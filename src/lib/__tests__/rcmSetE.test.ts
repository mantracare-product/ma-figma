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
let store: typeof import("../processLogsStore");
let cov: typeof import("../coveragesStore");
let appts: typeof import("../appointmentService");
let tasks: typeof import("../tasksStore");
let auto: typeof import("../useAutomationStore");
let jobs: typeof import("../rcmJobs");
let ids: typeof import("../rcmSampleIds");
let runs: typeof import("../actionRuns");
let el: typeof import("../eligibility");

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

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
  await import("../ruleEngine"); // bus subscriber
  await import("../sampleBundlesRegistry");
  await import("../sampleRuleSets");
  sb = await import("../sampleBundles");
  store = await import("../processLogsStore");
  cov = await import("../coveragesStore");
  appts = await import("../appointmentService");
  tasks = await import("../tasksStore");
  auto = await import("../useAutomationStore");
  jobs = await import("../rcmJobs");
  ids = await import("../rcmSampleIds");
  runs = await import("../actionRuns");
  el = await import("../eligibility");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  el.setMockScenario("auto");
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", contactType: "Client", stage: "x", processes: [], dob: "1980-01-01" }]));
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  const svc = [
    { id: 701, name: "MRI brain", description: "", cptCode: "70553", duration: 30, price: 1, currency: "USD", isActive: true },
    { id: 702, name: "Office visit", description: "", cptCode: "99214", duration: 30, price: 1, currency: "USD", isActive: true },
  ];
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svc));
  sb.loadSampleTemplates();
  // the sample coverage rows target the sample clients; this test supplies its own coverage
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
});

const book = async (serviceId: number, date: string) => {
  const a = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId, date, time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  await wait();
  return String((a as any).id ?? (a as any).appointment?.id);
};
const instancesOf = (apptId: string) => store.getProcessInstances().filter((i) => i.source?.type === "appointment" && String(i.source.id) === apptId && i.processId === ids.SAMPLE_COVERAGE_PROCESS_ID);
const myTasks = () => tasks.getStoredTasks().filter((t) => !!t.entityRef);

