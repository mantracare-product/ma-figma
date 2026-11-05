export type TaskStatus = "pending" | "in_progress" | "review" | "completed" | "deferred";

export type TaskScopeLevel = "admin" | "client" | "portal";

export interface TaskAssigneeScope {
  scopeLevel: "admin" | "org" | "org_role" | "client" | "contact";
  adminScopeId?: string;
  adminScopeName?: string;
  orgId?: string;
  orgName?: string;
  roleId?: string;
  roleName?: string;
  clientId?: string;
  clientName?: string;
  userId?: string;
  assigneeName: string;
  assigneeAvatar?: string;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  isImportant: boolean;
}

export interface TaskChecklist {
  id: string;
  title: string;
  items: TaskChecklistItem[];
}

export interface TaskObserver {
  id: string;
  name: string;
  role?: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
  assigneeName?: string;
  deadline?: string;
}

export interface TaskRecurrenceConfig {
  enabled: boolean;
  interval: number;
  unit: "days" | "weeks" | "months" | "years";
  startDate: string;
  createAtTime: string;
  deadlineOffsetDays: number;
  stopRule: "never" | "count" | "date";
  stopCount?: number;
  stopDate?: string;
  skipWeekends: boolean;
}

export interface TaskTimePlanningConfig {
  startDate?: string;
  dueDate?: string;
  durationDays?: number;
  assigneeCanEditDates: boolean;
  skipWeekends: boolean;
  useSubtaskDates: boolean;
}

export interface TaskFileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  url?: string;
}

export interface TaskEntity {
  id: string;
  code: string;
  title: string;
  description: string;
  status: TaskStatus;
  isImportant: boolean;
  scopeLevel: TaskScopeLevel;
  assignee: TaskAssigneeScope;
  creator: {
    id: string;
    name: string;
    role?: string;
  };
  project?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  checklists: TaskChecklist[];
  observers: TaskObserver[];
  subtasks: TaskSubtask[];
  parentTaskId?: string;
  recurrence?: TaskRecurrenceConfig;
  timePlanning?: TaskTimePlanningConfig;
  attachments: TaskFileAttachment[];
}

