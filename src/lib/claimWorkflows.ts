/**
 * Claim workflows (Slice 4, item 4.1). A claim belongs to ONE workflow (Process with entityType "claim") at a time
 * and can move between workflows (claimService.moveToWorkflow). Any number of workflows may exist; their names and
 * stages are the clinic's (the samples in rcmSampleClaimWorkflows are only seeded on request).
 *
 * Claim.status is DERIVED from the stage's systemCategory when it has one, otherwise "Unmapped".
 */
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES, type Process, type Stage } from "./useProcessStore";
import type { Claim, ClaimStatus } from "./claimsStore";

export function getClaimWorkflows(): Process[] {
  const stored = getStoredProcesses().filter((p) => p.entityType === "claim");
  return stored.length > 0 ? stored : [DEFAULT_ENTITY_PROCESSES.claim];
}

export const getClaimWorkflow = (id?: string | null): Process | undefined => (id ? getClaimWorkflows().find((p) => p.id === id) : undefined);

export function initialStageOf(process: Process): Stage | undefined {
  return process.stages.find((s) => s.isInitial || s.stagePosition === "initial") || process.stages[0];
}

/** Find a stage by id, then by (case-insensitive) name. */
export function findStage(process: Process | undefined, ref?: string | null): Stage | undefined {
  if (!process || !ref) return undefined;
  const q = String(ref).trim().toLowerCase();
  return process.stages.find((s) => s.id === ref) || process.stages.find((s) => (s.name || "").trim().toLowerCase() === q);
}

const CATEGORY_STATUS: Record<string, ClaimStatus> = {
  draft: "Draft",
  scrub_failed: "Draft",
  ready: "Ready to Submit",
  submitted: "Submitted",
  accepted: "Accepted",
  pending: "Under Review",
  in_review: "Under Review",
  partially_paid: "Under Review",
  paid: "Paid",
  denied: "Denied",
  failed: "Denied",
  rejected: "Rejected",
};

/** Status shown for a claim in a stage: from the stage's systemCategory, else "Unmapped". */
export function claimStatusForStage(stage?: Stage | null): ClaimStatus {
  const cat = (stage?.systemCategory || "").toLowerCase().trim();
  return (cat && CATEGORY_STATUS[cat]) || "Unmapped";
}

/**
 * Give every claim without a workflow one: the first claim workflow, keeping its stage when that stage exists there,
 * else matching by name (statusLabel), else the initial stage. Status is left as stored. Pure; returns changed claims.
 */
export function assignClaimsToWorkflows(claims: Claim[], workflows: Process[]): { claims: Claim[]; changed: boolean } {
  const target = workflows[0];
  if (!target) return { claims, changed: false };
  let changed = false;
  const next = claims.map((c) => {
    if (c.processId) return c;
    changed = true;
    const stage = findStage(target, c.currentStageId) || findStage(target, c.statusLabel) || initialStageOf(target);
    return { ...c, processId: target.id, currentStageId: stage?.id, statusLabel: stage?.name || c.statusLabel };
  });
  return { claims: next, changed };
}

/** True for workflows that hold an insurance record before any claim exists (decided by workflow TYPE, never by name). */
export const isPreClaimWorkflow = (p?: { workflowType?: string } | null): boolean => p?.workflowType === "eligibility" || p?.workflowType === "prior_auth";
/** True when a claim record currently sits in a pre-claim (eligibility / prior auth) workflow. */
export const isPreClaimClaim = (c: { processId?: string }): boolean => isPreClaimWorkflow(getClaimWorkflow(c.processId));

/** Claims proper: records in an Eligibility / Prior auth workflow are not claims yet and are left out of claim counts, A/R, denial rate and first-pass. */
export const claimsOnly = <T extends { processId?: string }>(claims: T[]): T[] => claims.filter((c) => !isPreClaimClaim(c));
/** The insurance records that are still before the claim stage. */
export const preClaimRecords = <T extends { processId?: string }>(claims: T[]): T[] => claims.filter((c) => isPreClaimClaim(c));
