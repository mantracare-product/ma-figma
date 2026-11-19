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

import { getStoredTeamMembers, saveStoredTeamMembers, type TeamMember } from "../teamStore";
import { getProviderCredential, providerCredentialsStore } from "../billingSetupStore";
import { migrateProviderCredentialsToTeamMember, PROVIDER_CREDENTIALS_MIGRATION_FLAG } from "../providerCredentialMigration";
import { isValidNpiLuhn } from "../scrubMigration";

describe("R5-fix.5 Provider credentials on Team Member profile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("validates 10-digit NPIs with the Luhn checksum", () => {
    // Valid 10-digit NPIs
    expect(isValidNpiLuhn("1111111112")).toBe(true);
    expect(isValidNpiLuhn("2222222228")).toBe(true);
    expect(isValidNpiLuhn("3333333334")).toBe(true);
    expect(isValidNpiLuhn("1234567893")).toBe(true);

    // Invalid NPIs
    expect(isValidNpiLuhn("1111111111")).toBe(false);
    expect(isValidNpiLuhn("1234567890")).toBe(false);
    expect(isValidNpiLuhn("123")).toBe(false);
    expect(isValidNpiLuhn("")).toBe(false);
  });

  it("migrates existing provider credentials to matching team members by ID or name", () => {
    const initialMembers: TeamMember[] = [
      { id: 1, name: "Dr. Sarah Mitchell", email: "sarah@example.com", role: "Admin", department: "Clinical" },
      { id: 2, name: "Dr. James Wilson", email: "james@example.com", role: "Doctor", department: "Clinical" },
    ];
    saveStoredTeamMembers(initialMembers);

    providerCredentialsStore.save([
      { id: "1", name: "Dr. Sarah Mitchell", npi: "1111111112", taxonomy: "207W00000X", licenseNumber: "CA-MD-98214", licenseState: "CA" },
      { id: "2", name: "Dr. James Wilson", npi: "2222222228", taxonomy: "207WX0009X", licenseNumber: "CA-DO-44120", licenseState: "CA" },
    ]);

    const res = migrateProviderCredentialsToTeamMember();
    expect(res.migrated).toBeGreaterThanOrEqual(2);
    expect(localStorage.getItem(PROVIDER_CREDENTIALS_MIGRATION_FLAG)).toBe("1");

    const updated = getStoredTeamMembers();
    const sarah = updated.find((m) => m.id === 1)!;
    expect(sarah.npi).toBe("1111111112");
    expect(sarah.taxonomy).toBe("207W00000X");
    expect(sarah.licenseNumber).toBe("CA-MD-98214");
    expect(sarah.licenseState).toBe("CA");
    expect(sarah.customFields?.npi).toBe("1111111112");

    // Idempotent migration
    const res2 = migrateProviderCredentialsToTeamMember();
    expect(res2.migrated).toBe(0);
  });

  it("reads provider credentials from team store first", () => {
    saveStoredTeamMembers([
      {
        id: 99,
        name: "Dr. Custom Member",
        email: "custom@example.com",
        role: "Provider",
        department: "Clinical",
        npi: "1487920194",
        taxonomy: "207W00000X",
        licenseNumber: "LIC-999",
        licenseState: "NY",
      },
    ]);

    const cred = getProviderCredential("99");
    expect(cred).toBeDefined();
    expect(cred?.name).toBe("Dr. Custom Member");
    expect(cred?.npi).toBe("1487920194");
    expect(cred?.taxonomy).toBe("207W00000X");
    expect(cred?.licenseState).toBe("NY");

    // Also supports lookup by provider name
    const credByName = getProviderCredential("Dr. Custom Member");
    expect(credByName).toBeDefined();
    expect(credByName?.npi).toBe("1487920194");
  });
});
