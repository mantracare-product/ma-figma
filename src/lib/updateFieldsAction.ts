/**
 * `update_fields` action (spec action 9, replaces the in-memory-only `fieldupdate`).
 * Params: targets: string[] of "this" | "instance" | "appointment" | "client" | "claim" | "invoice" (default ["this"]);
 *         fields: { [fieldKey]: valueTemplate } where {{path}} reads event.data / context values.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule } from "./useAutomationStore";
import { resolveRecordContext } from "./recordContext";
import { writeRecordFields, type RecordRef } from "./recordWriter";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const UPDATE_FIELDS_STEP_KEYS = ["update_fields", "update-fields"];
export const isUpdateFieldsStep = (k: string) => UPDATE_FIELDS_STEP_KEYS.includes((k || "").toLowerCase());

export function renderTemplate(tpl: unknown, scope: Record<string, any>): unknown {
  if (typeof tpl !== "string") return tpl;
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const v = path.split(".").reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), scope);
    return v == null ? "" : String(v);
  });
}

export interface UpdateFieldsPayload {
  refs: RecordRef[];
  values: Record<string, any>;
}

function performUpdate(p: UpdateFieldsPayload): { written: number } {
  let written = 0;
  const errors: string[] = [];
  for (const ref of p.refs) {
    const r = writeRecordFields(ref, p.values);
    if (r.ok) written += r.written.length;
    else errors.push(r.error || "write failed");
  }
  if (errors.length && written === 0) throw new Error(errors.join("; "));
  return { written };
}

registerActionRetryHandler("update_fields", (run) => performUpdate(run.payload as UpdateFieldsPayload));

export function executeUpdateFieldsStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
}): RunOnceResult<any> {
  const { rule, stepId, params, event } = args;
  const ctx = resolveRecordContext(event);
  const targets: string[] = Array.isArray(params.targets) && params.targets.length ? params.targets : ["this"];
  const refs: RecordRef[] = [];
  for (const t of targets) {
    if (t === "this") {
      if (event.recordType === "appointment") refs.push({ type: "appointment", id: event.recordId });
      else if (event.recordType === "claim") refs.push({ type: "claim", id: event.recordId });
      else if (event.recordType === "invoice") refs.push({ type: "invoice", id: event.recordId });
      else if (ctx.instance) refs.push({ type: "process_instance", id: ctx.instance.instanceId || ctx.instance.id });
      else if (ctx.clientId) refs.push({ type: "client", id: ctx.clientId });
    } else if (t === "instance" && ctx.instance) refs.push({ type: "process_instance", id: ctx.instance.instanceId || ctx.instance.id });
    else if (t === "appointment" && ctx.appointmentId) refs.push({ type: "appointment", id: ctx.appointmentId });
    else if (t === "client" && ctx.clientId) refs.push({ type: "client", id: ctx.clientId });
    else if (t === "claim" && event.recordType === "claim") refs.push({ type: "claim", id: event.recordId });
    else if (t === "invoice" && event.recordType === "invoice") refs.push({ type: "invoice", id: event.recordId });
  }
  const scope = { ...(event.data || {}), client: ctx.client, appointment: ctx.appointment, instance: ctx.instance };
  const values: Record<string, any> = {};
  const fields = (params.fields && typeof params.fields === "object" ? params.fields : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(fields)) values[k] = renderTemplate(v, scope);

  const hash = JSON.stringify(values);
  const key = actionIdempotencyKey("update_fields", rule.id, stepId, event.id, refs.map((r) => `${r.type}:${r.id}`).join(","), hash);
  return runActionOnce(key, { actionKey: "update_fields", ruleId: rule.id, ruleName: rule.name, stepId, payload: { refs, values } }, () => {
    if (refs.length === 0) throw new Error("update_fields: no target record could be resolved");
    return performUpdate({ refs, values });
  });
}
