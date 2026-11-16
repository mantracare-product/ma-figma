/**
 * `move_to_workflow` action (Slice 4, item 4.2): move a CLAIM to another claim workflow, optionally to a given stage
 * (default: the target workflow's initial stage). All field values are kept. A move to the workflow the claim is
 * already in (at that stage) is a no-op. Cycles are bounded by the engine's chain depth + loop guard.
 *
 * Params: workflowId (or processId / workflowName), stageId | stageName (optional).
 * R4.3: also moves an APPOINTMENT to another appointment workflow (the record is the appointment of the event, or the
 * one the event's record is linked to). A move to the workflow it is already in is a no-op.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { claimService } from "./claimService";
import { appointmentService } from "./appointmentService";
import { getStoredProcesses } from "./useProcessStore";
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

function appointmentWorkflow(ref: string) {
  const q = ref.trim().toLowerCase();
  return getStoredProcesses().find((p) => p.entityType === "appointment" && (p.id === ref || (p.name || "").trim().toLowerCase() === q));
}

/** Move an appointment to another appointment workflow (initial stage unless a stage is named). */
export function performMoveAppointmentToWorkflow(appointmentId: string, workflowRef: string, stageRef: string | undefined, cause: StageMove["cause"]): { moved: boolean; workflowId: string; stageName: string } {
  const wf = appointmentWorkflow(workflowRef);
  if (!wf) throw new Error(`move_to_workflow: appointment workflow "${workflowRef}" not found`);
  const appt: any = appointmentService.getAppointmentById(appointmentId);
  if (!appt) throw new Error(`Appointment ${appointmentId} not found`);
  const stage = (stageRef ? wf.stages.find((s) => s.id === stageRef || (s.name || "").toLowerCase() === stageRef.toLowerCase()) : undefined) || wf.stages.find((s) => s.isInitial || s.stagePosition === "initial") || wf.stages[0];
  if (!stage) throw new Error(`Workflow "${wf.name}" has no stages`);
  if (appt.processId === wf.id && (!stageRef || appt.currentStageId === stage.id)) return { moved: false, workflowId: wf.id, stageName: stage.name };
  appointmentService.moveToStage(appointmentId, stage.id, { ...(cause as any), processId: wf.id });
  return { moved: true, workflowId: wf.id, stageName: stage.name };
}

export function executeMoveToWorkflowStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
  cause: StageMove["cause"];
}): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  // appointment workflows: the record is an appointment (or is linked to one) and the target is an appointment workflow
  const apptId = event.recordType === "appointment" ? String(event.recordId) : params.entity === "appointment" ? String((event.data as any)?.appointmentId || "") : "";
  const wfRef = String(params.workflowId || params.processId || params.workflowName || "");
  if (apptId && wfRef && !resolveWorkflowId(wfRef)) {
    const stage = (params.stageId || params.stageName || undefined) as string | undefined;
    const akey = actionIdempotencyKey("move_to_workflow", apptId, wfRef, event.id);
    return runActionOnce(akey, { actionKey: "move_to_workflow", ruleId: rule.id, ruleName: rule.name, stepId }, () => performMoveAppointmentToWorkflow(apptId, wfRef, stage, cause) as any);
  }
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
