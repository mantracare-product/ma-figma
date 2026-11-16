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
let r4: typeof import("../rcmDefaultsR4");
let claimSvc: typeof import("../claimService");
let claimsLib: typeof import("../claimsStore");
let kpis: typeof import("../rcmKpis");
let ov: typeof import("../claimsOverviewData");
let rep: typeof import("../rcmReportSources");
let tasks: typeof import("../tasksStore");
let rw: typeof import("../recordWriter");
let samples: typeof import("../rcmSampleClaimWorkflows");
let wf: typeof import("../claimWorkflows");

beforeAll(async () => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window = { localStorage: (globalThis as any).localStorage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  await import("../ruleEngine");
  r4 = await import("../rcmDefaultsR4");
  claimSvc = await import("../claimService");
  claimsLib = await import("../claimsStore");
  kpis = await import("../rcmKpis");
  ov = await import("../claimsOverviewData");
  rep = await import("../rcmReportSources");
  tasks = await import("../tasksStore");
  rw = await import("../recordWriter");
  samples = await import("../rcmSampleClaimWorkflows");
  wf = await import("../claimWorkflows");
});
beforeEach(() => {
  localStorage.clear();
  samples.seedSampleClaimWorkflows();
  r4.seedInsuranceRecordDefaults();
});

const base = (id: string, extra: any = {}): any => ({ id, claimNumber: id, patientId: "P", patientName: "Pat", patientDob: "", patientGender: "Other", patientAddress: "", patientPhone: "", insuredId: "", payer: { id: "p", name: "Payer", payerId: "1", type: "Commercial" }, renderingProviderName: "", renderingProviderNpi: "", billingProviderName: "", billingProviderNpi: "", placeOfService: "", serviceDate: "2031-01-01", diagnosisCodes: [], lines: [], totalCharge: 100, amountPaid: 0, status: "Draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra });

describe("pre-claim records stay out of claim numbers (by workflow type, not name)", () => {
  it("counts, A/R, denial rate and the claims report exclude Eligibility / Prior auth records; the eligibility report reads the Eligibility workflow", () => {
    const W = samples.SAMPLE_CLAIM_WORKFLOW_IDS;
    const seeded = kpis.rcmKpis().claimsTotal; // the store starts with its own claims
    claimSvc.claimService.create(base("c1", { amountPaid: 80 }), W.claim, undefined);
    claimSvc.claimService.create(base("c2", { denialCategory: "appealable" }), W.denial, undefined);
    const e1 = claimSvc.claimService.create(base("e1", { appointmentId: "1" }), r4.ELIGIBILITY_WORKFLOW_ID, undefined);
    claimSvc.claimService.create(base("e2", { appointmentId: "2" }), r4.PRIOR_AUTH_WORKFLOW_ID, undefined);
    rw.writeRecordFields({ type: "claim", id: e1.id }, { elig_status: "active", elig_payer: "BCBS", elig_copay: 30 });

    expect(claimsLib.getStoredClaims().filter((c) => c.id.startsWith("e"))).toHaveLength(2);
    expect(kpis.rcmKpis().claimsTotal).toBe(seeded + 2);
    expect(ov.buildClaimsOverview().total).toBe(seeded + 2);
    const ids = rep.buildRcmReportRows("claims").map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["c1", "c2"]));
    expect(ids.some((i) => String(i).startsWith("e") && String(i).length === 2)).toBe(false);
    expect(rep.buildRcmReportRows("ar_aging").every((r) => !String(r.id).startsWith("e"))).toBe(true);
    const el = rep.buildRcmReportRows("eligibility");
    expect(el).toHaveLength(1);
    expect(el[0]).toMatchObject({ status: "active", payer: "BCBS", copay: 30 });
    expect(ov.buildClaimsOverview().eligibility.find((s) => s.name === "Verified")?.value).toBe(1);
    expect(kpis.rcmKpis().eligibilityChecked).toBe(1);
    // decided by type: renaming the workflow changes nothing
    expect(wf.isPreClaimWorkflow(wf.getClaimWorkflow(r4.ELIGIBILITY_WORKFLOW_ID))).toBe(true);
    expect(wf.isPreClaimWorkflow(wf.getClaimWorkflow(W.claim))).toBe(false);
  });

  it("a task linked to the record (entityRef claim + stage) closes itself when the record leaves that stage", () => {
    const rec = claimSvc.claimService.create(base("e3", { appointmentId: "3" }), r4.ELIGIBILITY_WORKFLOW_ID, undefined);
    const stage = wf.getClaimWorkflow(r4.ELIGIBILITY_WORKFLOW_ID)!.stages.find((s) => s.name === "Needs fix")!;
    claimSvc.claimService.moveToStage(rec.id, stage.id, { type: "manual" });
    const t = tasks.createTaskRecord({ title: "Fix", description: "", status: "pending", isImportant: false, scopeLevel: "client", assignee: { scopeLevel: "client", assigneeName: "x" }, creator: { id: "u", name: "u" }, checklists: [], observers: [], subtasks: [], attachments: [], queueId: "insurance-fixes", entityRef: { type: "claim", id: rec.id, stageId: stage.id, stageName: stage.name } } as any);
    const eligible = wf.getClaimWorkflow(r4.ELIGIBILITY_WORKFLOW_ID)!.stages.find((s) => s.name === "Eligible")!;
    claimSvc.claimService.moveToStage(rec.id, eligible.id, { type: "manual" });
    expect(tasks.getStoredTasks().find((x) => x.id === t.id)!.status).toBe("completed");
    expect(tasks.getStoredTasks().find((x) => x.id === t.id)!.closedBy).toBe("auto:stage_exit");
  });
});
