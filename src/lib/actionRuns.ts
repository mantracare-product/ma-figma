/**
 * Shared per-action idempotency + run log (Slice 1, item f).
 *
 * Every automation action that must not run twice for the same trigger wraps its work in `runActionOnce`.
 * The run is recorded as success | failed. A failed run stays retryable (`retryActionRun`) and is counted by
 * `getActionHealth` so a UI can surface "N actions failed" later.
 *
 * Frontend only: state lives in localStorage (`automation_action_runs_v1`).
 */

export type ActionRunStatus = "success" | "failed";

export interface ActionRun {
  id: string;
  /** Idempotency key: same key => same logical execution. */
  key: string;
  actionKey: string;
  ruleId?: string;
  ruleName?: string;
  stepId?: string;
  status: ActionRunStatus;
  attempts: number;
  error?: string;
  /** Everything a retry handler needs to re-run the action without the original event. */
  payload?: Record<string, any>;
  result?: Record<string, any>;
  firstAt: string;
  lastAt: string;
}

const STORAGE_KEY = "automation_action_runs_v1";
const MAX_RUNS = 500;
export const ACTION_RUNS_EVENT = "automation_action_runs_updated";

function readRuns(): ActionRun[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: ActionRun[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof Event !== "undefined") {
      window.dispatchEvent(new Event(ACTION_RUNS_EVENT));
    }
  } catch (e) {
    console.warn("[actionRuns] could not persist run log:", e);
  }
}

/** Build a stable idempotency key from its parts (undefined parts are skipped). */
export function actionIdempotencyKey(...parts: Array<string | number | undefined | null>): string {
  return parts.filter((p) => p !== undefined && p !== null && p !== "").join("|");
}

export function getActionRun(key: string): ActionRun | undefined {
  return readRuns().find((r) => r.key === key);
}

export function listActionRuns(filter?: { status?: ActionRunStatus; actionKey?: string }): ActionRun[] {
  return readRuns().filter(
    (r) => (!filter?.status || r.status === filter.status) && (!filter?.actionKey || r.actionKey === filter.actionKey)
  );
}

export function listFailedActionRuns(): ActionRun[] {
  return listActionRuns({ status: "failed" });
}

export interface ActionHealth {
  total: number;
  failed: number;
  lastFailureAt?: string;
}

export function getActionHealth(): ActionHealth {
  const runs = readRuns();
  const failed = runs.filter((r) => r.status === "failed");
  return {
    total: runs.length,
    failed: failed.length,
    lastFailureAt: failed.map((r) => r.lastAt).sort().pop(),
  };
}

export interface RunOnceMeta {
  actionKey: string;
  ruleId?: string;
  ruleName?: string;
  stepId?: string;
  payload?: Record<string, any>;
}

export interface RunOnceResult<T> {
  status: ActionRunStatus;
  /** True when a previous successful run with this key made this call a no-op. */
  alreadyRan: boolean;
  result?: T;
  error?: string;
}

function upsert(run: ActionRun): void {
  const runs = readRuns();
  const idx = runs.findIndex((r) => r.key === run.key);
  if (idx >= 0) runs[idx] = run;
  else runs.unshift(run);
  writeRuns(runs);
}

/**
 * Run `fn` unless a successful run with the same key already exists. Exceptions are caught and recorded as a
 * failed run (never rethrown) so one bad action cannot break the rest of the rule chain.
 */
export function runActionOnce<T extends Record<string, any> | void>(
  key: string,
  meta: RunOnceMeta,
  fn: () => T
): RunOnceResult<T> {
  const prev = getActionRun(key);
  if (prev && prev.status === "success") {
    return { status: "success", alreadyRan: true, result: prev.result as T };
  }
  const now = new Date().toISOString();
  try {
    const result = fn();
    upsert({
      id: prev?.id || `RUN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      key,
      ...meta,
      status: "success",
      attempts: (prev?.attempts || 0) + 1,
      result: (result as Record<string, any>) || undefined,
      firstAt: prev?.firstAt || now,
      lastAt: now,
    });
    return { status: "success", alreadyRan: false, result };
  } catch (e: any) {
    const error = String(e?.message || e);
    console.warn(`[actionRuns] ${meta.actionKey} failed (${key}):`, error);
    upsert({
      id: prev?.id || `RUN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      key,
      ...meta,
      status: "failed",
      attempts: (prev?.attempts || 0) + 1,
      error,
      firstAt: prev?.firstAt || now,
      lastAt: now,
    });
    return { status: "failed", alreadyRan: false, error };
  }
}

type RetryHandler = (run: ActionRun) => Record<string, any> | void;
const retryHandlers = new Map<string, RetryHandler>();

/** Register how a failed run of `actionKey` is re-executed from its stored payload. */
export function registerActionRetryHandler(actionKey: string, handler: RetryHandler): void {
  retryHandlers.set(actionKey, handler);
}

/** Re-run one failed run through its registered handler. Returns the new status. */
export function retryActionRun(runId: string): RunOnceResult<any> {
  const run = readRuns().find((r) => r.id === runId);
  if (!run) return { status: "failed", alreadyRan: false, error: "Run not found" };
  if (run.status === "success") return { status: "success", alreadyRan: true, result: run.result };
  const handler = retryHandlers.get(run.actionKey);
  if (!handler) return { status: "failed", alreadyRan: false, error: `No retry handler for ${run.actionKey}` };
  return runActionOnce(run.key, { actionKey: run.actionKey, ruleId: run.ruleId, ruleName: run.ruleName, stepId: run.stepId, payload: run.payload }, () =>
    handler(run) as any
  );
}

export function __resetActionRunsForTests(): void {
  retryHandlers.clear();
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
