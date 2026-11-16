import { describe, it, expect, beforeAll, beforeEach } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
let appts: typeof import("../appointmentService");
let auto: typeof import("../useAutomationStore");
let r4: typeof import("../rcmDefaultsR4");
let claimsLib: typeof import("../claimsStore");
let sb: typeof import("../sampleBundles");
let cov: typeof import("../coveragesStore");
let tasks: typeof import("../tasksStore");
let billing: typeof import("../billingSetupStore");
let procs: typeof import("../useProcessStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let rw: typeof import("../recordWriter");
let bus: typeof import("../eventBus");

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  fresh();
  await import("../ruleEngine");
  appts = await import("../appointmentService");
  auto = await import("../useAutomationStore");
  r4 = await import("../rcmDefaultsR4");
  claimsLib = await import("../claimsStore");
  sb = await import("../sampleBundles");
  cov = await import("../coveragesStore");
  tasks = await import("../tasksStore");
  billing = await import("../billingSetupStore");
  procs = await import("../useProcessStore");
  samples = await import("../rcmSampleClaimWorkflows");
  rw = await import("../recordWriter");
  bus = await import("../eventBus");
});

beforeEach(() => {
  fresh();
  localStorage.setItem("ma_services_demo", JSON.stringify([
    { id: 701, name: "Cataract surgery", description: "", cptCode: "66984", duration: 30, price: 2400, currency: "USD", isActive: true, billableToInsurance: true },
    { id: 702, name: "Cosmetic", description: "", duration: 30, price: 100, currency: "USD", isActive: true, billableToInsurance: false },
  ]));
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "555", email: "t@x.com", stage: "x", processes: [], consents: { voice: true } }]));
  sb.loadSampleTemplates(); // reference data (payers, prior-auth rules, claim workflows, message templates)
  auto.saveStoredRules(auto.getStoredRules().filter((r) => !r.id.startsWith("r4-rule-"))); // the Round 4 rules come from ensureRound4Defaults, as for an existing workspace
  billing.seedBillingSetupSamples();
  cov.coveragesStore.save([{ id: "c1", clientId: "CL-T", payerId: "payer-bcbs", memberId: "M-OK-1", priority: "primary" } as any]);
  r4.ensureRound4Defaults();
  sb.enableDemoSet("C");
});

const book = (serviceId: number, date: string, extra: any = {}) =>
  appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "555", employeeId: 1, serviceId, date, time: "10:00", duration: 30, clientId: "CL-T", source: "screen", ...extra },
    { force: true, createdBy: "user" }
  ).appointment as any;

const recordOf = (apptId: string | number) => claimsLib.getStoredClaims().find((c) => c.appointmentId === String(apptId));
const stageOf = (c?: { statusLabel?: string }) => c?.statusLabel;

