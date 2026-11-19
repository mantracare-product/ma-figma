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
  if (typeof globalThis.sessionStorage === "undefined") {
    (globalThis as any).sessionStorage = mem;
  }
  if (typeof globalThis.window === "undefined") {
    (globalThis as any).window = {
      localStorage: mem,
      sessionStorage: mem,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
});

let bSetup: typeof import("../billingSetupStore");
let claimAct: typeof import("../claimActions");
let claimsLib: typeof import("../claimsStore");
let orgLib: typeof import("../orgBilling");
let apptLib: typeof import("../appointmentService");

describe("R5-fix.3: Claim defaults, claim billing fields, and frequency code", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    bSetup = await import("../billingSetupStore");
    claimAct = await import("../claimActions");
    claimsLib = await import("../claimsStore");
    orgLib = await import("../orgBilling");
    apptLib = await import("../appointmentService");

    const orgId = orgLib.getActiveOrgId();
    orgLib.saveOrgBilling(orgId, {
      legalName: "Mantra Test Health",
      ein: "12-3456789",
      groupNpi: "1932840192",
      address: "100 Medical Center Way",
      phone: "555-0100",
    });
    localStorage.setItem(
      `mantra_org_locations_${orgId}`,
      JSON.stringify([
        { id: "loc-main", name: "Main Clinic", pos: "11", address: "Suite 100" },
        { id: "loc-tele", name: "Virtual / Telehealth", pos: "02", address: "Online" },
      ])
    );
    bSetup.claimDefaultsStore.save({
      frequencyCode: "1",
      defaultPos: "11",
      acceptAssignment: true,
      timelyFilingDays: 90,
      defaultBillingLocationId: "loc-main",
      signatureOnFile: true,
      releaseOfInformation: true,
    });
  });

  it("applies defaults to new claims: billing location, accept assignment, consents, frequency code 1", () => {
    const res = claimAct.performCreateClaim({
      clientId: "client-test-1",
      sourceType: "client",
      sourceId: "man-1",
      cause: { type: "manual" },
    });
    expect(res.created).toBe(true);
    const claim = claimsLib.getStoredClaims().find((c) => c.id === res.claimId);
    expect(claim).toBeDefined();
    expect(claim?.frequencyCode).toBe("1");
    expect(claim?.acceptAssignment).toBe(true);
    expect(claim?.signatureOnFile).toBe(true);
    expect(claim?.releaseOfInformation).toBe(true);
    expect(claim?.billingLocationId).toBe("loc-main");
  });

  it("resolves place of service from appointment's location first, overriding default billing location", () => {
    apptLib.appointmentService.saveAppointments([
      {
        id: "apt-loc-test",
        title: "Telehealth Visit",
        patientId: "client-loc-1",
        date: "2026-11-20",
        location: "Virtual / Telehealth",
      } as any,
    ]);

    const res = claimAct.performCreateClaim({
      clientId: "client-loc-1",
      sourceType: "appointment",
      sourceId: "apt-loc-test",
      appointmentId: "apt-loc-test",
      cause: { type: "manual" },
    });
    const claim = claimsLib.getStoredClaims().find((c) => c.id === res.claimId);
    expect(claim?.placeOfService).toBe("02");
  });

  it("payer timely filing overrides claim defaults fallback", () => {
    const payer: import("../billingSetupStore").Payer = {
      id: "payer-strict",
      name: "Strict Insurance",
      payerIdCode: "STRCT",
      timelyFilingDays: 60,
      enrollment: { status: "enrolled" },
    };
    bSetup.payersStore.save([payer]);

    const res = claimAct.performCreateClaim({
      clientId: "client-payer-test",
      sourceType: "client",
      sourceId: "man-strict",
      payerId: "payer-strict",
      cause: { type: "manual" },
    });
    const claim = claimsLib.getStoredClaims().find((c) => c.id === res.claimId);
    expect(claim?.timelyFilingDays).toBe(60);
  });

  it("resubmit as replacement sets frequencyCode to 7 and void claim sets frequencyCode to 8", () => {
    const res = claimAct.performCreateClaim({
      clientId: "client-freq-test",
      sourceType: "client",
      sourceId: "man-freq-1",
      cause: { type: "manual" },
    });
    const claimId = res.claimId;

    const rep = claimAct.resubmitClaimAsReplacement(claimId);
    expect(rep.frequencyCode).toBe("7");
    expect(claimsLib.getStoredClaims().find((c) => c.id === claimId)?.frequencyCode).toBe("7");

    const voided = claimAct.voidClaim(claimId);
    expect(voided.frequencyCode).toBe("8");
    expect(claimsLib.getStoredClaims().find((c) => c.id === claimId)?.frequencyCode).toBe("8");
  });
});
