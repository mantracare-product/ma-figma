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
  | "ai"
  | "insurance"
  | "stage"
  | "field_update";

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
    type: "ai",
    label: "AI",
    description: "Trigger when an AI prompt condition or natural language instruction is matched",
    iconKey: "sparkles",
    events: [
      { event: "ai.prompt", label: "AI Prompt Trigger", description: "Fires when prompt condition or natural language instruction evaluates to true" },
    ],
  },
];
