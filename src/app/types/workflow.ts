export type EntityType = "client" | "appointment" | "invoice" | "insurance" | "claim";

export interface AutomationBranch {
  id: string;
  name?: string; // "Branch 1", "Branch 2", etc.
  steps: WorkflowStep[];
}

export interface ConditionCaseRule {
  id: string;
  field: string;
  fieldLabel?: string;
  fieldSource?: string;
  operator: string;
  valueType?: "static" | "dynamic";
  value?: any;
  dynamicField?: string;
  dynamicFieldLabel?: string;
  dynamicFieldSource?: string;
  logicOp?: "AND" | "OR";
}

export interface ConditionCase {
  id: string;
  name: string;
  matchLogic?: "AND" | "OR";
  conditions: ConditionCaseRule[];
}

export type WorkflowStep = {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  kind?: "step" | "parallel";
  stepKey?: string;
  branches?: AutomationBranch[]; // Present when kind === "parallel" or stepKey === "parallel"
  trigger?: "stage" | "enter_stage" | "exit_stage" | "incall" | "inchat" | "postcall" | string;
  enabled?: boolean;
  executionType?: "wait" | "parallel";
  delayValue?: number;
  delayUnit?: string;
  isFixed?: boolean;
  isFixedAction?: boolean;
  connectAfterId?: string;
  conditions?: {
    field?: Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>;
    fieldOperators?: Array<"AND" | "OR">;
    intent?: Array<{ id: string; value: string }>;
    intentOperators?: Array<"AND" | "OR">;
    enabled?: boolean;
  };
  params?: Record<string, any>;
};
