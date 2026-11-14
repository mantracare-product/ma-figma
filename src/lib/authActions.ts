/**
 * `check_auth_required` and `request_prior_auth` (Slice 3, item 3.3).
 *
 * Write targets (spec): the existing process INSTANCE (created earlier, e.g. by start_process) and/or the linked
 * APPOINTMENT. Neither action ever creates an instance: when no instance exists for the source record the write
 * falls back to the appointment only and the result reports `targetFallback: "appointment"`.
 *
 * Params (both): payerId (default: the client's primary coverage on the service date), serviceId / cptCode
 * (default: the appointment's service), stageMap { required|not_required|unknown|requested : stage } applied to the
 * instance only. Prior-auth requests are MOCK (no payer portal call): the request is recorded as Authorization
 * fields plus a history row.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { resolveRecordContext, type RecordContext } from "./recordContext";
import { writeRecordFields } from "./recordWriter";
import { getCoverageOn } from "./coveragesStore";
import { getStoredServices } from "./servicesStore";
import { isAuthRequired, type AuthRequirement } from "./priorAuthRulesStore";
import { getStoredProcesses } from "./useProcessStore";
import { getProcessInstanceById, logInstanceStageMove, updateProcessInstanceStage } from "./processLogsStore";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const CHECK_AUTH_STEP_KEYS = ["check_auth_required", "check-auth-required"];
export const REQUEST_AUTH_STEP_KEYS = ["request_prior_auth", "request-prior-auth"];
export const isCheckAuthStep = (k: string) => CHECK_AUTH_STEP_KEYS.includes((k || "").toLowerCase());
export const isRequestAuthStep = (k: string) => REQUEST_AUTH_STEP_KEYS.includes((k || "").toLowerCase());

export interface AuthStepInput {
  clientId: string;
  appointmentId?: string;
  instanceId?: string;
  serviceDate: string;
  trigger: string;
  params: Record<string, any>;
  cause: StageMove["cause"];
  /** Resolved at event time so a retry does not depend on the appointment still being open. */
  serviceRef: { serviceId?: string | number; cptCode?: string; requiresAuthDefault?: boolean };
  payerId?: string;
}

