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
let o: typeof import("../orgBilling");
let b: typeof import("../billingSetupStore");

beforeAll(async () => {
  (globalThis as any).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  (globalThis as any).localStorage = new MemStorage();
  o = await import("../orgBilling");
  b = await import("../billingSetupStore");
});
beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
  (globalThis as any).window.localStorage = (globalThis as any).localStorage;
});

describe("organization billing identity", () => {
  it("stores the entity on the organization and reports when it is complete", () => {
    expect(o.hasBillingEntity()).toBe(false);
    o.saveOrgBilling("demo", { legalName: "Acme Clinic LLC", groupNpi: "1234567893", ein: "12-3456789" });
    expect(o.getOrgBilling("demo")).toMatchObject({ legalName: "Acme Clinic LLC", groupNpi: "1234567893" });
    expect(o.hasBillingEntity(o.getOrgBilling("demo"))).toBe(true);
  });

  it("migrates the old entity and locations once, keeps ids in claim defaults, and never overwrites", () => {
    b.billingEntityStore.save({ legalName: "Old LLC", dbaName: "", ein: "99-9999999", npi: "1111111112", taxonomy: "207W00000X", address: "1 Main", phone: "555" });
    b.billingLocationsStore.upsert({ id: "loc-a", name: "Main clinic", pos: "22", address: "1 Main" });
    b.claimDefaultsStore.patch({ defaultBillingLocationId: "loc-a" });
    expect(o.migrateBillingSetupToOrg("demo").migrated).toBe(true);
    expect(o.getOrgBilling("demo")).toMatchObject({ legalName: "Old LLC", ein: "99-9999999", groupNpi: "1111111112" });
    const locs = o.getOrgLocations("demo");
    expect(locs).toHaveLength(1);
    expect(locs[0].pos).toBe("22");
    expect(b.claimDefaultsStore.get().defaultBillingLocationId).toBe(locs[0].id);

    o.saveOrgBilling("demo", { legalName: "Edited LLC" });
    expect(o.migrateBillingSetupToOrg("demo").migrated).toBe(false);
    expect(o.getOrgBilling("demo").legalName).toBe("Edited LLC");
  });

  it("matches an existing org location by name and sets its POS; online locations default to 02", () => {
    localStorage.setItem("mantra_org_locations_demo", JSON.stringify([{ id: "L1", name: "California Branch", type: "physical", address: "x" }, { id: "L2", name: "Online", type: "online", address: "" }]));
    b.billingLocationsStore.upsert({ id: "old", name: "california branch", pos: "19" });
    o.migrateBillingSetupToOrg("demo");
    const locs = o.getOrgLocations("demo");
    expect(locs.find((l) => l.id === "L1")?.pos).toBe("19");
    expect(locs.find((l) => l.id === "L2")?.pos).toBe("02");
    expect(locs).toHaveLength(2);
  });
});
