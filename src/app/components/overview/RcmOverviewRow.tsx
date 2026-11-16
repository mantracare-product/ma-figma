import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useCurrentPermissions } from "../../hooks/useCurrentPermissions";
import { rcmKpis } from "../../../lib/rcmKpis";
import { kpiDeltas } from "../../../lib/claimsOverviewData";
import { TASKS_STORE_EVENT } from "../../../lib/tasksStore";
import { CLAIMS_CHANGED_EVENT } from "../../../lib/claimsStore";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null, d = 0) => (v === null ? "—" : v.toFixed(d));

/** Delta chip: `goodWhenUp` decides green/red. Null = nothing to compare. */
function Delta({ v, unit, goodWhenUp = true }: { v: number | null; unit: string; goodWhenUp?: boolean }) {
  if (v === null) return <span className="text-[11px] text-slate-400">vs prior 30 days: —</span>;
  if (v === 0) return <span className="text-[11px] text-slate-400">no change · 30 days</span>;
  const good = (v > 0) === goodWhenUp;
  const Icon = v > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${good ? "text-emerald-700" : "text-red-600"}`}>
      <Icon className="w-3 h-3" />{v > 0 ? "+" : ""}{v}{unit}<span className="font-normal text-slate-400 ml-1">30 days</span>
    </span>
  );
}

/** Overview > Claims overview: one tidy row of KPI tiles (value + 30-day delta). Visible only with rcmReports. */
export default function RcmOverviewRow() {
  const { hasPermission } = useCurrentPermissions();
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const events = [TASKS_STORE_EVENT, CLAIMS_CHANGED_EVENT];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  if (!hasPermission("rcmReports", "read")) return null;

  const k = rcmKpis();
  const d = kpiDeltas();
  const tiles: Array<{ label: string; value: string; delta: React.ReactNode }> = [
    { label: "Claims", value: String(k.claimsTotal), delta: <Delta v={d.claims} unit="" /> },
    { label: "Submitted", value: String(k.claimsSubmitted), delta: <Delta v={d.submitted} unit="" /> },
    { label: "Denial rate", value: pct(k.denialRate), delta: <Delta v={d.denialRate} unit=" pt" goodWhenUp={false} /> },
    { label: "A/R outstanding", value: k.arOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 }), delta: <span className="text-[11px] text-slate-400">open balance</span> },
    { label: "Avg days in A/R", value: num(k.avgDaysInAr, 1), delta: <span className="text-[11px] text-slate-400">waiting on payers</span> },
    { label: "First-pass accepted", value: pct(k.firstPassRate), delta: <Delta v={d.firstPass} unit=" pt" /> },
    { label: "Eligibility verified", value: pct(k.eligibilityVerifiedRate), delta: <span className="text-[11px] text-slate-400">{k.eligibilityChecked} checks</span> },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3" data-testid="rcm-overview-row">
      {tiles.map((t) => (
        <div key={t.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] truncate">{t.label}</div>
          <div className="text-2xl font-bold text-[#222222] tabular-nums mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>{t.value}</div>
          <div className="mt-1 truncate">{t.delta}</div>
        </div>
      ))}
    </section>
  );
}
