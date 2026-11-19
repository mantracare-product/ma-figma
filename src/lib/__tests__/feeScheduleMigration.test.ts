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
  if (typeof (globalThis as any).window !== "undefined") {
    (globalThis as any).window.localStorage = (globalThis as any).localStorage;
    (globalThis as any).window.sessionStorage = (globalThis as any).sessionStorage;
  }
}

beforeAll(() => {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  fresh();
});

import { migrateFeeSchedulesToServicePrices, getServicePriceForCpt } from "../feeScheduleMigration";
import { feeSchedulesStore } from "../billingSetupStore";
import { getStoredServices, saveStoredServices, Service } from "../servicesStore";
import { applyCodesToClaim } from "../scribeBilling";
import { Claim } from "../claimsStore";

describe("R5.B - Fees live on the service only", () => {
  beforeEach(() => {
    fresh();
  });

  it("migrates default schedule lines to service price only when service has none", () => {
    const services: Service[] = [
      { id: 101, name: "Consultation", description: "Office visit", cptCode: "99214", duration: 30, price: 0, currency: "USD", isActive: true },
      { id: 102, name: "Surgery", description: "Cataract removal", cptCode: "66984", duration: 60, price: 2500, currency: "USD", isActive: true }, // conflict: existing price 2500 vs schedule 2400
    ];
    saveStoredServices(services);

    feeSchedulesStore.save([
      {
        id: "fee-default",
        name: "Default fee schedule",
        lines: [
          { cpt: "99214", amount: 150 },
          { cpt: "66984", amount: 2400 },
          { cpt: "99999", amount: 500 }, // unmatched
        ],
      },
    ]);

    const result = migrateFeeSchedulesToServicePrices();
    expect(result.servicesUpdated).toBe(1);
    expect(result.conflicts).toBe(1);
    expect(result.unmatched).toBe(1);

    const updated = getStoredServices();
    expect(updated.find((s) => s.id === 101)?.price).toBe(150);
    expect(updated.find((s) => s.id === 102)?.price).toBe(2500); // kept existing price on conflict

    const migrationLog = JSON.parse(localStorage.getItem("mantra_migration_log_v1") || "[]");
    expect(migrationLog.some((l: any) => l.change.includes("Set service \"Consultation\" (99214) price to $150"))).toBe(true);
    expect(migrationLog.some((l: any) => l.change.includes("Conflict on service \"Surgery\" (66984)"))).toBe(true);
    expect(migrationLog.some((l: any) => l.change.includes("Unmatched default schedule line CPT 99999"))).toBe(true);
  });

  it("calculates claim line amount from service price x units", () => {
    const services: Service[] = [
      { id: 201, name: "MRI Brain", description: "Brain scan", cptCode: "70553", duration: 45, price: 1200, currency: "USD", isActive: true },
    ];
    saveStoredServices(services);

    const baseClaim: Claim = {
      id: "clm-test-1",
      claimNumber: "CLM-001",
      patientId: "pat-1",
      patientName: "John Doe",
      patientDob: "1980-01-01",
      patientGender: "Male",
      patientAddress: "123 Main St",
      patientPhone: "555-0100",
      insuredId: "INS-001",
      payer: { id: "payer-1", name: "Aetna", payerId: "AETNA", type: "Commercial" },
      renderingProviderName: "Dr. Smith",
      renderingProviderNpi: "1234567890",
      billingProviderName: "Clinic LLC",
      billingProviderNpi: "0987654321",
      placeOfService: "11",
      serviceDate: "2026-11-01",
      diagnosisCodes: [{ pointer: "A", code: "G43.909", description: "Migraine" }],
      lines: [],
      totalCharge: 0,
      amountPaid: 0,
      status: "Draft",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    };

    const updated = applyCodesToClaim(
      baseClaim,
      {
        icd: [{ code: "G43.909", description: "Migraine" }],
        cpt: [{ code: "70553", description: "MRI Brain", units: 2 }],
        accepted: true,
      },
      "2026-11-01"
    );

    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].chargeAmount).toBe(2400); // 1200 * 2
    expect(updated.totalCharge).toBe(2400);
    expect(updated.missingData).not.toContain("service_price");
  });

  it("missing service price leaves amount empty and adds service_price to missingData", () => {
    // No services in store matching CPT 88888
    saveStoredServices([]);

    const baseClaim: Claim = {
      id: "clm-test-2",
      claimNumber: "CLM-002",
      patientId: "pat-2",
      patientName: "Jane Doe",
      patientDob: "1985-05-05",
      patientGender: "Female",
      patientAddress: "456 Oak St",
      patientPhone: "555-0200",
      insuredId: "INS-002",
      payer: { id: "payer-2", name: "Cigna", payerId: "CIGNA", type: "Commercial" },
      renderingProviderName: "Dr. Smith",
      renderingProviderNpi: "1234567890",
      billingProviderName: "Clinic LLC",
      billingProviderNpi: "0987654321",
      placeOfService: "11",
      serviceDate: "2026-11-01",
      diagnosisCodes: [{ pointer: "A", code: "Z00.00", description: "General exam" }],
      lines: [],
      totalCharge: 0,
      amountPaid: 0,
      status: "Draft",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    };

    const updated = applyCodesToClaim(
      baseClaim,
      {
        icd: [{ code: "Z00.00", description: "General exam" }],
        cpt: [{ code: "88888", description: "Unknown procedure", units: 1 }],
        accepted: true,
      },
      "2026-11-01"
    );

    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].chargeAmount).toBeUndefined();
    expect(updated.missingData).toContain("service_price");
  });
});
