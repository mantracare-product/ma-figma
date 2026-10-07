export {};

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
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function runTest() {
  const {
    getStoredProcesses,
    saveStoredProcesses,
    DEFAULT_ENTITY_PROCESSES,
    getEntityProcess,
  } = await import("../lib/useProcessStore");
  const {
    isAutomationRuleMatchingScope,
  } = await import("../lib/useAutomationStore");

  console.log("=== Testing Admin Workflows & Automations Multi-Entity & Scope Rules ===\n");

  // Test 1: Verify saveStoredProcesses preserves multiple processes per entity
  console.log("[Test 1] Testing multiple processes per entity in saveStoredProcesses...");
  const testProcesses: any[] = [
    // 2 Client processes
    {
      id: "proc-client-1",
      name: "General Client Intake",
      description: "General intake",
      assignedToUserId: 1,
      stages: [],
      entityType: "client",
      industryCategory: "All",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
    {
      id: "proc-client-2",
      name: "VIP Healthcare Intake",
      description: "Healthcare VIP",
      assignedToUserId: 1,
      stages: [],
      entityType: "client",
      industryCategory: "Healthcare",
      industry: "Cardiologist",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
    // 2 Appointment processes (Healthcare vs Automobile)
    {
      id: "proc-appt-health",
      name: "Clinical Appointment Workflow",
      description: "Medical consultations",
      assignedToUserId: 1,
      stages: [
        { id: "st-h1", name: "Consultation Booked", description: "", status: "active", systemCategory: "booked" },
        { id: "st-h2", name: "Exam Completed", description: "", status: "active", systemCategory: "completed" },
      ],
      entityType: "appointment",
      industryCategory: "Healthcare",
      industry: "Cardiologist",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
    {
      id: "proc-appt-auto",
      name: "Auto Service Booking Workflow",
      description: "Vehicle test drive and servicing",
      assignedToUserId: 1,
      stages: [
        { id: "st-a1", name: "Service Scheduled", description: "", status: "active", systemCategory: "booked" },
        { id: "st-a2", name: "Vehicle Serviced", description: "", status: "active", systemCategory: "completed" },
      ],
      entityType: "appointment",
      industryCategory: "Automobile",
      industry: "Auto Dealership & Service",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
    // 2 Invoice processes (Healthcare vs Automobile)
    {
      id: "proc-inv-health",
      name: "Healthcare Billing Workflow",
      description: "Patient copay & claims billing",
      assignedToUserId: 1,
      stages: [
        { id: "st-ih1", name: "Copay Due", description: "", status: "active", systemCategory: "draft" },
        { id: "st-ih2", name: "Claim Settled", description: "", status: "active", systemCategory: "paid" },
      ],
      entityType: "invoice",
      industryCategory: "Healthcare",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
    {
      id: "proc-inv-auto",
      name: "Auto Repair Invoice Workflow",
      description: "Parts and labor billing",
      assignedToUserId: 1,
      stages: [
        { id: "st-ia1", name: "Estimate Sent", description: "", status: "active", systemCategory: "draft" },
        { id: "st-ia2", name: "Invoice Paid", description: "", status: "active", systemCategory: "paid" },
      ],
      entityType: "invoice",
      industryCategory: "Automobile",
      aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0 },
    },
  ];

  saveStoredProcesses(testProcesses);
  const stored = getStoredProcesses();

  const apptCount = stored.filter((p) => p.entityType === "appointment").length;
  const invCount = stored.filter((p) => p.entityType === "invoice").length;

  if (apptCount !== 2) throw new Error(`Expected 2 appointment processes saved, found ${apptCount}`);
  if (invCount !== 2) throw new Error(`Expected 2 invoice processes saved, found ${invCount}`);
  console.log(`✓ Multiple processes per entity preserved successfully: ${apptCount} appointments, ${invCount} invoices.\n`);

  // Test 2: Client scoping resolution for organizations
  console.log("[Test 2] Testing client scoping for appointment and invoice processes...");
  const healthcareOrg = {
    id: "org-1",
    name: "Heart Care Clinic",
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    location: "California",
  };

  const autoOrg = {
    id: "org-3",
    name: "Apex Auto Care",
    industryCategory: "Automobile",
    industry: "Auto Dealership & Service",
    location: "California",
  };

  // Check getEntityProcess for healthcare org
  const healthAppt = getEntityProcess(stored, "appointment", healthcareOrg);
  if (!healthAppt || healthAppt.id !== "proc-appt-health") {
    throw new Error(`Expected proc-appt-health for Healthcare org, got ${healthAppt?.id}`);
  }
  console.log(`✓ Healthcare org resolved to exact process: "${healthAppt.name}" (${healthAppt.id})`);

  // Check getEntityProcess for auto org
  const autoAppt = getEntityProcess(stored, "appointment", autoOrg);
  if (!autoAppt || autoAppt.id !== "proc-appt-auto") {
    throw new Error(`Expected proc-appt-auto for Auto org, got ${autoAppt?.id}`);
  }
  console.log(`✓ Automobile org resolved to exact process: "${autoAppt.name}" (${autoAppt.id})`);

  // Check invoice scoping
  const healthInv = getEntityProcess(stored, "invoice", healthcareOrg);
  if (!healthInv || healthInv.id !== "proc-inv-health") {
    throw new Error(`Expected proc-inv-health for Healthcare org, got ${healthInv?.id}`);
  }
  console.log(`✓ Healthcare org resolved to exact invoice process: "${healthInv.name}" (${healthInv.id})`);

  const autoInv = getEntityProcess(stored, "invoice", autoOrg);
  if (!autoInv || autoInv.id !== "proc-inv-auto") {
    throw new Error(`Expected proc-inv-auto for Auto org, got ${autoInv?.id}`);
  }
  console.log(`✓ Automobile org resolved to exact invoice process: "${autoInv.name}" (${autoInv.id})\n`);

  // Test 3: Admin Automations Scope Matching
  console.log("[Test 3] Testing Admin Automations scope rule matching...");
  const globalRule: any = {
    id: "rule-1",
    orgId: "default",
    name: "Global Inbound Call Rule",
    entityType: "client",
    trigger: { event: "call.inbound" },
    action: { type: "moveToStage", processId: "", stageId: "" },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const scopedRule: any = {
    id: "rule-2",
    orgId: "default",
    name: "Healthcare Appointment Auto-Confirm",
    entityType: "appointment",
    trigger: { event: "appointment.booked" },
    action: { type: "moveToStage", processId: "", stageId: "" },
    enabled: true,
    industryCategory: "Healthcare",
    industry: "Cardiologist",
    scopingRules: [
      {
        id: "scope-1",
        industryCategory: "Healthcare",
        industries: ["Cardiologist"],
        locations: ["California"],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Filter by Healthcare: both global (no restriction) and scopedRule should match
  const matchHealth = isAutomationRuleMatchingScope(scopedRule, { category: "Healthcare", industry: "Cardiologist" });
  if (!matchHealth) throw new Error("scopedRule should match Healthcare / Cardiologist");

  // Filter by Automobile: scopedRule should NOT match
  const matchAuto = isAutomationRuleMatchingScope(scopedRule, { category: "Automobile" });
  if (matchAuto) throw new Error("scopedRule should NOT match Automobile");

  // Global rule matches all scopes
  const globalMatchesAuto = isAutomationRuleMatchingScope(globalRule, { category: "Automobile" });
  if (!globalMatchesAuto) throw new Error("globalRule should match any scope");

  console.log("✓ Admin automation scope matching verified successfully!");

  // Test 4: Dynamic filtering of processes, appointments, invoices based on Admin Scope Rule
  console.log("\n[Test 4] Testing dynamic filtering of processes, appointments, and invoices based on Admin Scope Rule...");
  const { isProcessMatchingScopingRules } = await import("../lib/useProcessStore");

  const healthcareScopeRules = [
    {
      id: "scope-health",
      industryCategory: "Healthcare",
      industries: ["Cardiologist"],
      locations: ["California"],
    },
  ];

  const automobileScopeRules = [
    {
      id: "scope-auto",
      industryCategory: "Automobile",
      industries: ["Auto Dealership & Service"],
      locations: ["Texas"],
    },
  ];

  // Under Healthcare Admin Scope:
  const healthcareFiltered = testProcesses.filter((p) => isProcessMatchingScopingRules(p, healthcareScopeRules));
  const healthcareAppt = healthcareFiltered.find((p) => p.entityType === "appointment");
  const healthcareInv = healthcareFiltered.find((p) => p.entityType === "invoice");

  if (!healthcareAppt || healthcareAppt.id !== "proc-appt-health") {
    throw new Error(`Expected Healthcare appointment process 'proc-appt-health', got ${healthcareAppt?.id}`);
  }
  if (!healthcareInv || healthcareInv.id !== "proc-inv-health") {
    throw new Error(`Expected Healthcare invoice process 'proc-inv-health', got ${healthcareInv?.id}`);
  }
  if (healthcareFiltered.some((p) => p.id === "proc-appt-auto" || p.id === "proc-inv-auto")) {
    throw new Error("Automobile processes should NOT render under Healthcare Admin Scope!");
  }

  // Under Automobile Admin Scope:
  const automobileFiltered = testProcesses.filter((p) => isProcessMatchingScopingRules(p, automobileScopeRules));
  const scopedAutoAppt = automobileFiltered.find((p) => p.entityType === "appointment");
  const scopedAutoInv = automobileFiltered.find((p) => p.entityType === "invoice");

  if (!scopedAutoAppt || scopedAutoAppt.id !== "proc-appt-auto") {
    throw new Error(`Expected Automobile appointment process 'proc-appt-auto', got ${scopedAutoAppt?.id}`);
  }
  if (!scopedAutoInv || scopedAutoInv.id !== "proc-inv-auto") {
    throw new Error(`Expected Automobile invoice process 'proc-inv-auto', got ${scopedAutoInv?.id}`);
  }
  if (automobileFiltered.some((p) => p.id === "proc-appt-health" || p.id === "proc-inv-health")) {
    throw new Error("Healthcare processes should NOT render under Automobile Admin Scope!");
  }

  console.log("✓ Dynamic filtering of processes, appointment, and invoice configurations verified successfully!");

  // Test 5: Verify Automations added in Admin render in respective client automations
  console.log("\n[Test 5] Testing that automations added in Admin render in respective client automations...");
  const { createRule, getStoredRules, saveStoredRules } = await import("../lib/useAutomationStore");

  // Admin creates a rule scoped strictly to Healthcare
  const adminCreatedHealthcareRule = createRule({
    orgId: "default",
    name: "Admin Patient Recall Automation",
    description: "Automated recall for cardiac patients",
    entityType: "appointment",
    trigger: {
      event: "appointment.booked",
      label: "Appointment booked",
      source: "any",
    },
    action: {
      type: "moveToStage",
      processId: "proc-appt-health",
      stageId: "st-h1",
      processName: "Clinical Appointment Workflow",
      stageName: "Consultation Booked",
    },
    actions: [],
    enabled: true,
    health: "ok",
    scopingRules: healthcareScopeRules,
  });

  // Client view with Healthcare Org (e.g. Heart Care Clinic)
  const allStoredRules = getStoredRules();
  const healthcareClientVisibleRules = allStoredRules.filter((r) =>
    isAutomationRuleMatchingScope(r, {
      category: healthcareOrg.industryCategory,
      industry: healthcareOrg.industry,
      location: healthcareOrg.location,
    })
  );

  // Client view with Auto Org (e.g. Apex Auto Care)
  const autoClientVisibleRules = allStoredRules.filter((r) =>
    isAutomationRuleMatchingScope(r, {
      category: autoOrg.industryCategory,
      industry: autoOrg.industry,
      location: autoOrg.location,
    })
  );

  const isVisibleInHealthcare = healthcareClientVisibleRules.some((r) => r.id === adminCreatedHealthcareRule.id);
  const isVisibleInAuto = autoClientVisibleRules.some((r) => r.id === adminCreatedHealthcareRule.id);

  if (!isVisibleInHealthcare) {
    throw new Error("Admin-created Healthcare automation rule MUST be visible in Healthcare client automations!");
  }
  if (isVisibleInAuto) {
    throw new Error("Admin-created Healthcare automation rule MUST NOT be visible in Automobile client automations!");
  }

  console.log("✓ Admin-created automation renders in matching client automations and correctly excludes non-matching tenants!");
  console.log("\n🎉 ALL ADMIN WORKFLOWS & AUTOMATIONS TESTS PASSED! 🎉\n");
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
