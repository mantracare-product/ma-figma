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

let rep: typeof import("../rcmReportSources");
let kpi: typeof import("../rcmKpis");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let views: typeof import("../taskViewsStore");
let tasks: typeof import("../tasksStore");
let store: typeof import("../processLogsStore");
let engine: typeof import("../reportEngine");
let tpl: any;

const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
const NOW = Date.parse("2031-03-01T12:00:00Z");
const DAY = 86400000;

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  rep = await import("../rcmReportSources");
  kpi = await import("../rcmKpis");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  views = await import("../taskViewsStore");
  tasks = await import("../tasksStore");
  store = await import("../processLogsStore");
  engine = await import("../reportEngine");
});
beforeEach(() => {
  fresh();
  claimsLib.__resetClaimMigrationForTests();
  store.__resetInstanceMigrationForTests();
  samples.seedSampleClaimWorkflows();
  tpl = claimsLib.getStoredClaims()[0];
  localStorage.setItem("mantra_claims_v1", "[]"); // start every test with no claims
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [] }]));
});

const stage = (n: string) => ({ currentStageId: samples.claimStageId(W().claim, n), statusLabel: n });
function put(id: string, extra: any) {
  const base: any = tpl;
  claimsLib.saveClaim({ ...base, id, claimNumber: `CLM-${id}`, patientId: "CL-T", patientName: "Test Patient", totalCharge: 100, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [], processId: W().claim, payer: { id: "p1", name: "Payer One", payerId: "1", type: "Commercial" }, denialCategory: undefined, ...extra });
}

describe("RCM report sources", () => {
  it("are registered in the report builder metadata with fields and a date field", () => {
    for (const s of rep.RCM_REPORT_SOURCES) {
      const meta = engine.DATA_SOURCE_METADATA[s];
      expect(meta, s).toBeTruthy();
      expect(meta.fields.length).toBeGreaterThan(3);
      expect(meta.primaryDateField).toBeTruthy();
    }
    expect(rep.isRcmReportSource("claims")).toBe(true);
    expect(rep.isRcmReportSource("calls")).toBe(false);
  });

  it("claims / denials / payments / ar_aging rows reflect the stores (denial rate by payer = average of the 1/0 denied field)", () => {
    put("paid", { ...stage("Paid"), status: "Paid", amountPaid: 100, submittedAt: new Date(NOW - 10 * DAY).toISOString(), payments: [{ id: "p", eraId: "e", traceNumber: "T1", amount: 100, date: "2031-02-20" }] });
    put("den", { ...stage("Submitted"), status: "Submitted", submittedAt: new Date(NOW - 50 * DAY).toISOString(), denialCategory: "appealable", denialCodes: ["CO-97"], denialSummary: "Bundled", denialNext: "appeal", appealDeadline: "2031-03-11" });
    put("wait", { ...stage("Submitted"), status: "Submitted", submittedAt: new Date(NOW - 95 * DAY).toISOString() });

    const claims = rep.buildRcmReportRows("claims", NOW);
    expect(claims.map((r) => r.id).sort()).toEqual(expect.arrayContaining(["den", "paid", "wait"]));
    const mine = claims.filter((r) => ["den", "paid", "wait"].includes(r.id));
    expect(mine.reduce((a, r) => a + r.denied, 0) / mine.length).toBeCloseTo(1 / 3, 5);

    const denials = rep.buildRcmReportRows("denials", NOW);
    expect(denials).toHaveLength(1);
    expect(denials[0]).toMatchObject({ id: "den", category: "appealable", codes: "CO-97", daysToDeadline: 10 });

    const pays = rep.buildRcmReportRows("payments", NOW);
    expect(pays).toEqual([expect.objectContaining({ claimNumber: "CLM-paid", amount: 100, trace: "T1" })]);

    const ar = rep.buildRcmReportRows("ar_aging", NOW);
    expect(ar.find((r) => r.id === "wait")).toMatchObject({ bucket: "90+", outstanding: 100 });
    expect(ar.find((r) => r.id === "den")).toMatchObject({ bucket: "31-60" });
    expect(ar.some((r) => r.id === "paid")).toBe(false);
  });

  it("eligibility rows come from instances that carry a result", () => {
    const { instance } = store.startProcessInstance({ clientId: "CL-T", clientName: "Test Patient", processName: "Cov", stageName: "Verified", source: { type: "appointment", id: "1" } });
    store.updateProcessInstanceFields(instance.instanceId!, { elig_status: "active", elig_payer: "Payer One", elig_copay: 30, elig_checked_at: "2031-02-27T10:00:00Z" });
    const rows = rep.buildRcmReportRows("eligibility", NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ client: "Test Patient", status: "active", payer: "Payer One", copay: 30, date: "2031-02-27" });
  });

  it("aging buckets", () => {
    expect([rep.agingBucket(0), rep.agingBucket(30), rep.agingBucket(31), rep.agingBucket(61), rep.agingBucket(91)]).toEqual(["0-30", "0-30", "31-60", "61-90", "90+"]);
  });
});

