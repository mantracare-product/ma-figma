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
let dd: typeof import("../demoData");
function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
}
beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  dd = await import("../demoData");
});
beforeEach(fresh);

describe("demo data guard", () => {
  it("purges only records carrying the test marker and keeps real ones", () => {
    localStorage.setItem("mantra_tasks_store", JSON.stringify([{ id: "t1", title: "real" }, { id: "t2", title: "RCMTEST x" }]));
    localStorage.setItem("clients", JSON.stringify([{ id: "RCMTEST-CL-1" }, { id: "CL-001", name: "Real" }]));
    localStorage.setItem("mantra_appt_fields_RCMTEST-9", "{}");
    const r = dd.ensureDemoData();
    expect(r.purged).toBe(3);
    expect(JSON.parse(localStorage.getItem("mantra_tasks_store")!)).toEqual([{ id: "t1", title: "real" }]);
    expect(JSON.parse(localStorage.getItem("clients")!)).toEqual([{ id: "CL-001", name: "Real" }]);
    expect(localStorage.getItem("mantra_appt_fields_RCMTEST-9")).toBeNull();
  });

  it("a store that only held test records is cleared so its default seed applies; clients are re-seeded; idempotent", () => {
    localStorage.setItem("deals", JSON.stringify([{ id: "D", clientName: "RCMTEST-Patient" }]));
    localStorage.setItem("clients", JSON.stringify([{ id: "RCMTEST-CL-1" }]));
    dd.ensureDemoData();
    expect(localStorage.getItem("deals")).toBeNull();
    const clients = JSON.parse(localStorage.getItem("clients")!);
    expect(clients.length).toBeGreaterThan(5);
    expect(JSON.stringify(clients)).not.toContain("RCMTEST");
    const snap = JSON.stringify(Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])));
    dd.ensureDemoData();
    const snap2 = JSON.stringify(Object.fromEntries(Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i)!)])));
    expect(snap2).toBe(snap);
  });

  it("never overwrites non-empty stores and skips the purge while a browser test run is active", () => {
    localStorage.setItem("clients", JSON.stringify([{ id: "CL-9", name: "Mine" }]));
    sessionStorage.setItem("__rcmtest_run", JSON.stringify({ running: true }));
    localStorage.setItem("mantra_tasks_store", JSON.stringify([{ id: "x", title: "RCMTEST during a run" }]));
    dd.ensureDemoData();
    expect(JSON.parse(localStorage.getItem("clients")!)).toEqual([{ id: "CL-9", name: "Mine" }]);
    expect(localStorage.getItem("mantra_tasks_store")).toContain("RCMTEST");
  });
});
