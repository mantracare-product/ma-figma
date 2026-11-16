import type { EntityType, WorkflowStep } from "./workflow";

export type AutomationScope = "stage" | "global";

export type StageTrigger = {
  type: "stage";
  when: "entry" | "exit";
  params?: Record<string, any>;
};

export type EventTriggerType =
  | "process"
  | "client"
  | "appointment"
  | "invoice"
  | "call"
  | "insurance"
  | "stage"
  | "field_update"
  | "claim"
  | "coverage"
  | "era"
  | "schedule"
  | "task";

export type EventTrigger = {
  type: EventTriggerType;
  event: string;
  stage?: {
    entity: EntityType;
    processId: string;
    stageId: string;
    when: "entry" | "exit";
  };
  params?: Record<string, any>;
};

export interface AutomationStep {
  id: string;
  kind: "action" | "wait" | "condition";
  stepKey: string;
  name: string;
  description?: string;
  iconKey?: string;
  params: Record<string, any>;
  outputAlias?: string; // e.g. "invoice"
  delay?: {
    value: number;
    unit: "minutes" | "hours" | "days";
  };
}

export interface Automation {
  id: string;
  orgId: string;
  scope: AutomationScope;
  stageRef?: {
    processId: string;
    stageId: string;
    stageName?: string;
    processName?: string;
  };
  name: string;
  description?: string;
  status: "draft" | "active";
  trigger: StageTrigger | EventTrigger;
  steps: AutomationStep[];
  scopingRules?: any[];
  enabled?: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
  health?: "ok" | "failed" | "needs_attention";
  healthMessage?: string;
}

export interface RunContext {
  triggerPayload: Record<string, any>;
  client?: Record<string, any>;
  recordRefs: Record<string, any>;
  outputs: Record<string, any>; // step outputs by outputAlias (e.g. outputs["invoice"])
}

export interface GlobalTriggerDefinition {
  type: EventTriggerType;
  label: string;
  description: string;
  iconKey: string;
  events: Array<{
    event: string;
    label: string;
    description: string;
  }>;
}

