import type { ReactNode } from "react";
import type { CallLog } from "../../../lib/processLogsStore";
import type { Claim } from "../../../lib/claimsStore";
import type { ArRecord } from "../../../lib/arStore";
import type { Process } from "../../../lib/useProcessStore";
import type { AutomationRule } from "../../../lib/useAutomationStore";

export type FilterKey =
  | "process"
  | "stage"
  | "date"
  | "channel"
  | "direction"
  | "teamMember"
  | "entity"
  | "rule"
  | "trigger"
  | "payer"
  | "agingBucket"
  | "assignee";

export interface FilterValues {
  process: string;
  stage: string;
  date: string;
  customFrom: string;
  customTo: string;
  channel: string;
  direction: string;
  teamMember: string;
  entity: string;
  rule: string;
  trigger: string;
  payer: string;
  agingBucket: string;
  assignee: string;
}

export interface DashboardDataContext {
  calls: CallLog[];
  claims: Claim[];
  arRecords: ArRecord[];
  processes: Process[];
  rules: AutomationRule[];
  filterValues: FilterValues;
}

export type WidgetSource =
  | "calls"
  | "communication"
  | "workflows"
  | "automation"
  | "revenue"
  | "ar";

export interface WidgetDef {
  id: string;
  title: string;
  description?: string;
  source: WidgetSource;
  type: "kpi" | "chart";
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  supportedFilters: FilterKey[];
  render: (ctx: DashboardDataContext) => ReactNode;
}

export interface CustomDashboard {
  id: string;
  name: string;
  orgId: string;
  widgetIds: string[];
  createdAt: number;
}
