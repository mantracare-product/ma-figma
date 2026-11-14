/**
 * claimService (Slice 4, item 4.2): the ONE door for claim stage changes (like appointmentService / invoiceService).
 * Every move saves the claim, derives its status from the stage category, logs one StageMove (which emits one
 * stage.entered and one stage.exited carrying the FROM workflow) and emits the claim domain event
 * `claim.<stage systemCategory>` (claim.submitted, claim.rejected, claim.denied, claim.paid, claim.partially_paid ...).
 *
 * A claim can change workflow (moveToWorkflow, used by the move_to_workflow action): it keeps all its field values.
 */
import { getStoredClaims, saveClaim, type Claim } from "./claimsStore";
import { claimStatusForStage, findStage, getClaimWorkflow, getClaimWorkflows, initialStageOf } from "./claimWorkflows";
import { logStageMove, type StageMove } from "./useAutomationStore";
import { eventBus } from "./eventBus";

export type MoveCause = StageMove["cause"];

export interface ClaimMoveResult {
  claim: Claim;
  moved: boolean;
  fromWorkflowId?: string;
  toWorkflowId: string;
  stageName: string;
}

function emitDomainEvent(claim: Claim, category?: string, cause?: MoveCause): void {
  const cat = (category || "").trim().toLowerCase();
  if (!cat) return;
  void eventBus.emit(`claim.${cat}`, "claim", claim.id, { ...claim, claimId: claim.id, clientId: claim.patientId, chain: cause?.chain });
}

function move(claimId: string, workflowId: string | undefined, stageRef: string | undefined, cause: MoveCause): ClaimMoveResult | null {
  const claim = getStoredClaims().find((c) => c.id === claimId);
  if (!claim) return null;
  const fromWorkflow = getClaimWorkflow(claim.processId) || getClaimWorkflows()[0];
  const toWorkflow = workflowId ? getClaimWorkflow(workflowId) : fromWorkflow;
  if (!toWorkflow) throw new Error(`Claim workflow "${workflowId}" not found`);
  const stage = stageRef ? findStage(toWorkflow, stageRef) : initialStageOf(toWorkflow);
  if (!stage) throw new Error(`Stage "${stageRef}" not found in workflow "${toWorkflow.name}"`);

  const fromStage = findStage(fromWorkflow, claim.currentStageId) || findStage(fromWorkflow, claim.statusLabel);
  const sameWorkflow = (claim.processId || fromWorkflow?.id) === toWorkflow.id;
  if (sameWorkflow && fromStage?.id === stage.id) {
    return { claim, moved: false, fromWorkflowId: fromWorkflow?.id, toWorkflowId: toWorkflow.id, stageName: stage.name };
  }

  const updated: Claim = {
    ...claim,
    processId: toWorkflow.id,
    currentStageId: stage.id,
    statusLabel: stage.name,
    status: claimStatusForStage(stage),
    updatedAt: new Date().toISOString(),
  };
  saveClaim(updated);

  logStageMove(
    {
      orgId: "default",
      recordType: "claim",
      recordId: claim.id,
      fromStageId: fromStage?.id,
      fromStageName: fromStage?.name || claim.statusLabel,
      fromProcessId: fromWorkflow?.id,
      fromProcessName: fromWorkflow?.name,
      toStageId: stage.id,
      toStageName: stage.name,
      processId: toWorkflow.id,
      processName: toWorkflow.name,
      clientId: claim.patientId,
      cause,
    },
    { recordData: { ...updated, claimId: updated.id } }
  );
  emitDomainEvent(updated, stage.systemCategory, cause);
  return { claim: updated, moved: true, fromWorkflowId: fromWorkflow?.id, toWorkflowId: toWorkflow.id, stageName: stage.name };
}

export const claimService = {
  /** Create a claim directly in a workflow stage (default: initial). Emits one stage.entered (no exit) + claim.<category>. */
  create(claim: Claim, workflowId: string, stageRef?: string, cause: MoveCause = { type: "manual" }): Claim {
    const wf = getClaimWorkflow(workflowId);
    if (!wf) throw new Error(`Claim workflow "${workflowId}" not found`);
    const stage = stageRef ? findStage(wf, stageRef) : initialStageOf(wf);
    if (!stage) throw new Error(`Stage "${stageRef}" not found in workflow "${wf.name}"`);
    const created: Claim = { ...claim, processId: wf.id, currentStageId: stage.id, statusLabel: stage.name, status: claimStatusForStage(stage) };
    saveClaim(created);
    logStageMove(
      { orgId: "default", recordType: "claim", recordId: created.id, toStageId: stage.id, toStageName: stage.name, processId: wf.id, processName: wf.name, clientId: created.patientId, cause },
      { recordData: { ...created, claimId: created.id } }
    );
    emitDomainEvent(created, stage.systemCategory, cause);
    return created;
  },

  /** Move within the claim's current workflow. */
  moveToStage(claimId: string, stageRef: string, cause: MoveCause = { type: "manual" }): ClaimMoveResult | null {
    return move(claimId, undefined, stageRef, cause);
  },

  /** Move to another workflow (default: its initial stage). No-op when already there. */
  moveToWorkflow(claimId: string, workflowId: string, stageRef?: string, cause: MoveCause = { type: "manual" }): ClaimMoveResult | null {
    return move(claimId, workflowId, stageRef, cause);
  },

  /** Rule engine entry: a move whose target process may be another workflow. */
  moveFromRule(claimId: string, workflowId: string | undefined, stageRef: string, cause: MoveCause): ClaimMoveResult | null {
    return move(claimId, workflowId, stageRef, cause);
  },

  /** Used by Undo: put the claim back without emitting new stage events. */
  restore(claimId: string, workflowId: string | undefined, stageId: string | undefined): Claim | null {
    const claim = getStoredClaims().find((c) => c.id === claimId);
    if (!claim) return null;
    const wf = getClaimWorkflow(workflowId || claim.processId) || getClaimWorkflows()[0];
    const stage = findStage(wf, stageId) || initialStageOf(wf);
    const updated: Claim = {
      ...claim,
      processId: wf.id,
      currentStageId: stage?.id,
      statusLabel: stage?.name || claim.statusLabel,
      status: claimStatusForStage(stage),
      updatedAt: new Date().toISOString(),
    };
    saveClaim(updated);
    return updated;
  },
};
