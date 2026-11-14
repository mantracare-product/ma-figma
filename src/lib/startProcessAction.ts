/**
 * `start_process` automation action (Slice 1, item f): start a NEW process instance for a client from a rule.
 *
 * - Idempotent twice over: the per-action run key (rule + step + triggering record) via `runActionOnce`, and the
 *   instance dedupe key (client + process + source) inside `startProcessInstance`.
 * - Failures are recorded as failed runs and can be retried (`retryActionRun`) from the stored payload.
 * - No process or stage names are hard-coded: everything comes from the step params / the live process list.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { getStoredProcesses } from "./useProcessStore";
import { getStoredClients } from "./clientsStore";
import { appointmentService } from "./appointmentService";
import {
  startProcessInstance,
  logInstanceStageMove,
  appointmentInstanceTitle,
  type ProcessInstanceSource,
} from "./processLogsStore";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const START_PROCESS_STEP_KEYS = ["start_process", "start-process", "startprocess"];

export function isStartProcessStep(stepKey: string): boolean {
  return START_PROCESS_STEP_KEYS.includes((stepKey || "").toLowerCase());
}

export interface StartProcessPayload {
  clientId: string;
  processRef: string;
  /** Stage id or name; empty => the process's first stage. */
  stageRef?: string;
  source: ProcessInstanceSource;
  title?: string;
  parentInstanceId?: string;
  cause: StageMove["cause"];
}

function findClient(ref: string) {
  const clients = getStoredClients();
  const q = String(ref || "").trim().toLowerCase();
  return clients.find((c) => c.id === ref) || clients.find((c) => (c.name || "").trim().toLowerCase() === q);
}

/** Does the real work; throws on any problem so the caller can record a failed run. */
export function performStartProcess(p: StartProcessPayload): { instanceId: string; created: boolean; stageName: string } {
  const proc = getStoredProcesses().find(
    (x) => x.id === p.processRef || (x.name || "").trim().toLowerCase() === (p.processRef || "").trim().toLowerCase()
  );
  if (!proc) throw new Error(`Process "${p.processRef}" not found`);
  const stages = proc.stages || [];
  if (stages.length === 0) throw new Error(`Process "${proc.name}" has no stages`);
  const q = (p.stageRef || "").trim().toLowerCase();
  const stage = q
    ? stages.find((s) => s.id === p.stageRef) || stages.find((s) => (s.name || "").trim().toLowerCase() === q)
    : stages[0];
  if (!stage) throw new Error(`Stage "${p.stageRef}" not found in process "${proc.name}"`);
  const client = findClient(p.clientId);
  if (!client) throw new Error(`Client "${p.clientId}" not found`);

  const { instance, alreadyExisted } = startProcessInstance({
    clientId: client.id,
    clientName: client.name,
    processName: proc.name,
    processId: proc.id,
    stageName: stage.name,
    source: p.source,
    title: p.title,
    parentInstanceId: p.parentInstanceId,
  });
  if (!alreadyExisted) {
    // First stage entry of the new instance: one stage.entered event, rules for that stage run per instance.
    logInstanceStageMove(instance, undefined, p.cause);
  }
  return { instanceId: instance.instanceId || instance.id, created: !alreadyExisted, stageName: instance.currentStage };
}

registerActionRetryHandler("start_process", (run) => {
  const payload = run.payload as StartProcessPayload | undefined;
  if (!payload) throw new Error("No payload stored for retry");
  return performStartProcess(payload);
});

function resolveClientRef(event: BusEvent): string | undefined {
  if (event.data?.clientId) return String(event.data.clientId);
  if (event.recordType === "client") return String(event.recordId);
  if (event.recordType === "appointment") {
    const appt = appointmentService.getAppointmentById(event.recordId);
    return appt?.clientId || appt?.clientName || undefined;
  }
  return undefined;
}

function resolveSource(event: BusEvent): ProcessInstanceSource {
  if (event.recordType === "appointment") {
    const appt = appointmentService.getAppointmentById(event.recordId);
    return {
      type: "appointment",
      id: String(event.recordId),
      title: appt
        ? appointmentInstanceTitle({ id: appt.id, serviceName: (appt as any).serviceName, title: appt.title, date: appt.date, time: appt.time })
        : undefined,
    };
  }
  if (event.recordType === "client" && event.data?.instanceId) {
    return { type: "instance", id: String(event.data.instanceId) };
  }
  return { type: event.recordType || "event", id: String(event.recordId) };
}

/** Rule-engine entry point for one `start_process` step. Never throws. */
export function executeStartProcessStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
  cause: StageMove["cause"];
}): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const processRef = String(params.processId || params.stepDetailProcess || params.processName || "");
  const stageRef = String(params.stageId || params.stageName || params.stepDetailStage || params.stepDetailStageName || "");
  const clientId = resolveClientRef(event);
  const source = resolveSource(event);

  const key = actionIdempotencyKey("start_process", rule.id, stepId, event.recordType, event.recordId, processRef);
  const payload: StartProcessPayload = {
    clientId: clientId || "",
    processRef,
    stageRef,
    source,
    title: params.title ? String(params.title) : undefined,
    parentInstanceId: event.data?.instanceId ? String(event.data.instanceId) : undefined,
    cause,
  };
  return runActionOnce(
    key,
    { actionKey: "start_process", ruleId: rule.id, ruleName: rule.name, stepId, payload: payload as any },
    () => {
      if (!processRef) throw new Error("start_process: no target process configured");
      if (!clientId) throw new Error(`start_process: cannot resolve a client from ${event.recordType} ${event.recordId}`);
      return performStartProcess(payload);
    }
  );
}