export interface AuthStepResult {
  required: boolean | "unknown";
  ruleId?: string;
  units?: number;
  validityDays?: number;
  source: AuthRequirement["source"];
  targetFallback?: "appointment";
  instanceId?: string;
  appointmentId?: string;
  stageMoved?: string;
  skipped?: boolean;
  validFrom?: string;
  validTo?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

function stageByRef(processId: string | undefined, ref: string): { name: string } | undefined {
  const proc = getStoredProcesses().find((p) => p.id === processId);
  if (!proc) return { name: ref };
  const q = ref.trim().toLowerCase();
  const st = proc.stages?.find((s) => s.id === ref) || proc.stages?.find((s) => (s.name || "").trim().toLowerCase() === q);
  return st ? { name: st.name } : undefined;
}

function moveInstance(instanceId: string, stageRef: string | undefined, cause: StageMove["cause"]): string | undefined {
  if (!stageRef) return undefined;
  const inst = getProcessInstanceById(instanceId);
  if (!inst) return undefined;
  const stage = stageByRef(inst.processId, stageRef);
  if (!stage) throw new Error(`stage "${stageRef}" not found in the instance's process`);
  if ((inst.currentStage || "").trim().toLowerCase() === stage.name.trim().toLowerCase()) return undefined;
  const moved = updateProcessInstanceStage(instanceId, stage.name);
  if (!moved) return undefined;
  logInstanceStageMove(moved, inst.currentStage, cause);
  return stage.name;
}

function appendHistory(instanceId: string, row: Record<string, any>): Record<string, any> {
  const existing = ((getProcessInstanceById(instanceId) as any)?.elig_history as any[]) || [];
  return { elig_history: [...existing, row] };
}

function evaluate(input: AuthStepInput): AuthRequirement {
  return isAuthRequired(input.payerId, input.serviceRef);
}

export function performCheckAuth(input: AuthStepInput): AuthStepResult {
  const instance = input.instanceId ? getProcessInstanceById(input.instanceId) : undefined;
  const apptId = input.appointmentId;
  if (!instance && !apptId) throw new Error("check_auth_required: no write target (no instance and no appointment)");
  const req = evaluate(input);
  const status = req.required === true ? "required" : req.required === false ? "not_required" : "unknown";
  const result: AuthStepResult = {
    required: req.required,
    ruleId: req.rule?.id,
    units: req.rule?.units,
    validityDays: req.rule?.validityDays,
    source: req.source,
  };
  const fields = { auth_required: req.required === "unknown" ? "" : req.required, auth_status: status, auth_rule_id: req.rule?.id || "" };

  if (instance) {
    const id = instance.instanceId || instance.id;
    const w = writeRecordFields({ type: "process_instance", id }, {
      ...fields,
      ...appendHistory(id, { checkedAt: new Date().toISOString(), trigger: input.trigger, source: "prior_auth_rules", status: `auth_${status}`, reasonCode: "", summary: `Authorization ${status.replace("_", " ")}`, sourceRecord: apptId ? `appointment:${apptId}` : "", rawRef: req.rule?.id || "" }),
    });
    if (!w.ok) throw new Error(w.error);
    result.instanceId = id;
    result.stageMoved = moveInstance(id, input.params.stageMap?.[status], input.cause);
  } else {
    result.targetFallback = "appointment";
  }
  if (apptId) {
    const w = writeRecordFields({ type: "appointment", id: apptId }, instance ? fields : { ...fields, auth_note: `Checked without an instance (${status})` });
    if (!w.ok) throw new Error(w.error);
    result.appointmentId = apptId;
  }
  return result;
}

export function performRequestAuth(input: AuthStepInput): AuthStepResult {
  const instance = input.instanceId ? getProcessInstanceById(input.instanceId) : undefined;
  const apptId = input.appointmentId;
  if (!instance && !apptId) throw new Error("request_prior_auth: no write target (no instance and no appointment)");
  const req = evaluate(input);
  const base: AuthStepResult = { required: req.required, ruleId: req.rule?.id, units: req.rule?.units, validityDays: req.rule?.validityDays, source: req.source };
  if (req.required !== true) return { ...base, skipped: true, instanceId: instance ? instance.instanceId || instance.id : undefined, appointmentId: apptId };

  const validFrom = input.serviceDate;
  const validTo = req.rule?.validityDays ? addDays(validFrom, req.rule.validityDays) : "";
  const today = todayStr();
  const fields: Record<string, any> = {
    auth_required: true,
    auth_status: "requested",
    auth_requested_at: today,
    auth_valid_from: validFrom,
    auth_valid_to: validTo,
    auth_units_approved: "",
    auth_rule_id: req.rule?.id || "",
    ...(input.params.referringProvider ? { auth_referring_provider: String(input.params.referringProvider) } : {}),
  };
  const result: AuthStepResult = { ...base, validFrom, validTo };
  const summary = `Prior auth requested via ${input.params.channel || "manual (mock)"}${req.rule?.units ? ` · ${req.rule.units} unit(s)` : ""}`;

  if (instance) {
    const id = instance.instanceId || instance.id;
    const w = writeRecordFields({ type: "process_instance", id }, {
      ...fields,
      ...appendHistory(id, { checkedAt: new Date().toISOString(), trigger: input.trigger, source: "prior_auth_request", status: "auth_requested", reasonCode: "", summary, sourceRecord: apptId ? `appointment:${apptId}` : "", rawRef: req.rule?.id || "" }),
    });
    if (!w.ok) throw new Error(w.error);
    result.instanceId = id;
    result.stageMoved = moveInstance(id, input.params.stageMap?.requested, input.cause);
  } else {
    result.targetFallback = "appointment";
  }
  if (apptId) {
    const w = writeRecordFields({ type: "appointment", id: apptId }, instance ? fields : { ...fields, auth_note: summary });
    if (!w.ok) throw new Error(w.error);
    result.appointmentId = apptId;
  }
  return result;
}

registerActionRetryHandler("check_auth_required", (run) => performCheckAuth(run.payload as AuthStepInput) as any);
registerActionRetryHandler("request_prior_auth", (run) => performRequestAuth(run.payload as AuthStepInput) as any);

function buildInput(rule: AutomationRule, params: Record<string, any>, event: BusEvent, cause: StageMove["cause"]): { input: AuthStepInput; ctx: RecordContext } {
  void rule;
  const ctx = resolveRecordContext(event);
  // renew: the new authorization period starts today (so it is a different request from the original).
  const serviceDate = params.renew ? todayStr() : ctx.appointment?.date || todayStr();
  const serviceId = params.serviceId ?? ctx.appointment?.serviceId;
  const svc = serviceId !== undefined ? getStoredServices().find((s) => String(s.id) === String(serviceId)) : undefined;
  const payerId = params.payerId || (ctx.clientId ? getCoverageOn(ctx.clientId, serviceDate, "primary")?.payerId : undefined);
  const input: AuthStepInput = {
    clientId: ctx.clientId || "",
    appointmentId: ctx.appointmentId,
    instanceId: ctx.instance ? ctx.instance.instanceId || ctx.instance.id : undefined,
    serviceDate,
    trigger: event.event,
    params,
    cause,
    serviceRef: {
      serviceId,
      cptCode: params.cptCode || svc?.cptCode,
      requiresAuthDefault: (svc as any)?.requiresAuthDefault,
    },
    payerId,
  };
  return { input, ctx };
}

export function executeAuthStep(args: {
  kind: "check" | "request";
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
  cause: StageMove["cause"];
}): RunOnceResult<any> {
  const { kind, rule, stepId, params, event, cause } = args;
  const { input } = buildInput(rule, params, event, cause);
  const actionKey = kind === "check" ? "check_auth_required" : "request_prior_auth";
  const key =
    kind === "check"
      ? actionIdempotencyKey(actionKey, input.instanceId || input.appointmentId || input.clientId, rule.id, event.id)
      : actionIdempotencyKey(actionKey, input.clientId, input.payerId, input.serviceRef.serviceId ?? input.serviceRef.cptCode, input.serviceDate);
  return runActionOnce(key, { actionKey, ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!input.clientId) throw new Error(`${actionKey}: cannot resolve a client from ${event.recordType} ${event.recordId}`);
    return (kind === "check" ? performCheckAuth(input) : performRequestAuth(input)) as any;
  });
}

