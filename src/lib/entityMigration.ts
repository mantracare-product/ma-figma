/**
 * entityMigration.ts
 * Path: src/lib/entityMigration.ts
 *
 * One-time migration and status-to-stage mapping for:
 * - Invoices (ClientInvoice)
 * - Appointments (Appointment)
 * - Claims (Claim)
 *
 * Ensures each record has `currentStageId` corresponding to the entity's workflow process stages.
 * Business logic should use stage.systemCategory, never hardcoded status strings.
 */

import { Process, Stage, EntityType, DEFAULT_ENTITY_PROCESSES } from "./useProcessStore";

const MIGRATION_FLAG_KEY = "mantra_entity_stage_migration_v1_done";

export function mapInvoiceStatusToCategory(status: string): string {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "draft":
      return "draft";
    case "sent":
      return "sent";
    case "viewed":
      return "viewed";
    case "partial":
    case "partially_paid":
    case "partially paid":
      return "partially_paid";
    case "paid":
      return "paid";
    case "overdue":
      return "overdue";
    case "void":
    case "voided":
    case "cancelled":
      return "void";
    default:
      return "draft";
  }
}

export function mapAppointmentStatusToCategory(status: string): string {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "scheduled":
    case "confirmed":
    case "booked":
    case "pending-accept":
      return "booked";
    case "rescheduled":
      return "rescheduled";
    case "reminder":
    case "reminder sent":
      return "reminder";
    case "checked in":
    case "checked-in":
    case "checked_in":
      return "checked_in";
    case "completed":
    case "done":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "no-show":
    case "noshow":
    case "no_show":
      return "no_show";
    default:
      return "booked";
  }
}

export function mapClaimStatusToCategory(status: string): string {
  const s = (status || "").toLowerCase().trim();
  switch (s) {
    case "draft":
      return "draft";
    case "ready to submit":
    case "ready":
    case "submitted":
      return "submitted";
    case "under review":
    case "in review":
    case "in_review":
    case "accepted":
      return "in_review";
    case "paid":
      return "paid";
    case "rejected":
    case "denied":
      return "denied";
    default:
      return "draft";
  }
}

/**
 * Finds the stage in an entity process that matches a given systemCategory,
 * or returns the first stage as a fallback.
 */
export function findStageForCategory(process: Process, category: string): Stage | undefined {
  if (!process?.stages || process.stages.length === 0) return undefined;
  const match = process.stages.find((s) => s.systemCategory?.toLowerCase() === category.toLowerCase());
  return match || process.stages[0];
}

/**
 * Executes idempotent migration across existing records in storage:
 * - mantra_invoices_v1
 * - appointments_v1 / sessionStorage
 * - mantra_claims_v1
 */
export function runEntityStageMigration(processes: Process[]): void {
  try {
    const invProc = processes.find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
    const apptProc = processes.find((p) => p.entityType === "appointment") || DEFAULT_ENTITY_PROCESSES.appointment;
    const clmProc = processes.find((p) => p.entityType === "claim") || DEFAULT_ENTITY_PROCESSES.claim;

    // 1. Invoices
    const rawInvoices = localStorage.getItem("mantra_invoices_v1");
    if (rawInvoices) {
      try {
        const invoices = JSON.parse(rawInvoices);
        if (Array.isArray(invoices)) {
          let modified = false;
          const updatedInvoices = invoices.map((inv: any) => {
            if (!inv.currentStageId) {
              const cat = mapInvoiceStatusToCategory(inv.status);
              const targetStage = findStageForCategory(invProc, cat);
              modified = true;
              return {
                ...inv,
                currentStageId: targetStage?.id || invProc.stages[0]?.id,
                statusLabel: targetStage?.name || inv.status || "Draft",
              };
            }
            return inv;
          });
          if (modified) {
            localStorage.setItem("mantra_invoices_v1", JSON.stringify(updatedInvoices));
          }
        }
      } catch (e) {
        console.warn("Failed migrating invoices to stages:", e);
      }
    }

    // 2. Appointments (sessionStorage & localStorage)
    const rawAppts = sessionStorage.getItem("appointments_v1") || localStorage.getItem("appointments_v1");
    if (rawAppts) {
      try {
        const appts = JSON.parse(rawAppts);
        if (Array.isArray(appts)) {
          let modified = false;
          const updatedAppts = appts.map((appt: any) => {
            if (!appt.currentStageId) {
              const cat = mapAppointmentStatusToCategory(appt.status);
              const targetStage = findStageForCategory(apptProc, cat);
              modified = true;
              return {
                ...appt,
                currentStageId: targetStage?.id || apptProc.stages[0]?.id,
              };
            }
            return appt;
          });
          if (modified) {
            sessionStorage.setItem("appointments_v1", JSON.stringify(updatedAppts));
            localStorage.setItem("appointments_v1", JSON.stringify(updatedAppts));
          }
        }
      } catch (e) {
        console.warn("Failed migrating appointments to stages:", e);
      }
    }

    // 3. Claims
    const rawClaims = localStorage.getItem("mantra_claims_v1");
    if (rawClaims) {
      try {
        const claims = JSON.parse(rawClaims);
        if (Array.isArray(claims)) {
          let modified = false;
          const updatedClaims = claims.map((clm: any) => {
            if (!clm.currentStageId) {
              const cat = mapClaimStatusToCategory(clm.status);
              const targetStage = findStageForCategory(clmProc, cat);
              modified = true;
              return {
                ...clm,
                currentStageId: targetStage?.id || clmProc.stages[0]?.id,
              };
            }
            return clm;
          });
          if (modified) {
            localStorage.setItem("mantra_claims_v1", JSON.stringify(updatedClaims));
          }
        }
      } catch (e) {
        console.warn("Failed migrating claims to stages:", e);
      }
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch (err) {
    console.warn("Error running entity stage migration:", err);
  }
}
