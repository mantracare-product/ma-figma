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

let cov: typeof import("../coveragesStore");
let bus: typeof import("../eventBus");

function fresh() {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).sessionStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
  (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
}

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  fresh();
  cov = await import("../coveragesStore");
  bus = await import("../eventBus");
});
beforeEach(() => {
  fresh();
  localStorage.setItem("clients", JSON.stringify([
    { id: "CL-1", name: "Ann Lee", contactType: "Client", processes: [], stage: "x" },
    { id: "CL-2", name: "Bob Ray", contactType: "Lead", processes: [], stage: "x" },
  ]));
});

const base = { clientId: "CL-1", payerId: "payer-bcbs", memberId: "M1" };

describe("coverages", () => {
  it("one coverage per priority: a new primary demotes the old primary to secondary", () => {
    const a = cov.saveCoverage({ ...base, priority: "primary" });
    const b = cov.saveCoverage({ ...base, memberId: "M2", priority: "primary" });
    expect(b.demoted).toEqual([a.coverage.id]);
    const list = cov.getCoveragesForClient("CL-1");
    expect(list.map((c) => [c.memberId, c.priority])).toEqual([["M2", "primary"], ["M1", "secondary"]]);
  });

  it("getCoverageOn honours effective/term dates", () => {
    cov.saveCoverage({ ...base, priority: "primary", effectiveDate: "2025-01-01", termDate: "2025-06-30" });
    expect(cov.getPrimaryCoverage("CL-1", "2025-03-01")).toBeDefined();
    expect(cov.getPrimaryCoverage("CL-1", "2025-07-01")).toBeUndefined();
    expect(cov.getPrimaryCoverage("CL-1", "2024-12-31")).toBeUndefined();
  });

  it("emits coverage.updated on save and remove", async () => {
    const seen: any[] = [];
    const off = bus.eventBus.subscribe("coverage.updated", (e) => { seen.push(e); });
    const { coverage } = cov.saveCoverage({ ...base, priority: "primary" });
    cov.removeCoverage(coverage.id);
    await new Promise((r) => setTimeout(r, 5));
    off();
    expect(seen.map((e) => e.data.removed === true)).toEqual([false, true]);
    expect(seen[0].recordId).toBe("CL-1");
  });

  it("typed demographics round-trip on the client record", () => {
    expect(cov.saveClientDemographics("CL-1", { dob: "1980-02-03", sex: "female", selfPay: false, consents: { sms: true } })).toBe(true);
    expect(cov.getClientDemographics("CL-1")).toMatchObject({ dob: "1980-02-03", sex: "female", consents: { sms: true } });
    expect(cov.saveClientDemographics("nope", { dob: "x" })).toBe(false);
  });

  it("sample seeding covers only contact type Client, is idempotent, and does not overwrite demographics", () => {
    cov.saveClientDemographics("CL-1", { dob: "1990-01-01" });
    const r1 = cov.seedCoverageSamples();
    expect(r1.coverages).toBe(1);
    expect(cov.getCoveragesForClient("CL-2")).toHaveLength(0);
    expect(cov.getCoveragesForClient("CL-1")[0].sample).toBe(true);
    expect(cov.getClientDemographics("CL-1").dob).toBe("1990-01-01");
    expect(cov.getClientDemographics("CL-1").legalFirstName).toBe("Ann");
    const r2 = cov.seedCoverageSamples();
    expect(r2.coverages).toBe(0);
    expect(r2.clients).toBe(0);
  });
});
