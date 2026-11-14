import { eventBus, BusEvent } from "./eventBus";
import {
  AutomationRule,
  AutomationCondition,
  getStoredRules,
  saveStoredRules,
  logStageMove,
  validateRuleEntityTarget,
  compareRulesByOrder,
} from "./useAutomationStore";
import { getStoredProcesses, Process } from "./useProcessStore";
import { appointmentService } from "./appointmentService";
import { invoiceService, generateInvoiceDocument } from "./invoiceService";
import { getClientProducts } from "./servicesStore";
import { saveClientDocument, StoredClientDocument } from "./clientDocumentsStore";
import { appendActivity } from "./activityEngine";
import { getStoredDocumentTemplates } from "./documentTemplatesStore";
import { getClientList } from "./getClientList";
import { moveClientToStage, getStoredClients } from "./clientsStore";
import {
  getPrimaryInstance,
  getProcessInstanceById,
  updateProcessInstanceStage,
  logInstanceStageMove,
  isActiveInstance,
} from "./processLogsStore";
import { getStoredClaims, moveClaimToStage } from "./claimsStore";
import type { RuleChainContext, StageMove } from "./useAutomationStore";
import { executeStartProcessStep, isStartProcessStep } from "./startProcessAction";
import { executeUpdateFieldsStep, isUpdateFieldsStep } from "./updateFieldsAction";
import { executeCreateTaskStep, isCreateTaskStep } from "./createTaskAction";
import "./taskAutoClose";

const MAX_CHAIN_DEPTH = 10;
const executedIdempotencyKeys = new Set<string>();

/**
 * Stage events for client-in-process moves carry `recordId = instanceId` (so every instance is its own
 * record: idempotency, undo and tasks are per instance) plus `data.clientId`. Most actions were written
 * with "client event => recordId is the client id", so for actions we present the event with
 * `recordId = clientId`; the instance stays available as `event.data.instanceId`.
 */
function toActionEvent(raw: BusEvent): BusEvent {
  if (raw.recordType === "client" && raw.data?.instanceId && raw.data?.clientId) {
    return { ...raw, recordId: String(raw.data.clientId) };
  }
  return raw;
}

/** Cause for a stage move made by a rule; carries the loop-guard chain so bus-driven cascades stay bounded. */
function ruleCause(
  rule: AutomationRule,
  event: BusEvent,
  depth: number,
  visited: Set<string>
): StageMove["cause"] {
  const chain: RuleChainContext = { depth: depth + 1, visited: [...visited, rule.id] };
  return {
    type: "rule",
    ruleId: rule.id,
    ruleName: rule.name,
    eventId: event.id,
    eventName: event.event,
    chain,
  };
}

/**
 * Move a client within a process, by INSTANCE. Resolution order: the instance named by the triggering event
 * (if it belongs to the target process), else the client's primary (most recent active) instance of that
 * process. Instance moves never write client.stage. With no instance, falls back to the client-level move.
 */
function moveClientInProcess(opts: {
  clientId: string;
  processRef?: string;
  stageRef: string;
  event: BusEvent;
  cause: StageMove["cause"];
}): { moved: boolean; instanceId?: string; stageName?: string } {
  const { clientId, processRef, stageRef, event, cause } = opts;
  if (!clientId || !stageRef) return { moved: false };
  const processes = getStoredProcesses();
  const refLower = (processRef || "").trim().toLowerCase();
  const proc = refLower
    ? processes.find((p) => p.id === processRef || (p.name || "").trim().toLowerCase() === refLower)
    : undefined;

  if (!proc) {
    const updated = moveClientToStage(clientId, stageRef, processRef, { cause });
    return { moved: !!updated, stageName: updated?.stage };
  }

  const q = stageRef.trim().toLowerCase();
  const stage =
    proc.stages?.find((s) => s.id === stageRef) ||
    proc.stages?.find((s) => (s.name || "").trim().toLowerCase() === q) ||
    proc.stages?.find((s) => (s.name || "").toLowerCase().includes(q));
  if (!stage) {
    console.warn(`[RuleEngine] Stage "${stageRef}" not found in process "${proc.name}"; client move skipped.`);
    return { moved: false };
  }

  const eventInstanceId = event.data?.instanceId ? String(event.data.instanceId) : undefined;
  let instance = eventInstanceId ? getProcessInstanceById(eventInstanceId) : undefined;
  if (
    instance &&
    !(
      (instance.processId && instance.processId === proc.id) ||
      (instance.process || "").trim().toLowerCase() === (proc.name || "").trim().toLowerCase()
    )
  ) {
    instance = undefined; // the event's instance belongs to another process
  }
  if (!instance) instance = getPrimaryInstance(clientId, proc.name, { warn: false });

  if (instance && isActiveInstance(instance)) {
    const fromStageName = instance.currentStage;
    const updated = updateProcessInstanceStage(instance.instanceId || instance.id, stage.name);
    if (updated) {
      logInstanceStageMove(updated, fromStageName, cause);
      return { moved: true, instanceId: updated.instanceId, stageName: stage.name };
    }
  }

  const updatedClient = moveClientToStage(clientId, stage.id, proc.id, { cause });
  return { moved: !!updatedClient, stageName: updatedClient?.stage };
}

/**
 * Check if condition matches event data / record properties
 */
