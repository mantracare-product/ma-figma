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

let svc: typeof import("../claimService");
let claimsLib: typeof import("../claimsStore");
let samples: typeof import("../rcmSampleClaimWorkflows");
let wf: typeof import("../claimWorkflows");
let auto: typeof import("../useAutomationStore");
let mtw: typeof import("../moveToWorkflowAction");
let runs: typeof import("../actionRuns");
let bus: typeof import("../eventBus");

const rule: any = { id: "R-mtw", name: "Move" };
const cause: any = { type: "rule", ruleId: "R-mtw" };
const IDS = () => samples.SAMPLE_CLAIM_WORKFLOW_IDS;
const stageId = (proc: string, name: string) => samples.claimStageId(proc, name);
const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  svc = await import("../claimService");
  claimsLib = await import("../claimsStore");
  samples = await import("../rcmSampleClaimWorkflows");
  wf = await import("../claimWorkflows");
  auto = await import("../useAutomationStore");
  mtw = await import("../moveToWorkflowAction");
  runs = await import("../actionRuns");
  bus = await import("../eventBus");
});

let seen: any[] = [];
beforeEach(() => {
  fresh();
  runs.__resetActionRunsForTests();
  claimsLib.__resetClaimMigrationForTests();
  samples.seedSampleClaimWorkflows();
  seen = [];
  bus.eventBus.subscribeAll((e) => void seen.push(e));
  // one claim in the sample "Claim / Draft" stage with some values
  const base: any = claimsLib.getStoredClaims()[0];
  claimsLib.saveClaim({
    ...base, id: "clm-T", patientId: "CL-T", processId: IDS().claim, currentStageId: stageId(IDS().claim, "Draft"), statusLabel: "Draft", status: "Draft", totalCharge: 295, authNumber: "A-1",
  });
});

describe("claimService: the one door", () => {
  it("moveToStage saves, derives status from the stage category, logs ONE move and emits claim.<category>", async () => {
    const r = svc.claimService.moveToStage("clm-T", stageId(IDS().claim, "Submitted"), { type: "manual" })!;
    await wait();
    expect(r.moved).toBe(true);
    const c = claimsLib.getStoredClaims().find((x) => x.id === "clm-T")!;
    expect(c).toMatchObject({ statusLabel: "Submitted", status: "Submitted", currentStageId: stageId(IDS().claim, "Submitted") });
    const entered = seen.filter((e) => e.event === "stage.entered" && e.recordId === "clm-T");
    const exited = seen.filter((e) => e.event === "stage.exited" && e.recordId === "clm-T");
    expect(entered).toHaveLength(1);
    expect(exited).toHaveLength(1);
    expect(exited[0].data.processId).toBe(IDS().claim);
    expect(seen.filter((e) => e.event === "claim.submitted")).toHaveLength(1);
  });

  it("a stage without a category maps to Unmapped and emits no claim.* event", async () => {
    svc.claimService.moveToStage("clm-T", stageId(IDS().claim, "Closed"), { type: "manual" });
    await wait();
    expect(claimsLib.getStoredClaims().find((x) => x.id === "clm-T")!.status).toBe("Unmapped");
    expect(seen.filter((e) => e.event.startsWith("claim.") && e.event !== "claim.closed")).toHaveLength(0);
  });

  it("moving to the stage it is already in is a no-op (no events)", async () => {
    const r = svc.claimService.moveToStage("clm-T", stageId(IDS().claim, "Draft"), { type: "manual" })!;
    await wait();
    expect(r.moved).toBe(false);
    expect(seen.filter((e) => e.event === "stage.entered" && e.recordId === "clm-T")).toHaveLength(0);
  });

  it("unknown stage or workflow throws", () => {
    expect(() => svc.claimService.moveToStage("clm-T", "nope")).toThrow(/not found/);
    expect(() => svc.claimService.moveToWorkflow("clm-T", "nope")).toThrow(/not found/);
    expect(svc.claimService.moveToStage("missing", "x")).toBeNull();
  });
});

