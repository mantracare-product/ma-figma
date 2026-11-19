import { describe, it, expect, beforeEach, beforeAll } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
}

const mem = new MemStorage();
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    (globalThis as any).localStorage = mem;
  }
});

let bSetup: typeof import("../billingSetupStore");
let pMigrate: typeof import("../payerMigration");
let eraLib: typeof import("../eraStore");
let claimAct: typeof import("../claimActions");

beforeEach(async () => {
  localStorage.clear();
  bSetup = await import("../billingSetupStore");
  pMigrate = await import("../payerMigration");
  eraLib = await import("../eraStore");
  claimAct = await import("../claimActions");
});

describe("Part C: Payers 3-function enrollment and detail logic", () => {
  it("migrates legacy single enrollment to eligibility, claims, and era", () => {
    bSetup.payersStore.save([
      {
        id: "payer-test-1",
        name: "Medicare Part B",
        payerIdCode: "MED01",
        enrollment: { status: "enrolled" },
      } as any,
      {
        id: "payer-test-2",
        name: "Acme Commercial",
        payerIdCode: "ACM01",
        enrollment: { status: "pending" },
      } as any,
    ]);

    const res = pMigrate.migratePayersToThreeFunctionEnrollment();
    expect(res.migrated).toBe(2);

    const p1 = bSetup.getPayer("payer-test-1")!;
    expect(p1.type).toBe("medicare");
    expect(p1.active).toBe(true);
    expect(p1.enrollment.eligibility?.status).toBe("enrolled");
    expect(p1.enrollment.claims?.status).toBe("enrolled");
    expect(p1.enrollment.era?.status).toBe("enrolled");

    const p2 = bSetup.getPayer("payer-test-2")!;
    expect(p2.type).toBe("commercial");
    expect(p2.enrollment.eligibility?.status).toBe("pending");
  });

  it("getActivePayers filters out inactive payers", () => {
    bSetup.payersStore.save([
      { id: "p-act", name: "Active Payer", payerIdCode: "1", active: true, enrollment: { status: "enrolled" } },
      { id: "p-inact", name: "Inactive Payer", payerIdCode: "2", active: false, enrollment: { status: "not_started" } },
    ]);

    expect(bSetup.getActivePayers()).toHaveLength(1);
    expect(bSetup.getActivePayers()[0].id).toBe("p-act");
    expect(bSetup.getPayers(true)).toHaveLength(2);
  });

  it("mockAcknowledge rejects claims if payer is not enrolled for claims", () => {
    bSetup.payersStore.save([
      {
        id: "p-no-claims",
        name: "Test Payer",
        payerIdCode: "TP1",
        active: true,
        enrollment: {
          status: "pending",
          claims: { status: "not_started" },
        },
      },
    ]);

    const claim: any = {
      id: "clm-1",
      claimNumber: "CLM-001",
      insuredId: "INS-OK",
      payer: { id: "p-no-claims", name: "Test Payer", payerId: "TP1" },
    };

    const ack = claimAct.mockAcknowledge(claim);
    expect(ack.accepted).toBe(false);
    expect(ack.reason).toContain("provider not enrolled for claims");
  });

  it("matchEraLine returns undefined if payer is not enrolled for ERA", () => {
    bSetup.payersStore.save([
      {
        id: "p-no-era",
        name: "No ERA Payer",
        payerIdCode: "NE1",
        active: true,
        enrollment: {
          status: "pending",
          era: { status: "pending" },
        },
      },
    ]);

    const claims: any[] = [
      {
        id: "clm-1",
        claimNumber: "CLM-001",
        payer: { id: "p-no-era", name: "No ERA Payer" },
      },
    ];

    const eraLine: any = {
      id: "line-1",
      claimNumber: "CLM-001",
      paid: 50,
      adjustments: [],
    };

    const matched = eraLib.matchEraLine(eraLine, claims);
    expect(matched).toBeUndefined();
  });
});
