/**
 * Round 6 single claim pipeline: "Insurance claim" (Part A).
 * Replaces the 5 seeded workflows (Eligibility, Prior auth, Charge capture, Claim, Denial & appeal)
 * with ONE workflow whose stages carry an editable `phase` property:
 *   "eligibility" | "prior_auth" | "charge_capture" | "claim" | "none"
 *
 * Records whose stage phase is Eligibility or Prior auth are excluded from claim counts,
 * KPIs, A/R, and reports.
 */
import { getStoredProcesses, saveStoredProcesses, type Process, type Stage, type StagePhase } from "./useProcessStore";
import { getStoredClaims, saveStoredClaims, type Claim } from "./claimsStore";
import { defaultCallSettings } from "./stageCallDefaults";
import { logMigration } from "./stageCallMigration";
import {
  INSURANCE_CLAIM_WORKFLOW_ID,
  INSURANCE_CLAIM_WORKFLOW_NAME,
  ELIGIBILITY_WORKFLOW_ID,
  PRIOR_AUTH_WORKFLOW_ID,
} from "./rcmWorkflowIds";
import { SAMPLE_CLAIM_WORKFLOW_IDS } from "./rcmSampleClaimWorkflows";

export const FLAG_R6_PIPELINE = "mantra_r6_pipeline_migrated_v1";

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const insuranceClaimStageId = (name: string) => `${INSURANCE_CLAIM_WORKFLOW_ID}-${slug(name)}`;

export interface PipelineStageRow {
  name: string;
  phase: StagePhase;
  systemCategory?: string;
  position: "initial" | "intermediate" | "final";
  stageCategory: "in_progress" | "success" | "lost";
  color: string;
  enableCalling?: boolean;
}

export const PIPELINE_STAGE_ROWS: PipelineStageRow[] = [
  // ── Eligibility Phase ─────────────────────────────────────────────
  { name: "Run eligibility", phase: "eligibility", systemCategory: "initial", position: "initial", stageCategory: "in_progress", color: "#64748B" },
  { name: "Needs fix", phase: "eligibility", systemCategory: "pending", position: "intermediate", stageCategory: "in_progress", color: "#F59E0B" },
  { name: "Credentialing issue", phase: "eligibility", systemCategory: "pending", position: "intermediate", stageCategory: "in_progress", color: "#E11D48" },
  { name: "Inconclusive", phase: "eligibility", systemCategory: "pending", position: "intermediate", stageCategory: "in_progress", color: "#EAB308", enableCalling: true },
  { name: "Pending review", phase: "eligibility", systemCategory: "pending", position: "intermediate", stageCategory: "in_progress", color: "#8B5CF6" },
  { name: "Eligible", phase: "eligibility", systemCategory: "completed", position: "intermediate", stageCategory: "in_progress", color: "#10B981" },

  // ── Prior Auth Phase ──────────────────────────────────────────────
  { name: "Auth required", phase: "prior_auth", systemCategory: "pending", position: "intermediate", stageCategory: "in_progress", color: "#EC4899" },
  { name: "Auth submitted", phase: "prior_auth", systemCategory: "submitted", position: "intermediate", stageCategory: "in_progress", color: "#06B6D4" },
  { name: "Auth approved", phase: "prior_auth", systemCategory: "completed", position: "intermediate", stageCategory: "in_progress", color: "#10B981" },
  { name: "Auth denied", phase: "prior_auth", systemCategory: "denied", position: "intermediate", stageCategory: "in_progress", color: "#B91C1C" },
  { name: "Auth expired", phase: "prior_auth", systemCategory: "denied", position: "intermediate", stageCategory: "in_progress", color: "#DC2626" },
  { name: "Cleared for visit", phase: "prior_auth", systemCategory: "completed", position: "intermediate", stageCategory: "in_progress", color: "#059669" },

  // ── Charge Capture Phase ──────────────────────────────────────────
  { name: "Awaiting note", phase: "charge_capture", systemCategory: "draft", position: "intermediate", stageCategory: "in_progress", color: "#64748B" },
  { name: "Coding", phase: "charge_capture", systemCategory: "draft", position: "intermediate", stageCategory: "in_progress", color: "#3B82F6" },
  { name: "Ready to bill", phase: "charge_capture", systemCategory: "ready", position: "intermediate", stageCategory: "in_progress", color: "#10B981" },

  // ── Claim Phase ───────────────────────────────────────────────────
  { name: "Draft", phase: "claim", systemCategory: "draft", position: "intermediate", stageCategory: "in_progress", color: "#64748B" },
  { name: "Scrub failed", phase: "claim", systemCategory: "scrub_failed", position: "intermediate", stageCategory: "in_progress", color: "#F59E0B" },
  { name: "Ready to submit", phase: "claim", systemCategory: "ready", position: "intermediate", stageCategory: "in_progress", color: "#06B6D4" },
  { name: "Submitted", phase: "claim", systemCategory: "submitted", position: "intermediate", stageCategory: "in_progress", color: "#3B82F6" },
  { name: "Rejected", phase: "claim", systemCategory: "rejected", position: "intermediate", stageCategory: "in_progress", color: "#EF4444" },
  { name: "Accepted by payer", phase: "claim", systemCategory: "accepted", position: "final", stageCategory: "success", color: "#10B981" },

  // ── Closed (Lost) ─────────────────────────────────────────────────
  { name: "Inactive coverage", phase: "none", systemCategory: "lost", position: "final", stageCategory: "lost", color: "#94A3B8" },
  { name: "Self-pay", phase: "none", systemCategory: "lost", position: "final", stageCategory: "lost", color: "#64748B" },
  { name: "Visit cancelled", phase: "none", systemCategory: "lost", position: "final", stageCategory: "lost", color: "#475569" },
  { name: "Closed - not billable", phase: "none", systemCategory: "lost", position: "final", stageCategory: "lost", color: "#334155" },
];

