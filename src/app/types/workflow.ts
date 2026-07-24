export type WorkflowTrigger = "stage" | "incall" | "inchat" | "postcall";

export interface WhatsappStepParams {
  messageSource?: "text" | "template" | "question";
  chatMessageText?: string;
  questionType?: "buttons" | "list";
  questionButtons?: Array<{ id: string; label: string; actionType?: "quick_reply" | "call" | "url" | "email"; value?: string }>;
  questionListItems?: string[];
  saveResponseField?: string;
}

export type WorkflowStep = {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  stepKey?: string;
  trigger?: WorkflowTrigger;
  executionType?: "wait" | "parallel";
  delayValue?: number;
  delayUnit?: string;
  connectAfterId?: string;
  portConnections?: Record<string, string>;
  conditions?: {
    field?: Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>;
    fieldOperators?: Array<"AND" | "OR">;
    intent?: Array<{ id: string; value: string }>;
    intentOperators?: Array<"AND" | "OR">;
    enabled?: boolean;
  };
  params?: Record<string, any>;
};