describe("one insurance record per appointment", () => {
  it("ships the workflows (typed), rules enabled except patient messages, no Start Call node", () => {
    const wfs = procs.getStoredProcesses().filter((p) => p.entityType === "claim");
    expect(wfs.find((w) => w.id === r4.ELIGIBILITY_WORKFLOW_ID)?.workflowType).toBe("eligibility");
    expect(wfs.find((w) => w.id === r4.PRIOR_AUTH_WORKFLOW_ID)?.workflowType).toBe("prior_auth");
    const elig: any = wfs.find((w) => w.id === r4.ELIGIBILITY_WORKFLOW_ID)!;
    expect(elig.stages.map((s: any) => s.name)).toEqual(["Run eligibility", "Needs fix", "Inconclusive", "Pending review", "Eligible", "Inactive", "Self-pay"]);
    expect(elig.stages.find((s: any) => s.name === "Inconclusive")).toMatchObject({ enableCalling: true, callTriggerSettings: { callPurpose: "payer_benefits" } });
    const rules = auto.getStoredRules().filter((r) => r.id.startsWith("r4-rule-"));
    expect(rules.length).toBeGreaterThanOrEqual(18);
    expect(rules.filter((r) => !r.enabled).every((r) => (r.actions || []).some((a: any) => a.stepKey === "send_message"))).toBe(true);
    expect(auto.getStoredRules().some((r) => (r.actions || []).some((a: any) => a.stepKey === "start_call"))).toBe(false);
  });

  it("insurance booking creates ONE record in Eligibility, runs eligibility (-> Eligible), checks auth (not required -> appointment Insurance cleared)", async () => {
    const a = book(701, "2031-03-01");
    expect(a.paymentMode).toBe("insurance");
    expect(a.processId).toBe(r4.APPT_INSURANCE_WORKFLOW_ID);
    await wait(800);
    const recs = claimsLib.getStoredClaims().filter((c) => c.appointmentId === String(a.id));
    expect(recs).toHaveLength(1);
    expect(recs[0].processId).toBe(r4.ELIGIBILITY_WORKFLOW_ID);
    expect(recs[0].lines).toHaveLength(0);
    expect(stageOf(recs[0])).toBe("Eligible");
    const fields = rw.readLocalRecordFields("claim", recs[0].id) as any;
    expect(fields.elig_status).toBe("active");
    expect((appts.appointmentService.getAppointmentById(a.id) as any).coverage?.status).toBe("active");
    // authorization is checked on entering Eligible; with no payer rule the answer is unknown, so force the decision path:
    await bus.eventBus.emit("auth.checked", "claim", recs[0].id, { auth_status: "not_required", claimId: recs[0].id, appointmentId: String(a.id) });
    await wait(300);
    expect((appts.appointmentService.getAppointmentById(a.id) as any).statusLabel).toBe("Insurance cleared");
    // a second booking event for the same appointment does not make a second record
    await bus.eventBus.emit("appointment.booked", "appointment", String(a.id), { ...appts.appointmentService.getAppointmentById(a.id), clientId: "CL-T" });
    await wait(300);
    expect(claimsLib.getStoredClaims().filter((c) => c.appointmentId === String(a.id))).toHaveLength(1);
  });

  it("a self-pay booking creates no insurance record", async () => {
    const a = book(702, "2031-03-02");
    expect(a.paymentMode).toBe("self_pay");
    await wait(500);
    expect(recordOf(a.id)).toBeUndefined();
  });

  it("authorization required: the SAME record moves to Prior auth (Submitted) and a Prior auth task is created", async () => {
    const a = book(701, "2031-03-03");
    await wait(800);
    const rec = recordOf(a.id)!;
    await bus.eventBus.emit("auth.checked", "claim", rec.id, { auth_status: "required", claimId: rec.id, appointmentId: String(a.id) });
    await wait(600);
    const after = claimsLib.getStoredClaims().filter((c) => c.appointmentId === String(a.id));
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(rec.id);
    expect(after[0].processId).toBe(r4.PRIOR_AUTH_WORKFLOW_ID);
    expect(tasks.getStoredTasks().some((t) => t.queueId === "prior-auth" && t.entityRef?.id === rec.id)).toBe(true);
  });

  it("completing the visit moves the same record to Charge capture / Awaiting note; cancelling closes it as lost and closes its tasks", async () => {
    const a = book(701, "2031-03-04");
    await wait(800);
    const rec = recordOf(a.id)!;
    await bus.eventBus.emit("appointment.completed", "appointment", String(a.id), { ...appts.appointmentService.getAppointmentById(a.id), clientId: "CL-T" });
    await wait(500);
    const done = claimsLib.getStoredClaims().filter((c) => c.appointmentId === String(a.id));
    expect(done).toHaveLength(1);
    expect(done[0].id).toBe(rec.id);
    expect(done[0].processId).toBe(samples.SAMPLE_CLAIM_WORKFLOW_IDS.chargeCapture);
    expect(stageOf(done[0])).toBe("Awaiting note");

    const b = book(701, "2031-03-05");
    await wait(800);
    const recB = recordOf(b.id)!;
    await bus.eventBus.emit("appointment.cancelled", "appointment", String(b.id), { ...appts.appointmentService.getAppointmentById(b.id), clientId: "CL-T" });
    await wait(500);
    const closed = claimsLib.getStoredClaims().find((c) => c.id === recB.id)!;
    const wf: any = procs.getStoredProcesses().find((p) => p.id === closed.processId);
    expect(wf.stages.find((s: any) => s.id === closed.currentStageId).stageCategory).toBe("lost");
  });

  it("migration: Coverage & authorization instances become insurance records, old rules are switched off, the process is retired (copy kept)", async () => {
    // pretend this is an older workspace: the old flow, no Round 4 flags
    localStorage.removeItem("mantra_r4_instances_migrated_v1");
    localStorage.removeItem("mantra_retired_processes_v1");
    const procLib = procs;
    procLib.saveStoredProcesses([...procLib.getStoredProcesses(), { id: "proc-sample-coverage-auth", name: "Coverage & authorization", entityType: "client", stages: [{ id: "s", name: "Verified" }] } as any]);
    const logs = await import("../processLogsStore");
    logs.saveCallLogs([{ id: "PRC-OLD", instanceId: "PRC-OLD", kind: "process_instance", client: "Test Patient", clientId: "CL-T", type: "WhatsApp", status: "In Progress", process: "Coverage & authorization", processId: "proc-sample-coverage-auth", currentStage: "Verified", duration: "0:00", date: "2031-04-01 10:00", hasRecording: false, hasTranscript: true, hasScheduledCall: false, source: { type: "appointment", id: "9001", title: "Visit" }, instanceStatus: "active", createdAt: "2031-03-01T00:00:00Z", elig_status: "active", elig_copay: 30 } as any, ...logs.getStoredCallLogs()]);
    auto.saveStoredRules([{ id: "sample-rule-A1", name: "A1 old", orgId: "default", enabled: true, entityType: "appointment", trigger: { event: "appointment.booked" }, conditions: [], action: {}, actions: [], createdAt: "", updatedAt: "" } as any, ...auto.getStoredRules()]);
    const res = r4.migrateInstancesToInsuranceRecords();
    expect(res).toMatchObject({ records: 1, retired: true });
    expect(res.rulesDisabled).toBeGreaterThanOrEqual(1);
    const rec = claimsLib.getStoredClaims().find((c) => c.appointmentId === "9001")!;
    expect(rec.processId).toBe(r4.ELIGIBILITY_WORKFLOW_ID);
    expect(rec.statusLabel).toBe("Eligible");
    expect((rw.readLocalRecordFields("claim", rec.id) as any).elig_copay).toBe(30);
    expect(procs.getStoredProcesses().some((p) => p.id === "proc-sample-coverage-auth")).toBe(false);
    expect(JSON.parse(localStorage.getItem("mantra_retired_processes_v1") || "[]")).toHaveLength(1);
    expect(auto.getStoredRules().find((r) => r.id === "sample-rule-A1")!.enabled).toBe(false);
    expect(r4.migrateInstancesToInsuranceRecords()).toMatchObject({ records: 0 });
  });
});
