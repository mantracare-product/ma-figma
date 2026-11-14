/**
 * `create_task` action (spec action 7): creates a work-queue task linked to the triggering record.
 * Idempotency: (a) per-event run key, (b) an OPEN task with the same entityRef {id, stageId} + ruleId is reused,
 * so re-entering a stage after leaving it (the old task auto-closed) legitimately creates a new task.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule } from "./useAutomationStore";
import type { TaskEntity, TaskEntityRef } from "../types/task";
import { createTaskRecord, findOpenTasksForRecord } from "./tasksStore";
import { queueIdFromName } from "./taskViewsStore";
import { renderTemplate } from "./updateFieldsAction";
import { resolveRecordContext } from "./recordContext";
import { getStoredProcesses } from "./useProcessStore";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const CREATE_TASK_STEP_KEYS = ["create_task", "create-task"];
export const isCreateTaskStep = (k: string) => CREATE_TASK_STEP_KEYS.includes((k || "").toLowerCase());

export interface CreateTaskPayload {
  title: string;
  description: string;
  queueId?: string;
  taskType?: string;
  priority?: TaskEntity["priority"];
  dueAt?: string;
  payerId?: string;
  amountAtStake?: number;
  assigneeName: string;
  entityRef: TaskEntityRef;
  clientId?: string;
  clientName?: string;
  ruleId?: string;
}

export function entityRefFromEvent(event: BusEvent, ruleId?: string): TaskEntityRef {
  const data = event.data || {};
  const isStageEnter = event.event === "stage.entered";
  const base = {
    processId: data.processId ? String(data.processId) : undefined,
    stageId: isStageEnter && data.stageId ? String(data.stageId) : undefined,
    stageName: isStageEnter && data.stageName ? String(data.stageName) : undefined,
    ruleId,
  };
  if (data.instanceId) {
    return { type: "process_instance", id: String(data.instanceId), instanceId: String(data.instanceId), ...base };
  }
  const type = event.recordType === "appointment" || event.recordType === "claim" || event.recordType === "invoice" ? event.recordType : "client";
  return { type, id: String(event.recordId), ...base };
}

function computeDueAt(params: Record<string, any>, event: BusEvent, appointmentDate?: string): string | undefined {
  const days = Number(params.dueInDays);
  const hours = Number(params.dueInHours);
  if (params.dueSource === "visit_date" && appointmentDate) return new Date(`${appointmentDate}T09:00:00`).toISOString();
  if (Number.isFinite(days) && days !== 0) return new Date(Date.now() + days * 86400000).toISOString();
  if (Number.isFinite(hours) && hours !== 0) return new Date(Date.now() + hours * 3600000).toISOString();
  if (params.dueSource === "none") return undefined;
  void event;
  return undefined;
}

export function performCreateTask(p: CreateTaskPayload): { taskId: string; reused: boolean } {
  const open = findOpenTasksForRecord({ id: p.entityRef.id, instanceId: p.entityRef.instanceId, stageId: p.entityRef.stageId, ruleId: p.ruleId })[0];
  if (open) return { taskId: open.id, reused: true };
  const task = createTaskRecord({
    title: p.title,
    description: p.description,
    status: "pending",
    isImportant: p.priority === "high" || p.priority === "urgent",
    scopeLevel: "client",
    assignee: { scopeLevel: "client", assigneeName: p.assigneeName, clientId: p.clientId, clientName: p.clientName },
    creator: { id: "system", name: "Automation", role: "system" },
    checklists: [],
    observers: [],
    subtasks: [],
    attachments: [],
    queueId: p.queueId,
    taskType: p.taskType,
    priority: p.priority || "normal",
    dueAt: p.dueAt,
    deadlineDate: p.dueAt ? p.dueAt.slice(0, 10) : undefined,
    payerId: p.payerId,
    amountAtStake: p.amountAtStake,
    source: "rule",
    entityRef: p.entityRef,
  });
  return { taskId: task.id, reused: false };
}

registerActionRetryHandler("create_task", (run) => performCreateTask(run.payload as CreateTaskPayload));

export function executeCreateTaskStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
}): RunOnceResult<any> {
  const { rule, stepId, params, event } = args;
  const ctx = resolveRecordContext(event);
  const scope = { ...(event.data || {}), client: ctx.client, appointment: ctx.appointment, instance: ctx.instance };
  let entityRef = entityRefFromEvent(event, rule.id);
  // linkTo "instance_if_present": tie the task to the process instance of the triggering record when one exists
  // (stage = the instance's current stage, so the task closes when it leaves), else keep the event's own record.
  if (params.linkTo === "instance_if_present" && ctx.instance) {
    const inst = ctx.instance;
    const proc = getStoredProcesses().find((p) => p.id === inst.processId);
    const stage = proc?.stages?.find((s) => (s.name || "").trim().toLowerCase() === (inst.currentStage || "").trim().toLowerCase());
    entityRef = {
      type: "process_instance",
      id: inst.instanceId || inst.id,
      instanceId: inst.instanceId || inst.id,
      processId: inst.processId,
      stageId: stage?.id || inst.currentStage,
      stageName: inst.currentStage,
      ruleId: rule.id,
    };
  }
  entityRef.autoCloseOnStageExit = params.autoCloseOnStageExit !== false;

  const queueName = String(params.queue || params.queueId || "").trim();
  const amountField = params.amountField ? String((scope as any)[params.amountField] ?? ctx.instance?.[params.amountField] ?? "") : "";
  const amount = Number(params.amountAtStake ?? amountField);

  const payload: CreateTaskPayload = {
    title: String(renderTemplate(params.title || rule.name || "Follow up", scope)),
    description: String(renderTemplate(params.description || "", scope)),
    queueId: queueName ? queueIdFromName(queueName) : undefined,
    taskType: params.taskType ? String(params.taskType) : undefined,
    priority: params.priority || "normal",
    dueAt: computeDueAt(params, event, ctx.appointment?.date),
    payerId: params.payerId ? String(params.payerId) : (ctx.instance as any)?.elig_payerId,
    amountAtStake: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    assigneeName: String(renderTemplate(params.assignee || "Unassigned", scope)) || "Unassigned",
    entityRef,
    clientId: ctx.clientId,
    clientName: ctx.client?.name,
    ruleId: rule.id,
  };
  const key = actionIdempotencyKey("create_task", rule.id, stepId, event.id, entityRef.id, entityRef.stageId);
  return runActionOnce(key, { actionKey: "create_task", ruleId: rule.id, ruleName: rule.name, stepId, payload: payload as any }, () =>
    performCreateTask(payload)
  );
}
