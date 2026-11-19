import { getStoredProcesses } from "./useProcessStore";
import { logMigration } from "./stageCallMigration";
import { getStoredClaims, type Claim } from "./claimsStore";

export const AR_STORAGE_KEY = "mantra_ar_records_v1";
export const AR_CHANGED_EVENT = "mantra:ar_records_changed";

export interface ArRecord {
  id: string; // e.g. "ar-CLM-1001" or unique
  claimId: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  payerId: string;
  payerName: string;
  providerId?: string;
  providerName: string;
  dateOfService: string;
  submittedDate: string;
  ageInDays: number;
  billedAmount: number;
  allowedAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
  patientResponsibility: number;
  outstandingAmount: number;
  denialCategory?: string;
  carcCodes?: string[];
  appealDeadline?: string;
  appealDraft?: {
    letter: string;
    accepted?: boolean;
    createdDate: string;
  };
  nextFollowUpDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  processId: string;
  currentStageId: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  history?: Array<{
    date: string;
    type: string;
    description: string;
    userId?: string;
    userName?: string;
  }>;
}

export function getStoredArRecords(): ArRecord[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(AR_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read AR records:", e);
    return [];
  }
}

export function saveStoredArRecords(records: ArRecord[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(AR_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AR_CHANGED_EVENT));
    }
  } catch (e) {
    console.error("Failed to save AR records:", e);
  }
}

export function saveArRecord(record: ArRecord): ArRecord {
  const current = getStoredArRecords();
  const idx = current.findIndex((r) => r.id === record.id || (record.claimId && r.claimId === record.claimId));
  let updated: ArRecord[];
  const timestamp = new Date().toISOString();
  const finalRecord: ArRecord = {
    ...record,
    updatedAt: timestamp,
    createdAt: record.createdAt || timestamp,
  };

  if (idx >= 0) {
    updated = [...current];
    updated[idx] = finalRecord;
  } else {
    updated = [finalRecord, ...current];
  }
  saveStoredArRecords(updated);
  return finalRecord;
}

export function getArWorkflows() {
  const procs = getStoredProcesses();
  return procs.filter((p) => (p.entityType as string) === "ar");
}

export function getArWorkflow(id?: string) {
  const wfs = getArWorkflows();
  if (id) {
    const found = wfs.find((w) => w.id === id);
    if (found) return found;
  }
  return wfs[0] || null;
}

export function agingBucketOf(days: number): "0-30" | "31-60" | "61-90" | "91-120" | "120+" {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  if (days <= 120) return "91-120";
  return "120+";
}

/**
 * Migration: existing claims in Paid, Partially paid, Denied / Denial & appeal or Pending (payer) or Accepted
 * get an AR record (add-only, idempotent, flagged once, logged to mantra_migration_log_v1).
 */
export function migrateExistingClaimsToAr(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem("mantra_r6_claims_to_ar_v1") === "1") return;

    const claims = getStoredClaims();
    const existingAr = getStoredArRecords();
    const existingClaimIds = new Set(existingAr.map((r) => r.claimId));
    let arWorkflow = getArWorkflow();
    if (!arWorkflow) return;

    const newArRecords: ArRecord[] = [];
    const now = Date.now();

    for (const c of claims) {
      if (existingClaimIds.has(c.id)) continue;

      const stgName = (c.statusLabel || c.status || "").toLowerCase();
      const isAcceptedOrPast =
        c.status === "Accepted" ||
        c.status === "Paid" ||
        c.status === "Denied" ||
        stgName.includes("accepted") ||
        stgName.includes("paid") ||
        stgName.includes("denied") ||
        stgName.includes("appeal") ||
        (c.amountPaid || 0) > 0 ||
        Boolean(c.denialCategory);

      if (!isAcceptedOrPast) continue;

      // Determine initial AR stage based on claim status
      let targetStage = arWorkflow.stages[0]; // "Awaiting payer" default
      if (c.status === "Paid" || stgName.includes("paid in full")) {
        targetStage = arWorkflow.stages.find((s) => s.systemCategory === "won" || s.name.toLowerCase().includes("paid in full")) || targetStage;
      } else if (c.status === "Denied" || stgName.includes("denied")) {
        targetStage = arWorkflow.stages.find((s) => s.systemCategory === "denied" || s.name.toLowerCase() === "denied") || targetStage;
      } else if ((c.underpaidBy || 0) > 0 || stgName.includes("partial")) {
        targetStage = arWorkflow.stages.find((s) => s.systemCategory === "partially_paid" || s.name.toLowerCase().includes("partially")) || targetStage;
      }

      const billed = c.totalCharge || 0;
      const paid = c.amountPaid || 0;
      const adjustments = c.contractualAdjustment || 0;
      const pr = c.patientResponsibility || 0;
      const outstanding = Math.max(0, billed - paid - adjustments);
      const serviceDate = c.serviceDate || new Date().toISOString().slice(0, 10);
      const subDate = c.submittedAt || c.createdAt || serviceDate;
      const ageDays = Math.max(0, Math.floor((now - new Date(subDate).getTime()) / 86400000));

      const arRec: ArRecord = {
        id: `ar-${c.claimNumber || c.id}`,
        claimId: c.id,
        claimNumber: c.claimNumber || `CLM-${c.id}`,
        patientId: c.patientId || "",
        patientName: c.patientName || "Unknown Patient",
        payerId: c.payer?.id || c.payer?.payerId || "payer-default",
        payerName: c.payer?.name || "Default Payer",
        providerName: c.renderingProviderName || c.billingProviderName || "Rendering Provider",
        dateOfService: serviceDate,
        submittedDate: subDate,
        ageInDays: ageDays,
        billedAmount: billed,
        allowedAmount: paid + adjustments + pr,
        paidAmount: paid,
        adjustmentAmount: adjustments,
        patientResponsibility: pr,
        outstandingAmount: outstanding,
        denialCategory: c.denialCategory,
        carcCodes: c.denialCodes,
        appealDeadline: c.appealDeadline,
        processId: arWorkflow.id,
        currentStageId: targetStage.id,
        statusLabel: targetStage.name,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newArRecords.push(arRec);
      existingClaimIds.add(c.id);
    }

    if (newArRecords.length > 0) {
      saveStoredArRecords([...newArRecords, ...existingAr]);
      logMigration("r6-claims-to-ar", `Created ${newArRecords.length} AR records from existing accepted/paid/denied claims`);
    }

    localStorage.setItem("mantra_r6_claims_to_ar_v1", "1");
  } catch (err) {
    console.warn("Failed to run migrateExistingClaimsToAr:", err);
  }
}
