import { describe, it, expect, beforeEach } from "vitest";

class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as any).localStorage = new MemStorage();
}
if (typeof globalThis.sessionStorage === "undefined" || !globalThis.sessionStorage.getItem) {
  (globalThis as any).sessionStorage = new MemStorage();
}

import {
  isValidNpiLuhn,
  migrateScrubRulesToConditionBlocks,
  convertLegacyRuleToBlock,
  SEEDED_SCRUB_RULES,
  SCRUB_RULES_MIGRATION_FLAG,
} from "../scrubMigration";
import {
  scrubRulesStore,
  type ScrubRule,
} from "../billingSetupStore";
import { scrubClaim } from "../claimActions";
import type { Claim } from "../claimsStore";

describe("Scrub rules condition blocks and validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isValidNpiLuhn", () => {
    it("validates 10-digit NPIs with Luhn algorithm and 80840 prefix", () => {
      // Valid CMS NPIs
      expect(isValidNpiLuhn("1111111112")).toBe(true);
      expect(isValidNpiLuhn("1234567893")).toBe(true);
      expect(isValidNpiLuhn("2222222228")).toBe(true);
      expect(isValidNpiLuhn("3333333334")).toBe(true);
      expect(isValidNpiLuhn("1839201948")).toBe(true);

      // Invalid NPIs
      expect(isValidNpiLuhn("2222222226")).toBe(false);
      expect(isValidNpiLuhn("3333333330")).toBe(false);
      expect(isValidNpiLuhn("12345")).toBe(false);
      expect(isValidNpiLuhn("abcdefghij")).toBe(false);
      expect(isValidNpiLuhn("")).toBe(false);
      expect(isValidNpiLuhn(null)).toBe(false);
    });
  });

  describe("migrateScrubRulesToConditionBlocks", () => {
    it("migrates legacy rules, updates prior auth to Error and On, and seeds extra rules", () => {
      // Seed legacy rules
      const legacy: ScrubRule[] = [
        {
          id: "scrub-sample-icd",
          name: "At least one diagnosis code",
          check: "icd_required",
          severity: "error",
          enabled: true,
          message: "Add at least one ICD-10 code",
        },
        {
          id: "scrub-sample-auth",
          name: "Prior auth number present",
          check: "required_field",
          target: "priorAuthNumber",
          severity: "warning",
          enabled: false,
          message: "Prior authorization number is empty",
        },
      ];
      scrubRulesStore.save(legacy);

      const res = migrateScrubRulesToConditionBlocks();
      expect(res.migrated).toBe(2);
      expect(res.seeded).toBeGreaterThanOrEqual(5);

      const stored = scrubRulesStore.get();
      // ICD rule migrated to condition block
      const icd = stored.find((r) => r.id === "scrub-sample-icd");
      expect(icd?.groups?.length).toBeGreaterThan(0);
      expect(icd?.groups?.[0].conditions[0].field).toBe("diagnosisCodes");
      expect(icd?.enabled).toBe(true);
      expect(icd?.severity).toBe("error");

      // Prior auth rule migrated to Error and On
      const auth = stored.find((r) => r.id === "scrub-sample-auth");
      expect(auth?.severity).toBe("error");
      expect(auth?.enabled).toBe(true);
      expect(auth?.groups?.length).toBeGreaterThan(0);

      // Extra rules present
      expect(stored.some((r) => r.id === "scrub-rule-member-id")).toBe(true);
      expect(stored.some((r) => r.id === "scrub-rule-duplicate")).toBe(true);
      expect(stored.some((r) => r.id === "scrub-rule-future-dos")).toBe(true);
      expect(stored.some((r) => r.id === "scrub-rule-filing-deadline")).toBe(true);
      expect(stored.some((r) => r.id === "scrub-rule-npi-invalid")).toBe(true);

      // Logged to migration log
      const logs = JSON.parse(localStorage.getItem("mantra_migration_log_v1") || "[]");
      expect(logs.some((l: any) => l.phase === "R5-fix.4")).toBe(true);
    });
  });

  describe("scrubClaim evaluation with condition blocks", () => {
    it("evaluates condition blocks dynamically", () => {
      const claim = {
        id: "clm-test-1",
        claimNumber: "CLM-001",
        patientId: "P-1",
        patientName: "John Doe",
        patientDob: "1980-01-01",
        patientGender: "Male",
        patientAddress: "123 Main St",
        patientPhone: "555-1234",
        insuredId: "INS-001",
        renderingProviderName: "Dr. Smith",
        renderingProviderNpi: "1111111112",
        billingProviderName: "Test Clinic LLC",
        billingProviderNpi: "1234567893",
        placeOfService: "11",
        status: "Draft",
        serviceDate: "2025-01-01",
        diagnosisCodes: [],
        lines: [
          {
            id: "ln-1",
            serviceDate: "2025-01-01",
            cptCode: "66984",
            description: "Cataract",
            diagnosisPointer: "A",
            modifier: "",
            units: 1,
            chargeAmount: 2000,
          },
        ],
        totalCharge: 2000,
        amountPaid: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Claim;

      const rules: ScrubRule[] = [
        {
          id: "r1",
          name: "Diagnosis required",
          enabled: true,
          severity: "error",
          message: "No ICD",
          groups: [
            {
              id: "g1",
              matchType: "ALL",
              conditions: [
                { id: "c1", record: "claim", field: "diagnosisCodes", operator: "is_empty" },
              ],
            },
          ],
        },
        {
          id: "r2",
          name: "Modifier on 66984",
          enabled: true,
          severity: "error",
          message: "No modifier",
          groups: [
            {
              id: "g2",
              matchType: "ALL",
              conditions: [
                { id: "c2a", record: "claim_line", lineQuantifier: "any", field: "cptCode", operator: "is", value: "66984" },
                { id: "c2b", record: "claim_line", lineQuantifier: "any", field: "modifier", operator: "is_empty" },
              ],
            },
          ],
        },
      ];

      const issues = scrubClaim(claim, rules);
      expect(issues).toHaveLength(2);
      expect(issues.map((i) => i.ruleId)).toEqual(["r1", "r2"]);

      // After fixing diagnosis and modifier
      const fixedClaim: Claim = {
        ...claim,
        diagnosisCodes: [{ pointer: "A", code: "H25.11", description: "Cataract" }],
        lines: [{ ...claim.lines[0], modifier: "RT" }],
      };

      const fixedIssues = scrubClaim(fixedClaim, rules);
      expect(fixedIssues).toHaveLength(0);
    });
  });
});
