import { getStoredClaims, saveClaim, type Claim, type ClaimRemittanceRecord } from "./claimsStore";
import { CARC } from "./denialCodes";
import { logMigration } from "./stageCallMigration";

const FLAG_REMITTANCES_MIGRATED = "mantra_r6_claim_remittances_v1";

export function migrateClaimRemittances(): number {
  if (typeof window === "undefined" || !window.localStorage) return 0;
  if (localStorage.getItem(FLAG_REMITTANCES_MIGRATED)) return 0;

  try {
    const claims = getStoredClaims();
    let updatedCount = 0;

    for (const c of claims) {
      if (c.remittances && c.remittances.length > 0) continue;

      const paid =
        c.status === "Paid" ||
        c.statusLabel?.toLowerCase().includes("paid") ||
        (c.amountPaid && c.amountPaid > 0);

      const denied =
        c.status === "Denied" ||
        c.statusLabel?.toLowerCase().includes("deni") ||
        (c.denialCodes && c.denialCodes.length > 0);

      if (!paid && !denied) continue;

      const charge = c.totalCharge || 150;
      const amountPaid = c.amountPaid || (paid ? Math.round(charge * 0.85 * 100) / 100 : 0);
      const payerName = c.payer?.name || "Insurance Payer";
      const cpt = c.lines?.[0]?.cptCode || "99214";
      const desc = c.lines?.[0]?.description || "Office visit";

      if (paid) {
        const rem: ClaimRemittanceRecord = {
          id: `rem-mig-${c.id}`,
          eraId: `era-mig-${c.id}`,
          traceNumber: `TRN-${c.claimNumber.replace(/[^0-9]/g, "") || "8821"}`,
          checkNumber: `CHK-${c.claimNumber.replace(/[^0-9]/g, "") || "4412"}`,
          paymentDate: c.serviceDate || new Date().toISOString().slice(0, 10),
          payerName,
          status: amountPaid >= charge - 0.01 ? "Paid" : "Partially Paid",
          billed: charge,
          allowed: Math.round(charge * 0.85 * 100) / 100,
          paid: amountPaid,
          patientResponsibility: Math.round(charge * 0.05 * 100) / 100,
          adjustments: Math.round(charge * 0.15 * 100) / 100,
          lines: [
            {
              id: `remln-mig-${c.id}`,
              cptCode: cpt,
              serviceName: desc,
              billed: charge,
              allowed: Math.round(charge * 0.85 * 100) / 100,
              paid: amountPaid,
              patientResponsibility: Math.round(charge * 0.05 * 100) / 100,
              adjustments: [
                {
                  group: "CO",
                  carc: "45",
                  amount: Math.round(charge * 0.15 * 100) / 100,
                  description: CARC["45"]?.text || "Charges exceed fee schedule",
                },
                {
                  group: "PR",
                  carc: "2",
                  amount: Math.round(charge * 0.05 * 100) / 100,
                  description: CARC["2"]?.text || "Coinsurance amount",
                },
              ],
              status: "Paid",
            },
          ],
        };

        saveClaim({
          ...c,
          remittances: [rem],
        });
        updatedCount += 1;
      } else if (denied) {
        const carcCode = c.denialCodes?.[0]?.replace(/^CO-|^PR-/, "") || "97";
        const carcDesc = c.denialSummary || CARC[carcCode]?.text || "Denied by payer";
        const rem: ClaimRemittanceRecord = {
          id: `rem-mig-den-${c.id}`,
          eraId: `era-mig-den-${c.id}`,
          traceNumber: `TRN-DEN-${c.claimNumber.replace(/[^0-9]/g, "") || "9912"}`,
          checkNumber: `DEN-835-${c.claimNumber.replace(/[^0-9]/g, "") || "3311"}`,
          paymentDate: c.serviceDate || new Date().toISOString().slice(0, 10),
          payerName,
          status: "Denied",
          billed: charge,
          allowed: 0,
          paid: 0,
          patientResponsibility: 0,
          adjustments: charge,
          lines: [
            {
              id: `remln-mig-den-${c.id}`,
              cptCode: cpt,
              serviceName: desc,
              billed: charge,
              allowed: 0,
              paid: 0,
              patientResponsibility: 0,
              adjustments: [
                {
                  group: "CO",
                  carc: carcCode,
                  rarc: "N130",
                  amount: charge,
                  description: carcDesc,
                },
              ],
              rarc: "N130",
              status: "Denied",
            },
          ],
        };

        saveClaim({
          ...c,
          remittances: [rem],
        });
        updatedCount += 1;
      }
    }

    localStorage.setItem(FLAG_REMITTANCES_MIGRATED, "1");
    if (updatedCount > 0) {
      logMigration(
        "R6.fix2",
        `Seeded remittances add-only on ${updatedCount} paid/denied claim records.`
      );
    }
    return updatedCount;
  } catch (e) {
    console.warn("[migrateClaimRemittances] Error:", e);
    return 0;
  }
}
