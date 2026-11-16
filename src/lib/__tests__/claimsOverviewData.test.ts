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
let ov: typeof import("../claimsOverviewData");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let views: typeof import("../taskViewsStore");
let store: typeof import("../processLogsStore");
const W = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
let tpl: any;
function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
}
beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  ov = await import("../claimsOverviewData");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  views = await import("../taskViewsStore");
  store = await import("../processLogsStore");
});
beforeEach(() => {
  fresh();
  claimsLib.__resetClaimMigrationForTests();
  store.__resetInstanceMigrationForTests();
  samples.seedSampleClaimWorkflows();
  tpl = claimsLib.getStoredClaims()[0];
  localStorage.setItem("mantra_claims_v1", "[]");
});
const put = (id: string, stage: string, extra: any = {}) =>
  claimsLib.saveClaim({ ...tpl, id, claimNumber: id, processId: W().claim, currentStageId: samples.claimStageId(W().claim, stage), statusLabel: stage, totalCharge: 100, amountPaid: 0, patientResponsibility: 0, contractualAdjustment: 0, payments: [], denialCategory: undefined, payer: { id: "p", name: "Payer A", payerId: "1", type: "Commercial" }, createdAt: "2031-01-10T00:00:00Z", ...extra });

describe("claims overview data", () => {
  it("groups by stage/workflow/payer and filters by payer and date", () => {
    put("a", "Submitted", { submittedAt: "2031-01-12T00:00:00Z", submissionCount: 1 });
    put("b", "Paid", { amountPaid: 100, submittedAt: "2031-02-02T00:00:00Z", payer: { id: "q", name: "Payer B", payerId: "2", type: "Commercial" } });
    put("c", "Submitted", { denialCategory: "appealable", submittedAt: "2031-02-05T00:00:00Z", submissionCount: 2 });
    const all = ov.buildClaimsOverview({}, Date.parse("2031-03-01"));
    expect(all.total).toBe(3);
    expect(all.claimsByStage.find((s) => s.name === "Submitted")!.value).toBe(2);
    expect(all.claimsByWorkflow.reduce((a, s) => a + s.value, 0)).toBe(3);
    expect(all.payerMix.find((s) => s.name === "Payer B")!.value).toBe(100);
    expect(all.payers).toEqual(["Payer A", "Payer B"]);
    expect(all.denialTrend.map((m) => [m.month, m.rate])).toEqual([["2031-01", null], ["2031-02", 50]]);
    expect(all.firstPassTrend.find((m) => m.month === "2031-02")!.rate).toBe(50);
    expect(all.arAging.reduce((a, b) => a + b.claims, 0)).toBeGreaterThan(0);
    const payerA = ov.buildClaimsOverview({ payer: "Payer A" }, Date.parse("2031-03-01"));
    expect(payerA.total).toBe(2);
    const feb = ov.buildClaimsOverview({ from: "2031-02-01", to: "2031-02-28" }, Date.parse("2031-03-01"));
    expect(feb.total).toBe(2);
  });

  it("eligibility donut and task queues come from instances and Task views", () => {
    views.seedTaskViewSamples();
    const mk = (n: string, s: string) => { const i = store.startProcessInstance({ clientId: "C", clientName: "C", processName: "P", stageName: "x", source: { type: "appointment", id: n } }).instance; store.updateProcessInstanceFields(i.instanceId!, { elig_status: s }); };
    mk("1", "active"); mk("2", "active"); mk("3", "not_found"); mk("4", "inactive"); mk("5", "pending_review");
    const d = ov.buildClaimsOverview({}, Date.now());
    expect(Object.fromEntries(d.eligibility.map((e) => [e.name, e.value]))).toEqual({ Verified: 2, "Needs fix": 1, Inactive: 1, Inconclusive: 1 });
    expect(d.queues).toHaveLength(8);
    expect(d.queues.every((q) => !q.name.includes("Sample"))).toBe(true);
  });
});
