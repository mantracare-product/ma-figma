// Phase 1 Foundation Unit Tests
// Tests singleton guard, migration, and required-category protection
import assert from "node:assert";

// Provide browser mock globals
const storage = {};
const sessionStore = {};
globalThis.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
globalThis.sessionStorage = {
  getItem: (key) => sessionStore[key] || null,
  setItem: (key, val) => { sessionStore[key] = String(val); },
  removeItem: (key) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.Event = class {};

async function runTests() {
  console.log("Starting Phase 1 Verification Tests...\n");

  // Dynamic import of modules after globalThis setup
  const {
    getStoredProcesses,
    saveStoredProcesses,
    isStageDeletable,
    isRequiredSystemCategory,
    REQUIRED_SYSTEM_CATEGORIES,
    DEFAULT_ENTITY_PROCESSES,
  } = await import("../useProcessStore.ts");

  const {
    mapInvoiceStatusToCategory,
    mapAppointmentStatusToCategory,
    mapClaimStatusToCategory,
    findStageForCategory,
    runEntityStageMigration,
  } = await import("../entityMigration.ts");

  // TEST 1: Default Seeding & Structure
  console.log("Test 1: Default Process Seeding & Entity Types");
  const initial = getStoredProcesses();
  assert(Array.isArray(initial), "Processes must be an array");
  
  const entities = ["client", "appointment", "invoice", "insurance", "claim"];
  for (const et of entities) {
    const found = initial.some((p) => (p.entityType || "client") === et);
    assert(found, `Expected process with entityType "${et}" to exist in seeded list`);
  }
  console.log("✔ Test 1 Passed: All 5 entity types seeded and present.\n");

  // TEST 2: Singleton Enforcement
  console.log("Test 2: Singleton Guard (no duplication or deletion of non-client processes)");
  
  // Attempt 2a: Try deleting non-client processes by saving only client processes
  const onlyClients = initial.filter((p) => p.entityType === "client");
  saveStoredProcesses(onlyClients);
  const afterDeleteAttempt = getStoredProcesses();
  
  assert(
    afterDeleteAttempt.some((p) => p.entityType === "appointment"),
    "Appointment singleton must be auto-preserved when deletion is attempted"
  );
  assert(
    afterDeleteAttempt.some((p) => p.entityType === "invoice"),
    "Invoice singleton must be auto-preserved when deletion is attempted"
  );
  assert(
    afterDeleteAttempt.some((p) => p.entityType === "insurance"),
    "Insurance singleton must be auto-preserved when deletion is attempted"
  );
  assert(
    afterDeleteAttempt.some((p) => p.entityType === "claim"),
    "Claim singleton must be auto-preserved when deletion is attempted"
  );

  // Attempt 2b: Try duplicating appointment process
  const apptProc = afterDeleteAttempt.find((p) => p.entityType === "appointment");
  const duplicatedList = [
    ...afterDeleteAttempt,
    { ...apptProc, id: "appt-duplicate-999", name: "Second Appointment Process" },
  ];
  saveStoredProcesses(duplicatedList);
  const afterDuplicateAttempt = getStoredProcesses();
  const apptCount = afterDuplicateAttempt.filter((p) => p.entityType === "appointment").length;
  assert.strictEqual(apptCount, 1, "There must be exactly ONE appointment process (singleton constraint)");
  console.log("✔ Test 2 Passed: Singleton guard strictly prevents deletion and duplication.\n");

  // TEST 3: Required System Category Protection
  console.log("Test 3: Required System Category Protection");
  
  // Appointment required: booked, rescheduled, completed, cancelled
  assert.strictEqual(isRequiredSystemCategory("appointment", "booked"), true);
  assert.strictEqual(isRequiredSystemCategory("appointment", "rescheduled"), true);
  assert.strictEqual(isRequiredSystemCategory("appointment", "completed"), true);
  assert.strictEqual(isRequiredSystemCategory("appointment", "cancelled"), true);
  assert.strictEqual(isRequiredSystemCategory("appointment", "reminder"), false);
  assert.strictEqual(isRequiredSystemCategory("appointment", "checked_in"), false);

  // Invoice required: draft, paid, void
  assert.strictEqual(isRequiredSystemCategory("invoice", "draft"), true);
  assert.strictEqual(isRequiredSystemCategory("invoice", "paid"), true);
  assert.strictEqual(isRequiredSystemCategory("invoice", "void"), true);
  assert.strictEqual(isRequiredSystemCategory("invoice", "sent"), false);
  assert.strictEqual(isRequiredSystemCategory("invoice", "viewed"), false);

  // Verify isStageDeletable behavior
  const invProc = DEFAULT_ENTITY_PROCESSES.invoice;
  const draftStage = invProc.stages.find((s) => s.systemCategory === "draft");
  const sentStage = invProc.stages.find((s) => s.systemCategory === "sent");
  const paidStage = invProc.stages.find((s) => s.systemCategory === "paid");

  const draftCheck = isStageDeletable(invProc, draftStage.id);
  assert.strictEqual(draftCheck.deletable, false, "Required stage 'draft' must not be deletable");

  const paidCheck = isStageDeletable(invProc, paidStage.id);
  assert.strictEqual(paidCheck.deletable, false, "Required stage 'paid' must not be deletable");

  const sentCheck = isStageDeletable(invProc, sentStage.id);
  assert.strictEqual(sentCheck.deletable, true, "Non-required stage 'sent' should be deletable");

  console.log("✔ Test 3 Passed: Required categories protected from deletion, optional stages deletable.\n");

  // TEST 4: Entity Stage Migration
  console.log("Test 4: Legacy Status-to-Stage Migration");

  // Seed legacy un-migrated invoices
  const legacyInvoices = [
    { id: "INV-1", status: "paid", total: 100 },
    { id: "INV-2", status: "draft", total: 50 },
    { id: "INV-3", status: "sent", total: 75 },
    { id: "INV-4", status: "unknown_weird_status", total: 20 },
  ];
  localStorage.setItem("mantra_invoices_v1", JSON.stringify(legacyInvoices));

  // Seed legacy un-migrated appointments
  const legacyAppts = [
    { id: 101, status: "scheduled" },
    { id: 102, status: "completed" },
    { id: 103, status: "rescheduled" },
  ];
  localStorage.setItem("appointments_v1", JSON.stringify(legacyAppts));

  // Run migration
  runEntityStageMigration(getStoredProcesses());

  // Verify migrated invoices
  const migratedInvoices = JSON.parse(localStorage.getItem("mantra_invoices_v1"));
  assert(migratedInvoices[0].currentStageId, "Invoice 1 must have currentStageId");
  assert.strictEqual(migratedInvoices[0].statusLabel, "Paid", "Invoice 1 statusLabel should be Paid");

  assert(migratedInvoices[1].currentStageId, "Invoice 2 must have currentStageId");
  assert.strictEqual(migratedInvoices[1].statusLabel, "Draft", "Invoice 2 statusLabel should be Draft");

  assert(migratedInvoices[2].currentStageId, "Invoice 3 must have currentStageId");
  assert.strictEqual(migratedInvoices[2].statusLabel, "Sent", "Invoice 3 statusLabel should be Sent");

  // Unknown status should fallback to entry stage (Draft)
  assert(migratedInvoices[3].currentStageId, "Invoice 4 must fallback to entry stage");
  assert.strictEqual(migratedInvoices[3].statusLabel, "Draft", "Invoice 4 unmapped value should fallback to entry stage");

  // Verify migrated appointments
  const migratedAppts = JSON.parse(localStorage.getItem("appointments_v1"));
  assert(migratedAppts[0].currentStageId, "Appointment 101 must have currentStageId");
  assert(migratedAppts[1].currentStageId, "Appointment 102 must have currentStageId");
  assert(migratedAppts[2].currentStageId, "Appointment 103 must have currentStageId");

  console.log("✔ Test 4 Passed: Legacy records cleanly migrated to stage IDs with computed statusLabels.\n");

  console.log("=========================================");
  console.log("ALL PHASE 1 FOUNDATION TESTS PASSED (4/4)");
  console.log("=========================================");
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
