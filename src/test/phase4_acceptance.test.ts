// Polyfill localStorage, sessionStorage, and window for Node environment
const store: Record<string, string> = {};
const sessionStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

const mockSessionStorage = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, val: string) => { sessionStore[key] = val; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); },
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).window = {
  dispatchEvent: (event: any) => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as any).CustomEvent = class {
  type: string;
  detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

async function runAcceptanceTest() {
  console.log("=== Phase 4: Appointments, Invoices & Dynamic Automation-Driven Stages Test ===");

  // Dynamic import after polyfills
  await import("../lib/ruleEngine");
  const { appointmentService } = await import("../lib/appointmentService");
  const { invoiceService } = await import("../lib/invoiceService");
  const { getStoredStageMoves, undoStageMove, saveStoredRules } = await import("../lib/useAutomationStore");
  const { eventBus } = await import("../lib/eventBus");
  const { saveStoredProcesses, getStoredProcesses } = await import("../lib/useProcessStore");

  // Track events emitted
  const emittedEvents: string[] = [];
  eventBus.subscribeAll((evt) => {
    emittedEvents.push(`${evt.event}:${evt.recordType}:${evt.recordId}`);
  });

  // Step 1: Simulate user editing stages in the Workflow / Process
  // Let's add custom edited stages to appointment and invoice processes!
  console.log("\n[Test 1] Simulating user editing workflow stages...");
  const processes = getStoredProcesses();
  const apptProc = processes.find((p) => p.entityType === "appointment")!;
  const invProc = processes.find((p) => p.entityType === "invoice")!;

  // Custom edited stages:
  apptProc.stages = [
    { id: "custom-appt-init", name: "New Intake", color: "#6366f1", description: "Initial intake", status: "active" },
    { id: "custom-appt-verified", name: "Verified & Prepped", color: "#10b981", description: "Verified", status: "active" },
    { id: "custom-appt-done", name: "Session Finished", color: "#8b5cf6", description: "Done", status: "completed" },
  ];
  invProc.stages = [
    { id: "custom-inv-init", name: "Billing Queued", color: "#64748b", description: "Queued", status: "draft" },
    { id: "custom-inv-dispatched", name: "Client Dispatched", color: "#3b82f6", description: "Sent to client", status: "sent" },
    { id: "custom-inv-settled", name: "Settled in Full", color: "#10b981", description: "Settled", status: "paid" },
  ];
  saveStoredProcesses(processes);
  console.log("✓ Custom workflow stages saved: New Intake -> Verified & Prepped, Billing Queued -> Client Dispatched -> Settled in Full");

  // Step 2: Verify appointment booking is LOCKED without automation rules (same as invoice creation)
  console.log("\n[Test 2] Verifying appointment booking is locked WITHOUT automation...");
  saveStoredRules([]); // Clear all rules

  // 2a. Attempt booking without automation
  const blockedResult = appointmentService.createAppointment({
    clientName: "Alice Walker",
    clientEmail: "alice@example.com",
    clientPhone: "+1-555-0199",
    employeeId: 1,
    date: "2026-10-15",
    time: "10:00 AM",
    duration: 60,
    title: "Initial Consultation",
    source: "screen",
  });
  if (blockedResult.appointment !== null) {
    throw new Error("Expected appointment booking to be locked/blocked without automation rule!");
  }
  console.log("✓ Verified: Appointment booking is strictly locked without automation rule!");

  // 2b. Book with test bypass to verify stage is not marked automatically without workflow rule
  const createResult = appointmentService.createAppointment({
    clientName: "Alice Walker",
    clientEmail: "alice@example.com",
    clientPhone: "+1-555-0199",
    employeeId: 1,
    date: "2026-10-15",
    time: "10:00 AM",
    duration: 60,
    title: "Initial Consultation",
    source: "screen",
  }, { createdBy: "test" });
  const appt = createResult.appointment;

  console.log(`✓ Appointment created: ID=${appt.id}, stage='${appt.currentStageId}' (${appt.statusLabel || "unmarked"})`);
  // Verify that without automation, stage is NOT assigned/marked automatically:
  if (appt.currentStageId !== "") {
    throw new Error(`Expected stage to be unmarked ('') without automation, but got '${appt.currentStageId}'`);
  }
  console.log("✓ Verified: Stage is not marked when booked without automation!");

  // Verify NO invoice is generated without automation
  const invoicesAfterBooking = invoiceService.getInvoices();
  const linkedInvoice = invoicesAfterBooking.find((inv) => String(inv.appointmentId) === String(appt.id));
  if (linkedInvoice) {
    throw new Error(`Invoice was generated unexpectedly without automation rule: ${linkedInvoice.id}`);
  }
  console.log("✓ Verified: No invoice generated for Alice Walker without automation rule!");

  // Step 3: Now define automation rules:
  // Rule A: On appointment.booked -> Generate Invoice & Move to "Verified & Prepped"
  // Rule B: On invoice.sent -> Move to "Client Dispatched"
  // Rule C: On invoice.paid -> Move to "Settled in Full"
  console.log("\n[Test 3] Configuring automation rules to define stage movement on each action...");
  saveStoredRules([
    {
      id: "rule-book-to-verified",
      name: "On Booked Move To Verified and Generate Invoice",
      description: "Moves appointment to custom stage and creates invoice",
      orgId: "default",
      entityType: "appointment",
      trigger: { event: "appointment.booked", label: "Appointment booked", source: "any" },
      action: { type: "moveToStage", processId: "", stageId: "", processName: "", stageName: "" },
      actions: [
        {
          id: "step-1",
          name: "Generate Invoice",
          description: "",
          iconKey: "filetext",
          stepKey: "generate_invoice",
          trigger: "stage",
          executionType: "wait",
          delayValue: 0,
          delayUnit: "minutes",
          params: {
            billFor: "choose",
            selectedServices: [{ serviceId: "srv-1", name: "Therapy", quantity: 1, unitPrice: 150 }],
            dueDays: 14,
            paymentMode: "card",
          },
        },
        {
          id: "step-2",
          name: "Update to Verified & Prepped",
          description: "",
          iconKey: "gitbranch",
          stepKey: "update_to_stage",
          trigger: "stage",
          executionType: "wait",
          delayValue: 0,
          delayUnit: "minutes",
          params: {
            stageEntity: "appointment",
            stageId: "custom-appt-verified",
            stageName: "Verified & Prepped",
          },
        },
      ],
      enabled: true,
      health: "ok",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rule-invoice-sent",
      name: "On Invoice Sent Move Stage",
      description: "Moves invoice to Client Dispatched",
      orgId: "default",
      entityType: "invoice",
      trigger: { event: "invoice.sent", label: "Invoice sent", source: "any" },
      action: { type: "moveToStage", processId: "", stageId: "", processName: "", stageName: "" },
      actions: [
        {
          id: "step-inv-sent-1",
          name: "Update to Client Dispatched",
          description: "",
          iconKey: "gitbranch",
          stepKey: "update_to_stage",
          trigger: "stage",
          executionType: "wait",
          delayValue: 0,
          delayUnit: "minutes",
          params: {
            stageEntity: "invoice",
            stageId: "custom-inv-dispatched",
            stageName: "Client Dispatched",
          },
        },
      ],
      enabled: true,
      health: "ok",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rule-invoice-paid",
      name: "On Invoice Paid Move Stage",
      description: "Moves invoice to Settled in Full",
      orgId: "default",
      entityType: "invoice",
      trigger: { event: "invoice.paid", label: "Invoice paid", source: "any" },
      action: { type: "moveToStage", processId: "", stageId: "", processName: "", stageName: "" },
      actions: [
        {
          id: "step-inv-paid-1",
          name: "Update to Settled in Full",
          description: "",
          iconKey: "gitbranch",
          stepKey: "update_to_stage",
          trigger: "stage",
          executionType: "wait",
          delayValue: 0,
          delayUnit: "minutes",
          params: {
            stageEntity: "invoice",
            stageId: "custom-inv-settled",
            stageName: "Settled in Full",
          },
        },
      ],
      enabled: true,
      health: "ok",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  // Step 4: Book an appointment for Bob Smith WITH automation in place
  console.log("\n[Test 4] Booking appointment for Bob Smith WITH automation active...");
  const bobResult = appointmentService.createAppointment({
    clientName: "Bob Smith",
    clientEmail: "bob@example.com",
    clientPhone: "+1-555-0200",
    employeeId: 2,
    date: "2026-10-16",
    time: "11:00 AM",
    duration: 60,
    title: "Therapy Session",
    source: "screen",
  });
  await new Promise((r) => setTimeout(r, 60));

  // Fetch updated appointment to verify rule execution
  const bobApptUpdated = appointmentService.getAppointmentById(bobResult.appointment.id)!;
  console.log(`✓ Bob Smith's appointment: stage=${bobApptUpdated.currentStageId} (${bobApptUpdated.statusLabel})`);

  if (bobApptUpdated.currentStageId !== "custom-appt-verified") {
    throw new Error(`Expected Bob's appointment to move to 'custom-appt-verified' via automation, but got ${bobApptUpdated.currentStageId}`);
  }
  console.log("✓ Verified: Automation moved Bob Smith to custom stage 'Verified & Prepped'!");

  const bobInvoice = invoiceService.getInvoices().find((inv) => String(inv.appointmentId) === String(bobApptUpdated.id));
  if (!bobInvoice) {
    throw new Error("Expected invoice to be generated for Bob Smith via automation rule!");
  }
  console.log(`✓ Verified: Invoice ${bobInvoice.id} generated via automation with initial stage=${bobInvoice.currentStageId} (${bobInvoice.statusLabel})`);
  if (bobInvoice.currentStageId !== "custom-inv-init") {
    throw new Error(`Expected invoice initial stage to be 'custom-inv-init', got ${bobInvoice.currentStageId}`);
  }

  // Step 5: Send Invoice and verify automation moves it to "Client Dispatched"
  console.log("\n[Test 5] Sending invoice via WhatsApp...");
  invoiceService.sendInvoice(bobInvoice.id, "whatsapp");
  await new Promise((r) => setTimeout(r, 60));

  const bobInvoiceAfterSend = invoiceService.getInvoiceById(bobInvoice.id)!;
  console.log(`✓ Invoice after send: stage=${bobInvoiceAfterSend.currentStageId} (${bobInvoiceAfterSend.statusLabel}), status=${bobInvoiceAfterSend.status}`);
  if (bobInvoiceAfterSend.currentStageId !== "custom-inv-dispatched") {
    throw new Error(`Expected invoice stage to move to 'custom-inv-dispatched' via automation, got ${bobInvoiceAfterSend.currentStageId}`);
  }
  console.log("✓ Verified: Automation moved invoice to custom stage 'Client Dispatched'!");

  // Step 6: Record Payment and verify automation moves it to "Settled in Full"
  console.log(`\n[Test 6] Recording full payment of $${bobInvoiceAfterSend.total}...`);
  invoiceService.recordPayment(bobInvoiceAfterSend.id, bobInvoiceAfterSend.total, "card_on_file", "Online payment");
  await new Promise((r) => setTimeout(r, 60));

  const bobInvoiceAfterPayment = invoiceService.getInvoiceById(bobInvoice.id)!;
  console.log(`✓ Invoice after payment: stage=${bobInvoiceAfterPayment.currentStageId} (${bobInvoiceAfterPayment.statusLabel}), status=${bobInvoiceAfterPayment.status}`);
  if (bobInvoiceAfterPayment.currentStageId !== "custom-inv-settled") {
    throw new Error(`Expected invoice stage to move to 'custom-inv-settled' via automation, got ${bobInvoiceAfterPayment.currentStageId}`);
  }
  console.log("✓ Verified: Automation moved invoice to custom stage 'Settled in Full'!");

  // Step 7: Stage Movement Audit Trail & 1-Click Undo
  console.log("\n[Test 7] Verifying Stage Movement Audit Trail & 1-Click Undo...");
  const stageMoves = getStoredStageMoves();
  console.log(`✓ Total recorded stage moves in audit trail: ${stageMoves.length}`);
  if (stageMoves.length === 0) throw new Error("No stage moves were logged in audit trail!");

  const lastMove = stageMoves[0];
  console.log(`✓ Most recent move: ${lastMove.recordType} ${lastMove.recordId} from ${lastMove.fromStageId} -> ${lastMove.toStageId} (cause: ${lastMove.cause?.ruleName})`);

  const undoneMove = undoStageMove(lastMove.id);
  if (!undoneMove) throw new Error("undoStageMove returned null!");

  const invoiceAfterUndo = invoiceService.getInvoices().find((i) => i.id === bobInvoice.id);
  console.log(`✓ Invoice stage after undo: ${invoiceAfterUndo?.currentStageId} (${invoiceAfterUndo?.statusLabel})`);
  if (invoiceAfterUndo?.currentStageId !== lastMove.fromStageId) {
    throw new Error(`Expected invoice stage to revert to ${lastMove.fromStageId}, but got ${invoiceAfterUndo?.currentStageId}`);
  }

  console.log("\n🎉 ALL TESTS PASSED: Dynamic stages and automation-driven stage updates verified! 🎉\n");
}

runAcceptanceTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
