import { useState, useEffect } from "react";
import { eventBus } from "./eventBus";
import {
  EntityType,
  Process,
  getStoredProcesses,
  DEFAULT_ENTITY_PROCESSES,
  ScopingRule,
} from "./useProcessStore";
import type { WorkflowStep } from "../app/types/workflow";
export type {
  Automation,
  AutomationStep,
  StageTrigger,
  EventTrigger,
  AutomationScope,
  RunContext,
} from "../app/types/automation";

export const AUTOMATION_STORE_EVENT = "mantra_automation_rules_updated";
export const STAGE_MOVES_STORE_EVENT = "mantra_stage_moves_updated";
const AUTOMATION_RULES_STORAGE_KEY = "mantra_global_automation_rules_v1";
const STAGE_MOVES_STORAGE_KEY = "mantra_stage_moves_log_v1";

export interface AutomationTrigger {
  event: string; // e.g. "client.created", "appointment.booked", "invoice.paid"
  label?: string;
  source?: "manual" | "import" | "webhook" | "call" | "any";
  params?: Record<string, any>;
}

export interface AutomationCondition {
  id: string;
  field: string;
  op: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: any;
}

export interface AutomationDelay {
  value: number;
  unit: "minutes" | "hours" | "days";
}

export interface AutomationAction {
  type: "moveToStage";
  processId: string;
  stageId: string;
  processName?: string;
  stageName?: string;
}