export function evaluateCondition(condition: any, data: Record<string, any> = {}): boolean {
  if (!condition) return true;
  const fieldKey = condition.field || condition.fieldToFilter || condition.fieldKey || "";
  if (!fieldKey) return true;

  // Resolve actual value from event data
  let actualValue = data[fieldKey];
  if (actualValue === undefined && fieldKey.includes(".")) {
    const parts = fieldKey.split(".");
    actualValue = data[parts[parts.length - 1]];
  }
  if (actualValue === undefined) {
    const lowerKey = fieldKey.toLowerCase();
    const shortKey = fieldKey.includes(".") ? fieldKey.split(".").pop()?.toLowerCase() : lowerKey;
    const foundKey = Object.keys(data).find(
      (k) => k.toLowerCase() === lowerKey || (shortKey && k.toLowerCase() === shortKey)
    );
    if (foundKey) actualValue = data[foundKey];
  }

  const op = (condition.op || condition.operator || "equals").toLowerCase();
  let targetValue = condition.value ?? condition.filterValue ?? condition.targetValue ?? "";

  // Dynamic field value comparison support (e.g. Due Amount > Paid Amount)
  if (condition.valueType === "dynamic" && condition.dynamicField) {
    const dynKey = condition.dynamicField;
    let dynActual = data[dynKey];
    if (dynActual === undefined && dynKey.includes(".")) {
      const parts = dynKey.split(".");
      dynActual = data[parts[parts.length - 1]];
    }
    if (dynActual === undefined) {
      const lowerKey = dynKey.toLowerCase();
      const shortKey = dynKey.includes(".") ? dynKey.split(".").pop()?.toLowerCase() : lowerKey;
      const foundKey = Object.keys(data).find(
        (k) => k.toLowerCase() === lowerKey || (shortKey && k.toLowerCase() === shortKey)
      );
      if (foundKey) dynActual = data[foundKey];
    }
    if (dynActual !== undefined) {
      targetValue = dynActual;
    }
  }

  const normSource = (v: any) => {
    const s = String(v ?? "").trim().toLowerCase().replace(/[_\s-]+/g, " ");
    if (s.includes("walk") || s.includes("reception")) return "walked in";
    if (s.includes("ma client") || s.includes("patient portal") || s.includes("client portal")) return "ma-client";
    if (s.includes("inbound") || s.includes("call")) return "inbound call";
    return s;
  };

  const isSourceField = fieldKey.toLowerCase().includes("source");
  if (isSourceField) {
    const nsActual = normSource(actualValue);
    const nsTarget = normSource(targetValue);
    if (op === "equals" || op === "equal_to" || op === "is") {
      return nsActual === nsTarget || String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    }
    if (op === "not_equals" || op === "not_equal_to" || op === "is_not") {
      return nsActual !== nsTarget && String(actualValue ?? "").trim().toLowerCase() !== String(targetValue ?? "").trim().toLowerCase();
    }
  }

  switch (op) {
    case "equals":
    case "equal_to":
    case "is":
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    case "not_equals":
    case "not_equal_to":
    case "is_not":
      return String(actualValue ?? "").trim().toLowerCase() !== String(targetValue ?? "").trim().toLowerCase();
    case "contains":
    case "includes":
      return String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "not_contains":
      return !String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "starts_with":
      return String(actualValue ?? "").toLowerCase().startsWith(String(targetValue ?? "").toLowerCase());
    case "ends_with":
      return String(actualValue ?? "").toLowerCase().endsWith(String(targetValue ?? "").toLowerCase());
    case "greater_than":
    case "gt":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
    case "lt":
      return Number(actualValue) < Number(targetValue);
    case "greater_than_or_equal":
    case "gte":
      return Number(actualValue) >= Number(targetValue);
    case "less_than_or_equal":
    case "lte":
      return Number(actualValue) <= Number(targetValue);
    case "is_empty":
    case "empty":
      return actualValue === undefined || actualValue === null || String(actualValue).trim() === "";
    case "is_not_empty":
    case "not_empty":
      return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
    default:
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
  }
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  skippedReason?: string;
  movedToStageId?: string;
  movedToStageName?: string;
}

export function flattenRuleSteps(steps: any[]): any[] {
  const flattened: any[] = [];
  if (!Array.isArray(steps)) return flattened;
  for (const step of steps) {
    flattened.push(step);
    if (Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        if (Array.isArray(branch.steps)) {
          flattened.push(...flattenRuleSteps(branch.steps));
        }
      }
    }
  }
  return flattened;
}

/**
 * Core Rule Execution Engine
 */
