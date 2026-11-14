/**
 * Numbers for the Overview RCM row (Slice 6, item 6.1): queue counts from the Task saved views and a few KPIs.
 * Pure over the stores so it is testable; the row component only renders what this returns.
 */
import { getStoredTasks } from "./tasksStore";
import { countTasksInView, isTaskOverdue, taskMatchesView, taskViewsStore, type TaskView } from "./taskViewsStore";
import { getStoredClaims } from "./claimsStore";
import { outstandingOf } from "./rcmReportSources";
import { getProcessInstances } from "./processLogsStore";
import type { TaskEntity } from "../types/task";

export interface QueueCount {
  viewId: string;
  name: string;
  open: number;
  overdue: number;
  amountAtStake: number;
  sample: boolean;
}

export function queueCounts(now: number = Date.now(), tasks: TaskEntity[] = getStoredTasks(), views: TaskView[] = taskViewsStore.get()): QueueCount[] {
  return views.map((v) => {
    const open = tasks.filter((t) => taskMatchesView(t, v, now));
    return {
      viewId: v.id,
      name: v.name,
      open: countTasksInView(tasks, v, now),
      overdue: open.filter((t) => isTaskOverdue(t, now)).length,
      amountAtStake: open.reduce((a, t) => a + (t.amountAtStake || 0), 0),
      sample: !!v.sample,
    };
  });
}

export interface RcmKpis {
  claimsTotal: number;
  claimsSubmitted: number;
  claimsPaid: number;
  /** Denied claims / claims that have had a payer decision (paid or denied); null when none yet. */
  denialRate: number | null;
  /** Outstanding insurance A/R in currency units. */
  arOutstanding: number;
  /** Average age in days of claims still waiting on the payer; null when none. */
  avgDaysInAr: number | null;
  /** Share of submitted claims accepted on the first submission; null when none submitted. */
  firstPassRate: number | null;
  eligibilityChecked: number;
  /** Verified (active) / checked; null when nothing has been checked. */
  eligibilityVerifiedRate: number | null;
}

export function rcmKpis(now: number = Date.now()): RcmKpis {
  const claims = getStoredClaims();
  const submitted = claims.filter((c) => !!c.submittedAt);
  const paid = claims.filter((c) => (c.amountPaid || 0) > 0 && !c.denialCategory);
  const denied = claims.filter((c) => !!c.denialCategory);
  const decided = paid.length + denied.length;
  const waiting = submitted.filter((c) => (c.amountPaid || 0) === 0 && !c.denialCategory);
  const firstPass = submitted.filter((c) => (c.submissionCount || 1) === 1 && c.status !== "Rejected");
  const checked = getProcessInstances().filter((i) => (i as any).elig_status);
  const verified = checked.filter((i) => (i as any).elig_status === "active");
  const ageDays = (c: { submittedAt?: string }) => Math.max(0, (now - Date.parse(c.submittedAt as string)) / 86400000);
  return {
    claimsTotal: claims.length,
    claimsSubmitted: submitted.length,
    claimsPaid: paid.length,
    denialRate: decided ? denied.length / decided : null,
    arOutstanding: Math.round(claims.reduce((a, c) => a + outstandingOf(c), 0) * 100) / 100,
    avgDaysInAr: waiting.length ? waiting.reduce((a, c) => a + ageDays(c), 0) / waiting.length : null,
    firstPassRate: submitted.length ? firstPass.length / submitted.length : null,
    eligibilityChecked: checked.length,
    eligibilityVerifiedRate: checked.length ? verified.length / checked.length : null,
  };
}
