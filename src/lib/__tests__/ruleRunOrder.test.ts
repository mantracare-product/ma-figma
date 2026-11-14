import { describe, it, expect, beforeAll, beforeEach } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

let auto: typeof import("../useAutomationStore");
let engine: typeof import("../ruleEngine");

function rule(id: string, extra: Record<string, any> = {}) {
  return {
    id,
    orgId: "default",
    name: id,
    entityType: "client",
    trigger: { event: "stage.entered", params: {} },
    action: { type: "moveToStage", processId: "", stageId: "" },
    actions: [{ id: `a-${id}`, stepKey: "fieldupdate", params: { fieldUpdateBlocks: [{ fieldToEdit: "marker", updateValue: id }] } }],
    enabled: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...extra,
  };
}

const event = (data: Record<string, any> = {}) => ({
  id: `evt-${Math.random().toString(36).slice(2)}`,
  event: "stage.entered",
  recordType: "client" as const,
  recordId: "CL-TEST",
  data,
  orgId: "default",
  timestamp: new Date().toISOString(),
});

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  auto = await import("../useAutomationStore");
  engine = await import("../ruleEngine");
});

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
});

describe("rule run order for one event", () => {
  it("compareRulesByOrder: ascending order, default 100, ties by creation time", () => {
    const rules = [
      rule("default"),
      rule("tie-new", { order: 20, createdAt: "2026-02-01T00:00:00.000Z" }),
      rule("late", { order: 30 }),
      rule("tie-old", { order: 20, createdAt: "2026-01-01T00:00:00.000Z" }),
      rule("first", { order: 10 }),
    ] as any[];
    expect([...rules].sort(auto.compareRulesByOrder).map((r) => r.id)).toEqual([
      "first",
      "tie-old",
      "tie-new",
      "late",
      "default",
    ]);
  });

  it("runs matching rules in that order regardless of stored-array order", async () => {
    auto.saveStoredRules([
      rule("default"),
      rule("tie-new", { order: 20, createdAt: "2026-02-01T00:00:00.000Z" }),
      rule("late", { order: 30 }),
      rule("tie-old", { order: 20, createdAt: "2026-01-01T00:00:00.000Z" }),
      rule("first", { order: 10 }),
    ] as any);
    const results = await engine.executeRulesForEvent(event({}));
    expect(results.filter((r) => r.matched).map((r) => r.ruleId)).toEqual([
      "first",
      "tie-old",
      "tie-new",
      "late",
      "default",
    ]);
  });

  it("a later rule can rely on an earlier rule (dependent rules)", async () => {
    // B needs what A produces (A sets event.data.marker). B is stored FIRST, so without ordering it would be skipped.
    auto.saveStoredRules([
      rule("B-needs-A", {
        order: 20,
        conditions: [{ id: "c1", field: "marker", op: "equals", value: "A-creates" }],
      }),
      rule("A-creates", { order: 10 }),
    ] as any);
    const results = await engine.executeRulesForEvent(event({}));
    const ran = results.filter((r) => r.matched).map((r) => r.ruleId);
    expect(ran).toEqual(["A-creates", "B-needs-A"]);
  });
});
