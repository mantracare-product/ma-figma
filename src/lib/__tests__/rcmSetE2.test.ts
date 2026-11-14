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
let auth: typeof import("../authActions");
let jobs: typeof import("../rcmJobs");
let notifs: typeof import("../notificationsStore");
let toggles: typeof import("../rcmNotificationSettings");
let runs: typeof import("../actionRuns");
let el: typeof import("../eligibility");

const wait = (ms = 200) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const ymd = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

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
  store = await import("../processLogsStore");
  cov = await import("../coveragesStore");
  appts = await import("../appointmentService");
  tasks = await import("../tasksStore");
  auth = await import("../authActions");
  jobs = await import("../rcmJobs");
  notifs = await import("../notificationsStore");
  toggles = await import("../rcmNotificationSettings");
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
  const svc = [{ id: 701, name: "MRI brain", description: "", cptCode: "70553", duration: 30, price: 1, currency: "USD", isActive: true }];
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svc));
  sb.loadSampleTemplates();
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
});

async function bookWithAuth(daysAhead: number) {
  const a: any = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 701, date: ymd(daysAhead), time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  const id = String(a.id ?? a.appointment?.id);
  await wait();
  const inst = store.getProcessInstances().find((i) => i.source?.type === "appointment" && String(i.source.id) === id && i.processId === "proc-sample-coverage-auth")!;
  return { id, inst };
}
const myTasks = () => tasks.getStoredTasks().filter((t) => !!t.entityRef && t.queueId === "prior-auth");

describe("Set E2 (A11, A12)", () => {
  it("loads disabled; Enable demo set E2 turns on both; nothing else is switched on", () => {
    expect(sb.getSampleSetStatus("E2")).toMatchObject({ loaded: 2, total: 2, enabled: 0 });
    expect(sb.enableDemoSet("E2")).toBe(2);
    expect(sb.getSampleSetStatus("E")!.enabled).toBe(0);
  });

  it("A11: an approved authorization expiring within 14 days is renewed (new request starting today) and a Prior auth task is queued", async () => {
    sb.enableDemoSet("E");
    const { id, inst } = await bookWithAuth(20);
    // approve it with a validity that runs out in 10 days
    auth.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "AUTH-1", unitsApproved: 1 });
    store.updateProcessInstanceFields(inst.instanceId!, { auth_valid_to: ymd(10) });
    sb.disableDemoSet("E"); // only the renewal job should act now
    sb.enableDemoSet("E2");
    const before: any = store.getProcessInstanceById(inst.instanceId!);
    expect(before.auth_status).toBe("approved");

    await jobs.runDaily(new Date(), ["instance_visit_countdown"]);
    await wait(400);
    const row: any = store.getProcessInstanceById(inst.instanceId!);
    expect(row.auth_status).toBe("requested");
    expect(row.auth_valid_from).toBe(ymd(0));
    expect(myTasks().filter((t) => t.status !== "completed")).toHaveLength(1);
  });

  it("A11 does not fire for an authorization with plenty of time and units left", async () => {
    sb.enableDemoSet("E");
    const { id, inst } = await bookWithAuth(20);
    auth.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "AUTH-2", unitsApproved: 10 });
    store.updateProcessInstanceFields(inst.instanceId!, { auth_valid_to: ymd(60), auth_units_used: 1 });
    sb.disableDemoSet("E");
    sb.enableDemoSet("E2");
    await jobs.runDaily(new Date(), ["instance_visit_countdown"]);
    await wait(300);
    expect((store.getProcessInstanceById(inst.instanceId!) as any).auth_status).toBe("approved");
  });

  it("A11 also fires at 80% of units used", async () => {
    sb.enableDemoSet("E");
    const { id, inst } = await bookWithAuth(20);
    auth.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "AUTH-3", unitsApproved: 10 });
    store.updateProcessInstanceFields(inst.instanceId!, { auth_valid_to: ymd(90), auth_units_used: 8 });
    sb.disableDemoSet("E");
    sb.enableDemoSet("E2");
    await jobs.runDaily(new Date(), ["instance_visit_countdown"]);
    await wait(400);
    expect((store.getProcessInstanceById(inst.instanceId!) as any).auth_status).toBe("requested");
  });

  it("A12: visit in 2 days with the authorization still only requested notifies; the per-event toggle silences it", async () => {
    sb.enableDemoSet("E");
    await bookWithAuth(2); // A10 leaves auth_status = requested
    sb.disableDemoSet("E");
    sb.enableDemoSet("E2");
    const count = () => notifs.getStoredNotifications().filter((n) => n.title === "Authorization not approved").length;
    const c0 = count();
    await jobs.runDaily(new Date(), ["instance_visit_countdown"]);
    await wait(300);
    expect(count()).toBe(c0 + 1);

    toggles.setRcmNotificationEnabled("sample-rule-A12", false);
    expect(toggles.isRcmNotificationEnabled("sample-rule-A12")).toBe(false);
    runs.__resetActionRunsForTests(); // a new day: the idempotency keys of the first run no longer apply
    await jobs.runDaily(new Date(Date.now() + 1000), ["instance_visit_countdown"]);
    await wait(300);
    expect(count()).toBe(c0 + 1); // silenced

    toggles.setRcmNotificationEnabled("sample-rule-A12", true);
    expect(toggles.isRcmNotificationEnabled("sample-rule-A12")).toBe(true);
  });
});

describe("recordAuthDecision", () => {
  it("writes the decision to the instance (+history) and the appointment, optionally moving the instance", async () => {
    sb.enableDemoSet("E");
    const { id, inst } = await bookWithAuth(10);
    const r = auth.recordAuthDecision({ instanceId: inst.instanceId, appointmentId: id, decision: "approved", authNumber: "AUTH-9", unitsApproved: 3, stage: "Verified" });
    expect(r.stageMoved).toBe("Verified");
    const row: any = store.getProcessInstanceById(inst.instanceId!);
    expect(row).toMatchObject({ auth_status: "approved", auth_number: "AUTH-9", auth_units_approved: 3, currentStage: "Verified" });
    expect(row.elig_history.some((h: any) => h.source === "prior_auth_decision")).toBe(true);
    expect(JSON.parse(localStorage.getItem(`mantra_appt_fields_${id}`)!)).toMatchObject({ auth_status: "approved", auth_number: "AUTH-9" });
    expect(() => auth.recordAuthDecision({ decision: "approved" })).toThrow(/no record/);
  });
});