export const GLOBAL_TRIGGER_CATALOG: GlobalTriggerDefinition[] = [
  {
    type: "process",
    label: "Process",
    description: "Trigger when a process workflow record is created or updated",
    iconKey: "workflow",
    events: [
      { event: "process.created", label: "Process created", description: "Fires when a new process workflow record is created" },
      { event: "process.updated", label: "Process updated", description: "Fires when a process workflow record is updated" },
    ],
  },
  {
    type: "client",
    label: "Client",
    description: "Trigger when a client record is created or updated",
    iconKey: "user",
    events: [
      { event: "client.created", label: "Client created", description: "New client record added from any intake source" },
      { event: "client.updated", label: "Client updated", description: "Client demographic or record details change" },
      { event: "client.checked_in", label: "Client checked in", description: "A client checks in (front desk or kiosk)" },
    ],
  },
  {
    type: "appointment",
    label: "Appointment",
    description: "Trigger when an appointment is created or updated",
    iconKey: "calendar",
    events: [
      { event: "appointment.created", label: "Appointment created", description: "A time slot or booking is created for a client" },
      { event: "appointment.updated", label: "Appointment updated", description: "An existing booking time, date, or status is updated" },
      { event: "appointment.booked", label: "Appointment booked", description: "A visit is booked for a client" },
      { event: "appointment.checked_in", label: "Appointment checked in", description: "The client arrives and is checked in for a visit" },
      { event: "appointment.completed", label: "Appointment completed", description: "A visit is marked completed" },
      { event: "appointment.cancelled", label: "Appointment cancelled", description: "A visit is cancelled" },
      { event: "appointment.rescheduled", label: "Appointment rescheduled", description: "A visit is moved to another time" },
      { event: "appointment.no_show", label: "Appointment no-show", description: "The client did not come to the visit" },
    ],
  },
  {
    type: "invoice",
    label: "Invoice",
    description: "Trigger when an invoice is created or updated",
    iconKey: "receipt",
    events: [
      { event: "invoice.created", label: "Invoice created", description: "New billing invoice is created or drafted" },
      { event: "invoice.updated", label: "Invoice updated", description: "Invoice details, items, or payment status are modified" },
      { event: "invoice.sent", label: "Invoice sent", description: "An invoice is sent to the client" },
      { event: "invoice.paid", label: "Invoice paid", description: "An invoice is paid in full" },
      { event: "invoice.partially_paid", label: "Invoice partially paid", description: "A payment covers part of an invoice" },
      { event: "invoice.overdue", label: "Invoice overdue", description: "An invoice passes its due date unpaid" },
      { event: "invoice.voided", label: "Invoice voided", description: "An invoice is voided" },
    ],
  },
  {
    type: "call",
    label: "Call",
    description: "Trigger when a call session is created or updated",
    iconKey: "phone",
    events: [
      { event: "call.created", label: "Call created", description: "A new inbound or outbound call session is initiated" },
      { event: "call.updated", label: "Call updated", description: "Call recording, transcript, analysis, or status is modified" },
    ],
  },
  {
    type: "claim",
    label: "Claim",
    description: "Trigger when a claim reaches a stage category, is scrubbed or its note is signed",
    iconKey: "filetext",
    events: [
      { event: "claim.ready", label: "Claim ready to submit", description: "A claim enters a stage marked ready to submit" },
      { event: "claim.scrub_failed", label: "Claim scrub failed", description: "The scrubber found errors on a claim" },
      { event: "claim.submitted", label: "Claim submitted", description: "A claim is submitted to the payer" },
      { event: "claim.pending", label: "Claim pending", description: "A claim is waiting on the payer" },
      { event: "claim.in_review", label: "Claim under review", description: "The payer is reviewing a claim" },
      { event: "claim.accepted", label: "Claim accepted", description: "The payer accepted a claim" },
      { event: "claim.rejected", label: "Claim rejected", description: "The clearinghouse or payer rejected a claim" },
      { event: "claim.denied", label: "Claim denied", description: "The payer denied a claim" },
      { event: "claim.failed", label: "Claim failed", description: "A claim could not be processed" },
      { event: "claim.partially_paid", label: "Claim partially paid", description: "The payer paid part of a claim" },
      { event: "claim.paid", label: "Claim paid", description: "A claim is paid in full" },
      { event: "claim.note_signed", label: "Claim note signed", description: "The visit note for a claim is signed with accepted codes" },
      { event: "scribe.note_signed", label: "Scribe note signed", description: "An AI Scribe note is signed and sent to billing" },
    ],
  },
  {
    type: "coverage",
    label: "Coverage",
    description: "Trigger when a client's insurance coverage changes",
    iconKey: "shield",
    events: [
      { event: "coverage.updated", label: "Coverage updated", description: "A client coverage is added or changed" },
    ],
  },
  {
    type: "era",
    label: "Remittance",
    description: "Trigger when a remittance (ERA) arrives",
    iconKey: "dollar",
    events: [
      { event: "era.received", label: "ERA received", description: "A remittance advice arrives from a payer" },
      { event: "era.unmatched", label: "ERA line unmatched", description: "An ERA line could not be matched to a claim" },
    ],
  },
  {
    type: "schedule",
    label: "Daily job",
    description: "Trigger on the daily schedule (each record the job selects)",
    iconKey: "clock",
    events: [
      { event: "job.daily", label: "Daily job", description: "Runs once a day for each record the job selects (eligibility, claims, invoices)" },
    ],
  },
  {
    type: "stage",
    label: "Stage",
    description: "Trigger when a record enters or leaves a stage of a process",
    iconKey: "gitbranch",
    events: [
      { event: "stage.entered", label: "Enters a stage", description: "A record moves into a stage of a process or claim workflow" },
      { event: "stage.exited", label: "Leaves a stage", description: "A record moves out of a stage of a process or claim workflow" },
    ],
  },
  {
    type: "task",
    label: "Task",
    description: "Trigger when a work-queue task changes",
    iconKey: "check",
    events: [
      { event: "task.created", label: "Task created", description: "A task is created" },
      { event: "task.updated", label: "Task updated", description: "A task is edited or reassigned" },
      { event: "task.completed", label: "Task completed", description: "A task is marked done" },
    ],
  },
];

/** Real name of a trigger event: the catalog label, else the event written out in words. */
export function triggerEventLabel(event: string): string {
  const found = GLOBAL_TRIGGER_CATALOG.flatMap((c) => c.events).find((e) => e.event === event);
  if (found) return found.label;
  return (event || "").replace(/[._]+/g, " ").replace(/^./, (m) => m.toUpperCase()) || "Trigger";
}
