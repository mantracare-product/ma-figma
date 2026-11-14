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
let auto: typeof import("../useAutomationStore");
let roles: typeof import("../rolesStore");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  sb = await import("../sampleBundles");
  auto = await import("../useAutomationStore");
  roles = await import("../rolesStore");
  await import("../sampleBundlesRegistry");
  const mk = (id: string, order: number): any => ({
    id,
    name: id,
    entityType: "appointment",
    trigger: { event: "appointment.booked" },
    action: { type: "moveToStage", processId: "", stageId: "" },
    actions: [],
    order,
  });
  sb.registerSampleRuleSet({ id: "E", label: "Test set", description: "", requires: ["task-views"], rules: () => [mk("sample-rule-A1", 10), mk("sample-rule-A10", 20)] });
});
beforeEach(fresh);

describe("sample bundles", () => {
  it("nothing is seeded until Load sample templates is pressed", () => {
    expect(JSON.parse(localStorage.getItem("mantra_task_views_v1") || "[]")).toHaveLength(0);
    expect(auto.getStoredRules().some((r) => r.id.startsWith("sample-rule"))).toBe(false);
  });

  it("loads templates + rules (rules DISABLED), idempotently", () => {
    const r1 = sb.loadSampleTemplates();
    expect(r1.total).toBeGreaterThan(0);
    expect(r1.rules.E).toBe(2);
    const rules = auto.getStoredRules().filter((r) => r.id.startsWith("sample-rule"));
    expect(rules).toHaveLength(2);
    expect(rules.every((r) => r.enabled === false && sb.isSampleRule(r))).toBe(true);
    expect(rules.find((r) => r.id === "sample-rule-A1")!.order).toBe(10);
    const r2 = sb.loadSampleTemplates();
    expect(r2.total).toBe(0);
  });

  it("never overwrites an edited sample rule, and preserves the user's enabled choice on reload", () => {
    sb.loadSampleTemplates();
    auto.updateRule("sample-rule-A1", { name: "My edited A1", enabled: true });
    sb.loadSampleTemplates();
    const a1 = auto.getStoredRules().find((r) => r.id === "sample-rule-A1")!;
    expect(a1.name).toBe("My edited A1");
    expect(a1.enabled).toBe(true);
  });

  it("enable / disable demo set only flips sample rules of that set", () => {
    auto.createRule({ orgId: "default", name: "mine", entityType: "client", trigger: { event: "client.created" }, action: { type: "moveToStage", processId: "", stageId: "" }, enabled: false } as any);
    expect(sb.getSampleSetStatus("E")).toMatchObject({ loaded: 0, total: 2, enabled: 0 });
    expect(sb.enableDemoSet("E")).toBe(2);
    expect(sb.getSampleSetStatus("E")).toMatchObject({ loaded: 2, total: 2, enabled: 2 });
    expect(auto.getStoredRules().find((r) => r.name === "mine")!.enabled).toBe(false);
    expect(sb.disableDemoSet("E")).toBe(2);
    expect(sb.getSampleSetStatus("E")!.enabled).toBe(0);
  });

  it("enabling a set also loads the templates it requires", () => {
    sb.enableDemoSet("E");
    expect(JSON.parse(localStorage.getItem("mantra_task_views_v1")!).length).toBe(8);
  });

  it("sample roles seed on top of the default roles instead of replacing them", () => {
    sb.loadSampleTemplates();
    const ids = roles.getStoredRoles().map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["admin", "manager", "sample-rcm-billing-setup"]));
  });
});