describe("move to workflow", () => {
  it("keeps all values, lands on the initial stage, and the exit event carries the FROM workflow", async () => {
    const r = svc.claimService.moveToWorkflow("clm-T", IDS().denial, undefined, cause)!;
    await wait();
    expect(r).toMatchObject({ moved: true, fromWorkflowId: IDS().claim, toWorkflowId: IDS().denial, stageName: "New denial" });
    const c: any = claimsLib.getStoredClaims().find((x) => x.id === "clm-T")!;
    expect(c).toMatchObject({ processId: IDS().denial, totalCharge: 295, authNumber: "A-1", status: "Denied" });
    const exit = seen.find((e) => e.event === "stage.exited" && e.recordId === "clm-T");
    const enter = seen.find((e) => e.event === "stage.entered" && e.recordId === "clm-T");
    expect(exit.data.processId).toBe(IDS().claim);
    expect(exit.data.toProcessId).toBe(IDS().denial);
    expect(enter.data.processId).toBe(IDS().denial);
    expect(seen.some((e) => e.event === "claim.denied")).toBe(true);
  });

  it("Undo puts the claim back in its previous workflow AND stage", () => {
    svc.claimService.moveToWorkflow("clm-T", IDS().denial, undefined, { type: "manual" });
    const move = auto.getStoredStageMoves().find((m) => m.recordId === "clm-T" && m.processId === IDS().denial)!;
    expect(move).toBeTruthy();
    expect(auto.undoStageMove(move.id)).toBe(true);
    const c = claimsLib.getStoredClaims().find((x) => x.id === "clm-T")!;
    expect(c).toMatchObject({ processId: IDS().claim, currentStageId: stageId(IDS().claim, "Draft"), status: "Draft" });
  });
});

describe("move_to_workflow action", () => {
  const ev = (id = "E1"): any => ({ id, event: "claim.denied", recordType: "claim", recordId: "clm-T", data: {}, timestamp: "" });

  it("moves the claim, accepts the workflow by name, and a repeat to the same place is a no-op", () => {
    const r1 = mtw.executeMoveToWorkflowStep({ rule, stepId: "s", params: { workflowId: "Denial & appeal (Sample)" }, event: ev("E1"), cause });
    expect(r1.status).toBe("success");
    expect(r1.result).toMatchObject({ moved: true, workflowId: IDS().denial });
    const r2 = mtw.executeMoveToWorkflowStep({ rule, stepId: "s", params: { workflowId: IDS().denial }, event: ev("E2"), cause });
    expect(r2.status).toBe("success");
    expect(r2.result.moved).toBe(false);
  });

  it("moving back and forth works (the idempotency key includes the event)", () => {
    mtw.executeMoveToWorkflowStep({ rule, stepId: "s", params: { workflowId: IDS().denial }, event: ev("E1"), cause });
    mtw.executeMoveToWorkflowStep({ rule, stepId: "s2", params: { workflowId: IDS().claim, stageName: "Ready to submit" }, event: ev("E2"), cause });
    expect(claimsLib.getStoredClaims().find((x) => x.id === "clm-T")).toMatchObject({ processId: IDS().claim, statusLabel: "Ready to submit", status: "Ready to Submit" });
    mtw.executeMoveToWorkflowStep({ rule, stepId: "s", params: { workflowId: IDS().denial }, event: ev("E3"), cause });
    expect(claimsLib.getStoredClaims().find((x) => x.id === "clm-T")!.processId).toBe(IDS().denial);
  });

  it("records failures: no workflow, unknown workflow, not a claim", () => {
    expect(mtw.executeMoveToWorkflowStep({ rule, stepId: "a", params: {}, event: ev("F1"), cause }).status).toBe("failed");
    expect(mtw.executeMoveToWorkflowStep({ rule, stepId: "b", params: { workflowId: "nope" }, event: ev("F2"), cause }).status).toBe("failed");
    expect(mtw.executeMoveToWorkflowStep({ rule, stepId: "c", params: { workflowId: IDS().denial }, event: { ...ev("F3"), recordType: "client", recordId: "CL-T" }, cause }).status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(3);
  });
});

describe("workflow claims in the engine (rule top-level move across workflows)", () => {
  it("a stage rule whose target process is another claim workflow moves the claim there", async () => {
    await import("../ruleEngine");
    const now = new Date().toISOString();
    auto.saveStoredRules([
      {
        id: "r-claim-move", orgId: "default", name: "Denied -> denial workflow", entityType: "claim",
        trigger: { event: "claim.denied" },
        action: { type: "moveToStage", processId: IDS().denial, stageId: stageId(IDS().denial, "Correct & resubmit") },
        actions: [], enabled: true, createdAt: now, updatedAt: now,
      } as any,
    ]);
    await bus.eventBus.emit("claim.denied", "claim", "clm-T", { claimId: "clm-T" });
    await wait(80);
    expect(claimsLib.getStoredClaims().find((x) => x.id === "clm-T")).toMatchObject({ processId: IDS().denial, statusLabel: "Correct & resubmit" });
  });
});
