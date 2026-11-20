import type { ReactNode } from "react";
import type { CallLog } from "../../../lib/processLogsStore";
import type { Claim } from "../../../lib/claimsStore";
import type { ArRecord } from "../../../lib/arStore";
import type { Process } from "../../../lib/useProcessStore";
import type { AutomationRule, StageMove } from "../../../lib/useAutomationStore";
import type { Conversation } from "../../../lib/useConversations";
import type { ActionRun } from "../../../lib/actionRuns";
import type { TaskEntity } from "../../../types/task";

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
  | "assignee"
  | "owner"
  | "status"
  | "provider";

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
  owner: string;
  status: string;
  provider: string;
}

/** The selected date range plus the window right before it (for deltas and sparklines). */
export interface DashboardPeriod {
  from: number;
  to: number;
  label: string;
  hasPeriod: boolean;
  dFrom: number;
  dTo: number;
  pFrom: number;
  pTo: number;
  deltaLabel: string;
}

/** A record moving through a workflow (claim / A/R / appointment / invoice), flattened for the Workflows dashboard. */
export interface WorkflowRecord {
  id: string;
  entity: string;
  processId: string;
  processName: string;
  stageId: string;
  stageName: string;
  stageCategory: string; // in_progress | success | lost
  owner?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface DashboardDataContext {
  calls: CallLog[];
  claims: Claim[];
  arRecords: ArRecord[];
  processes: Process[];
  rules: AutomationRule[];
  conversations: Conversation[];
  runs: ActionRun[];
  stageMoves: StageMove[];
  tasks: TaskEntity[];
  records: WorkflowRecord[];
  members: Array<{ id: string | number; name: string }>;
  period: DashboardPeriod;
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
  /** Chart width in the 12-column grid (default 6); KPIs share one row of equal tiles. */
  span?: 4 | 6 | 8 | 12;
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
