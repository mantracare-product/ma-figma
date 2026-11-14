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

let sb: typeof import("../sampleBundles");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let cov: typeof import("../coveragesStore");
let appts: typeof import("../appointmentService");
let tasks: typeof import("../tasksStore");
let auto: typeof import("../useAutomationStore");
let jobs: typeof import("../rcmJobs");
let scribe: typeof import("../scribeSessionStore");
let sbill: typeof import("../scribeBilling");
let act: typeof import("../claimActions");
let runs: typeof import("../actionRuns");
let bus: typeof import("../eventBus");

const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));

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
  await import("../sampleBundlesRegistry");
  await import("../sampleRuleSets");
  sb = await import("../sampleBundles");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  cov = await import("../coveragesStore");
  appts = await import("../appointmentService");
  tasks = await import("../tasksStore");
  auto = await import("../useAutomationStore");
  jobs = await import("../rcmJobs");
  scribe = await import("../scribeSessionStore");
  sbill = await import("../scribeBilling");
  act = await import("../claimActions");
  runs = await import("../actionRuns");
  bus = await import("../eventBus");
});

beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  act.clearinghouseSettingsStore.save({ scenario: "auto" });
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", phone: "555", contactType: "Client", stage: "x", processes: [], dob: "1980-01-01" }]));
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  const svc = [{ id: 701, name: "Cataract surgery", description: "", cptCode: "66984", duration: 30, price: 2400, currency: "USD", isActive: true }];
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svc));
  sb.loadSampleTemplates();
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
});

const myClaims = () => claimsLib.getStoredClaims().filter((c) => c.patientId === "CL-T" && c.sourceType);
const claimTasks = () => tasks.getStoredTasks().filter((t) => t.queueId === "claim-fixes");

async function completedVisit(): Promise<string> {
  const a: any = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 701, date: "2030-12-01", time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  const id = String(a.id ?? a.appointment?.id);
  await bus.eventBus.emit("appointment.completed", "appointment", id, { ...appts.appointmentService.getAppointmentById(id), clientId: "CL-T" });
  await wait();
  return id;
}

