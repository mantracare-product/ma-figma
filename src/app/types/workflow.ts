export type WorkflowStep = {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  stepKey?: string;
  trigger?: "stage" | "incall" | "postcall";
  executionType?: "wait" | "parallel";
  delayValue?: number;
  delayUnit?: string;
  conditions?: {
    field?: Array<{ id: string; fieldSource: string; field: string; operator: string; value: string }>;
    fieldOperators?: Array<"AND" | "OR">;
    intent?: Array<{ id: string; value: string }>;
    intentOperators?: Array<"AND" | "OR">;
    enabled?: boolean;
  };
};