export interface AutomationGraphNode {
  id: string;
  type: "trigger" | "condition" | "wait" | "action";
  label: string;
  subtitle?: string;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface AutomationGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AutomationRule {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  entityType: EntityType;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  delay?: AutomationDelay;
  action: AutomationAction;
  actions?: WorkflowStep[];
  enabled: boolean;
  /**
   * Run order among rules matching the SAME event: ascending, default DEFAULT_RULE_ORDER (100); ties are broken by
   * creation time (older first). Dependent rules set it explicitly (e.g. one rule that creates a record = 10, the rule
   * that needs that record = 20). TODO(rcm): there is no UI to edit `order` yet (it can be set in rule data / seeds).
   */
  order?: number;
  graph?: {
    nodes: AutomationGraphNode[];
    edges: AutomationGraphEdge[];
  };
  lastRunAt?: string;
  health?: "ok" | "failed" | "needs_attention";
  healthMessage?: string;
  industryCategory?: string;
  industry?: string;
  locations?: string[];
  scopingRules?: ScopingRule[];
  isAdmin?: boolean;
  isClientCustomization?: boolean;
  createdIn?: "admin" | "client";
  source?: "product" | "custom" | "template";
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_RULE_ORDER = 100;

/** Comparator for running the rules that match one event: ascending `order`, ties by creation time (older first). */
export function compareRulesByOrder(a: AutomationRule, b: AutomationRule): number {
  const orderOf = (r: AutomationRule) =>
    typeof r.order === "number" && Number.isFinite(r.order) ? r.order : DEFAULT_RULE_ORDER;
  const createdOf = (r: AutomationRule) => {
    const t = Date.parse(r.createdAt || "");
    return Number.isFinite(t) ? t : 0;
  };
  return orderOf(a) - orderOf(b) || createdOf(a) - createdOf(b);
}

/**
 * Checks whether an automation rule was built on the client side as a tenant's personal customization.
 * Rules created on the client side do not reflect on Admin Console.
 */
export function isClientAutomationRule(rule: AutomationRule): boolean {
  if (rule.isClientCustomization === true || rule.createdIn === "client" || rule.isAdmin === false) {
    return true;
  }
  // If not explicitly marked as an admin product-level automation, treat as client customization
  return rule.isAdmin !== true && rule.createdIn !== "admin";
}

/**
 * Checks whether an automation rule is a product-level automation configured via the Admin Console.
 */
export function isAdminAutomationRule(rule: AutomationRule): boolean {
  return (rule.isAdmin === true || rule.createdIn === "admin") && rule.isClientCustomization !== true;
}

export function isAutomationRuleMatchingScope(
  rule: AutomationRule,
  scope: { category?: string; industry?: string; location?: string }
): boolean {
  const { category, industry, location } = scope;
  if (rule.scopingRules && rule.scopingRules.length > 0) {
    if (category && category !== "all" && category !== "All") {
      const catMatch = rule.scopingRules.some(
        (r) => (r.industryCategory || "").toLowerCase() === category.toLowerCase()
      );
      if (!catMatch) return false;
    }
    if (industry && industry !== "all" && industry !== "All") {
      const indMatch = rule.scopingRules.some((r) => {
        if (!r.industries || r.industries.length === 0 || r.industries.includes("All")) return true;
        return r.industries.some((i) => i.toLowerCase() === industry.toLowerCase());
      });
      if (!indMatch) return false;
    }
    if (location && location !== "all" && location !== "All") {
      const locMatch = rule.scopingRules.some((r) => {
        if (!r.locations || r.locations.length === 0 || r.locations.includes("All")) return true;
        return r.locations.some((l) => l.toLowerCase() === location.toLowerCase());
      });
      if (!locMatch) return false;
    }
    return true;
  }

  if (category && category !== "all" && category !== "All") {
    if (rule.industryCategory && rule.industryCategory !== "All" && rule.industryCategory.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
  }
  if (industry && industry !== "all" && industry !== "All") {
    if (rule.industry && rule.industry !== "All" && rule.industry.toLowerCase() !== industry.toLowerCase()) {
      return false;
    }
  }
  if (location && location !== "all" && location !== "All") {
    if (rule.locations && rule.locations.length > 0 && !rule.locations.includes("All")) {
      if (!rule.locations.some((l) => l.toLowerCase() === location.toLowerCase())) {
        return false;
      }
    }
  }
  return true;
}

/** Loop-guard context carried across rule-caused stage moves (depth + rules already run in the chain). */
export interface RuleChainContext {
  depth: number;
  visited: string[];
}

export interface StageMove {
  id: string;
  orgId: string;
  recordType: EntityType;
  /** For client-process moves this is the instanceId (one move = one instance); otherwise the record id. */
  recordId: string;
  fromStageId?: string;
  fromStageName?: string;
  toStageId: string;
  toStageName: string;
  /** The process the record ENTERED (TO process). */
  processId: string;
  processName?: string;
  /** The process the record LEFT. Equal to processId for a plain stage move; differs for a workflow change. */
  fromProcessId?: string;
  fromProcessName?: string;
  /** Process instance this move belongs to (client-in-process moves). */
  instanceId?: string;
  clientId?: string;
  source?: { type: string; id: string; title?: string };
  cause: {
    type: "rule" | "manual" | "intent" | "import" | "webhook";
    ruleId?: string;
    ruleName?: string;
    eventId?: string;
    eventName?: string;
    /** Set by the rule engine so rule-caused moves keep the loop guard when they re-enter the bus. */
    chain?: RuleChainContext;
  };
  at: string;
  reverted?: boolean;
}

export const EVENT_CATALOG: Record<
  EntityType,
  Array<{ event: string; label: string; description: string }>
> = {
  client: [
    { event: "client.created", label: "Client created", description: "Fires when a new client record is added (manual, import, webhook, or call)" },
    { event: "client.intent_matched", label: "Intent matched", description: "AI receptionist identifies caller intent matching process keywords" },
    { event: "client.call_ended", label: "Call ended", description: "Phone conversation concludes with transcript and summary" },
    { event: "client.entered_stage", label: "Entered stage", description: "Client transitions into an intake or custom process stage" },
  ],
  appointment: [
    { event: "appointment.booked", label: "Appointment booked", description: "A time slot is confirmed for a client session or service" },
    { event: "appointment.rescheduled", label: "Appointment rescheduled", description: "Existing appointment time or date is modified" },
    { event: "appointment.cancelled", label: "Appointment cancelled", description: "Scheduled appointment is cancelled by patient or clinic" },
    { event: "appointment.completed", label: "Appointment completed", description: "Consultation or service concluded successfully" },
    { event: "appointment.no_show", label: "No-show", description: "Patient failed to attend scheduled session without notice" },
  ],
  invoice: [
    { event: "invoice.created", label: "Invoice created", description: "New invoice record is generated as a draft" },
    { event: "invoice.sent", label: "Invoice sent", description: "Invoice is emailed, SMS'd, or dispatched to recipient" },
    { event: "invoice.viewed", label: "Invoice viewed", description: "Client views the invoice online payment link" },
    { event: "invoice.partially_paid", label: "Partially paid", description: "A partial payment installment is recorded" },
    { event: "invoice.paid", label: "Invoice paid", description: "Full balance is collected and settled" },
    { event: "invoice.overdue", label: "Invoice overdue", description: "Payment past the stipulated due date" },
    { event: "invoice.voided", label: "Invoice voided", description: "Billing statement cancelled or voided" },
  ],
  insurance: [
    { event: "insurance.eligibility_checked", label: "Eligibility checked", description: "Coverage check request transmitted to payer" },
    { event: "insurance.verified", label: "Insurance verified", description: "Policy benefits confirmed active with co-pay and deductible" },
    { event: "insurance.failed", label: "Insurance failed", description: "Payer rejected verification or policy expired" },
  ],
  claim: [
    { event: "claim.created", label: "Claim created", description: "New medical billing claim generated" },
    { event: "claim.submitted", label: "Claim submitted", description: "EDI claim file dispatched to clearinghouse" },
    { event: "claim.accepted", label: "Claim accepted", description: "Clearinghouse accepted submission without formatting errors" },
    { event: "claim.denied", label: "Claim denied", description: "Payer denied coverage or requested pre-authorization" },
    { event: "claim.paid", label: "Claim paid", description: "Insurance remittance payment received" },
  ],
  task: [
    { event: "task.created", label: "Task created", description: "Fires when a new task is created" },
    { event: "task.assigned", label: "Task assigned", description: "Task is assigned to team member or contact" },
    { event: "task.status_changed", label: "Task status changed", description: "Task status transitions between lifecycle states" },
    { event: "task.completed", label: "Task completed", description: "Task checklist and deliverables finished" },
    { event: "task.overdue", label: "Task overdue", description: "Task exceeds planned deadline" },
  ],
};

export const DEFAULT_CHECKIN_CARE_JOURNEY_RULE: AutomationRule = {
  id: "rule-patient-checkin-care-journey",
  orgId: "default",
  name: "Patient Check-In -> Care Journey",
  description: "When patient checks in via AI Receptionist or Patient Portal, advance to configured stage in Patient Care Journey.",
  entityType: "client",
  trigger: {
    event: "client.checked_in",
    label: "Checked in",
    source: "any",
  },
  action: {
    type: "moveToStage",
    processId: "demo-patient-care-journey",
    processName: "Patient Care Journey",
    stageId: "stage-client-checked-in",
    stageName: "Client Checked In",
  },
  actions: [
    {
      id: "step-checkin-update-stage",
      name: "Update to stage",
      description: "Update the stage for a process, appointment, or invoice.",
      iconKey: "gitbranch",
      stepKey: "update_to_stage",
      trigger: "client.checked_in",
      executionType: "wait",
      delayValue: 0,
      delayUnit: "minutes",
      params: {
        stageEntity: "processes",
        entityType: "processes",
        processId: "demo-patient-care-journey",
        processName: "Patient Care Journey",
        stepDetailProcess: "demo-patient-care-journey",
        stageId: "stage-client-checked-in",
        stageName: "Client Checked In",
        stepDetailStage: "stage-client-checked-in",
      },
    },
  ],
  enabled: true,
  health: "ok",
  isClientCustomization: true,
  createdIn: "client",
  createdAt: "2026-10-13T10:00:00.000Z",
  updatedAt: "2026-10-13T10:00:00.000Z",
};

const DEFAULT_GLOBAL_RULES: AutomationRule[] = [DEFAULT_CHECKIN_CARE_JOURNEY_RULE];

/**
 * Validate that moveToStage targets a process and stage of the EXACT SAME entityType (if configured)
 */
export function validateRuleEntityTarget(
  rule: Partial<AutomationRule>,
  processes: Process[] = getStoredProcesses()
): { valid: boolean; error?: string } {
  if (rule.action?.type === "moveToStage" && rule.action.stageId && rule.action.processId) {
    const { processId, stageId } = rule.action;
    let targetProcess = processes.find((p) => p.id === processId || p.name === processId);

    const effectiveEntity = (
      rule.trigger?.event?.toLowerCase().startsWith("appointment")
        ? "appointment"
        : rule.trigger?.event?.toLowerCase().startsWith("invoice")
        ? "invoice"
        : rule.entityType || "client"
    );

    if (!targetProcess && (effectiveEntity === "appointment" || effectiveEntity === "invoice")) {
      targetProcess = DEFAULT_ENTITY_PROCESSES[effectiveEntity];
    }

    if (!targetProcess) {
      return { valid: false, error: `Target process "${processId}" not found.` };
    }

    const targetEntityType = targetProcess.entityType || "client";
    const isCheckinCrossMove =
      (effectiveEntity === "appointment" && (targetEntityType === "client" || targetProcess.name === "Patient Care Journey")) ||
      (effectiveEntity === "client" && (targetEntityType === "appointment" || targetProcess.name === "Patient Care Journey"));

    if (effectiveEntity && targetEntityType !== effectiveEntity && !isCheckinCrossMove) {
      return {
        valid: false,
        error: `Entity mismatch: ${effectiveEntity} rule cannot move records to ${targetEntityType} process.`,
      };
    }

    if (stageId) {
      const q = stageId.trim().toLowerCase();
      const targetStage = targetProcess.stages.find(
        (s) =>
          s.id.toLowerCase() === q ||
          s.name.toLowerCase() === q ||
          (s.systemCategory && s.systemCategory.toLowerCase() === q) ||
          (s.systemCategory && q.includes(s.systemCategory.toLowerCase())) ||
          q.includes(s.name.toLowerCase())
      );
      if (!targetStage) {
        return { valid: false, error: `Target stage "${stageId}" not found in process "${targetProcess.name}".` };
      }
    }
  }

  return { valid: true };
}

/**
 * Cycle detection: ensures rules don't form immediate direct infinite loops
 */
export function checkRuleCycle(
  newRule: AutomationRule,
  existingRules: AutomationRule[]
): { hasCycle: boolean; message?: string } {
  // If rule triggers on entering stage X, and action moves to stage X
  if (
    newRule.trigger.event.endsWith(".entered_stage") &&
    newRule.trigger.params?.stageId === newRule.action.stageId
  ) {
    return {
      hasCycle: true,
      message: "Loop detected: A rule cannot move to the exact stage that triggered it.",
    };
  }
  return { hasCycle: false };
}

export function getStoredRules(orgId?: string): AutomationRule[] {
  if (typeof localStorage === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(AUTOMATION_RULES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUTOMATION_RULES_STORAGE_KEY, JSON.stringify([DEFAULT_CHECKIN_CARE_JOURNEY_RULE]));
      return [DEFAULT_CHECKIN_CARE_JOURNEY_RULE];
    }
    const parsed: AutomationRule[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out hardcoded sample mock rules and check-in rules
    const legacyMockIds = new Set([
      "rule-client-intake-auto",
      "rule-appt-booked-auto",
      "rule-appt-rescheduled-auto",
      "rule-inv-sent-auto",
      "rule-inv-paid-auto",
      "rule-patient-checkin-care-journey",
    ]);
    let filtered = parsed.filter(
      (r) =>
        !legacyMockIds.has(r.id) &&
        r.trigger?.event !== "client.checked_in" &&
        r.trigger?.event !== "checked_in" &&
        r.trigger?.event !== "appointment.checked_in"
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(AUTOMATION_RULES_STORAGE_KEY, JSON.stringify(filtered));
    }
    if (orgId && orgId !== "all") {
      return filtered.filter((r) => !r.orgId || r.orgId === "default" || r.orgId === orgId);
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveStoredRules(rules: AutomationRule[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AUTOMATION_RULES_STORAGE_KEY, JSON.stringify(rules));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTOMATION_STORE_EVENT));
    }
  } catch (e) {
    console.error("Error saving automation rules:", e);
  }
}

export function createRule(ruleData: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">): AutomationRule {
  const current = getStoredRules();
  const newRule: AutomationRule = {
    ...ruleData,
    id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = validateRuleEntityTarget(newRule);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cycleCheck = checkRuleCycle(newRule, current);
  if (cycleCheck.hasCycle) {
    throw new Error(cycleCheck.message);
  }

  const updated = [newRule, ...current];
  saveStoredRules(updated);
  return newRule;
}

export function updateRule(id: string, patch: Partial<AutomationRule>): AutomationRule {
  const current = getStoredRules();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new Error(`Rule with id "${id}" not found.`);
  }

  const updatedRule: AutomationRule = {
    ...current[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const validation = validateRuleEntityTarget(updatedRule);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const otherRules = current.filter((r) => r.id !== id);
  const cycleCheck = checkRuleCycle(updatedRule, otherRules);
  if (cycleCheck.hasCycle) {
    throw new Error(cycleCheck.message);
  }

  current[idx] = updatedRule;
  saveStoredRules(current);
  return updatedRule;
}

export function deleteRule(id: string): boolean {
  const current = getStoredRules();
  const filtered = current.filter((r) => r.id !== id);
  if (filtered.length !== current.length) {
    saveStoredRules(filtered);
    return true;
  }
  return false;
}

export function toggleRule(id: string): boolean {
  const current = getStoredRules();
  const rule = current.find((r) => r.id === id);
  if (!rule) return false;
  rule.enabled = !rule.enabled;
  rule.updatedAt = new Date().toISOString();
  saveStoredRules(current);
  return rule.enabled;
}

/**
 * Returns stage IDs that have at least one active global automation rule targeting them
 */
export function getStagesTargetedByAutomation(): Set<string> {
  const rules = getStoredRules();
  const targeted = new Set<string>();

  const scanSteps = (steps?: any[]) => {
    if (!steps || !Array.isArray(steps)) return;
    for (const step of steps) {
      const isMove =
        step.stepKey === "update_to_stage" ||
        step.stepKey === "update-stage" ||
        step.stepKey === "movetostage" ||
        step.stepKey === "stagemovement" ||
        step.stepKey === "processmovement" ||
        step.stepKey === "move-stage" ||
        step.stepKey === "move-process";
      if (isMove) {
        const sId = step.params?.stageId || step.params?.stepDetailStage;
        if (sId) targeted.add(sId);
      }
      if (step.branches && Array.isArray(step.branches)) {
        for (const b of step.branches) {
          scanSteps(b.steps);
        }
      }
    }
  };

  rules.forEach((r) => {
    if (!r.enabled) return;
    if (r.action?.stageId) targeted.add(r.action.stageId);
    const trigStageId = r.trigger?.params?.stageId || r.trigger?.params?.triggerStageId;
    if (trigStageId && trigStageId !== "all") {
      targeted.add(trigStageId);
    }
    scanSteps(r.actions);
  });
  return targeted;
}

/**
 * Stage Movement Logs (for audit, timeline, and undo)
 */
export function getStoredStageMoves(orgId?: string): StageMove[] {
  try {
    const raw = localStorage.getItem(STAGE_MOVES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: StageMove[] = JSON.parse(raw);
    if (orgId && orgId !== "all") {
      return parsed.filter((m) => !m.orgId || m.orgId === "default" || m.orgId === orgId);
    }
    return parsed;
  } catch {
    return [];
  }
}

/** Best-effort stage-id lookup by name within a process (used when a caller knows names but not ids). */
function resolveStageIdByName(processId: string | undefined, stageName: string | undefined): string | undefined {
  if (!processId || !stageName) return undefined;
  try {
    const proc = getStoredProcesses().find((p) => p.id === processId);
    const target = stageName.trim().toLowerCase();
    return proc?.stages?.find((s) => s.name.trim().toLowerCase() === target)?.id;
  } catch {
    return undefined;
  }
}

/**
 * Record a stage move and emit its bus events. Exactly ONE `stage.entered` event is emitted per move
 * (plus ONE `stage.exited` when there was a previous stage). The entry event carries the TO process;
 * the exit event carries the FROM process (`fromProcessId`, defaulting to the same process).
 *
 * `opts.recordData` is merged into the event data so rules can evaluate record fields (it replaces the
 * second, record-carrying `stage.entered` emit the services used to send themselves).
 */
export function logStageMove(
  move: Omit<StageMove, "id" | "at">,
  opts?: { recordData?: Record<string, any> }
): StageMove {
  try {
    // fromStageId must always be supplied when there was a previous stage: resolve it by name if the caller only knew the name.
    const fromProcessId = move.fromProcessId || move.processId;
    // Falls back to the stage NAME (as the entry side does) so a previous stage always produces an exit event.
    const fromStageId =
      move.fromStageId ||
      (move.fromStageName ? resolveStageIdByName(fromProcessId, move.fromStageName) || move.fromStageName : undefined);
    const toStageId = move.toStageId || resolveStageIdByName(move.processId, move.toStageName) || move.toStageName;

    const normalized: Omit<StageMove, "id" | "at"> = { ...move, fromStageId, fromProcessId, toStageId };

    const moves = getStoredStageMoves();
    const newMove: StageMove = {
      ...normalized,
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      at: new Date().toISOString(),
    };
    const updated = [newMove, ...moves.slice(0, 499)]; // Keep latest 500
    localStorage.setItem(STAGE_MOVES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STAGE_MOVES_STORE_EVENT));

    // instanceId / clientId / source are already in `normalized` when the caller supplied them, so they are
    // not re-set here (re-setting would overwrite record data with undefined).
    const common = {
      ...(opts?.recordData || {}),
      ...normalized,
      chain: normalized.cause?.chain,
      moveId: newMove.id,
    };

    // ONE entry event per move.
    eventBus.emit("stage.entered", normalized.recordType, normalized.recordId, {
      ...common,
      stageId: toStageId,
      stageName: normalized.toStageName,
      processId: normalized.processId,
      processName: normalized.processName,
    });
    // ONE exit event per move, carrying the FROM process.
    if (fromStageId) {
      eventBus.emit("stage.exited", normalized.recordType, normalized.recordId, {
        ...common,
        stageId: fromStageId,
        stageName: normalized.fromStageName,
        processId: fromProcessId,
        processName: normalized.fromProcessName || normalized.processName,
        toStageId,
        toStageName: normalized.toStageName,
        toProcessId: normalized.processId,
      });
    }

    return newMove;
  } catch (e) {
    console.error("Error logging stage move:", e);
    return {
      ...move,
      id: `sm-${Date.now()}`,
      at: new Date().toISOString(),
    };
  }
}

export function undoStageMove(moveId: string): boolean {
  const moves = getStoredStageMoves();
  const move = moves.find((m) => m.id === moveId);
  if (!move || move.reverted) return false;

  // Mark move as reverted
  move.reverted = true;
  localStorage.setItem(STAGE_MOVES_STORAGE_KEY, JSON.stringify(moves));
  window.dispatchEvent(new Event(STAGE_MOVES_STORE_EVENT));

  // Directly rollback entity stage in store
  if (move.fromStageId) {
    if (move.recordType === "appointment") {
      try {
        const raw = localStorage.getItem("appointments_v1") || sessionStorage.getItem("appointments_v1");
        if (raw) {
          const appts = JSON.parse(raw);
          const updated = appts.map((a: any) =>
            String(a.id) === String(move.recordId)
              ? { ...a, currentStageId: move.fromStageId, statusLabel: move.fromStageId === "appt-1" ? "Booked" : a.statusLabel, updatedAt: new Date().toISOString() }
              : a
          );
          localStorage.setItem("appointments_v1", JSON.stringify(updated));
          try { sessionStorage.setItem("appointments_v1", JSON.stringify(updated)); } catch {}
          window.dispatchEvent(new CustomEvent("mantra_appointments_changed", { detail: updated }));
        }
      } catch {}
    } else if (move.recordType === "invoice") {
      try {
        const raw = localStorage.getItem("mantra_invoices_v1");
        if (raw) {
          const invs = JSON.parse(raw);
          const updated = invs.map((i: any) =>
            String(i.id) === String(move.recordId)
              ? {
                  ...i,
                  currentStageId: move.fromStageId,
                  status: move.fromStageId === "inv-1" ? "draft" : move.fromStageId === "inv-2" ? "sent" : move.fromStageId === "inv-5" ? "paid" : i.status,
                  statusLabel: move.fromStageId === "inv-1" ? "Draft" : move.fromStageId === "inv-2" ? "Sent" : move.fromStageId === "inv-5" ? "Paid" : i.statusLabel,
                  updatedAt: new Date().toISOString(),
                }
              : i
          );
          localStorage.setItem("mantra_invoices_v1", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("mantra_invoices_changed", { detail: updated }));
        }
      } catch {}
    }
  }

  return true;
}

/**
 * React Hook for automation rules
 */
export function useAutomationRules(orgId?: string) {
  const [rules, setRules] = useState<AutomationRule[]>(() => getStoredRules(orgId));

  useEffect(() => {
    const handleUpdate = () => {
      setRules(getStoredRules(orgId));
    };
    window.addEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
    return () => window.removeEventListener(AUTOMATION_STORE_EVENT, handleUpdate);
  }, [orgId]);

  return {
    rules,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    refresh: () => setRules(getStoredRules(orgId)),
  };
}
