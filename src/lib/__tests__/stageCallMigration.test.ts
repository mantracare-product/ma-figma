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
let mig: typeof import("../stageCallMigration");
let auto: typeof import("../useAutomationStore");
let procs: typeof import("../useProcessStore");

beforeAll(async () => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window = { localStorage: (globalThis as any).localStorage, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).CustomEvent = class { constructor(public type: string) {} };
  mig = await import("../stageCallMigration");
  auto = await import("../useAutomationStore");
  procs = await import("../useProcessStore");
});
beforeEach(() => { localStorage.clear(); });

const step = (id: string, stepKey: string, params: any = {}) => ({ id, name: stepKey, stepKey, description: "", iconKey: "zap", trigger: "stage", executionType: "wait", delayValue: 0, delayUnit: "minutes", params }) as any;

describe("start_call -> stage call settings", () => {
  it("moves the payer call to its stage (ON), keeps rules that do more, deletes rules that only called, logs, and is idempotent", () => {
    procs.saveStoredProcesses([
      { id: "p1", name: "Checks", entityType: "client", stages: [{ id: "s1", name: "Inconclusive" }, { id: "s2", name: "Other" }] } as any,
      { id: "pi", name: "Invoices", entityType: "invoice", stages: [{ id: "i1", name: "Reminder 1" }, { id: "i2", name: "Reminder 2" }] } as any,
    ]);
    const base: any = { orgId: "default", enabled: true, entityType: "client", conditions: [], createdAt: "", updatedAt: "", action: { type: "noop" } };
    auto.saveStoredRules([
      { ...base, id: "r-call", name: "Call the payer", trigger: { event: "stage.entered", params: { processId: "p1", stageId: "s1" } }, actions: [step("a", "start_call", { purpose: "payer_benefits", resultStage: "Pending review" })] },
      { ...base, id: "r-mixed", name: "Call and task", trigger: { event: "stage.entered", params: { processId: "p1", stageId: "s2" } }, actions: [step("b", "start_call", { purpose: "payer_benefits" }), step("c", "create_task", {})] },
      { ...base, id: "r-bal", name: "Balance call", entityType: "invoice", trigger: { event: "job.daily" }, actions: [step("d", "start_call", { purpose: "balance_reminder" })] },
      { ...base, id: "r-other", name: "Untouched", trigger: { event: "stage.entered", params: {} }, actions: [step("e", "create_task", {})] },
    ]);
    const res = mig.migrateStartCallToStageCalls();
    expect(res).toMatchObject({ rulesDeleted: 2, rulesChanged: 1, stagesSet: 3 });
    const rules = auto.getStoredRules();
    expect(rules.map((r) => r.id).sort()).toEqual(["r-mixed", "r-other"]);
    expect(rules.find((r) => r.id === "r-mixed")!.actions.map((s: any) => s.stepKey)).toEqual(["create_task"]);
    const p = procs.getStoredProcesses();
    const s1: any = p.find((x) => x.id === "p1")!.stages.find((s) => s.id === "s1");
    expect(s1).toMatchObject({ enableCalling: true, callTriggerSettings: { callPurpose: "payer_benefits", resultStage: "Pending review" } });
    const bal: any = p.find((x) => x.id === "pi")!.stages.find((s) => s.id === "i2");
    expect(bal).toMatchObject({ enableCalling: false, callTriggerSettings: { callPurpose: "balance_reminder" } });
    expect(JSON.parse(localStorage.getItem(mig.MIGRATION_LOG_KEY) || "[]").length).toBeGreaterThanOrEqual(5);
    expect(mig.migrateStartCallToStageCalls()).toMatchObject({ rulesDeleted: 0, rulesChanged: 0, stagesSet: 0 });
  });
});
