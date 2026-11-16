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

let d: typeof import("../rcmDefaults");
let auto: typeof import("../useAutomationStore");
let sb: typeof import("../sampleBundles");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  d = await import("../rcmDefaults");
  auto = await import("../useAutomationStore");
  sb = await import("../sampleBundles");
});
beforeEach(fresh);

describe("RCM defaults (seeded once, ordinary items)", () => {
  it("creates the rules enabled, except variants and outbound ones, and does it only once", () => {
    const r = d.ensureRcmDefaults();
    expect(r.already).toBe(false);
    expect(r.rules).toBeGreaterThan(20);
    const rules = auto.getStoredRules();
    const defs = new Map(sb.listSampleRuleSets().flatMap((s) => s.rules()).map((x) => [x.id, x]));
    for (const rule of rules) {
      const def = defs.get(rule.id);
      if (!def) continue;
      const expectOn = def.demoDefault !== false && !d.isUnsafeByDefault(def);
      expect(rule.enabled, rule.id).toBe(expectOn);
    }
    expect(rules.some((x) => x.enabled)).toBe(true);
    expect(d.ensureRcmDefaults().already).toBe(true);
    expect(auto.getStoredRules().length).toBe(rules.length);
  });

  it("never overwrites an edit, and never brings back a deleted rule", () => {
    d.ensureRcmDefaults();
    const rules = auto.getStoredRules();
    const target = rules.find((x) => x.enabled)!;
    const gone = rules.find((x) => x.id !== target.id)!;
    auto.saveStoredRules(rules.filter((x) => x.id !== gone.id).map((x) => (x.id === target.id ? { ...x, enabled: false, name: "My name" } : x)));
    d.ensureRcmDefaults();
    const after = auto.getStoredRules();
    expect(after.find((x) => x.id === target.id)).toMatchObject({ enabled: false, name: "My name" });
    expect(after.some((x) => x.id === gone.id)).toBe(false);
  });
});
