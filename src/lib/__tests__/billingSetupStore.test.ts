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

let s: typeof import("../billingSetupStore");

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).localStorage = new MemStorage();
  s = await import("../billingSetupStore");
});
beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
});

describe("billing setup stores", () => {
  it("starts empty: no sample data without the seeding call", () => {
    expect(s.getPayers()).toHaveLength(0);
    expect(s.billingEntityStore.get().legalName).toBe("");
  });

  it("seeds 15 payers, scrub rules, and the default POS (fees & providers moved, entity on organization)", () => {
    const r = s.seedBillingSetupSamples();
    expect(r.added).toBeGreaterThan(20);
    expect(s.getPayers()).toHaveLength(15);
    expect(s.getPayers().every((p) => p.sample)).toBe(true);
    expect(s.billingLocationsStore.get()).toHaveLength(0);
    expect(s.scrubRulesStore.get().length).toBeGreaterThan(0);
    expect(s.billingEntityStore.get().legalName).toBe("");
    expect(s.claimDefaultsStore.get().defaultPos).toBe("11");
  });

  it("seeding is idempotent and never overwrites edits", () => {
    s.seedBillingSetupSamples();
    s.payersStore.upsert({ ...s.getPayer("payer-bcbs")!, name: "My BCBS", sample: false });
    s.claimDefaultsStore.patch({ defaultPos: "22" });
    const again = s.seedBillingSetupSamples();
    expect(again.added).toBe(0);
    expect(s.getPayer("payer-bcbs")!.name).toBe("My BCBS");
    expect(s.claimDefaultsStore.get().defaultPos).toBe("22");
    expect(s.getPayers()).toHaveLength(15);
  });

  it("does not seed the entity over a user-entered one", () => {
    s.billingEntityStore.save({ legalName: "Mine", dbaName: "", ein: "", npi: "", taxonomy: "", address: "", phone: "" });
    s.seedBillingSetupSamples();
    expect(s.billingEntityStore.get().legalName).toBe("Mine");
  });

  it("fees live on the service only; lookupFee is backward-compatible fallback", () => {
    s.seedBillingSetupSamples();
    expect(s.lookupFee("99214", "payer-bcbs")).toBe(120);
    expect(s.lookupFee("99214", "payer-aetna")).toBe(150);
    expect(s.lookupFee("00000")).toBeUndefined();
  });

  it("provider credentials look up by team member id or name from team store", () => {
    s.seedBillingSetupSamples();
    expect(s.getProviderCredential(1)?.npi).toBe("1111111112");
    expect(s.getProviderCredential(999)).toBeUndefined();
  });
});
