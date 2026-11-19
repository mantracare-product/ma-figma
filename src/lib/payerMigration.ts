/**
 * R5.C Migration: Payers with 3-function enrollment and type presetting.
 * Old single enrollment status is copied to all three functions (eligibility, claims, era).
 * Type is preset by name for Medicare / Medicaid / Tricare else commercial (editable).
 * Logged to mantra_migration_log_v1.
 */
import { payersStore, SAMPLE_PAYERS, type Payer, type EnrollmentStatus } from "./billingSetupStore";
import { logMigration } from "./stageCallMigration";

const FLAG = "mantra_payers_migrated_v1";

export function migratePayersToThreeFunctionEnrollment(): { migrated: number } {
  const result = { migrated: 0 };
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(FLAG) === "1") {
      return result;
    }

    const stored = payersStore.get();
    const payers = stored.length > 0 ? stored : SAMPLE_PAYERS;
    let changed = false;

    for (const p of payers) {
      let payerChanged = false;

      // 1. Preset Type by name
      if (!p.type || p.type === "other") {
        const nameLower = (p.name || "").toLowerCase();
        let determinedType: Payer["type"] = "commercial";
        if (nameLower.includes("medicare")) determinedType = "medicare";
        else if (nameLower.includes("medicaid")) determinedType = "medicaid";
        else if (nameLower.includes("tricare")) determinedType = "other";
        
        if (p.type !== determinedType) {
          p.type = determinedType;
          payerChanged = true;
        }
      }

      // 2. Active status
      if (p.active === undefined) {
        p.active = true;
        payerChanged = true;
      }

      // 3. 3-function enrollment
      const legacyStatus: EnrollmentStatus = p.enrollment?.status || "not_started";
      const elig = p.enrollment?.eligibility?.status ?? (typeof p.enrollment?.eligibility === "string" ? p.enrollment.eligibility : legacyStatus);
      const claims = p.enrollment?.claims?.status ?? (typeof p.enrollment?.claims === "string" ? p.enrollment.claims : legacyStatus);
      const era = p.enrollment?.era?.status ?? (typeof p.enrollment?.era === "string" ? p.enrollment.era : legacyStatus);

      if (!p.enrollment?.eligibility || !p.enrollment?.claims || !p.enrollment?.era) {
        p.enrollment = {
          status: legacyStatus,
          eligibility: {
            status: elig,
            submittedAt: p.enrollment?.submittedAt,
            enrolledAt: p.enrollment?.enrolledAt,
            notes: p.enrollment?.notes,
          },
          claims: {
            status: claims,
            submittedAt: p.enrollment?.submittedAt,
            enrolledAt: p.enrollment?.enrolledAt,
            notes: p.enrollment?.notes,
          },
          era: {
            status: era,
            submittedAt: p.enrollment?.submittedAt,
            enrolledAt: p.enrollment?.enrolledAt,
            notes: p.enrollment?.notes,
          },
          submittedAt: p.enrollment?.submittedAt,
          enrolledAt: p.enrollment?.enrolledAt,
          notes: p.enrollment?.notes,
        };
        payerChanged = true;
      }

      if (payerChanged) {
        result.migrated++;
        changed = true;
        logMigration(
          "R5.C",
          `Payer "${p.name}" (${p.id}): type set to "${p.type}", enrollment set to [eligibility: ${elig}, claims: ${claims}, era: ${era}], active=${p.active}`
        );
      }
    }

    if (changed || stored.length === 0) {
      payersStore.save(payers);
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FLAG, "1");
    }
  } catch (err) {
    console.warn("migratePayersToThreeFunctionEnrollment error:", err);
  }
  return result;
}
