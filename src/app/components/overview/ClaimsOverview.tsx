import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { buildClaimsOverview, type Slice } from "../../../lib/claimsOverviewData";
import { CLAIMS_CHANGED_EVENT } from "../../../lib/claimsStore";
import { TASKS_STORE_EVENT } from "../../../lib/tasksStore";
import { PROCESS_LOGS_STORE_EVENT } from "../../../lib/processLogsStore";
import RcmOverviewRow from "./RcmOverviewRow";

const PALETTE = ["#1456f0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#64748B"];
const card = "bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col";
const title = "text-base font-bold text-[#222222] mb-2";

function Empty() {
  return <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic min-h-[160px]">No data for this selection.</div>;
}

function Donut({ data, label }: { data: Slice[]; label: string }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  if (rows.length === 0) return <Empty />;
  return (
    <>
      <div className="relative w-full h-56 my-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {rows.map((d, i) => <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <ChartTooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[#222222] tabular-nums">{total.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-slate-100 text-[11px]">
        {rows.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-slate-600">{d.name}</span>
            <span className="ml-auto font-semibold text-slate-800 tabular-nums">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BarBox({ data, xKey, yKey, horizontal, color = "#1456f0" }: { data: any[]; xKey: string; yKey: string; horizontal?: boolean; color?: string }) {
  if (data.length === 0 || data.every((d) => !d[yKey])) return <Empty />;
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 24 : 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey={xKey} width={120} tick={{ fontSize: 10 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} interval={0} angle={data.length > 5 ? -20 : 0} height={data.length > 5 ? 50 : 30} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            </>
          )}
          <ChartTooltip />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineBox({ data, yKey, unit }: { data: any[]; yKey: string; unit: string }) {
  if (data.length === 0 || data.every((d) => d[yKey] === null)) return <Empty />;
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit={unit} domain={[0, 100]} />
          <ChartTooltip />
          <Line type="monotone" dataKey={yKey} stroke="#1456f0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Slide 2 of Overview: revenue-cycle KPIs and charts from the real stores. Filters: payer and date range. */
export default function ClaimsOverview({ payer, from, to }: { payer: string; from: string; to: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const events = [CLAIMS_CHANGED_EVENT, TASKS_STORE_EVENT, PROCESS_LOGS_STORE_EVENT];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  const d = useMemo(() => buildClaimsOverview({ payer, from, to }), [payer, from, to, tick]);

  return (
    <div className="space-y-6" data-testid="claims-overview">
      <RcmOverviewRow />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className={card}><h3 className={title}>Claims by stage</h3><BarBox data={d.claimsByStage} xKey="name" yKey="value" /></div>
        <div className={card}><h3 className={title}>Claims by workflow</h3><Donut data={d.claimsByWorkflow} label="CLAIMS" /></div>
        <div className={card}><h3 className={title}>Denial rate by month</h3><LineBox data={d.denialTrend} yKey="rate" unit="%" /></div>
        <div className={card}><h3 className={title}>A/R aging (outstanding)</h3><BarBox data={d.arAging} xKey="bucket" yKey="amount" color="#F59E0B" /></div>
        <div className={card}><h3 className={title}>Payer mix (charges)</h3><Donut data={d.payerMix} label="CHARGES" /></div>
        <div className={card}><h3 className={title}>First-pass acceptance by month</h3><LineBox data={d.firstPassTrend} yKey="rate" unit="%" /></div>
        <div className={card}><h3 className={title}>Eligibility results</h3><Donut data={d.eligibility} label="CHECKS" /></div>
        <div className={`${card} md:col-span-2`}><h3 className={title}>Task queues (open)</h3><BarBox data={d.queues} xKey="name" yKey="value" horizontal color="#10B981" /></div>
      </div>
    </div>
  );
}
