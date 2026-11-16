/**
 * Insurance-record targets (R4.4). Eligibility, prior-auth and phone-call results used to be written to a process
 * INSTANCE; they are now written to the appointment's insurance record (a claim in the Eligibility / Prior auth workflow).
 * The actions keep their instance-shaped code: `resolveInstanceLike` returns the instance row when the id is an instance
 * and a small stand-in for a claim otherwise, and these helpers read, write and move the right record.
 */
import { getProcessInstanceById, logInstanceStageMove, updateProcessInstanceStage } from "./processLogsStore";
import { getStoredClaims } from "./claimsStore";
import { claimService } from "./claimService";
import { findStage, getClaimWorkflow } from "./claimWorkflows";
import { readLocalRecordFields } from "./recordWriter";
import { getStoredProcesses } from "./useProcessStore";
import type { StageMove } from "./useAutomationStore";

export interface InstanceLike {
  id: string;
  instanceId: string;
  processId?: string;
  currentStage?: string;
  __claim?: boolean;
}

export function resolveInstanceLike(id?: string): any | undefined {
  if (!id) return undefined;
  const row = getProcessInstanceById(id);
  if (row) return row;
  const claim = getStoredClaims().find((c) => c.id === id);
  if (!claim) return undefined;
  const local = readLocalRecordFields("claim", claim.id) || {};
  return { ...local, id: claim.id, instanceId: claim.id, processId: claim.processId, currentStage: claim.statusLabel, clientId: claim.patientId, client: claim.patientName, source: claim.appointmentId ? { type: "appointment", id: String(claim.appointmentId) } : undefined, __claim: true } as InstanceLike;
}

export const targetType = (inst: any): "claim" | "process_instance" => (inst?.__claim ? "claim" : "process_instance");

/** Field values of the target (instance row properties, or the claim's registry values). */
export function readTargetFields(id: string): Record<string, any> {
  const row: any = getProcessInstanceById(id);
  if (row) return row;
  return readLocalRecordFields("claim", id) || {};
}

/** Move the target to a stage of its own workflow (name or id). Returns the stage name when it moved. */
export function moveTargetStage(id: string, stageRef: string | undefined, cause: StageMove["cause"]): string | undefined {
  if (!stageRef) return undefined;
  const row: any = getProcessInstanceById(id);
  if (row) {
    const proc = getStoredProcesses().find((p) => p.id === row.processId);
    const q = stageRef.trim().toLowerCase();
    const st = proc ? proc.stages?.find((s) => s.id === stageRef) || proc.stages?.find((s) => (s.name || "").trim().toLowerCase() === q) : { name: stageRef };
    if (!st) throw new Error(`stage "${stageRef}" not found in the instance's process`);
    if ((row.currentStage || "").trim().toLowerCase() === st.name.trim().toLowerCase()) return undefined;
    const moved = updateProcessInstanceStage(id, st.name);
    if (!moved) return undefined;
    logInstanceStageMove(moved, row.currentStage, cause);
    return st.name;
  }
  const claim = getStoredClaims().find((c) => c.id === id);
  if (!claim) return undefined;
  const wf = getClaimWorkflow(claim.processId);
  const stage = findStage(wf, stageRef);
  if (!stage) throw new Error(`stage "${stageRef}" not found in the record's workflow`);
  if (claim.currentStageId === stage.id) return undefined;
  const r = claimService.moveToStage(id, stage.id, cause);
  return r?.moved ? stage.name : undefined;
}