export function buildInsuranceClaimWorkflow(): Process {
  const stages: Stage[] = PIPELINE_STAGE_ROWS.map((row) => {
    const isInit = row.position === "initial";
    const isFin = row.position === "final";
    const st: Stage = {
      id: insuranceClaimStageId(row.name),
      name: row.name,
      description: "",
      status: "active",
      color: row.color,
      phase: row.phase,
      systemCategory: row.systemCategory,
      stageCategory: row.stageCategory,
      stagePosition: row.position,
      isInitial: isInit,
      isFinal: isFin,
      isFinalStage: isFin,
    };
    if (row.enableCalling) {
      st.enableCalling = true;
      st.callTriggerSettings = defaultCallSettings("payer_benefits", "Pending review");
    }
    return st;
  });

  return {
    id: INSURANCE_CLAIM_WORKFLOW_ID,
    name: INSURANCE_CLAIM_WORKFLOW_NAME,
    description: "Complete single pipeline for insurance claims from eligibility and authorization to charge capture and payer acceptance",
    assignedToUserId: 1,
    entityType: "claim",
    workflowType: "claim",
    aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0, voice: "Ava", tone: "Professional", style: "Balanced" },
    stages,
    requiredCategories: ["submitted", "accepted"],
    source: "template",
  } as Process;
}

/** Seed the single pipeline workflow if missing. */
export function seedInsuranceClaimWorkflow(): Process {
  const list = getStoredProcesses();
  let found = list.find((p) => p.id === INSURANCE_CLAIM_WORKFLOW_ID);
  if (!found) {
    found = buildInsuranceClaimWorkflow();
    saveStoredProcesses([found, ...list]);
  }
  return found;
}

/** Map legacy stage name and workflow to the new single pipeline stage. */
export function mapLegacyStageToNewPipeline(legacyWorkflowId: string | undefined, stageName: string | undefined): string {
  const sName = (stageName || "").trim();
  const lower = sName.toLowerCase();

  // Prior auth mapping
  if (legacyWorkflowId === PRIOR_AUTH_WORKFLOW_ID || lower.startsWith("auth")) {
    if (lower === "required" || lower === "auth required") return "Auth required";
    if (lower === "submitted" || lower === "auth submitted") return "Auth submitted";
    if (lower === "approved" || lower === "auth approved") return "Auth approved";
    if (lower === "denied" || lower === "auth denied") return "Auth denied";
    if (lower === "expired" || lower === "auth expired") return "Auth expired";
  }

  // Eligibility mapping
  if (legacyWorkflowId === ELIGIBILITY_WORKFLOW_ID) {
    if (lower === "inactive") return "Inactive coverage";
    if (lower === "self-pay" || lower === "self pay") return "Self-pay";
    if (lower === "eligible") return "Eligible";
    if (lower === "needs fix") return "Needs fix";
    if (lower === "inconclusive") return "Inconclusive";
    if (lower === "pending review") return "Pending review";
    if (lower === "run eligibility") return "Run eligibility";
  }

  // Charge capture mapping
  if (legacyWorkflowId === SAMPLE_CLAIM_WORKFLOW_IDS.chargeCapture) {
    if (lower === "coding review" || lower === "coding") return "Coding";
    if (lower === "awaiting note") return "Awaiting note";
    if (lower === "hold") return "Awaiting note";
    if (lower === "ready to bill") return "Ready to bill";
  }

  // Claim & Denial mapping (paid / denial / pending stay claims at Accepted by payer, will get AR records)
  if (
    legacyWorkflowId === SAMPLE_CLAIM_WORKFLOW_IDS.claim ||
    legacyWorkflowId === SAMPLE_CLAIM_WORKFLOW_IDS.denial ||
    legacyWorkflowId === "process-claim-default"
  ) {
    if (lower === "draft") return "Draft";
    if (lower === "scrub failed") return "Scrub failed";
    if (lower === "ready to submit") return "Ready to submit";
    if (lower === "submitted") return "Submitted";
    if (lower === "rejected") return "Rejected";
    if (
      lower === "accepted by payer" ||
      lower === "accepted" ||
      lower === "pending (payer)" ||
      lower === "pending" ||
      lower === "partially paid" ||
      lower === "paid" ||
      lower === "closed" ||
      lower === "new denial" ||
      lower === "correct & resubmit" ||
      lower === "appeal drafted" ||
      lower === "appeal submitted" ||
      lower === "written off"
    ) {
      return "Accepted by payer";
    }
  }

  // Exact match against pipeline stage names
  const directMatch = PIPELINE_STAGE_ROWS.find((r) => r.name.toLowerCase() === lower);
  if (directMatch) return directMatch.name;

  return "Run eligibility";
}

