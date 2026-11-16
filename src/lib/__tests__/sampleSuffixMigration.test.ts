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
let m: typeof import("../sampleSuffixMigration");
beforeAll(async () => { (globalThis as any).localStorage = new MemStorage(); m = await import("../sampleSuffixMigration"); });
beforeEach(() => localStorage.clear());

describe("strip (Sample) suffix", () => {
  it("strips nested names once, leaves everything else, is idempotent", () => {
    localStorage.setItem("mantra_processes", JSON.stringify([{ id: "p", name: "Coverage & authorization (Sample)", stages: [{ name: "Intake (Sample)" }, { name: "Sampler" }] }]));
    localStorage.setItem("mantra_other", JSON.stringify({ note: "keep (Sample) inside text" }));
    localStorage.setItem("unrelated", JSON.stringify([{ name: "X (Sample)" }]));
    expect(m.migrateStripSampleSuffix().keys).toBe(1);
    const p = JSON.parse(localStorage.getItem("mantra_processes")!);
    expect(p[0].name).toBe("Coverage & authorization");
    expect(p[0].stages.map((s: any) => s.name)).toEqual(["Intake", "Sampler"]);
    expect(localStorage.getItem("mantra_other")).toContain("keep (Sample) inside text");
    expect(localStorage.getItem("unrelated")).toContain("(Sample)");
    expect(m.migrateStripSampleSuffix().keys).toBe(0);
    expect(m.stripSampleSuffix("A (Sample)")).toBe("A");
  });
});
