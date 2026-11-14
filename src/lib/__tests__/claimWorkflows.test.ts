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

let pstore: typeof import("../useProcessStore");
let wf: typeof import("../claimWorkflows");
let samples: typeof import("../rcmSampleClaimWorkflows");
let claims: typeof import("../claimsStore");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  pstore = await import("../useProcessStore");
  wf = await import("../claimWorkflows");
  samples = await import("../rcmSampleClaimWorkflows");
  claims = await import("../claimsStore");
});
beforeEach(() => {
  fresh();
  claims.__resetClaimMigrationForTests();
});

describe("claim workflows persist (several allowed)", () => {
  it("claim processes survive a reload (they used to be deleted on every load)", () => {
    expect(samples.seedSampleClaimWorkflows()).toBe(3);
    const loaded = pstore.getStoredProcesses().filter((p) => p.entityType === "claim");
    const ids = loaded.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(Object.values(samples.SAMPLE_CLAIM_WORKFLOW_IDS)));
    expect(wf.getClaimWorkflows().length).toBeGreaterThanOrEqual(3);
    expect(samples.seedSampleClaimWorkflows()).toBe(0); // idempotent
  });

  it("a clinic-added claim workflow is kept alongside the others", () => {
    const list = pstore.getStoredProcesses();
    const mine: any = { id: "proc-mine", name: "My claim flow", description: "", assignedToUserId: 1, entityType: "claim", aiSettings: {} as any, stages: [{ id: "a", name: "A", description: "", status: "active" }] };
    pstore.saveStoredProcesses([...list, mine]);
    expect(wf.getClaimWorkflow("proc-mine")?.name).toBe("My claim flow");
  });
});

describe("per-process required categories", () => {
  it("only the workflow's own list is required; the default claim list is empty", () => {
    samples.seedSampleClaimWorkflows();
    const claimWf: any = wf.getClaimWorkflow(samples.SAMPLE_CLAIM_WORKFLOW_IDS.claim);
    const capture: any = wf.getClaimWorkflow(samples.SAMPLE_CLAIM_WORKFLOW_IDS.chargeCapture);
    expect(pstore.isRequiredSystemCategory("claim", "submitted", claimWf)).toBe(true);
    expect(pstore.isRequiredSystemCategory("claim", "paid", claimWf)).toBe(true);
    expect(pstore.isRequiredSystemCategory("claim", "draft", claimWf)).toBe(false);
    expect(pstore.isRequiredSystemCategory("claim", "submitted", capture)).toBe(false);
    expect(pstore.isRequiredSystemCategory("claim", "submitted")).toBe(false);
    expect(pstore.isRequiredSystemCategory("appointment", "booked")).toBe(true); // other entities unchanged
  });
});

describe("claim status derives from the stage category", () => {
  it("mapped categories give a status, no category gives Unmapped", () => {
    samples.seedSampleClaimWorkflows();
    const w: any = wf.getClaimWorkflow(samples.SAMPLE_CLAIM_WORKFLOW_IDS.claim);
    expect(wf.claimStatusForStage(wf.findStage(w, "Submitted"))).toBe("Submitted");
    expect(wf.claimStatusForStage(wf.findStage(w, "Paid"))).toBe("Paid");
    expect(wf.claimStatusForStage(wf.findStage(w, "Closed"))).toBe("Unmapped");
    expect(wf.claimStatusForStage(undefined)).toBe("Unmapped");
    expect(wf.claimStatusForStage({ id: "x", name: "x", description: "", status: "active" } as any)).toBe("Unmapped");
  });
});

describe("migration: every claim gets a workflow and a valid stage", () => {
  it("assigns the first workflow, keeps a valid stage, maps by name, else initial; idempotent", () => {
    const first: any = wf.getClaimWorkflows()[0];
    const stageIn = first.stages[1];
    const legacy = [
      { id: "c1", currentStageId: stageIn.id },
      { id: "c2", statusLabel: first.stages[0].name },
      { id: "c3", currentStageId: "ins-3-old", statusLabel: "Nonexistent" },
      { id: "c4", processId: "already-set", currentStageId: "z" },
    ] as any[];
    const r1 = wf.assignClaimsToWorkflows(legacy, [first]);
    expect(r1.changed).toBe(true);
    const by = (id: string) => r1.claims.find((c) => c.id === id)!;
    expect(by("c1")).toMatchObject({ processId: first.id, currentStageId: stageIn.id });
    expect(by("c2")).toMatchObject({ processId: first.id, currentStageId: first.stages[0].id });
    expect(by("c3")).toMatchObject({ processId: first.id, currentStageId: wf.initialStageOf(first)!.id });
    expect(by("c4")).toMatchObject({ processId: "already-set", currentStageId: "z" });
    expect(wf.assignClaimsToWorkflows(r1.claims, [first]).changed).toBe(false);
  });

  it("getStoredClaims runs the migration once and persists processId on the seed claim", () => {
    const list = claims.getStoredClaims();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => !!c.processId)).toBe(true);
    expect(localStorage.getItem(claims.CLAIMS_SCHEMA_FLAG)).toBe("1");
    const again = claims.getStoredClaims();
    expect(again.map((c) => c.processId)).toEqual(list.map((c) => c.processId));
  });
});