describe("Set C demo (Slice 4)", () => {
  it("loads A14-A20 plus the three A14 variants disabled; Enable demo set C turns on only the default timing", () => {
    const rules = auto.getStoredRules().filter((r) => r.id.startsWith("sample-rule-A1") || r.id.startsWith("sample-rule-A20"));
    const ids = rules.map((r) => r.id.replace("sample-rule-", ""));
    expect(ids).toEqual(expect.arrayContaining(["A14", "A14-scribe", "A14-checkin", "A14-paid", "A15", "A16a", "A16b", "A16c", "A17", "A18", "A19", "A20"]));
    expect(rules.filter((r) => r.id.startsWith("sample-rule-A14") || r.id.startsWith("sample-rule-A15")).every((r) => r.enabled === false)).toBe(true);
    sb.enableDemoSet("C");
    const on = (id: string) => auto.getStoredRules().find((r) => r.id === `sample-rule-${id}`)!.enabled;
    expect(on("A14")).toBe(true);
    expect(on("A14-scribe") || on("A14-checkin") || on("A14-paid")).toBe(false);
    expect(sb.getSampleSetStatus("C")).toMatchObject({ enabled: 9, total: 9 });
    sb.disableDemoSet("C");
    expect(auto.getStoredRules().filter((r) => r.id.startsWith("sample-rule-A14") && r.enabled)).toHaveLength(0);
  });

  it("visit completed -> claim in Charge capture / Awaiting note (once, even if the event repeats)", async () => {
    sb.enableDemoSet("C");
    const id = await completedVisit();
    await bus.eventBus.emit("appointment.completed", "appointment", id, { ...appts.appointmentService.getAppointmentById(id), clientId: "CL-T" });
    await wait();
    const cs = myClaims();
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ processId: W().chargeCapture, statusLabel: "Awaiting note", appointmentId: id });
  });

  it("sign the note with RT -> Ready to bill -> Claim/Draft -> scrub passes -> Ready to submit; daily job submits; accepted", async () => {
    sb.enableDemoSet("C");
    const id = await completedVisit();
    scribe.saveScribeSession({ ...(scribe.INITIAL_SCRIBE_SESSIONS[0] as any), id: "scr-C", clientId: "CL-T", appointmentId: id, extractedData: { ...(scribe.INITIAL_SCRIBE_SESSIONS[0] as any).extractedData, icd10Code: "H25.11", diagnosis: "Cataract" } });
    sbill.acceptCodes("scr-C", { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", modifier: "RT", units: 1 }] });
    await sbill.signAndSendToBilling("scr-C");
    await wait(400);
    const c: any = myClaims()[0];
    expect(c).toMatchObject({ processId: W().claim, statusLabel: "Ready to submit", status: "Ready to Submit" });
    expect(c.scribeSessionId).toBe("scr-C");

    await jobs.runDaily(new Date(), ["claims"]);
    await wait(300);
    expect((myClaims()[0] as any)).toMatchObject({ statusLabel: "Accepted by payer", status: "Accepted" });
    expect((myClaims()[0] as any).clearinghouseTrackingId).toBeTruthy();
  });

  it("missing modifier: scrub fails -> Scrub failed + Claim fixes task; fixing and re-scrubbing closes the task", async () => {
    sb.enableDemoSet("C");
    const id = await completedVisit();
    scribe.saveScribeSession({ ...(scribe.INITIAL_SCRIBE_SESSIONS[0] as any), id: "scr-C2", clientId: "CL-T", appointmentId: id });
    sbill.acceptCodes("scr-C2", { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", units: 1 }] }); // no RT/LT
    await sbill.signAndSendToBilling("scr-C2");
    await wait(500);
    const c: any = myClaims()[0];
    expect(c).toMatchObject({ processId: W().claim, statusLabel: "Scrub failed" });
    const open = claimTasks().filter((t) => t.status !== "completed");
    expect(open).toHaveLength(1);
    expect(open[0].entityRef).toMatchObject({ type: "claim", id: c.id, stageId: samples.claimStageId(W().claim, "Scrub failed") });

    // fix the modifier, move the claim back to Draft -> A16c scrubs again -> Ready to submit; leaving Scrub failed auto-closes the task
    claimsLib.saveClaim({ ...c, lines: c.lines.map((l: any) => ({ ...l, modifier: "RT" })) });
    (await import("../claimService")).claimService.moveToStage(c.id, "Draft", { type: "manual" });
    await wait(500);
    expect(myClaims()[0]).toMatchObject({ statusLabel: "Ready to submit" });
    expect(claimTasks().filter((t) => t.status !== "completed")).toHaveLength(0);
  });

  it("mock 277CA rejects -> Rejected + Claim fixes task; resubmitting after the fix is accepted", async () => {
    sb.enableDemoSet("C");
    act.clearinghouseSettingsStore.save({ scenario: "reject" });
    const id = await completedVisit();
    scribe.saveScribeSession({ ...(scribe.INITIAL_SCRIBE_SESSIONS[0] as any), id: "scr-C3", clientId: "CL-T", appointmentId: id });
    sbill.acceptCodes("scr-C3", { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", modifier: "LT", units: 1 }] });
    await sbill.signAndSendToBilling("scr-C3");
    await wait(400);
    await jobs.runDaily(new Date(), ["claims"]);
    await wait(400);
    const c: any = myClaims()[0];
    expect(c).toMatchObject({ statusLabel: "Rejected", status: "Rejected" });
    expect(c.rejectionReason).toContain("277CA");
    expect(claimTasks().filter((t) => t.status !== "completed")).toHaveLength(1);

    act.clearinghouseSettingsStore.save({ scenario: "accept" });
    (await import("../claimService")).claimService.moveToStage(c.id, "Ready to submit", { type: "manual" });
    await wait(200);
    await jobs.runDaily(new Date(), ["claims"]);
    await wait(400);
    expect(myClaims()[0]).toMatchObject({ statusLabel: "Accepted by payer", submissionCount: 2 });
    expect(claimTasks().filter((t) => t.status !== "completed")).toHaveLength(0); // left Rejected -> auto-closed
  });

  it("A14 variant: enabling the scribe-signing variant (and disabling the default) creates the claim at signing instead", async () => {
    sb.enableDemoSet("C");
    auto.updateRule("sample-rule-A14", { enabled: false });
    auto.updateRule("sample-rule-A14-scribe", { enabled: true });
    const a: any = appts.appointmentService.createAppointment(
      { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 701, date: "2030-12-02", time: "10:00", duration: 30, clientId: "CL-T" } as any,
      { force: true, createdBy: "user" } as any
    );
    const id = String(a.id ?? a.appointment?.id);
    await bus.eventBus.emit("appointment.completed", "appointment", id, { ...appts.appointmentService.getAppointmentById(id), clientId: "CL-T" });
    await wait();
    expect(myClaims()).toHaveLength(0); // completion no longer creates a claim

    scribe.saveScribeSession({ ...(scribe.INITIAL_SCRIBE_SESSIONS[0] as any), id: "scr-V", clientId: "CL-T", appointmentId: id });
    sbill.acceptCodes("scr-V", { icd: [{ code: "H25.11", description: "Cataract" }], cpt: [{ code: "66984", description: "Cataract surgery", modifier: "RT", units: 1 }] });
    await sbill.signAndSendToBilling("scr-V");
    await wait(500);
    const c: any = myClaims()[0];
    expect(c).toBeTruthy();
    expect(c.sourceType).toBe("scribe");
    expect(c.lines[0]).toMatchObject({ cptCode: "66984", modifier: "RT" });
  });
});
