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
let vb: typeof import("../voiceBenefits");
let csc: typeof import("../claimStatusAndCalls");
let voiceCtx: typeof import("../ruleContextFields");
let runs: typeof import("../actionRuns");
let el: typeof import("../eligibility");

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

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
  vb = await import("../voiceBenefits");
  csc = await import("../claimStatusAndCalls");
  voiceCtx = await import("../ruleContextFields");
  runs = await import("../actionRuns");
  el = await import("../eligibility");
});

beforeEach(() => {
  fresh();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  el.setMockScenario("auto");
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", contactType: "Client", stage: "x", processes: [], dob: "1980-01-01", consents: { voice: true } }]));
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  const svc = [{ id: 702, name: "Office visit", description: "", cptCode: "99214", duration: 30, price: 1, currency: "USD", isActive: true }];
  for (const k of ["ma_services_store", "ma_services_demo", "ma_services_store_signup"]) localStorage.setItem(k, JSON.stringify(svc));
  sb.loadSampleTemplates();
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "M100", priority: "primary", effectiveDate: "2025-01-01" });
});

async function bookWithInconclusive() {
  // a member id that makes the payer unreachable after retries -> Inconclusive
  cov.saveCoverage({ clientId: "CL-T", payerId: "payer-bcbs", memberId: "DOWNDOWNDOWN", priority: "primary", effectiveDate: "2025-01-01" });
  await wait(50);
  const a: any = appts.appointmentService.createAppointment(
    { clientName: "Test Patient", clientEmail: "t@x.com", clientPhone: "1", employeeId: 1, serviceId: 702, date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), time: "10:00", duration: 30, clientId: "CL-T" } as any,
    { force: true, createdBy: "user" } as any
  );
  const id = String(a.id ?? a.appointment?.id);
  await wait(500);
  const inst = store.getProcessInstances().find((i) => i.source?.type === "appointment" && String(i.source.id) === id && i.processId === "proc-sample-coverage-auth")!;
  return { id, inst };
}

describe("voice results into an instance (S6.4)", () => {
  it("A7 (voice on): an Inconclusive instance gets a mock payer call whose benefits land as PENDING REVIEW; accepting makes them the verified result", async () => {
    sb.enableDemoSet("E");
    localStorage.setItem(voiceCtx.VOICE_ENABLED_KEY, "1");
    const { id, inst } = await bookWithInconclusive();
    await wait(400);
    const row: any = store.getProcessInstanceById(inst.instanceId!);
    expect(row.currentStage).toBe("Pending review");
    expect(row).toMatchObject({ elig_status: "pending_review", elig_source: "voice", elig_copay: 30 });
    expect(row.voice_call_id).toBeTruthy();
    expect(row.elig_history.some((h: any) => h.source === "voice")).toBe(true);
    expect(csc.rcmCallsStore.get().filter((c) => c.purpose === "payer_benefits")).toHaveLength(1);
    // no Benefits-to-verify task: A8 is for voice OFF
    expect(tasks.getStoredTasks().filter((t) => t.queueId === "benefits-to-verify")).toHaveLength(0);

    const accepted = vb.acceptCallResult({ instanceId: inst.instanceId!, stage: "Verified" });
    expect(accepted.stageMoved).toBe("Verified");
    const after: any = store.getProcessInstanceById(inst.instanceId!);
    expect(after).toMatchObject({ elig_status: "active", currentStage: "Verified" });
    expect(after.elig_history.some((h: any) => h.source === "voice_accepted")).toBe(true);
    expect((appts.appointmentService.getAppointmentById(id) as any).coverage).toMatchObject({ status: "active", instanceId: inst.instanceId });
  });

  it("voice OFF: the same Inconclusive instance gets the Benefits to verify task instead (A8), no call", async () => {
    sb.enableDemoSet("E");
    const { inst } = await bookWithInconclusive();
    await wait(400);
    expect((store.getProcessInstanceById(inst.instanceId!) as any).currentStage).toBe("Inconclusive");
    expect(csc.rcmCallsStore.get()).toHaveLength(0);
    expect(tasks.getStoredTasks().filter((t) => t.queueId === "benefits-to-verify" && t.status !== "completed")).toHaveLength(1);
  });

  it("accepting is refused when there is nothing to review", () => {
    const { instance } = store.startProcessInstance({ clientId: "CL-T", clientName: "T", processName: "Cov", stageName: "x", source: { type: "appointment", id: "z" } });
    expect(() => vb.acceptCallResult({ instanceId: instance.instanceId! })).toThrow(/no call result/);
    expect(() => vb.acceptCallResult({ instanceId: "nope" })).toThrow(/not found/);
  });

  it("a payer-benefits call without an instance only records the call", () => {
    const r = csc.performStartCall({ purpose: "payer_benefits", clientId: "CL-T", voiceConsent: false, recordType: "client", recordId: "CL-T" });
    expect(r).toMatchObject({ status: "completed", mock: true });
  });
});