export async function executeRulesForEvent(
  rawEvent: BusEvent,
  depth = 0,
  visitedRules: Set<string> = new Set()
): Promise<RuleExecutionResult[]> {
  // `rawEvent.recordId` may be an instanceId (client-process moves); actions see the client id (see toActionEvent).
  const event = toActionEvent(rawEvent);
  if (depth >= MAX_CHAIN_DEPTH) {
    console.warn(`[RuleEngine] Max execution chain depth (${MAX_CHAIN_DEPTH}) reached for record ${event.recordId}. Aborting cascade.`);
    return [];
  }

  const allRules = getStoredRules(event.orgId);
  const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/[\s_-]+/g, ".");
  const busEvt = norm(event.event);

  const matchingRules = allRules.filter((r) => {
    if (!r.enabled) return false;
    const ruleEvt = norm(r.trigger?.event);
    const ruleLabel = norm(r.trigger?.label);

    const isDirectMatch = ruleEvt === busEvt || ruleLabel === busEvt;
    const isCheckinMatch =
      (ruleEvt.includes("checked.in") || ruleLabel.includes("checked.in")) &&
      busEvt.includes("checked.in");
    const isStageMatch =
      (ruleEvt === "stage.entered" || ruleEvt === "stage.entry" || ruleEvt.endsWith(".entered_stage") || ruleEvt.endsWith(".entered.stage")) &&
      (busEvt === "stage.entered" || busEvt === "stage.entry" || busEvt.endsWith(".entered_stage") || busEvt.endsWith(".entered.stage"));
    const isStageExitMatch =
      (ruleEvt === "stage.exited" || ruleEvt === "stage.exit" || ruleEvt.endsWith(".exited_stage") || ruleEvt.endsWith(".exited.stage")) &&
      (busEvt === "stage.exited" || busEvt === "stage.exit" || busEvt.endsWith(".exited_stage") || busEvt.endsWith(".exited.stage"));
    const isFieldMatch =
      (ruleEvt.includes("field") || ruleEvt === "field_update") &&
      (busEvt.includes("field") || busEvt === "field_update");

    if (!isDirectMatch && !isCheckinMatch && !isStageMatch && !isStageExitMatch && !isFieldMatch) {
      return false;
    }

    const ruleEntity = (r.entityType || "").toLowerCase();
    const eventRecord = (event.recordType || "").toLowerCase();
    const isCheckinCross =
      (busEvt.includes("checked.in") || ruleEvt.includes("checked.in")) &&
      ((ruleEntity === "client" && eventRecord === "appointment") || (ruleEntity === "appointment" && eventRecord === "client"));

    if (
      ruleEntity &&
      ruleEntity !== eventRecord &&
      !ruleEvt.startsWith(`${eventRecord}.`) &&
      !ruleLabel.startsWith(eventRecord)
    ) {
      if (!isStageMatch && !isStageExitMatch && !isFieldMatch && !isCheckinCross) {
        return false;
      }
    }

    return true;
  });

  // Rules matching one event run in a defined order: ascending `order` (default 100), ties by creation time. Each
  // rule's whole action chain completes (is awaited) before the next rule starts, so a later rule can rely on what an
  // earlier one did. (Before this, rules ran in stored-array order, i.e. newest-created first, with no explicit order.)
  matchingRules.sort(compareRulesByOrder);

  const results: RuleExecutionResult[] = [];
  const processes = getStoredProcesses();

  for (const rule of matchingRules) {
    // Stage Filter check
    if (rule.trigger.event.startsWith("stage.") || rule.trigger.event.includes("stage")) {
      const filterStageId = rule.trigger.params?.triggerStageId || rule.trigger.params?.stageId;
      if (filterStageId && filterStageId !== "all") {
        const evStageId = event.data?.stageId || event.data?.toStageId || event.data?.currentStageId;
        if (evStageId && evStageId !== filterStageId) {
          continue;
        }
      }
      const filterProcessId = rule.trigger.params?.triggerProcessId || rule.trigger.params?.processId;
      if (filterProcessId && filterProcessId !== "all") {
        const evProcessId = event.data?.processId;
        if (evProcessId && evProcessId !== filterProcessId) {
          continue;
        }
      }
    }

    // Field Update Filter check
    if (
      rule.trigger.event === "field.updated" ||
      rule.trigger.event === "field_update" ||
      rule.trigger.event.includes("field")
    ) {
      const monitoredFields: string[] =
        rule.trigger.params?.monitoredFields || rule.trigger.params?.fields || [];
      const matchLogic: string = rule.trigger.params?.matchLogic || "any";

      if (monitoredFields.length > 0) {
        const updatedFieldsList: string[] = [];
        if (event.data?.updatedFields && Array.isArray(event.data.updatedFields)) {
          updatedFieldsList.push(...event.data.updatedFields);
        }
        if (event.data?.updatedField && typeof event.data.updatedField === "string") {
          updatedFieldsList.push(event.data.updatedField);
        }
        if (event.data?.fieldKey && typeof event.data.fieldKey === "string") {
          updatedFieldsList.push(event.data.fieldKey);
        }

        const normClean = (s: string) =>
          s.trim().toLowerCase().replace(/^\{+|\}+$/g, "").replace(/[^a-z0-9]/g, "");
        const normUpdated = new Set(updatedFieldsList.map(normClean));

        if (normUpdated.size > 0) {
          const normMonitored = monitoredFields.map(normClean);
          if (matchLogic === "all") {
            const allMatch = normMonitored.every((f) => normUpdated.has(f));
            if (!allMatch) {
              continue;
            }
          } else {
            // "any"
            const anyMatch = normMonitored.some((f) => normUpdated.has(f));
            if (!anyMatch) {
              continue;
            }
          }
        }
      }
    }

    // 1. Loop Guard
    if (visitedRules.has(rule.id)) {
      console.warn(`[RuleEngine] Loop guard prevented rule "${rule.name}" (${rule.id}) from re-firing in the same chain.`);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Loop guard triggered (re-fire within same execution chain)",
      });
      continue;
    }

    // 2. Idempotency Check — keyed on the RAW record id (the instanceId for instance moves), so two instances
    // of one client never collapse into one execution.
    const idempotencyKey = `${rawEvent.recordId}:${rule.id}:${event.id}`;
    if (executedIdempotencyKeys.has(idempotencyKey)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Idempotent duplicate execution skipped",
      });
      continue;
    }

    // 3. Entity Target Validation
    const validation = validateRuleEntityTarget(rule, processes);
    if (!validation.valid) {
      console.error(`[RuleEngine] Rule validation failed for "${rule.name}":`, validation.error);
      rule.health = "failed";
      rule.healthMessage = validation.error;
      saveStoredRules(allRules);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: `Validation failed: ${validation.error}`,
      });
      continue;
    }

    // 4. Evaluate Conditions & Trigger Conditions
    let conditionsPass = true;
    if (rule.conditions && rule.conditions.length > 0) {
      for (const cond of rule.conditions) {
        if (!evaluateCondition(cond, event.data || {})) {
          conditionsPass = false;
          break;
        }
      }
    }

    const triggerConditions = rule.trigger.params?.triggerConditions || [];
    if (conditionsPass && Array.isArray(triggerConditions) && triggerConditions.length > 0) {
      for (const cond of triggerConditions) {
        if (!evaluateCondition(cond, event.data || {})) {
          conditionsPass = false;
          break;
        }
      }
    }

    if (!conditionsPass) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Conditions did not match event data",
      });
      continue;
    }

    // 5. Mark idempotency key as executed
    executedIdempotencyKeys.add(idempotencyKey);
    if (executedIdempotencyKeys.size > 2000) {
      const first = executedIdempotencyKeys.values().next().value;
      if (first) executedIdempotencyKeys.delete(first);
    }

    // 6. Handle top-level moveToStage action ONLY if a valid stageId is provided
    const hasTopLevelMove = Boolean(
      rule.action?.type === "moveToStage" && rule.action?.stageId && rule.action.stageId.trim() !== ""
    );
    const targetProcess = hasTopLevelMove ? processes.find((p) => p.id === rule.action.processId) : undefined;
    const targetStage = hasTopLevelMove ? targetProcess?.stages.find((s) => s.id === rule.action.stageId) : undefined;

    if (hasTopLevelMove && rule.action?.stageId) {
      // Dispatch by record type. Exactly ONE stage move is logged (and so ONE stage.entered is emitted) per rule action:
      // appointment/invoice are logged inside their services, client-in-process moves by logInstanceStageMove, claims below.
      // (This used to log here AND again in the service, and treat every non-appointment/invoice record as a client.)
      const moveCause = ruleCause(rule, event, depth, visitedRules);
      const actionStageId = rule.action.stageId;
      try {
        if (event.recordType === "appointment") {
          appointmentService.moveToStage(event.recordId, actionStageId, {
            ...moveCause,
            processId: rule.action.processId,
          });
        } else if (event.recordType === "invoice") {
          invoiceService.moveToStage(event.recordId, actionStageId, moveCause);
        } else if (event.recordType === "client") {
          const clientId = event.data?.clientId || event.recordId;
          if (clientId) {
            moveClientInProcess({
              clientId: String(clientId),
              processRef: rule.action.processId,
              stageRef: actionStageId,
              event,
              cause: moveCause,
            });
          }
        } else if (event.recordType === "claim") {
          const claimBefore = getStoredClaims().find((c) => c.id === event.recordId);
          const moved = moveClaimToStage(event.recordId, actionStageId, targetStage?.name || rule.action.stageName);
          if (moved) {
            logStageMove(
              {
                orgId: event.orgId || "default",
                recordType: "claim",
                recordId: event.recordId,
                fromStageId: claimBefore?.currentStageId,
                fromStageName: claimBefore?.statusLabel,
                toStageId: actionStageId,
                toStageName: targetStage?.name || rule.action.stageName || moved.statusLabel || "Unknown Stage",
                processId: rule.action.processId,
                processName: targetProcess?.name || rule.action.processName,
                cause: moveCause,
              },
              { recordData: { ...moved } }
            );
          }
        } else {
          console.warn(
            `[RuleEngine] No stage mover is registered for record type "${event.recordType}"; move skipped ` +
              `(it used to be applied to a client record by mistake).`
          );
        }
      } catch (err) {
        console.warn(`[RuleEngine] Failed to move ${event.recordType} ${event.recordId} to stage ${actionStageId}:`, err);
      }
    }

    // 7. Execute Rule's Step Actions Chain (from FlowBuilderTab / Canvas / Library)
    const allActions = flattenRuleSteps(rule.actions && rule.actions.length > 0 ? rule.actions : (rule as any).steps || []);
    for (const act of allActions) {
      const stepKey = (act.stepKey || "").toLowerCase();

      // Condition Step Node: Gate downstream steps behind condition rules
      if (stepKey === "condition") {
        const rules = act.params?.conditionRules || [];
        if (Array.isArray(rules) && rules.length > 0) {
          const pass = rules.every((r: any) => evaluateCondition(r, event.data || {}));
          if (!pass) {
            console.log(`[RuleEngine] Condition step "${act.name || act.id}" evaluated to false. Halting flow for rule "${rule.name}".`);
            break;
          }
        }
      }

      // Action: Field Update
      if (stepKey === "fieldupdate" || stepKey === "field-update" || stepKey === "field_update") {
        const blocks = act.params?.fieldUpdateBlocks || [];
        if (Array.isArray(blocks) && blocks.length > 0) {
          for (const block of blocks) {
            const fieldKey = block.fieldToEdit || block.field;
            const updateVal = block.updateValue !== undefined ? block.updateValue : block.value;
            if (fieldKey) {
              if (event.data) {
                event.data[fieldKey] = updateVal;
              }
              appendActivity({
                type: "field_update",
                clientId: String(event.recordId),
                processId: "general",
                processName: "Field Update Automation",
                timestamp: new Date().toISOString(),
                fieldLabel: block.fieldLabel || fieldKey,
                newValue: String(updateVal),
                details: {
                  primary: `Field ${block.fieldLabel || fieldKey} updated to "${updateVal}"`,
                  secondary: `Via rule "${rule.name}"`,
                },
              });
            }
          }
        }
      }

      // Action: Update Stage / Move To Stage
      if (
        stepKey === "update_to_stage" ||
        stepKey === "update-stage" ||
        stepKey === "movetostage" ||
        stepKey === "move_to_stage" ||
        stepKey === "move-stage" ||
        stepKey === "stage_movement" ||
        stepKey === "stagemovement" ||
        stepKey === "processmovement"
      ) {
        const rawTargetEntity = act.params?.stageEntity || act.params?.entityType;
        const targetStageId = act.params?.stageId || act.params?.stepDetailStage || act.params?.stageName || act.params?.stepDetailStageName;

        if (targetStageId) {
          const appointmentProcesses = processes.filter((p) => p.entityType === "appointment");
          const targetInAppt = appointmentProcesses.some((p) =>
            p.id === act.params?.processId ||
            p.stages?.some((s) => s.id === targetStageId || s.name.toLowerCase() === targetStageId?.toLowerCase())
          );

          const invoiceProcesses = processes.filter(
            (p) => p.entityType === "invoice" || p.id === "billing" || p.id === "billing-invoicing" || p.id === "proc-invoices"
          );
          const targetInInvoice = invoiceProcesses.some(
            (p) =>
              p.id === act.params?.processId ||
              p.stages?.some((s) => s.id === targetStageId || s.name.toLowerCase() === targetStageId?.toLowerCase())
          );

          // If explicitly invoice or target stage belongs to invoice
          const isInvoiceTarget = rawTargetEntity === "invoice" || (!rawTargetEntity && event.recordType === "invoice") || targetInInvoice;
          const isAppointmentTarget = rawTargetEntity === "appointment" || (!rawTargetEntity && event.recordType === "appointment") || targetInAppt;

          const shouldMoveAppt =
            rawTargetEntity === "appointment" ||
            (targetInAppt && rawTargetEntity !== "invoice") ||
            (event.recordType === "appointment" && rawTargetEntity !== "invoice" && !targetInInvoice);

          if (shouldMoveAppt) {
            const apptId = event.recordType === "appointment" ? event.recordId : act.params?.appointmentId;
            if (apptId) {
              try {
                appointmentService.moveToStage(apptId, targetStageId, {
                  ...ruleCause(rule, event, depth, visitedRules),
                  processId: act.params?.processId || act.params?.stepDetailProcess,
                });
                console.log(`[RuleEngine] Moved appointment ${apptId} to stage ${targetStageId} via rule "${rule.name}"`);
              } catch (e) {
                console.warn("[RuleEngine] Failed to move appointment stage:", e);
              }
            }
          }

          const shouldMoveInvoice =
            isInvoiceTarget ||
            targetInInvoice ||
            (event.recordType === "invoice" && rawTargetEntity !== "appointment" && rawTargetEntity !== "client") ||
            (rawTargetEntity === "invoice" && event.recordType === "appointment");

          if (shouldMoveInvoice) {
            const currentAppt = event.recordType === "appointment" ? appointmentService.getAppointmentById(event.recordId) : undefined;
            const invId = event.recordType === "invoice" ? event.recordId : (event.data?.invoiceId || act.params?.invoiceId || currentAppt?.invoiceId);
            if (invId) {
              try {
                invoiceService.moveToStage(invId, targetStageId, ruleCause(rule, event, depth, visitedRules));
                console.log(`[RuleEngine] Moved invoice ${invId} to stage ${targetStageId} via rule "${rule.name}"`);
              } catch (e) {
                console.warn("[RuleEngine] Failed to move invoice stage:", e);
              }
            }
          }

          const isClientOrProcessTarget =
            rawTargetEntity === "client" ||
            (rawTargetEntity === "processes" && !targetInInvoice && !targetInAppt && event.recordType !== "invoice") ||
            act.params?.processName === "Patient Care Journey" ||
            act.params?.processId === "demo-patient-care-journey" ||
            (!rawTargetEntity && event.recordType === "client");

          if (isClientOrProcessTarget || (!isInvoiceTarget && !isAppointmentTarget)) {
            let targetClientId =
              event.recordType === "client"
                ? event.recordId
                : (event.data?.clientId || event.data?.id);
            if (!targetClientId && event.recordType === "appointment") {
              const currentAppt = appointmentService.getAppointmentById(event.recordId);
              targetClientId = currentAppt?.clientId || currentAppt?.clientName;
              if (targetClientId && !targetClientId.startsWith("CL-")) {
                const matchedClient = getStoredClients().find(
                  (c) => c.name?.toLowerCase() === targetClientId.toLowerCase()
                );
                if (matchedClient) targetClientId = matchedClient.id;
              }
            }
            if (targetClientId) {
              const targetProcId =
                act.params?.processId ||
                act.params?.stepDetailProcess ||
                act.params?.processName ||
                "demo-patient-care-journey";
              const targetStageVal =
                act.params?.stageName ||
                act.params?.stepDetailStageName ||
                act.params?.stageId ||
                act.params?.stepDetailStage;
              // Resolve by INSTANCE (the event's instance, else the client's primary instance of the target process).
              // The move is logged once (logInstanceStageMove / moveClientToStage); instance moves never write client.stage.
              const result = moveClientInProcess({
                clientId: String(targetClientId),
                processRef: targetProcId,
                stageRef: String(targetStageVal || ""),
                event,
                cause: ruleCause(rule, event, depth, visitedRules),
              });
              if (result.moved) {
                console.log(
                  `[RuleEngine] Moved client ${targetClientId}${result.instanceId ? ` (instance ${result.instanceId})` : ""} to stage "${result.stageName}" in process "${targetProcId}" via rule "${rule.name}"`
                );
              }
            }
          }
        }
      }

      // Action: Create Task (work-queue task linked to the triggering record; auto-closes on stage exit)
      if (isCreateTaskStep(stepKey)) {
        const run = executeCreateTaskStep({ rule, stepId: act.id, params: act.params || {}, event });
        if (run.status === "failed") console.warn(`[RuleEngine] create_task failed in rule "${rule.name}": ${run.error}`);
      }

      // Action: Update Fields (persisting, merge-safe writer; replaces the in-memory-only fieldupdate)
      if (isUpdateFieldsStep(stepKey)) {
        const run = executeUpdateFieldsStep({ rule, stepId: act.id, params: act.params || {}, event });
        if (run.status === "failed") console.warn(`[RuleEngine] update_fields failed in rule "${rule.name}": ${run.error}`);
      }

      // Action: Start Process (new instance for the client; idempotent per rule step + triggering record)
      if (isStartProcessStep(stepKey)) {
        const run = executeStartProcessStep({
          rule,
          stepId: act.id,
          params: act.params || {},
          event,
          cause: ruleCause(rule, event, depth, visitedRules),
        });
        if (run.status === "failed") {
          console.warn(`[RuleEngine] start_process failed in rule "${rule.name}": ${run.error} (retry from the action run log)`);
        } else if (!run.alreadyRan) {
          console.log(`[RuleEngine] start_process via rule "${rule.name}"`, run.result);
        }
      }

      // Action: Generate Invoice
      if (stepKey === "generate_invoice" || stepKey === "generate-invoice" || stepKey === "create_invoice") {
        if (event.recordType === "appointment") {
          const appt = appointmentService.getAppointmentById(event.recordId);
          if (appt) {
            let lineItems: any[] = [];
            if (act.params?.billFor === "choose" && Array.isArray(act.params?.selectedServices) && act.params.selectedServices.length > 0) {
              lineItems = act.params.selectedServices.map((s: any, idx: number) => ({
                id: `li-${appt.id}-${idx}`,
                source: "service",
                serviceId: s.serviceId,
                description: s.name,
                quantity: s.quantity || 1,
                unitPrice: s.unitPrice || 150,
                discountAmount: s.discount || 0,
                taxPercent: s.taxPercent ?? 5,
              }));
            }
            const discountVal = act.params?.discount ?? 0;
            const discountType = act.params?.discountType === "$" ? "amount" : "percent";
            const dueDays = typeof act.params?.dueDays === "number" ? act.params.dueDays : 14;
            const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

            const { invoice } = invoiceService.createInvoiceFromAppointment(
              {
                id: appt.id,
                clientId: appt.clientId || "c-1",
                clientName: appt.clientName,
                clientEmail: appt.clientEmail,
                clientPhone: appt.clientPhone,
                title: appt.title,
              },
              lineItems,
              {
                createdBy: "system",
                discountValue: discountVal,
                discountType: discountType as any,
                dueDate,
                paymentMode: act.params?.paymentMode,
              }
            );

            if (invoice?.id) {
              appointmentService.updateAppointment(appt.id, { invoiceId: invoice.id });
              if (event.data) {
                event.data.invoiceId = invoice.id;
              }
              console.log(`[RuleEngine] Generated invoice ${invoice.id} for appointment ${appt.id} via rule "${rule.name}"`);
            }
          }
        } else if (event.recordType === "client") {
          // Task 2: Triggered by Assign Product or Client events
          const clientId = String(event.recordId);
          let lineItems: any[] = [];

          if (act.params?.billFor === "choose" && Array.isArray(act.params?.selectedServices) && act.params.selectedServices.length > 0) {
            lineItems = act.params.selectedServices.map((s: any, idx: number) => ({
              id: `li-cl-${clientId}-${idx}`,
              source: "service",
              serviceId: s.serviceId,
              description: s.name,
              quantity: s.quantity || 1,
              unitPrice: s.unitPrice || 150,
              discountAmount: s.discount || 0,
              taxPercent: s.taxPercent ?? 5,
            }));
          } else if (event.data?.product || event.data?.productId) {
            const p = event.data.product || {};
            lineItems = [{
              id: `li-cl-${clientId}-prod`,
              source: "service",
              serviceId: p.id || event.data.productId,
              description: p.name || event.data.productName || "Client Service",
              quantity: 1,
              unitPrice: p.price ?? (event.data.productPrice || 150),
              discountAmount: 0,
              taxPercent: p.tax ?? 5,
            }];
          } else {
            const clientProducts = getClientProducts(clientId);
            if (clientProducts.length > 0) {
              lineItems = clientProducts.map((p, idx) => ({
                id: `li-cl-${clientId}-${idx}`,
                source: "service",
                serviceId: p.id,
                description: p.name,
                quantity: 1,
                unitPrice: p.price || 150,
                discountAmount: 0,
                taxPercent: p.tax ?? 5,
              }));
            }
          }

          if (lineItems.length === 0) {
            lineItems = [{
              id: `li-cl-${clientId}-def`,
              source: "service",
              description: "Assigned Client Service",
              quantity: 1,
              unitPrice: 150,
              discountAmount: 0,
              taxPercent: 5,
            }];
          }

          const discountVal = act.params?.discount ?? 0;
          const discountType = act.params?.discountType === "$" ? "amount" : "percent";
          const dueDays = typeof act.params?.dueDays === "number" ? act.params.dueDays : 14;
          const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

          const clientName = event.data?.clientName || event.data?.name || "Client";
          const clientEmail = event.data?.clientEmail || event.data?.email || "";
          const clientPhone = event.data?.clientPhone || event.data?.phone || "";
          const invoiceTitle = event.data?.productName
            ? `Invoice for ${event.data.productName}`
            : "Client Services Invoice";

          const { invoice } = invoiceService.createInvoiceFromAppointment(
            {
              clientId,
              clientName,
              clientEmail,
              clientPhone,
              title: invoiceTitle,
            },
            lineItems,
            {
              createdBy: "system",
              discountValue: discountVal,
              discountType: discountType as any,
              dueDate,
              paymentMode: act.params?.paymentMode,
            }
          );

          if (invoice?.id) {
            if (event.data) {
              event.data.invoiceId = invoice.id;
            }
            console.log(`[RuleEngine] Generated invoice ${invoice.id} for client ${clientId} via rule "${rule.name}"`);
            appendActivity({
              type: "field_update",
              clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              timestamp: new Date().toISOString(),
              fieldLabel: "Invoice",
              newValue: invoice.id,
              details: {
                primary: `Invoice ${invoice.id} generated for client services`,
                secondary: `Total: $${invoice.total.toFixed(2)} · ${lineItems.map((l: any) => l.description).join(", ")}`,
              },
            });
          }
        }
      }

      // Action: Generate Document (Task 3)
      if (stepKey === "generate_document" || stepKey === "generate-document") {
        try {
          const targetEntity = act.params?.entity || event.recordType || "client";
          let targetClientId = event.recordType === "client"
            ? String(event.recordId)
            : (event.data?.clientId ? String(event.data.clientId) : "");

          if (!targetClientId) {
            const clientList = getClientList();
            const clientName = event.data?.clientName || event.data?.name;
            const clientEmail = event.data?.email || event.data?.clientEmail;
            const clientPhone = event.data?.phone || event.data?.clientPhone;
            const foundClient = clientList.find(
              (c) =>
                (clientEmail && c.email?.toLowerCase() === clientEmail.toLowerCase()) ||
                (clientName && c.name?.toLowerCase() === clientName.toLowerCase()) ||
                (clientPhone && c.phoneNumber && c.phoneNumber.replace(/\D/g, "") === clientPhone.replace(/\D/g, ""))
            );
            if (foundClient) {
              targetClientId = String(foundClient.id);
            } else {
              targetClientId = "c-1";
            }
          }

          // Find template if templateId or template name was selected
          const storedTemplates = getStoredDocumentTemplates();
          const matchedTemplate = storedTemplates.find(
            (t) =>
              t.id === act.params?.templateId ||
              t.id === act.params?.template ||
              t.name.toLowerCase() === (act.params?.templateName || act.params?.template || "").toLowerCase()
          );

          const templateName = act.params?.templateName || matchedTemplate?.name || act.params?.template || "Document";
          const clientName = event.data?.clientName || event.data?.name || "Client";

          // Gather all available client/record data for substitution
          const rawTemplateText = act.params?.templateText || matchedTemplate?.templateText || `Generated document for ${clientName} on ${new Date().toLocaleString()}`;

          // Merge fields from event.data, client list, and parameters
          const clientList = getClientList();
          const storedClient = clientList.find((c) => String(c.id) === targetClientId);

          const mergedData: Record<string, any> = {
            client_name: clientName,
            name: clientName,
            contact_name: clientName,
            clientName: clientName,
            email: event.data?.email || storedClient?.email || "",
            phone: event.data?.phone || storedClient?.phoneNumber || "",
            phoneNumber: event.data?.phone || storedClient?.phoneNumber || "",
            company: event.data?.company || event.data?.companyName || "",
            companyName: event.data?.company || event.data?.companyName || "",
            status: event.data?.status || "Active",
            role: event.data?.role || event.data?.jobPosition || "",
            location: event.data?.location || "",
            country: event.data?.country || "",
            entity: targetEntity,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            ...(storedClient || {}),
            ...(event.data || {}),
          };

          // Helper to substitute {var} and {{var}}
          const substituteTokens = (inputStr: string): string => {
            if (!inputStr) return "";
            return inputStr.replace(/\{\{?([a-zA-Z0-9_\-]+)\}?\}/g, (match, token) => {
              const cleanToken = token.trim().toLowerCase();
              const normToken = cleanToken.replace(/[^a-z0-9]/g, "");

              for (const [k, v] of Object.entries(mergedData)) {
                const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (normK === normToken && v !== undefined && v !== null && v !== "") {
                  return String(v);
                }
              }
              if (cleanToken === "current_date" || cleanToken === "date") {
                return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              }
              return match;
            });
          };

          const rawDocName = act.params?.documentName || act.params?.docTitle || `${templateName} - {client_name}`;
          const resolvedDocName = substituteTokens(rawDocName);
          const resolvedContent = substituteTokens(rawTemplateText);

          const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const categoryByEntity: Record<string, string> = {
            client: "Client Documents",
            process: "Process",
            appointment: "Clinical",
            invoice: "Billing",
          };

          const isExplicitInvoice = targetEntity === "invoice" || event.recordType === "invoice";
          const isInvoiceTemplate =
            (matchedTemplate?.category || "").toLowerCase() === "invoices" ||
            templateName.toLowerCase().includes("invoice") ||
            templateName.toLowerCase().includes("billing");
          const isInvoiceTarget = isExplicitInvoice || (targetEntity !== "client" && targetEntity !== "appointment" && isInvoiceTemplate);

          let targetInvoiceId: string | undefined = undefined;
          if (isInvoiceTarget) {
            targetInvoiceId =
              event.data?.invoiceId ||
              (event.recordType === "invoice" ? String(event.recordId) : act.params?.invoiceId) ||
              (event.recordType === "appointment" ? appointmentService.getAppointmentById(event.recordId)?.invoiceId : undefined);

            if (!targetInvoiceId) {
              const allInvoices = invoiceService.getInvoices();
              const clientNameClean = (clientName || "").trim().toLowerCase();
              const matchingInv = allInvoices.find(
                (inv) =>
                  (event.recordType === "appointment" && inv.appointmentId === String(event.recordId)) ||
                  (targetClientId && inv.clientId === targetClientId && Math.abs(Date.now() - new Date(inv.createdAt).getTime()) < 600000) ||
                  (clientNameClean && inv.clientName.toLowerCase() === clientNameClean && Math.abs(Date.now() - new Date(inv.createdAt).getTime()) < 600000)
              );
              if (matchingInv) {
                targetInvoiceId = matchingInv.id;
              }
            }
          }

          const targetApptId =
            event.recordType === "appointment"
              ? String(event.recordId)
              : (event.data?.appointmentId || act.params?.appointmentId);

          if (isInvoiceTarget && targetInvoiceId) {
            const invObj = invoiceService.getInvoiceById(targetInvoiceId);
            if (invObj) {
              const invDoc = generateInvoiceDocument(invObj, act.params);
              appendActivity({
                type: "field_update",
                clientId: targetClientId,
                processId: "billing",
                processName: "Billing & Invoicing",
                timestamp: new Date().toISOString(),
                fieldLabel: "Generated Document",
                newValue: invDoc.name,
                details: {
                  primary: `Document generated: ${invDoc.name}`,
                  secondary: `Entity: INVOICE #${invObj.id} · Template: ${templateName}`,
                },
              });
              console.log(`[RuleEngine] Generated invoice document "${invDoc.name}" (${invDoc.id}) for invoice #${invObj.id}`);
              continue;
            }
          }

          const effectiveCategory = isInvoiceTarget
            ? "Invoices"
            : (matchedTemplate?.category || categoryByEntity[targetEntity] || "General");

          const newDoc: StoredClientDocument = {
            id: docId,
            clientId: targetClientId,
            invoiceId: targetInvoiceId || undefined,
            appointmentId: targetApptId || undefined,
            entityId: targetInvoiceId || (event.recordType === "invoice" ? String(event.recordId) : String(event.recordId)),
            entityType: (targetInvoiceId ? "invoice" : targetEntity) as any,
            name: resolvedDocName.endsWith(".pdf") ? resolvedDocName : `${resolvedDocName}.pdf`,
            category: effectiveCategory,
            valueBy: targetInvoiceId || targetEntity === "invoice" ? "Invoice Record Data" : "Client Profile Data",
            fileType: "pdf",
            fileSize: "1.4 MB",
            uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
            uploadedBy: "System Admin",
            status: "Verified",
            notes: `Generated automatically via rule "${rule.name}" for ${targetEntity} #${event.recordId}${targetInvoiceId ? ` · Invoice #${targetInvoiceId}` : ""}`,
            templateId: matchedTemplate?.id || act.params?.templateId,
            generatedContent: resolvedContent,
          };

          saveClientDocument(newDoc);

          appendActivity({
            type: "field_update",
            clientId: targetClientId,
            processId: targetEntity === "process" ? event.recordId : "general",
            processName: "Document Automation",
            timestamp: new Date().toISOString(),
            fieldLabel: "Generated Document",
            newValue: newDoc.name,
            details: {
              primary: `Document generated: ${newDoc.name}`,
              secondary: `Entity: ${targetEntity.toUpperCase()} · Template: ${templateName}`,
            },
          });
          console.log(`[RuleEngine] Generated document "${newDoc.name}" (${newDoc.id}) for ${targetEntity} #${event.recordId}`);
        } catch (e) {
          console.warn("[RuleEngine] Failed to generate document from rule action:", e);
        }
      }

      // Action: Schedule Appointment
      if (stepKey === "scheduleappointment" || stepKey === "schedule-appointment") {
        try {
          appointmentService.createAppointment({
            clientName: event.data?.clientName || event.data?.name || "Client",
            clientEmail: event.data?.clientEmail || event.data?.email || "client@example.com",
            clientPhone: event.data?.clientPhone || event.data?.phone || "+1-555-0100",
            employeeId: act.params?.employeeId || 1,
            date: act.params?.date || new Date().toISOString().split("T")[0],
            time: act.params?.time || "10:00",
            title: act.params?.title || "Automated Appointment",
            source: "ai",
          });
        } catch (e) {
          console.warn("[RuleEngine] Failed to schedule appointment from rule action:", e);
        }
      }

      // Action: Send Payment / Send Invoice
      if (
        stepKey === "send_payment" ||
        stepKey === "send-payment" ||
        stepKey === "send_invoice" ||
        stepKey === "send-invoice"
      ) {
        try {
          const invId = event.recordType === "invoice" ? event.recordId : event.data?.invoiceId;
          if (invId) {
            invoiceService.sendInvoice(invId, act.params?.channel || act.params?.invoiceChannel || "whatsapp");
          }
        } catch (e) {
          console.warn("[RuleEngine] Failed to send payment/invoice from rule action:", e);
        }
      }
    }

    // 8. Update rule execution metrics
    rule.lastRunAt = new Date().toISOString();
    rule.health = "ok";
    rule.healthMessage = undefined;
    saveStoredRules(allRules);

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matched: true,
      movedToStageId: rule.action?.stageId,
      movedToStageName: targetStage?.name,
    });

    // 9. Cascade: a stage move made by this rule has already emitted its single stage.entered event (via logStageMove),
    // tagged with cause.chain {depth + 1, visited + this rule}. The bus subscriber below feeds that event back through
    // executeRulesForEvent with the same chain, so the loop guard and MAX_CHAIN_DEPTH still bound the cascade.
    // (A synthetic second entered_stage event used to be fired here, which made stage rules run twice.)
  }

  return results;
}

// Auto-register Rule Engine listener to EventBus
let isInitialized = false;
export function initializeRuleEngine() {
  if (isInitialized) return;
  isInitialized = true;
  eventBus.subscribeAll(async (event) => {
    // Rule-caused moves carry their loop-guard chain on the event; resume it so depth/visited survive the bus hop.
    const chain: RuleChainContext | undefined = event.data?.chain;
    await executeRulesForEvent(event, chain?.depth ?? 0, new Set(chain?.visited ?? []));
  });
}

// Initialize immediately in app and test lifecycles
initializeRuleEngine();
