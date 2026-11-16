/**
 * Rule <-> flow-builder mapping (R2.5), pulled out of the Automation page so that opening and re-saving a rule
 * cannot change what it does: the trigger event and its params (process / stage), the entity type, the legacy
 * `action` and every step (key, params, ids, delay) come back exactly as they were unless the user edited them.
 */
import { GLOBAL_TRIGGER_CATALOG } from "../app/types/automation";
import type { AutomationRule } from "./useAutomationStore";
import type { WorkflowStep } from "../app/types/workflow";
import { stepDisplayName } from "./rcmCatalog";

const STAGE_MOVE_KEYS = ["update_to_stage", "update-stage", "movetostage", "stagemovement", "processmovement", "move-process", "move-stage", "move-new-process"];

const categoryOf = (event: string) => GLOBAL_TRIGGER_CATALOG.find((c) => c.events.some((e) => e.event.toLowerCase() === (event || "").toLowerCase()));

/** What the drawer opens with for a stored rule. */
export function ruleToInitialAutomation(rule: AutomationRule): any {
  const event = rule.trigger.event;
  return {
    id: rule.id,
    orgId: rule.orgId || "default",
    name: rule.name,
    description: rule.description,
    scope: "global" as const,
    status: rule.enabled ? ("active" as const) : ("draft" as const),
    trigger: {
      type: categoryOf(event)?.type || (event || "").split(".")[0] || "call",
      event,
      params: rule.trigger.params,
    },
    steps: (rule.actions || []).map((s, idx) => ({
      ...s,
      id: s.id,
      name: stepDisplayName(s),
      stepKey: s.stepKey,
      iconKey: s.iconKey,
      kind: (s.kind || (s.executionType === "parallel" ? "parallel" : "wait")) as any,
      executionType: s.executionType || "wait",
      branches: s.branches,
      delay: (s.delayValue ?? 0) > 0 ? { value: s.delayValue!, unit: (s.delayUnit as any) || "minutes" } : undefined,
      params: s.params || {},
      order: idx + 1,
    })),
    updatedAt: rule.updatedAt || "",
  };
}

function findStageMovement(steps: WorkflowStep[]): WorkflowStep | undefined {
  for (const s of steps) {
    if (STAGE_MOVE_KEYS.includes(s.stepKey || "")) return s;
    for (const b of s.branches || []) {
      const f = findStageMovement(b.steps || []);
      if (f) return f;
    }
  }
  return undefined;
}

const clean = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** What a save writes back to the rule store. `existing` = the rule being edited (undefined when creating). */
export function buildRulePatch(saved: any, existing?: AutomationRule | null) {
  const event: string = String(saved.trigger?.event || "");
  const evLower = event.toLowerCase();
  const cat = categoryOf(event);
  const catalogEvt = cat?.events.find((e) => e.event.toLowerCase() === evLower);
  const sameTrigger = !!existing && existing.trigger.event === event;

  const detectedEntityType: AutomationRule["entityType"] =
    cat?.type === "appointment" || evLower.startsWith("appointment")
      ? "appointment"
      : cat?.type === "invoice" || evLower.startsWith("invoice")
      ? "invoice"
      : cat?.type === "claim" && !evLower.startsWith("scribe")
      ? "claim"
      : "client";
  const entityType = sameTrigger && existing ? existing.entityType : detectedEntityType;

  const mappedActions: WorkflowStep[] = (saved.steps || []).map((s: any) => ({
    ...s,
    id: s.id,
    name: stepDisplayName(s),
    description: s.description || "",
    iconKey: s.iconKey || "zap",
    stepKey: s.stepKey,
    trigger: s.trigger || "stage",
    executionType: s.executionType || "wait",
    delayValue: s.delay?.value ?? s.delayValue ?? 0,
    delayUnit: s.delay?.unit ?? s.delayUnit ?? "minutes",
    params: s.params || {},
    branches: s.branches,
  }));

  const stageMovementStep = findStageMovement(mappedActions);
  const trigParams = saved.trigger?.params || {};
  const isStageTrigger = evLower.startsWith("stage.") || saved.trigger?.type === "stage" || trigParams?.category === "stage";
  const trigStageId = trigParams.stageId || trigParams.triggerStageId || saved.trigger?.stage?.stageId || "";
  const trigStageName = trigParams.stageName || trigParams.triggerStageName || "";
  const trigProcessId = trigParams.processId || trigParams.triggerProcessId || saved.trigger?.stage?.processId || "";
  const trigProcessName = trigParams.processName || trigParams.triggerProcessName || "";
  const actionStageId = stageMovementStep?.params?.stageId || stageMovementStep?.params?.stepDetailStage || trigStageId;
  const actionStageName = stageMovementStep?.params?.stageName || stageMovementStep?.params?.stepDetailStageName || trigStageName;
  const actionProcessId = stageMovementStep?.params?.processId || stageMovementStep?.params?.stepDetailProcess || trigProcessId;
  const actionProcessName = stageMovementStep?.params?.processName || stageMovementStep?.params?.stepDetailProcessName || trigProcessName;

  const normalizedParams = clean({
    ...(sameTrigger && existing?.trigger.params ? existing.trigger.params : {}),
    ...clean(trigParams),
    ...(isStageTrigger || trigStageId
      ? { stageId: trigStageId || actionStageId, stageName: trigStageName || actionStageName, processId: trigProcessId || actionProcessId, processName: trigProcessName || actionProcessName, triggerStageId: trigStageId || actionStageId, triggerStageName: trigStageName || actionStageName, triggerProcessId: trigProcessId || actionProcessId, triggerProcessName: trigProcessName || actionProcessName }
      : {}),
  });

  // The stored legacy action is kept unless the user changed the stage-movement step (or added one).
  const before = existing ? findStageMovement(existing.actions || []) : undefined;
  const movementUnchanged = !stageMovementStep ? true : !!before && before.id === stageMovementStep.id && JSON.stringify(before.params || {}) === JSON.stringify(stageMovementStep.params || {});
  const action =
    existing && movementUnchanged
      ? existing.action
      : { type: "moveToStage" as const, processId: actionProcessId || "", stageId: actionStageId || "", processName: actionProcessName || "", stageName: actionStageName || "" };

  return {
    entityType,
    trigger: { ...(existing?.trigger || {}), event, label: catalogEvt?.label || event, source: existing?.trigger.source || ("any" as const), params: normalizedParams },
    action,
    actions: mappedActions,
  };
}