describe("Set E demo (Slice 3)", () => {
  it("ships disabled; Enable demo set E turns on A1-A10 and A13 with run order A1=10, A10=20", () => {
    const rules = auto.getStoredRules().filter((r) => r.id.startsWith("sample-rule-A"));
    expect(rules.map((r) => r.id.replace("sample-rule-", "")).sort()).toEqual(["A1", "A10", "A13", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]);
    expect(rules.every((r) => r.enabled === false)).toBe(true);
    expect(rules.find((r) => r.id === "sample-rule-A1")!.order).toBe(10);
    expect(rules.find((r) => r.id === "sample-rule-A10")!.order).toBe(20);
    expect(sb.enableDemoSet("E")).toBe(11);
  });

  it("booking: A1 creates the instance and verifies; A10 (runs second) writes auth to the SAME instance and queues a Prior auth task", async () => {
    sb.enableDemoSet("E");
    const id = await book(701, "2030-09-01");
    const inst = instancesOf(id);
    expect(inst).toHaveLength(1);
    const row: any = inst[0];
    expect(row.elig_status).toBe("active");
    expect(row.auth_required).toBe(true); // written by A10 after A1 created the instance
    expect(row.auth_status).toBe("requested");
    expect(row.currentStage).toBe("Auth submitted");
    expect((appts.appointmentService.getAppointmentById(id) as any).coverage.status).toBe("active");
    const t = myTasks().filter((x) => x.queueId === "prior-auth");
    expect(t).toHaveLength(1);
    expect(t[0].entityRef).toMatchObject({ type: "process_instance", instanceId: row.instanceId });
  });

  it("disable A1 and re-book: A10 falls back to the appointment only and creates no instance", async () => {
    sb.enableDemoSet("E");
    auto.updateRule("sample-rule-A1", { enabled: false });
    const id = await book(701, "2030-09-05");
    expect(instancesOf(id)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`) || "{}")).toMatchObject({ auth_status: "requested" });
    const t = myTasks().filter((x) => x.queueId === "prior-auth");
    expect(t).toHaveLength(1);
    expect(t[0].entityRef).toMatchObject({ type: "appointment", id });
  });

  it("a service that needs no auth: instance verified, no auth task", async () => {
    sb.enableDemoSet("E");
    const id = await book(702, "2030-09-02");
    const row: any = instancesOf(id)[0];
    expect(row.currentStage).toBe("Verified");
    expect(row.auth_status).toBe("not_required");
    expect(myTasks().filter((x) => x.queueId === "prior-auth")).toHaveLength(0);
  });

  it("member not found: instance lands in Needs fix, A4 queues an Insurance fixes task; fixing coverage and re-running verifies and auto-closes it", async () => {
    sb.enableDemoSet("E");
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "NOTFOUNDNOTFOUND1", priority: "primary", effectiveDate: "2025-01-01" });
    await wait();
    const id = await book(702, "2030-09-03");
    const row: any = instancesOf(id)[0];
    expect(row.currentStage).toBe("Needs fix");
    expect(row.elig_reason_code).toBe("75");
    const open = myTasks().filter((x) => x.queueId === "insurance-fixes" && x.status !== "completed");
    expect(open).toHaveLength(1);

    // fix the coverage: coverage.updated -> A3 re-runs eligibility with window 0 for future instances
    cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M777", priority: "primary", effectiveDate: "2025-01-01" });
    await wait(200);
    expect((store.getProcessInstanceById(row.instanceId) as any).currentStage).toBe("Verified");
    expect(myTasks().filter((x) => x.queueId === "insurance-fixes" && x.status !== "completed")).toHaveLength(0);
  });

  it("second booking inside the window: new instance, result COPIED (no new payer call); window is per client+coverage", async () => {
    sb.enableDemoSet("E");
    const a = await book(702, "2030-09-10");
    const b = await book(702, "2030-09-12");
    const ra: any = instancesOf(a)[0];
    const rb: any = instancesOf(b)[0];
    expect(ra.instanceId).not.toBe(rb.instanceId);
    expect(ra.elig_history[0].source).toBe("mock");
    expect(rb.elig_history[0].source).toBe("copied");
  });

  it("scenario inactive: instance Inactive, A5 queues an Insurance fixes task", async () => {
    sb.enableDemoSet("E");
    el.setMockScenario("inactive");
    const id = await book(702, "2030-09-04");
    expect((instancesOf(id)[0] as any).currentStage).toBe("Inactive");
    expect(myTasks().filter((x) => x.queueId === "insurance-fixes" && x.status !== "completed")).toHaveLength(1);
  });

  it("Run daily jobs: A2 re-checks visits in the next days (window skips fresh results, so no extra payer call)", async () => {
    sb.enableDemoSet("E");
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const id = await book(702, soon);
    const before = ((instancesOf(id)[0] as any).elig_history || []).length;
    const r = await jobs.runDaily(new Date(), ["upcoming_visits"]);
    await wait(150);
    expect(r.byJob.upcoming_visits).toBeGreaterThanOrEqual(1);
    const after: any = instancesOf(id)[0];
    expect(after.elig_history.length).toBe(before + 1);
    expect(after.elig_history[after.elig_history.length - 1].source).toBe("copied");
  });

  it("A13: checking in re-verifies only when the last check is older than a day (window 0 = real payer call)", async () => {
    sb.enableDemoSet("E");
    const id = await book(702, "2030-09-20");
    const inst: any = instancesOf(id)[0];
    const checks = () => ((store.getProcessInstanceById(inst.instanceId) as any).elig_history as any[]).filter((h) => h.source === "mock" || h.source === "copied");
    const bus = (await import("../eventBus")).eventBus;

    await bus.emit("appointment.checked_in", "appointment", id, { id, clientId: "CL-T" });
    await wait();
    expect(checks()).toHaveLength(1); // checked moments ago: skipped

    store.updateProcessInstanceFields(inst.instanceId, { elig_checked_at: new Date(Date.now() - 3 * 86400000).toISOString() });
    await bus.emit("appointment.checked_in", "appointment", id, { id, clientId: "CL-T" });
    await wait();
    expect(checks()).toHaveLength(2);
    expect(checks()[1].source).toBe("mock");
  });
});
