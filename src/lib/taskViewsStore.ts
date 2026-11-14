/**
 * Task saved views = work queues (Slice 2, item 2.5). A view is a named filter over tasks (queue, priority,
 * overdue ...). The 8 sample queues are sample DATA seeded only by seedTaskViewSamples(); nothing in logic
 * refers to their names.
 */
import { createListStore, seedMissing } from "./refStore";
import type { TaskEntity } from "../types/task";

export const TASK_VIEWS_EVENT = "mantra_task_views_updated";

export interface TaskView {
  id: string;
  name: string;
  /** Match tasks whose queueId is one of these (empty = any). */
  queueIds?: string[];
  priorities?: Array<NonNullable<TaskEntity["priority"]>>;
  overdueOnly?: boolean;
  /** Include completed tasks (default false: queues show open work). */
  includeCompleted?: boolean;
  /** Visible columns, in order (informational for the Tasks table). */
  columns?: string[];
  sample?: boolean;
}

export const taskViewsStore = createListStore<TaskView>("mantra_task_views_v1", TASK_VIEWS_EVENT);

export const DEFAULT_VIEW_COLUMNS = ["queue", "title", "linkedRecord", "priority", "due", "sla", "amount", "assignee"];

const SAMPLE_QUEUE_NAMES = [
  "Insurance fixes",
  "Benefits to verify",
  "Enrollment",
  "Prior auth",
  "Claim fixes",
  "Posting",
  "Denials and A/R",
  "Patient balances",
];

/** Stable queue id for a name (what create_task stores in queueId). */
export const queueIdFromName = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const SAMPLE_TASK_VIEWS: TaskView[] = SAMPLE_QUEUE_NAMES.map((name) => ({
  id: `view-sample-${queueIdFromName(name)}`,
  name: `${name} (Sample)`,
  queueIds: [queueIdFromName(name)],
  columns: DEFAULT_VIEW_COLUMNS,
  sample: true,
}));

export function seedTaskViewSamples(): number {
  return seedMissing(taskViewsStore, SAMPLE_TASK_VIEWS);
}

export function isTaskOverdue(t: TaskEntity, now: number = Date.now()): boolean {
  if (t.status === "completed" || !t.dueAt) return false;
  const due = Date.parse(t.dueAt);
  return Number.isFinite(due) && due < now;
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function taskMatchesView(t: TaskEntity, v: TaskView, now: number = Date.now()): boolean {
  if (!v.includeCompleted && t.status === "completed") return false;
  if (v.queueIds && v.queueIds.length > 0 && !(t.queueId && v.queueIds.includes(t.queueId))) return false;
  if (v.priorities && v.priorities.length > 0 && !(t.priority && v.priorities.includes(t.priority))) return false;
  if (v.overdueOnly && !isTaskOverdue(t, now)) return false;
  return true;
}

/** Apply a view: filter, then sort by due date (earliest first, undated last), then amount at stake (largest first). */
export function applyTaskView(tasks: TaskEntity[], v: TaskView, now: number = Date.now()): TaskEntity[] {
  return tasks
    .filter((t) => taskMatchesView(t, v, now))
    .sort((a, b) => {
      const da = a.dueAt ? Date.parse(a.dueAt) : Infinity;
      const db = b.dueAt ? Date.parse(b.dueAt) : Infinity;
      if (da !== db) return da - db;
      const amt = (b.amountAtStake || 0) - (a.amountAtStake || 0);
      if (amt !== 0) return amt;
      return (PRIORITY_RANK[a.priority || "normal"] ?? 2) - (PRIORITY_RANK[b.priority || "normal"] ?? 2);
    });
}

export function countTasksInView(tasks: TaskEntity[], v: TaskView, now: number = Date.now()): number {
  return tasks.filter((t) => taskMatchesView(t, v, now)).length;
}
