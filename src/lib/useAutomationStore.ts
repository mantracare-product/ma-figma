import { useState, useEffect } from "react";
import {
  EntityType,
  Process,
  getStoredProcesses,
  DEFAULT_ENTITY_PROCESSES,
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
  graph?: {
    nodes: AutomationGraphNode[];
    edges: AutomationGraphEdge[];
  };
  lastRunAt?: string;
  health?: "ok" | "failed" | "needs_attention";
  healthMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageMove {
  id: string;
  orgId: string;
  recordType: EntityType;
  recordId: string;
  fromStageId?: string;
  fromStageName?: string;
  toStageId: string;
  toStageName: string;
  processId: string;
  processName?: string;
  cause: {
    type: "rule" | "manual" | "intent" | "import" | "webhook";
    ruleId?: string;
    ruleName?: string;
    eventId?: string;
    eventName?: string;
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
    { event: "appointment.checked_in", label: "Checked in", description: "Patient arrives or enters the appointment session" },
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
};

const DEFAULT_GLOBAL_RULES: AutomationRule[] = [
  {
    id: "rule-client-intake-auto",
    orgId: "default",
    name: "New Client Intake Routing",
    description: "Moves newly created clients directly into the initial intake stage",
    entityType: "client",
    trigger: {
      event: "client.created",
      label: "Client created",
      source: "any",
    },
    action: {
      type: "moveToStage",
      processId: "proc-1",
      stageId: "stg-1",
      processName: "Client Onboarding",
      stageName: "Initial Contact",
    },
    enabled: true,
    health: "ok",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    graph: {
      nodes: [
        {
          id: "node-trigger-1",
          type: "trigger",
          label: "Client created",
          subtitle: "Source: Any (Manual, Webhook, Call)",
          data: { event: "client.created" },
          position: { x: 80, y: 120 },
        },
        {
          id: "node-action-1",
          type: "action",
          label: "Move to stage",
          subtitle: "Client Onboarding → Initial Contact",
          data: { processId: "proc-1", stageId: "stg-1" },
          position: { x: 380, y: 120 },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-trigger-1",
          target: "node-action-1",
          label: "Immediate",
        },
      ],
    },
  },
  {
    id: "rule-appt-booked-auto",
    orgId: "default",
    name: "Auto Move Booked Appointment",
    description: "Moves newly scheduled appointments into the Booked stage",
    entityType: "appointment",
    trigger: {
      event: "appointment.booked",
      label: "Appointment booked",
    },
    action: {
      type: "moveToStage",
      processId: "process-appointment-default",
      stageId: "appt-1",
      processName: "Appointment Flow",
      stageName: "Booked",
    },
    enabled: true,
    health: "ok",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    graph: {
      nodes: [
        {
          id: "node-trigger-2",
          type: "trigger",
          label: "Appointment booked",
          subtitle: "AI Call or Online Booking",
          data: { event: "appointment.booked" },
          position: { x: 80, y: 120 },
        },
        {
          id: "node-action-2",
          type: "action",
          label: "Move to stage",
          subtitle: "Appointment Flow → Booked",
          data: { processId: "process-appointment-default", stageId: "appt-1" },
          position: { x: 380, y: 120 },
        },
      ],
      edges: [
        {
          id: "edge-2",
          source: "node-trigger-2",
          target: "node-action-2",
          label: "Immediate",
        },
      ],
    },
  },
  {
    id: "rule-appt-rescheduled-auto",
    orgId: "default",
    name: "Auto Move Rescheduled Appointment",
    description: "Moves rescheduled appointments into the Rescheduled stage",
    entityType: "appointment",
    trigger: {
      event: "appointment.rescheduled",
      label: "Appointment rescheduled",
    },
    action: {
      type: "moveToStage",
      processId: "process-appointment-default",
      stageId: "appt-2",
      processName: "Appointment Flow",
      stageName: "Rescheduled",
    },
    enabled: true,
    health: "ok",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-inv-sent-auto",
    orgId: "default",
    name: "Auto Move Sent Invoice",
    description: "Moves invoices to Sent stage upon dispatch",
    entityType: "invoice",
    trigger: {
      event: "invoice.sent",
      label: "Invoice sent",
    },
    action: {
      type: "moveToStage",
      processId: "process-invoice-default",
      stageId: "inv-2",
      processName: "Billing & Invoicing",
      stageName: "Sent",
    },
    enabled: true,
    health: "ok",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule-inv-paid-auto",
    orgId: "default",
    name: "Auto Move Paid Invoice",
    description: "Moves invoices to Paid stage upon payment settlement",
    entityType: "invoice",
    trigger: {
      event: "invoice.paid",
      label: "Invoice paid",
    },
    action: {
      type: "moveToStage",
      processId: "process-invoice-default",
      stageId: "inv-5",
      processName: "Billing & Invoicing",
      stageName: "Paid",
    },
    enabled: true,
    health: "ok",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Validate that moveToStage targets a process and stage of the EXACT SAME entityType
 */
export function validateRuleEntityTarget(
  rule: Partial<AutomationRule>,
  processes: Process[] = getStoredProcesses()
): { valid: boolean; error?: string } {
  if (!rule.entityType) {
    return { valid: false, error: "Rule requires an entityType." };
  }
  if (!rule.action || rule.action.type !== "moveToStage") {
    return { valid: false, error: "Action must specify moveToStage." };
  }

  const { processId, stageId } = rule.action;
  const targetProcess = processes.find((p) => p.id === processId);
  if (!targetProcess) {
    return { valid: false, error: `Target process "${processId}" not found.` };
  }

  const targetEntityType = targetProcess.entityType || "client";
  if (targetEntityType !== rule.entityType) {
    return {
      valid: false,
      error: `Entity mismatch: ${rule.entityType} rule cannot move records to ${targetEntityType} process.`,
    };
  }

  const targetStage = targetProcess.stages.find((s) => s.id === stageId);
  if (!targetStage) {
    return { valid: false, error: `Target stage "${stageId}" not found in process "${targetProcess.name}".` };
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
    return DEFAULT_GLOBAL_RULES;
  }
  try {
    const raw = localStorage.getItem(AUTOMATION_RULES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUTOMATION_RULES_STORAGE_KEY, JSON.stringify(DEFAULT_GLOBAL_RULES));
      return orgId && orgId !== "all"
        ? DEFAULT_GLOBAL_RULES.filter((r) => !r.orgId || r.orgId === "default" || r.orgId === orgId)
        : DEFAULT_GLOBAL_RULES;
    }
    const parsed: AutomationRule[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(AUTOMATION_RULES_STORAGE_KEY, JSON.stringify(DEFAULT_GLOBAL_RULES));
      return DEFAULT_GLOBAL_RULES;
    }
    if (orgId && orgId !== "all") {
      return parsed.filter((r) => !r.orgId || r.orgId === "default" || r.orgId === orgId);
    }
    return parsed;
  } catch {
    return DEFAULT_GLOBAL_RULES;
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
  rules.forEach((r) => {
    if (r.enabled && r.action?.stageId) {
      targeted.add(r.action.stageId);
    }
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

export function logStageMove(move: Omit<StageMove, "id" | "at">): StageMove {
  try {
    const moves = getStoredStageMoves();
    const newMove: StageMove = {
      ...move,
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      at: new Date().toISOString(),
    };
    const updated = [newMove, ...moves.slice(0, 499)]; // Keep latest 500
    localStorage.setItem(STAGE_MOVES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(STAGE_MOVES_STORE_EVENT));
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
