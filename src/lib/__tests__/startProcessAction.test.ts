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

let runs: typeof import("../actionRuns");
let store: typeof import("../processLogsStore");
let act: typeof import("../startProcessAction");

const rule: any = { id: "R1", name: "Start follow-up" };
const event = (id: string): any => ({ id: "E-" + id, event: "stage.entered", recordType: "appointment", recordId: id, data: { clientId: "CL-T" } });
const cause: any = { type: "rule", ruleId: "R1" };

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  runs = await import("../actionRuns");
  store = await import("../processLogsStore");
  act = await import("../startProcessAction");
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  store.__resetInstanceMigrationForTests();
  runs.__resetActionRunsForTests();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
  localStorage.setItem("clients", JSON.stringify([{ id: "CL-T", name: "Test Patient", stage: "x", processes: [] }]));
  localStorage.setItem(
    "process_store_processes",
    JSON.stringify([{ id: "proc-f", name: "Follow Up", stages: [{ id: "s1", name: "First" }, { id: "s2", name: "Second" }] }])
  );
});

describe("runActionOnce", () => {
  it("runs once per key, records failures, and retries them", () => {
    let calls = 0;
    const ok = runs.runActionOnce("k1", { actionKey: "x" }, () => { calls++; return { a: 1 }; });
    const again = runs.runActionOnce("k1", { actionKey: "x" }, () => { calls++; return { a: 2 }; });
    expect(ok.alreadyRan).toBe(false);
    expect(again.alreadyRan).toBe(true);
    expect(calls).toBe(1);

    let fail = true;
    runs.registerActionRetryHandler("y", () => { if (fail) throw new Error("boom"); return { done: true }; });
    const bad = runs.runActionOnce("k2", { actionKey: "y" }, () => { throw new Error("boom"); });
    expect(bad.status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(1);
    fail = false;
    const retried = runs.retryActionRun(runs.listFailedActionRuns()[0].id);
    expect(retried.status).toBe("success");
    expect(runs.getActionHealth().failed).toBe(0);
  });
});

describe("start_process step", () => {
  it("fails (recorded, not thrown) when the process does not exist", () => {
    const r = act.executeStartProcessStep({ rule, stepId: "st", params: { processId: "nope" }, event: event("1"), cause });
    expect(r.status).toBe("failed");
    expect(runs.getActionHealth().failed).toBe(1);
  });
  it("starts one instance per triggering record, and never duplicates for the same record", () => {
    const p = { processId: "proc-f" };
    const a = act.executeStartProcessStep({ rule, stepId: "st", params: p, event: event("101"), cause });
    const again = act.executeStartProcessStep({ rule, stepId: "st", params: p, event: event("101"), cause });
    const b = act.executeStartProcessStep({ rule, stepId: "st", params: p, event: event("102"), cause });
    expect(a.status).toBe("success");
    expect(again.alreadyRan).toBe(true);
    expect(b.status).toBe("success");
    const inst = store.getInstancesForClient("CL-T", "Follow Up");
    expect(inst).toHaveLength(2);
    expect(inst.every((i) => i.currentStage === "First")).toBe(true);
    expect(new Set(inst.map((i) => i.source?.id))).toEqual(new Set(["101", "102"]));
  });
});
