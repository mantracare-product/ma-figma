export type EntityType = "client" | "appointment" | "invoice" | "insurance" | "claim";

export interface AutomationBranch {
  id: string;
  name?: string; // "Branch 1", "Branch 2", etc.
  steps: WorkflowStep[];
}

export interface ConditionCaseRule {
  id: string;
  kind?: "field" | "intent";
  field: string;
  fieldLabel?: string;
  fieldSource?: string;
  operator: string;
  valueType?: "static" | "dynamic";
  value?: any;
  intentPrompt?: string;
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
  stepKey: string;
  trigger?: string;
  executionType?: "instant" | "wait" | "parallel";
  delayValue?: number;
  delayUnit?: "Minute" | "Hour" | "Day" | "Second" | "Week" | "Month" | string;
  connectAfterId?: string;
  params?: Record<string, any>;
  targetEntity?: EntityType;
  cases?: ConditionCase[];
  branches?: AutomationBranch[];
  order?: number;
  kind?: "action" | "wait" | "condition" | "parallel";
  enabled?: boolean;
  isFixed?: boolean;
  isFixedAction?: boolean;
};
