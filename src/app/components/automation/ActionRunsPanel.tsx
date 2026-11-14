import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ACTION_RUNS_EVENT,
  getActionHealth,
  listFailedActionRuns,
  retryActionRun,
  type ActionRun,
} from "../../../lib/actionRuns";

/** Health + Failed/Retry list for automation actions (Slice 2, item 2.2). Renders nothing when all is well. */
export default function ActionRunsPanel() {
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(ACTION_RUNS_EVENT, bump);
    return () => window.removeEventListener(ACTION_RUNS_EVENT, bump);
  }, []);

  const health = getActionHealth();
  const failed: ActionRun[] = health.failed > 0 ? listFailedActionRuns() : [];
  void tick;
  if (health.failed === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" data-testid="action-runs-panel">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-amber-900">
          Needs attention: {health.failed} automation action{health.failed === 1 ? "" : "s"} failed
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-amber-900 underline">
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {failed.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-xs text-amber-900">
              <span className="min-w-0 truncate">
                <b>{r.actionKey}</b>
                {r.ruleName ? ` · ${r.ruleName}` : ""} — {r.error} (attempt {r.attempts})
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-0.5 font-semibold hover:bg-amber-100"
                onClick={() => {
                  const res = retryActionRun(r.id);
                  if (res.status === "success") toast.success("Action retried successfully");
                  else toast.error(`Retry failed: ${res.error}`);
                }}
              >
                Retry
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
