import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import { queueCounts, rcmKpis } from "../../../lib/rcmKpis";
import { TASKS_STORE_EVENT } from "../../../lib/tasksStore";
import { TASK_VIEWS_EVENT } from "../../../lib/taskViewsStore";
import { CLAIMS_CHANGED_EVENT } from "../../../lib/claimsStore";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null, d = 0) => (v === null ? "—" : v.toFixed(d));

/** Overview > RCM row: work-queue counts (Task saved views) and revenue-cycle KPIs. Visible only with rcmReports. */
export default function RcmOverviewRow() {
  const { hasPermission } = useCurrentPermissions();
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const events = [TASKS_STORE_EVENT, TASK_VIEWS_EVENT, CLAIMS_CHANGED_EVENT];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  if (!hasPermission("rcmReports", "read")) return null;

  const queues = queueCounts();
  const k = rcmKpis();
  const hasData = queues.length > 0 || k.claimsTotal > 0 || k.eligibilityChecked > 0;
  const mock = queues.some((q) => q.sample);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 mb-6" data-testid="rcm-overview-row">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Revenue cycle</h2>
        {mock && <span className="text-[10px] font-bold uppercase text-amber-700">Includes mock data</span>}
      </div>
      {!hasData && <p className="text-xs text-slate-500">No revenue-cycle data yet. Load sample templates on the Automation page to see this row filled.</p>}
      {queues.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {queues.map((q) => (
            <Link key={q.viewId} to={`/tasks?view=${encodeURIComponent(q.viewId)}`} className="rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <div className="text-[11px] font-semibold text-slate-600 truncate">{q.name}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">{q.open}</span>
                {q.overdue > 0 && <span className="text-[11px] font-semibold text-red-600">{q.overdue} overdue</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        {[
          ["Claims", String(k.claimsTotal)],
          ["Submitted", String(k.claimsSubmitted)],
          ["Denial rate", pct(k.denialRate)],
          ["A/R outstanding", k.arOutstanding.toLocaleString()],
          ["Avg days in A/R", num(k.avgDaysInAr, 1)],
          ["First-pass accepted", pct(k.firstPassRate)],
          ["Eligibility checks", String(k.eligibilityChecked)],
          ["Verified", pct(k.eligibilityVerifiedRate)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-sm font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
