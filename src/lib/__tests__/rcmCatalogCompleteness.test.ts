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
function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

let cat: typeof import("../rcmCatalog");
let trig: typeof import("../../app/types/automation");
let sb: typeof import("../sampleBundles");
let map: typeof import("../automationRuleMapping");
let auto: typeof import("../useAutomationStore");
const execKeys: Record<string, string[]> = {};

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  cat = await import("../rcmCatalog");
  trig = await import("../../app/types/automation");
  sb = await import("../sampleBundles");
  map = await import("../automationRuleMapping");
  auto = await import("../useAutomationStore");
  await import("../sampleRuleSets");
  const mods: Array<[string, any]> = [
    ["claimActions", await import("../claimActions")],
    ["remittanceActions", await import("../remittanceActions")],
    ["authActions", await import("../authActions")],
    ["createTask", await import("../createTaskAction")],
    ["messages", await import("../messageActions")],
    ["claimStatus", await import("../claimStatusAndCalls")],
    ["runElig", await import("../runEligibility")],
    ["startProcess", await import("../startProcessAction")],
    ["updateFields", await import("../updateFieldsAction")],
    ["moveWf", await import("../moveToWorkflowAction")],
    ["invoiceFromClaim", await import("../invoiceFromClaim")],
  ];
  for (const [n, m] of mods) for (const [k, v] of Object.entries(m)) if (/_STEP_KEYS$/.test(k)) execKeys[`${n}.${k}`] = v as string[];
});
beforeEach(fresh);

const allRules = () => sb.listSampleRuleSets().flatMap((s) => s.rules());
const stepKeysOf = (steps: any[] = []): string[] => steps.flatMap((s) => [s.stepKey, ...(s.branches || []).flatMap((b: any) => stepKeysOf(b.steps))]);

describe("flow builder catalogs", () => {
  it("every step key used by a seeded rule is in the step catalog", () => {
    const known = new Set([...cat.RCM_ACTION_KEYS, ...cat.OTHER_STEP_KEYS]);
    const missing = allRules().flatMap((r) => stepKeysOf(r.actions)).filter((k) => !known.has(k));
    expect(Array.from(new Set(missing))).toEqual([]);
  });

  it("every executor action is registered with a label, group and description", () => {
    const first = Object.values(execKeys).map((v) => v[0]);
    expect(first.length).toBeGreaterThan(5);
    for (const k of first) expect(cat.getRcmAction(k), k).toBeTruthy();
    for (const a of cat.RCM_ACTIONS) {
      expect(a.label.length).toBeGreaterThan(2);
      expect(a.desc.length).toBeGreaterThan(10);
      expect(["Eligibility & Auth", "Claims", "Payments", "Tasks & Messages", "Processes"]).toContain(a.group);
    }
  });

  it("every trigger event used by a seeded rule is in the trigger catalog with a real name", () => {
    const events = new Set(trig.GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events.map((e) => e.event)));
    const used = Array.from(new Set(allRules().map((r) => r.trigger.event)));
    expect(used.filter((e) => !events.has(e))).toEqual([]);
    expect(trig.triggerEventLabel("job.daily")).toBe("Daily job");
    expect(trig.triggerEventLabel("era.unmatched")).not.toMatch(/process/i);
  });

  it("canvas names are readable, never the raw key", () => {
    for (const a of cat.RCM_ACTIONS) expect(cat.stepDisplayName({ stepKey: a.key, name: a.key })).toBe(a.label);
    for (const r of allRules()) for (const s of r.actions || []) expect(s.name).not.toMatch(/^[a-z]+(_[a-z]+)+$/);
  });

  it("opening and re-saving a seeded rule changes nothing it does", () => {
    for (const def of allRules()) {
      const rule = { ...def, orgId: "default", enabled: true, createdAt: "x", updatedAt: "x" } as any;
      const initial = map.ruleToInitialAutomation(rule);
      const patch = map.buildRulePatch({ ...initial, status: "active" }, rule);
      expect(patch.trigger.event, def.id).toBe(rule.trigger.event);
      for (const [k, v] of Object.entries(rule.trigger.params || {})) expect((patch.trigger.params as any)[k], `${def.id}.${k}`).toEqual(v);
      expect(patch.entityType, def.id).toBe(rule.entityType);
      expect(patch.action, def.id).toEqual(rule.action);
      expect(patch.actions.map((s: any) => [s.id, s.stepKey, s.params]), def.id).toEqual((rule.actions || []).map((s: any) => [s.id, s.stepKey, s.params || {}]));
    }
    void auto;
  });
});
