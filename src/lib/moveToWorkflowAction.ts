/**
 * `move_to_workflow` action (Slice 4, item 4.2): move a CLAIM to another claim workflow, optionally to a given stage
 * (default: the target workflow's initial stage). All field values are kept. A move to the workflow the claim is
 * already in (at that stage) is a no-op. Cycles are bounded by the engine's chain depth + loop guard.
 *
 * Params: workflowId (or processId / workflowName), stageId | stageName (optional).
 * TODO(rcm): process-instance records are not supported yet (only claims).
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { claimService } from "./claimService";
import { getClaimWorkflows } from "./claimWorkflows";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const MOVE_TO_WORKFLOW_STEP_KEYS = ["move_to_workflow", "move-to-workflow"];
export const isMoveToWorkflowStep = (k: string) => MOVE_TO_WORKFLOW_STEP_KEYS.includes((k || "").toLowerCase());

export interface MoveToWorkflowPayload {
  claimId: string;
  workflowId: string;
  stageRef?: string;
  cause: StageMove["cause"];
}

function resolveWorkflowId(ref: string): string | undefined {
  const q = ref.trim().toLowerCase();
  const wf = getClaimWorkflows().find((p) => p.id === ref || (p.name || "").trim().toLowerCase() === q);
  return wf?.id;
}

export function performMoveToWorkflow(p: MoveToWorkflowPayload): { moved: boolean; workflowId: string; stageName: string } {
  const r = claimService.moveToWorkflow(p.claimId, p.workflowId, p.stageRef, p.cause);
  if (!r) throw new Error(`Claim ${p.claimId} not found`);
  return { moved: r.moved, workflowId: r.toWorkflowId, stageName: r.stageName };
}

registerActionRetryHandler("move_to_workflow", (run) => performMoveToWorkflow(run.payload as MoveToWorkflowPayload) as any);

export function executeMoveToWorkflowStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
  cause: StageMove["cause"];
}): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : params.claimId || (event.data as any)?.claimId;
  const rawWorkflow = String(params.workflowId || params.processId || params.workflowName || "");
  const workflowId = rawWorkflow ? resolveWorkflowId(rawWorkflow) : undefined;
  const stageRef = (params.stageId || params.stageName || undefined) as string | undefined;
  const payload: MoveToWorkflowPayload | null = claimId && workflowId ? { claimId: String(claimId), workflowId, stageRef, cause } : null;
  const key = actionIdempotencyKey("move_to_workflow", claimId, workflowId, event.id);
  return runActionOnce(key, { actionKey: "move_to_workflow", ruleId: rule.id, ruleName: rule.name, stepId, payload: (payload || undefined) as any }, () => {
    if (!claimId) throw new Error(`move_to_workflow: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    if (!rawWorkflow) throw new Error("move_to_workflow: no target workflow configured");
    if (!workflowId) throw new Error(`move_to_workflow: workflow "${rawWorkflow}" not found`);
    return performMoveToWorkflow(payload!) as any;
  });
}