describe("Overview RCM numbers", () => {
  it("queue counts come from the Task saved views (open + overdue + amount at stake)", () => {
    views.seedTaskViewSamples();
    const mk = (id: string, queueId: string, extra: any = {}): any => ({ id, code: id, title: id, status: "pending", queueId, ...extra });
    const list = [
      mk("a", "claim-fixes", { dueAt: "2031-02-01T00:00:00Z", amountAtStake: 120 }),
      mk("b", "claim-fixes", { dueAt: "2031-04-01T00:00:00Z", amountAtStake: 80 }),
      mk("c", "claim-fixes", { status: "completed" }),
      mk("d", "posting"),
    ];
    const q = kpi.queueCounts(NOW, list as any);
    expect(q).toHaveLength(8);
    expect(q.find((x) => x.name.startsWith("Claim fixes"))).toMatchObject({ open: 2, overdue: 1, amountAtStake: 200 });
    expect(q.find((x) => x.name.startsWith("Posting"))).toMatchObject({ open: 1, overdue: 0 });
    void tasks;
  });

  it("KPIs: denial rate, A/R, days in A/R, first pass, eligibility verified rate; nulls when there is no data", () => {
    expect(kpi.rcmKpis(NOW)).toMatchObject({ denialRate: null, avgDaysInAr: null, firstPassRate: null, eligibilityVerifiedRate: null });
    put("paid", { ...stage("Paid"), status: "Paid", amountPaid: 100, submittedAt: new Date(NOW - 5 * DAY).toISOString(), submissionCount: 1 });
    put("den", { ...stage("Submitted"), status: "Submitted", submittedAt: new Date(NOW - 20 * DAY).toISOString(), submissionCount: 2, denialCategory: "appealable" });
    put("wait", { ...stage("Submitted"), status: "Submitted", submittedAt: new Date(NOW - 40 * DAY).toISOString(), submissionCount: 1 });
    const k = kpi.rcmKpis(NOW);
    expect(k.claimsTotal).toBe(3);
    expect(k.denialRate).toBeCloseTo(0.5, 5); // 1 denied of 2 decided (paid + denied)
    expect(k.avgDaysInAr).toBeCloseTo(40, 1);
    expect(k.firstPassRate).toBeCloseTo(2 / 3, 5);
    const a = store.startProcessInstance({ clientId: "CL-T", clientName: "T", processName: "Cov", stageName: "x", source: { type: "appointment", id: "a" } }).instance;
    const b = store.startProcessInstance({ clientId: "CL-T", clientName: "T", processName: "Cov", stageName: "x", source: { type: "appointment", id: "b" } }).instance;
    store.updateProcessInstanceFields(a.instanceId!, { elig_status: "active" });
    store.updateProcessInstanceFields(b.instanceId!, { elig_status: "not_found" });
    expect(kpi.rcmKpis(NOW)).toMatchObject({ eligibilityChecked: 2, eligibilityVerifiedRate: 0.5 });
  });
});
