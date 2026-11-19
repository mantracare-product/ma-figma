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

  ensureArRecordsAllStages();
}

/**
 * Ensures an AR record exists in every stage of the AR workflow (add-only, idempotent).
 */
export function ensureArRecordsAllStages(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem("mantra_r6_ar_every_stage_v1") === "1") return;

    const arWorkflow = getArWorkflow();
    if (!arWorkflow || !arWorkflow.stages) return;

    const currentRecords = getStoredArRecords();
    const claims = getStoredClaims();
    const stageCounts: Record<string, number> = {};

    for (const r of currentRecords) {
      if (r.currentStageId) stageCounts[r.currentStageId] = (stageCounts[r.currentStageId] || 0) + 1;
      if (r.statusLabel) stageCounts[r.statusLabel] = (stageCounts[r.statusLabel] || 0) + 1;
    }

    const addedRecords: ArRecord[] = [];
    const PATIENTS = [
      { id: "cl-101", name: "Sarah Johnson", phone: "555-0101" },
      { id: "cl-102", name: "Michael Chang", phone: "555-0102" },
      { id: "cl-103", name: "David Kim", phone: "555-0103" },
      { id: "cl-104", name: "Emily Watson", phone: "555-0104" },
      { id: "cl-105", name: "Robert Martinez", phone: "555-0105" },
    ];
    const PAYERS = [
      { id: "pyr-1", name: "Blue Cross Blue Shield" },
      { id: "pyr-2", name: "Aetna Healthcare" },
      { id: "pyr-3", name: "UnitedHealthcare" },
      { id: "pyr-4", name: "Cigna Commercial" },
      { id: "pyr-5", name: "Medicare Part B" },
    ];
    const STAFF = ["Dr. Sarah Chen", "Dr. Marcus Vance", "Emily Davis (Billing)", "Alex Rivera (RCM)"];

    arWorkflow.stages.forEach((stage, idx) => {
      const hasRecord = (stageCounts[stage.id] || 0) > 0 || (stageCounts[stage.name] || 0) > 0;
      if (hasRecord) return;

      const p = PATIENTS[idx % PATIENTS.length];
      const pyr = PAYERS[idx % PAYERS.length];
      const assignee = STAFF[idx % STAFF.length];
      const claimNum = `CLM-${29000 + idx * 17}`;

      const billed = 250 + (idx * 55) % 450;
      const isWon = stage.stageCategory === "success" || stage.systemCategory === "won" || stage.name.toLowerCase().includes("won") || stage.name.toLowerCase().includes("paid");
      const isLost = stage.stageCategory === "lost" || stage.systemCategory === "lost" || stage.name.toLowerCase().includes("lost") || stage.name.toLowerCase().includes("written");
      const isPartially = stage.systemCategory === "partially_paid" || stage.name.toLowerCase().includes("partial");
      const isPatient = stage.name.toLowerCase().includes("patient") || stage.name.toLowerCase().includes("plan") || stage.name.toLowerCase().includes("collection");

      let paid = 0;
      let adjustments = 0;
      let patientResp = 0;
      let outstanding = billed;

      if (isWon) {
        paid = Math.round(billed * 0.85 * 100) / 100;
        adjustments = Math.round(billed * 0.15 * 100) / 100;
        outstanding = 0;
      } else if (isLost) {
        if (stage.name.toLowerCase().includes("written")) {
          adjustments = billed;
          outstanding = 0;
        } else {
          outstanding = billed;
        }
      } else if (isPartially) {
        paid = Math.round(billed * 0.5 * 100) / 100;
        adjustments = Math.round(billed * 0.15 * 100) / 100;
        outstanding = Math.round((billed - paid - adjustments) * 100) / 100;
      } else if (isPatient) {
        paid = Math.round(billed * 0.6 * 100) / 100;
        adjustments = Math.round(billed * 0.15 * 100) / 100;
        patientResp = Math.round((billed - paid - adjustments) * 100) / 100;
        outstanding = patientResp;
      }

      const ageDays = 15 + idx * 8;
      const dos = new Date(Date.now() - (ageDays + 3) * 86400000).toISOString().slice(0, 10);
      const sub = new Date(Date.now() - ageDays * 86400000).toISOString().slice(0, 10);

      const matchedClaim = claims.find((c) => c.statusLabel?.toLowerCase() === stage.name.toLowerCase() || c.status?.toLowerCase() === stage.name.toLowerCase());

      addedRecords.push({
        id: `ar-seed-${stage.id}`,
        claimId: matchedClaim ? matchedClaim.id : `clm-seed-${stage.id}`,
        claimNumber: matchedClaim ? matchedClaim.claimNumber : claimNum,
        patientId: matchedClaim?.patientId || p.id,
        patientName: matchedClaim?.patientName || p.name,
        payerId: matchedClaim?.payer?.id || pyr.id,
        payerName: matchedClaim?.payer?.name || pyr.name,
        providerName: matchedClaim?.renderingProviderName || "Dr. Sarah Chen, MD",
        dateOfService: matchedClaim?.serviceDate || dos,
        submittedDate: matchedClaim?.submittedAt || sub,
        ageInDays: ageDays,
        billedAmount: billed,
        allowedAmount: Math.round(billed * 0.85 * 100) / 100,
        paidAmount: paid,
        adjustmentAmount: adjustments,
        patientResponsibility: patientResp,
        outstandingAmount: outstanding,
        processId: arWorkflow.id,
        currentStageId: stage.id,
        statusLabel: stage.name,
        assigneeName: assignee,
        nextFollowUpDate: new Date(Date.now() + ((idx % 7) + 2) * 86400000).toISOString().slice(0, 10),
        denialCategory: stage.name.toLowerCase().includes("deni") ? "Medical Necessity" : undefined,
        carcCodes: stage.name.toLowerCase().includes("deni") ? ["CO-50"] : undefined,
        createdAt: new Date(Date.now() - ageDays * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    if (addedRecords.length > 0) {
      saveStoredArRecords([...addedRecords, ...currentRecords]);
      logMigration("R6.fix3", `Seeded ${addedRecords.length} AR records across missing AR cycle stages`);
    }

    localStorage.setItem("mantra_r6_ar_every_stage_v1", "1");
  } catch (err) {
    console.warn("Failed to run ensureArRecordsAllStages:", err);
  }
}