export interface PipelineMigrationResult {
  migratedClaims: number;
  retiredProcesses: number;
  convertedRules: number;
  preservedItems: string[];
}

/**
 * Migrate all records from retired claim workflows into the single "Insurance claim" pipeline.
 * Runs once; flagged by mantra_r6_pipeline_migrated_v1.
 */
export function migrateToSingleClaimPipeline(): PipelineMigrationResult {
  const result: PipelineMigrationResult = {
    migratedClaims: 0,
    retiredProcesses: 0,
    convertedRules: 0,
    preservedItems: [],
  };

  try {
    if (localStorage.getItem(FLAG_R6_PIPELINE) === "1") {
      return result;
    }

    // 1. Ensure new workflow exists
    const pipelineWf = seedInsuranceClaimWorkflow();
    const allProcs = getStoredProcesses();

    const retiredIds = new Set<string>([
      ELIGIBILITY_WORKFLOW_ID,
      PRIOR_AUTH_WORKFLOW_ID,
      SAMPLE_CLAIM_WORKFLOW_IDS.chargeCapture,
      SAMPLE_CLAIM_WORKFLOW_IDS.claim,
      SAMPLE_CLAIM_WORKFLOW_IDS.denial,
      "process-claim-default",
    ]);

    // 2. Move claim records to the new pipeline
    const existingClaims = getStoredClaims();
    let claimsChanged = false;
    const updatedClaims = existingClaims.map((claim) => {
      if (!claim.processId || retiredIds.has(claim.processId)) {
        const targetStageName = mapLegacyStageToNewPipeline(claim.processId, claim.statusLabel);
        const targetStage = pipelineWf.stages.find((s) => s.name === targetStageName) || pipelineWf.stages[0];
        result.migratedClaims += 1;
        claimsChanged = true;
        return {
          ...claim,
          processId: INSURANCE_CLAIM_WORKFLOW_ID,
          currentStageId: targetStage.id,
          statusLabel: targetStage.name,
          updatedAt: new Date().toISOString(),
        };
      }
      return claim;
    });

    if (claimsChanged) {
      saveStoredClaims(updatedClaims);
    }

    // 3. Retire legacy processes
    const retiring: Process[] = [];
    const remainingProcs: Process[] = [];

    for (const p of allProcs) {
      if (p.id === INSURANCE_CLAIM_WORKFLOW_ID) {
        remainingProcs.push(p);
      } else if (retiredIds.has(p.id)) {
        // If user heavily edited it (custom stages), preserve it
        if (p.source !== "template" && p.name !== "Eligibility" && p.name !== "Prior auth" && p.name !== "Claim" && p.name !== "Charge capture" && p.name !== "Denial & appeal" && p.name !== "Claims Management") {
          result.preservedItems.push(`Custom workflow preserved: ${p.name} (${p.id})`);
          remainingProcs.push(p);
        } else {
          retiring.push(p);
          result.retiredProcesses += 1;
        }
      } else {
        remainingProcs.push(p);
      }
    }

    if (retiring.length > 0) {
      try {
        const prevRetired: Process[] = JSON.parse(localStorage.getItem("mantra_retired_processes_v1") || "[]");
        localStorage.setItem("mantra_retired_processes_v1", JSON.stringify([...prevRetired, ...retiring]));
      } catch {}
      saveStoredProcesses(remainingProcs);
    }

    logMigration(
      "R6.A",
      `Single claim pipeline: migrated ${result.migratedClaims} claim records to "Insurance claim", retired ${result.retiredProcesses} legacy workflows.`
    );
    localStorage.setItem(FLAG_R6_PIPELINE, "1");
  } catch (err: any) {
    console.warn("[rcmPipelineR6] migration error:", err);
  }

  return result;
}