// ── Authorization decision (manual) ────────────────────────────────────────────────────────────────

export interface AuthDecisionInput {
  /** Process instance and/or appointment to record it on (at least one). */
  instanceId?: string;
  appointmentId?: string;
  decision: "approved" | "denied";
  authNumber?: string;
  unitsApproved?: number;
  /** Optional instance stage to move to (name or id), e.g. the stage that means "cleared". */
  stage?: string;
}

/** Record the payer's decision on a prior-auth request (the mock request never decides on its own). */
export function recordAuthDecision(input: AuthDecisionInput): { instanceId?: string; appointmentId?: string; stageMoved?: string } {
  const instance = input.instanceId ? getProcessInstanceById(input.instanceId) : undefined;
  if (!instance && !input.appointmentId) throw new Error("recordAuthDecision: no record to write to");
  const fields: Record<string, any> = {
    auth_status: input.decision,
    auth_decided_at: todayStr(),
    ...(input.authNumber ? { auth_number: input.authNumber } : {}),
    ...(input.unitsApproved !== undefined ? { auth_units_approved: input.unitsApproved } : {}),
  };
  const out: { instanceId?: string; appointmentId?: string; stageMoved?: string } = {};
  if (instance) {
    const id = instance.instanceId || instance.id;
    const w = writeRecordFields({ type: "process_instance", id }, {
      ...fields,
      ...appendHistory(id, { checkedAt: new Date().toISOString(), trigger: "manual.auth_decision", source: "prior_auth_decision", status: `auth_${input.decision}`, reasonCode: "", summary: `Authorization ${input.decision}${input.authNumber ? ` (${input.authNumber})` : ""}`, sourceRecord: input.appointmentId ? `appointment:${input.appointmentId}` : "", rawRef: "" }),
    });
    if (!w.ok) throw new Error(w.error);
    out.instanceId = id;
    out.stageMoved = moveInstance(id, input.stage, { type: "manual" });
  }
  if (input.appointmentId) {
    const w = writeRecordFields({ type: "appointment", id: input.appointmentId }, fields);
    if (!w.ok) throw new Error(w.error);
    out.appointmentId = input.appointmentId;
  }
  return out;
}
