import type { EntityType, WorkflowStep } from "./workflow";

export type AutomationScope = "stage" | "global";

export type StageTrigger = {
  type: "stage";
  when: "entry" | "exit";
};

export type EventTriggerType =
  | "appointment"
  | "call"
  | "client"
  | "document"
  | "invoice"
  | "insurance"
  | "stage";

export type EventTrigger = {
  type: EventTriggerType;
  event: string;
  stage?: {
    entity: EntityType;
    processId: string;
    stageId: string;
    when: "entry" | "exit";
  };
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
  enabled?: boolean;
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
    type: "appointment",
    label: "Appointment",
    description: "Trigger when a clinic appointment is booked, changed, or completed",
    iconKey: "calendar",
    events: [
      { event: "appointment.booked", label: "Appointment booked", description: "A time slot is confirmed for a client" },
      { event: "appointment.rescheduled", label: "Appointment rescheduled", description: "An existing booking time or date is updated" },
      { event: "appointment.cancelled", label: "Appointment cancelled", description: "A booking is cancelled by client or clinic" },
      { event: "appointment.checked_in", label: "Checked in", description: "Patient arrives or confirms presence at session" },
      { event: "appointment.completed", label: "Appointment completed", description: "Consultation or clinical service concludes" },
      { event: "appointment.no_show", label: "No-show", description: "Client fails to attend scheduled session without notice" },
    ],
  },
  {
    type: "call",
    label: "Call",
    description: "Trigger on inbound, outbound, or completed AI/telephony calls",
    iconKey: "phone",
    events: [
      { event: "call.inbound", label: "Inbound call", description: "An incoming call arrives at the clinic number" },
      { event: "call.outbound", label: "Outbound call", description: "An automated or agent dial is dispatched" },
      { event: "call.missed", label: "Missed call", description: "Caller disconnects before pickup or triage" },
      { event: "call.voicemail", label: "Voicemail left", description: "Caller leaves a voice recording" },
      { event: "call.ended", label: "Call ended", description: "Phone conversation concludes with transcript and summary" },
    ],
  },
  {
    type: "client",
    label: "Client",
    description: "Trigger when client records are created, modified, or archived",
    iconKey: "user",
    events: [
      { event: "client.created", label: "Client created", description: "New client record added from any intake source" },
      { event: "client.updated", label: "Client updated", description: "Client demographic or medical records change" },
      { event: "client.deleted", label: "Client deleted", description: "Client record is archived or removed" },
    ],
  },
  {
    type: "document",
    label: "Document",
    description: "Trigger when clinical documents or consent forms are handled",
    iconKey: "filetext",
    events: [
      { event: "document.uploaded", label: "Document uploaded", description: "File, lab result, or intake form is uploaded" },
      { event: "document.deleted", label: "Document deleted", description: "A document attachment is removed" },
    ],
  },
  {
    type: "invoice",
    label: "Invoice",
    description: "Trigger on billing statements, payments, and overdue statuses",
    iconKey: "receipt",
    events: [
      { event: "invoice.created", label: "Invoice created", description: "New billing invoice is created as draft" },
      { event: "invoice.sent", label: "Invoice sent", description: "Invoice is emailed, SMS'd, or dispatched to client" },
      { event: "invoice.viewed", label: "Invoice viewed", description: "Client opens online payment link" },
      { event: "invoice.partially_paid", label: "Partially paid", description: "Installment or partial amount received" },
      { event: "invoice.paid", label: "Invoice paid", description: "Full balance collected and settled" },
      { event: "invoice.overdue", label: "Invoice overdue", description: "Due date elapsed without complete payment" },
      { event: "invoice.voided", label: "Invoice voided", description: "Invoice cancelled or written off" },
    ],
  },
  {
    type: "insurance",
    label: "Insurance",
    description: "Trigger on insurance eligibility checks and coverage updates",
    iconKey: "shieldcheck",
    events: [
      { event: "insurance.verified", label: "Eligibility verified", description: "Policy benefits confirmed active with co-pay" },
      { event: "insurance.failed", label: "Verification failed", description: "Policy expired, inactive, or rejected by payer" },
    ],
  },
  {
    type: "stage",
    label: "Stage",
    description: "Trigger when a record enters or leaves a specific stage",
    iconKey: "gitbranch",
    events: [
      { event: "stage.entered", label: "Stage entered", description: "Record transitions into the selected process stage" },
      { event: "stage.exited", label: "Stage exited", description: "Record transitions out of the selected process stage" },
    ],
  },
];
