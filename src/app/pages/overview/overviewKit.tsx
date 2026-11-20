/**
 * Visual kit for the Overview dashboards (DESIGN.md: white rounded-2xl cards, slate borders, Outfit headings, tabular
 * numbers). One KPI tile, one chart card, and thin recharts wrappers so every chart shares gridlines, axes, tooltips,
 * legends with values, palette and empty states.
 */
import React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend as _Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, BarChart3, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

void _Legend;

export const C = {
  blue: "#1456f0", emerald: "#10b981", amber: "#f59e0b", red: "#ef4444", violet: "#8b5cf6", cyan: "#06b6d4", pink: "#ec4899", slate: "#94a3b8", navy: "#1E293B", teal: "#14b8a6",
};
export const PALETTE = [C.blue, C.emerald, C.amber, C.violet, C.cyan, C.pink, C.red, C.teal, C.slate];
const GRID = "#eef2f7";
const AXIS = { fontSize: 11, fill: "#64748b" } as const;

export const fmtNum = (n: number | undefined | null, digits = 1) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 1000 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits }).format(v) : new Intl.NumberFormat("en-US", { maximumFractionDigits: v % 1 ? 1 : 0 }).format(v);
};
export const fmtCur = (n: number | undefined | null) => {
  const v = Number(n) || 0;
  return "$" + (Math.abs(v) >= 1000 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v));
};
export const fmtPct = (n: number | undefined | null, d = 1) => `${(Number(n) || 0).toFixed(d).replace(/\.0$/, "")}%`;
export const fmtDur = (secs: number) => {
  const s = Math.round(secs || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
export const fmtMinutes = (mins: number) => (mins < 1 ? `${Math.round(mins * 60)}s` : mins < 60 ? `${mins.toFixed(mins < 10 ? 1 : 0).replace(/\.0$/, "")}m` : `${(mins / 60).toFixed(1).replace(/\.0$/, "")}h`);

// ── KPI tile ─────────────────────────────────────────────────────────────────────────────────────

export interface KpiProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: string;
  /** % change vs the previous period; null = nothing to compare. */
  delta?: number | null;
  /** true when an increase is good (green), false when it is bad (red). */
  goodWhenUp?: boolean;
  deltaLabel?: string;
  spark?: number[];
  hint?: string;
}

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const rows = data.map((v, i) => ({ i, v }));
  const id = `sp${color.replace("#", "")}`;
  return (
    <div className="h-6 w-[64px] shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 3, right: 1, bottom: 1, left: 1 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.3} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeltaChip({ delta, goodWhenUp = true, label }: { delta?: number | null; goodWhenUp?: boolean; label?: string }) {
  if (delta === undefined) return null;
  if (delta === null) return <span className="text-[11px] font-semibold text-blue-600">New</span>;
  if (Math.abs(delta) < 0.05) return <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500"><Minus className="w-3 h-3" />0%{label && <span className="font-normal text-slate-400 ml-1 truncate">{label}</span>}</span>;
  const good = delta > 0 === goodWhenUp;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${good ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="w-3.5 h-3.5" />
      {Math.abs(delta) >= 1000 ? ">999" : Math.abs(delta).toFixed(Math.abs(delta) < 10 ? 1 : 0)}%
      {label && <span className="font-normal text-slate-400 ml-1 truncate">{label}</span>}
    </span>
  );
}

export function KpiTile({ label, value, icon: Icon, accent = C.blue, delta, goodWhenUp = true, deltaLabel, spark, hint }: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs min-w-0 h-full flex flex-col justify-between gap-2.5 transition-shadow hover:shadow-sm" data-testid="overview-kpi" title={deltaLabel}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#475569] truncate" title={label}>{label}</span>
        {Icon && (
          <span className="hidden 2xl:flex w-7 h-7 rounded-lg items-center justify-center shrink-0" style={{ background: `${accent}14`, color: accent }}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="text-[26px] leading-none font-bold text-[#0F172A] tabular-nums truncate" style={{ fontFamily: "Outfit, sans-serif" }}>{value}</div>
      <div className="flex items-center justify-between gap-2 min-h-[24px] min-w-0">
        <div className="min-w-0 truncate">{delta !== undefined ? <DeltaChip delta={delta} goodWhenUp={goodWhenUp} /> : <span className="text-[11px] text-slate-400 truncate">{hint}</span>}</div>
        {spark && spark.length > 1 && spark.some((v) => v !== 0) && <Sparkline data={spark} color={accent} />}
      </div>
    </div>
  );
}

// ── cards ────────────────────────────────────────────────────────────────────────────────────────

export function EmptyState({ text = "Nothing to show for this selection yet." }: { text?: string }) {
  return (
    <div className="flex-1 min-h-[180px] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
      <span className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
      <p className="text-xs max-w-[220px] leading-snug">{text}</p>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, empty, emptyText, right }: { title: string; subtitle?: string; children: React.ReactNode; empty?: boolean; emptyText?: string; right?: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs h-full flex flex-col min-w-0 ${empty ? "min-h-[240px]" : "min-h-[320px]"}`} data-testid="overview-chart">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B] truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-1 leading-snug">{subtitle}</p>}
        </div>
        {right}
      </div>
      {empty ? <EmptyState text={emptyText} /> : <div className="flex-1 min-h-0 flex flex-col">{children}</div>}
    </div>
  );
}

export function SkeletonCard({ tall }: { tall?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs animate-pulse ${tall ? "min-h-[320px]" : "min-h-[112px]"}`}>
      <div className="h-2.5 w-28 rounded bg-slate-100" />
      <div className={`mt-4 rounded-xl bg-slate-50 ${tall ? "h-52" : "h-8 w-24"}`} />
    </div>
  );
}

// ── tooltip + legend ─────────────────────────────────────────────────────────────────────────────

export function TooltipBox({ active, payload, label, format }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 shadow-lg text-xs min-w-[120px]">
      {label !== undefined && label !== "" && <div className="font-semibold text-[#1E293B] mb-1">{label}</div>}
      {payload.filter((p: any) => p.value !== undefined && p.value !== null).map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />{p.name ?? p.dataKey}</span>
          <span className="font-semibold text-[#0F172A] tabular-nums">{format ? format(p.value, p) : fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export interface LegendItem { name: string; value: number; color: string }

export function LegendList({ items, format = (n: number) => fmtNum(n), columns = 2 }: { items: LegendItem[]; format?: (n: number) => string; columns?: 1 | 2 }) {
  return (
    <div className={`grid gap-x-5 gap-y-1.5 pt-3 mt-3 border-t border-slate-100 text-[11px] ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {items.map((d) => (
        <div key={d.name} className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="truncate text-slate-600" title={d.name}>{d.name}</span>
          <span className="ml-auto font-semibold text-[#0F172A] tabular-nums">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SeriesLegend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 mt-1 text-[11px] text-slate-600">
      {items.map((d) => (
        <span key={d.name} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
      ))}
    </div>
  );
}

// ── charts ───────────────────────────────────────────────────────────────────────────────────────

export interface Slice { name: string; value: number }
const withColors = (rows: Slice[], colors: string[] = PALETTE): LegendItem[] => rows.map((r, i) => ({ ...r, color: colors[i % colors.length] }));

export function Donut({ data, centerLabel, format = (n: number) => fmtNum(n), colors, centerValue, maxLegend = 8 }: { data: Slice[]; centerLabel: string; format?: (n: number) => string; colors?: string[]; centerValue?: string; maxLegend?: number }) {
  const rows = withColors(data.filter((d) => d.value > 0), colors);
  const total = rows.reduce((a, d) => a + d.value, 0);
  return (
    <>
      <div className="relative w-full h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={86} paddingAngle={rows.length > 1 ? 2 : 0} strokeWidth={0} cornerRadius={4} isAnimationActive={false}>
              {rows.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TooltipBox format={format} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[#0F172A] tabular-nums" style={{ fontFamily: "Outfit, sans-serif" }}>{centerValue ?? format(total)}</span>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <LegendList items={rows.slice(0, maxLegend)} format={format} />
    </>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: AXIS } as const;
const H = 232;

export interface SeriesDef { key: string; name: string; color: string }

/** Vertical bars. `stacked` stacks the series; rounded top. */
export function Bars({ data, series, xKey = "label", stacked, format = (n: number) => fmtNum(n), legend = true, height = H, barSize }: { data: any[]; series: SeriesDef[]; xKey?: string; stacked?: boolean; format?: (n: number) => string; legend?: boolean; height?: number; barSize?: number }) {
  return (
    <>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -8 }} barCategoryGap="22%">
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" tickMargin={8} />
            <YAxis {...axisProps} tickFormatter={(v) => format(v)} width={44} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f8fafc" }} content={<TooltipBox format={format} />} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} stackId={stacked ? "a" : undefined} barSize={barSize} radius={stacked ? (i === series.length - 1 ? [6, 6, 0, 0] : 0) : [6, 6, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {legend && series.length > 1 && <SeriesLegend items={series} />}
    </>
  );
}

/** Horizontal bars (ranked lists, funnels). Every bar its own colour from `colors` or the single `color`. */
export function HBars({ data, color = C.blue, colors, format = (n: number) => fmtNum(n), height, nameWidth = 128 }: { data: Slice[]; color?: string; colors?: string[]; format?: (n: number) => string; height?: number; nameWidth?: number }) {
  const h = height ?? Math.max(190, data.length * 30 + 20);
  return (
    <div style={{ height: h }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => format(v)} allowDecimals={false} />
          <YAxis type="category" dataKey="name" {...axisProps} width={nameWidth} tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)} />
          <Tooltip cursor={{ fill: "#f8fafc" }} content={<TooltipBox format={format} />} />
          <Bar dataKey="value" name="Total" radius={[0, 6, 6, 0]} isAnimationActive={false} label={{ position: "right", fontSize: 11, fill: "#475569", formatter: (v: any) => format(Number(v)) }}>
            {data.map((d, i) => <Cell key={d.name} fill={colors ? colors[i % colors.length] : color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal stacked bars (one row per category, several series). */
export function StackedHBars({ data, series, xKey = "name", format = (n: number) => fmtNum(n), nameWidth = 100 }: { data: any[]; series: SeriesDef[]; xKey?: string; format?: (n: number) => string; nameWidth?: number }) {
  const h = Math.max(190, data.length * 38 + 20);
  return (
    <>
      <div style={{ height: h }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => format(v)} allowDecimals={false} />
            <YAxis type="category" dataKey={xKey} {...axisProps} width={nameWidth} />
            <Tooltip cursor={{ fill: "#f8fafc" }} content={<TooltipBox format={format} />} />
            {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === series.length - 1 ? [0, 6, 6, 0] : 0} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend items={series} />
    </>
  );
}

export function Areas({ data, series, xKey = "label", stacked, format = (n: number) => fmtNum(n), height = H }: { data: any[]; series: SeriesDef[]; xKey?: string; stacked?: boolean; format?: (n: number) => string; height?: number }) {
  if (data.length < 3) return <Bars data={data} series={series} xKey={xKey} stacked={stacked} format={format} height={height} barSize={40} />;
  return (
    <>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`ar-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} tickMargin={8} interval="preserveStartEnd" />
            <YAxis {...axisProps} tickFormatter={(v) => format(v)} width={44} allowDecimals={false} />
            <Tooltip content={<TooltipBox format={format} />} />
            {series.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#ar-${s.key})`} stackId={stacked ? "a" : undefined} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && <SeriesLegend items={series} />}
    </>
  );
}

export function Lines({ data, series, xKey = "label", format = (n: number) => fmtNum(n), height = H, domain }: { data: any[]; series: SeriesDef[]; xKey?: string; format?: (n: number) => string; height?: number; domain?: [number | "auto", number | "auto"] }) {
  return (
    <>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} tickMargin={8} />
            <YAxis {...axisProps} tickFormatter={(v) => format(v)} width={44} domain={domain} />
            <Tooltip content={<TooltipBox format={format} />} />
            {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.2} dot={{ r: 3, strokeWidth: 0, fill: s.color }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && <SeriesLegend items={series} />}
    </>
  );
}

/** Bars (left axis) + a line (right axis): e.g. calls vs messages, collections vs denial rate. */
export function Combo({ data, bar, line, xKey = "label", barFormat = (n: number) => fmtNum(n), lineFormat = (n: number) => fmtNum(n), height = H }: { data: any[]; bar: SeriesDef; line: SeriesDef; xKey?: string; barFormat?: (n: number) => string; lineFormat?: (n: number) => string; height?: number }) {
  return (
    <>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} {...axisProps} tickMargin={8} />
            <YAxis yAxisId="l" {...axisProps} tickFormatter={(v) => barFormat(v)} width={44} />
            <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={(v) => lineFormat(v)} width={40} />
            <Tooltip content={<TooltipBox format={(v: number, p: any) => (p.dataKey === line.key ? lineFormat(v) : barFormat(v))} />} />
            <Bar yAxisId="l" dataKey={bar.key} name={bar.name} fill={bar.color} radius={[6, 6, 0, 0]} barSize={22} isAnimationActive={false} />
            <Line yAxisId="r" type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2.2} dot={{ r: 3, strokeWidth: 0, fill: line.color }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend items={[bar, line]} />
    </>
  );
}
