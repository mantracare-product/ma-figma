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

export type TaskStudioResourceType = "file" | "image" | "video" | "url" | "html";
export type TaskStudioResourceSource = "upload" | "url";

export interface TaskStudioItemResource {
  type: TaskStudioResourceType;
  source?: TaskStudioResourceSource;
  value: string; // URL, data URL, or HTML block string
  name?: string; // Filename or label
  size?: string; // Human readable size (e.g. "240 KB")
  mimeType?: string;
}

export interface TaskItemCompletion {
  done: boolean;
  doneAt?: string;
}

export interface TaskStudioItem {
  id: string;
  title: string;
  description?: string;
  resource?: TaskStudioItemResource;
  isImportant: boolean;
  order: number;
  completion?: Record<string, TaskItemCompletion>; // personId / personName -> { done, doneAt }
}

export interface TaskResponsiblePerson {
  id: string;
  name: string;
  role?: string;
  category?: string;
  type: "member" | "contact" | "org_role";
  avatar?: string;
  orgId?: string;
  orgName?: string;
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
  type?: "member" | "contact" | "org_role";
  avatar?: string;
  category?: string;
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
  createAtTime?: string;
  deadlineOffsetDays?: number;
  stopRule: "never" | "count" | "date";
  stopCount?: number;
  stopDate?: string;
  skipWeekends: boolean;
  skipOffDays?: boolean;
  weeklyOffDays?: string[];
  customOffDates?: string[];
}

export interface TaskTimePlanningConfig {
  startDate?: string;
  dueDate?: string;
  durationDays?: number;
  assigneeCanEditDates: boolean;
  skipWeekends: boolean;
  skipOffDays?: boolean;
  weeklyOffDays?: string[];
  customOffDates?: string[];
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
  stageId?: string;
  stageName?: string;
  workflowId?: string;
  workflowName?: string;
  isImportant: boolean;
  scopeLevel: TaskScopeLevel;
  assignee: TaskAssigneeScope;
  assignees?: TaskAssigneeScope[];
  responsiblePeople?: TaskResponsiblePerson[];
  responsibleType?: "team" | "contact" | "org_role";
  targetRole?: string;
  targetCategory?: string;
  targetOrgId?: string;
  targetOrgName?: string;
  studioItems?: TaskStudioItem[];
  storytelling?: string;
  creator: {
    id: string;
    name: string;
    role?: string;
  };
  project?: string;
  deadline?: string;
  deadlineDate?: string;
  deadlineTime?: string;
  scopingRules?: any[];
  createdAt: string;
  updatedAt: string;
  checklists: TaskChecklist[];
  observers: TaskObserver[];
  subtasks: TaskSubtask[];
  parentTaskId?: string;
  recurrence?: TaskRecurrenceConfig;
  timePlanning?: TaskTimePlanningConfig;
  attachments: TaskFileAttachment[];
  department?: string;
  isPage?: boolean;
  htmlContent?: string;

  // ── RCM work-queue fields (all optional) ──
  /** The record this task is about. For a process instance, id === instanceId. */
  entityRef?: TaskEntityRef;
  /** Queue (saved-view bucket), e.g. a sample "Insurance fixes" queue. Free text, never hard-coded in logic. */
  queueId?: string;
  taskType?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  /** ISO timestamp the task is due. */
  dueAt?: string;
  payerId?: string;
  amountAtStake?: number;
  /** How the task came to exist, e.g. "rule" | "manual". */
  source?: string;
  /** Who/what closed it: "user" | "auto:stage_exit" | "rule" | ... */
  closedBy?: string;
  closedAt?: string;
}

/** Link from a task to the record (and stage) it was created for. */
export interface TaskEntityRef {
  type: "process_instance" | "appointment" | "claim" | "invoice" | "client" | string;
  id: string;
  instanceId?: string;
  processId?: string;
  stageId?: string;
  stageName?: string;
  ruleId?: string;
  /** Close the task automatically when the record leaves stageId (default true). */
  autoCloseOnStageExit?: boolean;
}

