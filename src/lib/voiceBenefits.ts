/**
 * Voice results into an instance (Slice 6, item 6.4). A MOCK payer call (start_call, purpose payer_benefits) "captures"
 * benefits: they are written to the process instance as a PENDING REVIEW result (EG1 fields, source "voice", history
 * row) and the instance moves to the configured review stage. A person then accepts the result (acceptCallResult),
 * which turns it into a verified eligibility result on the instance and the appointment.
 */
import { recordRcmAudit } from "./rcmAudit";
import { getProcessInstanceById, logInstanceStageMove, updateProcessInstanceStage } from "./processLogsStore";
import { writeRecordFields } from "./recordWriter";
import { getCoverageOn } from "./coveragesStore";
import { getPayer } from "./billingSetupStore";
import { findClientByRef } from "./recordContext";
import { mockEligibilityCheck, normalizeBenefits } from "./eligibility";
import { getStoredProcesses } from "./useProcessStore";
import type { StageMove } from "./useAutomationStore";

type Cause = StageMove["cause"];

function moveByRef(instanceId: string, ref: string | undefined, cause: Cause): string | undefined {
  if (!ref) return undefined;
  const inst = getProcessInstanceById(instanceId);
  if (!inst) return undefined;
  const proc = getStoredProcesses().find((p) => p.id === inst.processId);
  const q = ref.trim().toLowerCase();
  const stage = proc ? proc.stages?.find((s) => s.id === ref) || proc.stages?.find((s) => (s.name || "").trim().toLowerCase() === q) : { name: ref };
  if (!stage) throw new Error(`stage "${ref}" not found in the instance's process`);
  if ((inst.currentStage || "").trim().toLowerCase() === stage.name.trim().toLowerCase()) return undefined;
  const moved = updateProcessInstanceStage(instanceId, stage.name);
  if (!moved) return undefined;
  logInstanceStageMove(moved, inst.currentStage, cause);
  return stage.name;
}

function appendHistory(instanceId: string, row: Record<string, any>) {
  const existing = ((getProcessInstanceById(instanceId) as any)?.elig_history as any[]) || [];
  return { elig_history: [...existing, row] };
}

export function captureVoiceBenefits(input: { instanceId: string; callId: string; resultStage?: string; cause: Cause }): { stageMoved?: string; copay?: number } {
  const inst = getProcessInstanceById(input.instanceId);
  if (!inst) throw new Error(`Instance ${input.instanceId} not found`);
  const client: any = findClientByRef(inst.clientId);
  const apptId = inst.source?.type === "appointment" ? String(inst.source.id) : undefined;
  const cov = getCoverageOn(inst.clientId, new Date().toISOString().slice(0, 10), "primary");
  // What the (mock) payer rep read out: a standard active-plan benefit set.
  const res = mockEligibilityCheck({ payerId: cov?.payerId || "", memberId: cov?.memberId || "", serviceDate: new Date().toISOString().slice(0, 10), serviceTypes: ["30"], scenario: "active" });
  const n = normalizeBenefits(res.benefits, ["30"]);
  const now = new Date().toISOString();
  const w = writeRecordFields(
    { type: "process_instance", id: input.instanceId },
    {
      elig_status: "pending_review",
      elig_source: "voice",
      elig_payer: (cov ? getPayer(cov.payerId)?.name : undefined) || "",
      elig_copay: n.summary.copay ?? "",
      elig_deductible_remaining: n.summary.deductibleRemaining ?? "",
      elig_coinsurance: n.summary.coinsurancePercent ?? "",
      elig_oop_remaining: n.summary.oopRemaining ?? "",
      elig_checked_at: now,
      elig_benefits: n.lines,
      voice_call_id: input.callId,
      ...appendHistory(input.instanceId, { checkedAt: now, trigger: "start_call", source: "voice", status: "pending_review", reasonCode: "", summary: `Benefits captured by phone (mock): copay ${n.summary.copay ?? "-"}`, sourceRecord: apptId ? `appointment:${apptId}` : "", rawRef: input.callId }),
    }
  );
  if (!w.ok) throw new Error(w.error);
  void client;
  return { stageMoved: moveByRef(input.instanceId, input.resultStage, input.cause), copay: n.summary.copay };
}

/** Accept a captured voice result: it becomes a verified result on the instance and its appointment. */
export function acceptCallResult(input: { instanceId: string; stage?: string; cause?: Cause }): { stageMoved?: string } {
  const inst: any = getProcessInstanceById(input.instanceId);
  if (!inst) throw new Error(`Instance ${input.instanceId} not found`);
  if (inst.elig_status !== "pending_review") throw new Error("There is no call result waiting for review on this instance");
  recordRcmAudit({ action: "updated", entityType: "process_instance", entityId: input.instanceId, summary: "Accepted the phone call benefits result", after: { elig_status: "active" } });
  const now = new Date().toISOString();
  const w = writeRecordFields(
    { type: "process_instance", id: input.instanceId },
    { elig_status: "active", elig_checked_at: now, ...appendHistory(input.instanceId, { checkedAt: now, trigger: "manual.accept_call_result", source: "voice_accepted", status: "active", reasonCode: "", summary: "Call result accepted", sourceRecord: "", rawRef: inst.voice_call_id || "" }) }
  );
  if (!w.ok) throw new Error(w.error);
  if (inst.source?.type === "appointment") {
    const summary = `Active (accepted from call)${inst.elig_copay !== "" ? ` · copay ${inst.elig_copay}` : ""}`;
    writeRecordFields(
      { type: "appointment", id: String(inst.source.id) },
      { elig_status: "active", elig_copay: inst.elig_copay ?? "", elig_deductible_remaining: inst.elig_deductible_remaining ?? "", elig_checked_at: now, elig_instance_id: input.instanceId, coverage: { instanceId: input.instanceId, status: "active", checkedAt: now, summary } }
    );
  }
  return { stageMoved: moveByRef(input.instanceId, input.stage, input.cause || { type: "manual" }) };
}
