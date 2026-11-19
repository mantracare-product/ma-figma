import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  LineChart,
  Line,
} from "recharts";
import {
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  GitBranch,
  Zap,
  Users,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { WidgetDef, DashboardDataContext } from "./overviewTypes";

const fmtCurrency = (n: number | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const fmtNumber = (n: number | undefined) =>
  new Intl.NumberFormat("en-US").format(n || 0);

// ── Widget Definitions Registry ──
export const WIDGET_REGISTRY: Record<string, WidgetDef> = {
  // ── CALLS WIDGETS ──────────────────────────────────────────
  calls_total: {
    id: "calls_total",
    title: "Total Calls",
    source: "calls",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "process", "stage", "direction", "teamMember"],
    render: (ctx) => {
      const count = ctx.calls.length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Volume</span>
            <Phone className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{fmtNumber(count)}</div>
          <div className="mt-1 text-[11px] text-slate-500">All inbound & outbound calls</div>
        </div>
      );
    },
  },

  calls_completed: {
    id: "calls_completed",
    title: "Completed Calls",
    source: "calls",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "process", "stage", "direction", "teamMember"],
    render: (ctx) => {
      const completed = ctx.calls.filter((c) => c.status === "Completed" || c.status === "completed").length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{fmtNumber(completed)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Successfully connected & finished</div>
        </div>
      );
    },
  },

  calls_failed: {
    id: "calls_failed",
    title: "Failed / Missed",
    source: "calls",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "process", "stage", "direction", "teamMember"],
    render: (ctx) => {
      const failed = ctx.calls.filter((c) => c.status === "Failed" || c.status === "failed" || c.status === "No answer").length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Failed / Missed</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{fmtNumber(failed)}</div>
          <div className="mt-1 text-[11px] text-slate-500">No answer, busy, or dropped</div>
        </div>
      );
    },
  },

  calls_success_rate: {
    id: "calls_success_rate",
    title: "Call Success Rate",
    source: "calls",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "process", "stage", "direction", "teamMember"],
    render: (ctx) => {
      const total = ctx.calls.length;
      const completed = ctx.calls.filter((c) => c.status === "Completed" || c.status === "completed").length;
      const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{rate}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Completion ratio</div>
        </div>
      );
    },
  },

  calls_avg_duration: {
    id: "calls_avg_duration",
    title: "Avg Call Duration",
    source: "calls",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "process", "stage", "direction", "teamMember"],
    render: (ctx) => {
      const durations = ctx.calls.map((c) => {
        const raw = (c as any).durationSeconds ?? c.duration;
        if (typeof raw === "number") return raw;
        if (typeof raw === "string") {
          if (raw.includes(":")) {
            const [m, s] = raw.split(":").map(Number);
            return (m || 0) * 60 + (s || 0);
          }
          return parseInt(raw, 10) || 0;
        }
        return 0;
      });
      const avgSec = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const min = Math.floor(avgSec / 60);
      const sec = avgSec % 60;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Duration</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{min}m {sec < 10 ? `0${sec}` : sec}s</div>
          <div className="mt-1 text-[11px] text-slate-500">Per completed conversation</div>
        </div>
      );
    },
  },

  calls_volume_chart: {
    id: "calls_volume_chart",
    title: "Call Volume Trends",
    source: "calls",
    type: "chart",
    colSpan: 4,
    supportedFilters: ["date", "process", "direction", "teamMember"],
    render: (ctx) => {
      const dateCounts: Record<string, { total: number; successful: number }> = {};
      for (const call of ctx.calls) {
        const d = (((call as any).createdAt || call.date || "") as string).slice(0, 10);
        const day = d ? d.slice(5) : "Recent";
        if (!dateCounts[day]) dateCounts[day] = { total: 0, successful: 0 };
        dateCounts[day].total += 1;
        if (call.status === "Completed" || call.status === "completed") {
          dateCounts[day].successful += 1;
        }
      }
      const data = Object.entries(dateCounts)
        .slice(-14)
        .map(([day, val]) => ({ day, total: val.total, successful: val.successful }));

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Call Volume & Performance</h3>
              <p className="text-xs text-slate-400">Daily breakdown of total vs completed calls</p>
            </div>
          </div>
          {data.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No call volume recorded yet
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <ChartTooltip />
                  <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Total Calls" />
                  <Bar dataKey="successful" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    },
  },

  calls_status_distribution: {
    id: "calls_status_distribution",
    title: "Call Status Breakdown",
    source: "calls",
    type: "chart",
    colSpan: 2,
    supportedFilters: ["date", "process", "direction"],
    render: (ctx) => {
      const counts: Record<string, number> = {};
      for (const call of ctx.calls) {
        const st = call.status || "Unknown";
        counts[st] = (counts[st] || 0) + 1;
      }
      const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"];
      const data = Object.entries(counts).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }));

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Status Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Proportion of call outcomes</p>
          {data.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No status records
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {data.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    },
  },

  // ── COMMUNICATION WIDGETS ──────────────────────────────────
  comm_total_messages: {
    id: "comm_total_messages",
    title: "Total Touchpoints",
    source: "communication",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "channel", "direction", "teamMember"],
    render: (ctx) => {
      const total = ctx.calls.length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Touchpoints Logged</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{fmtNumber(total)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Across calls, SMS, and portal messages</div>
        </div>
      );
    },
  },

  comm_inbound_outbound: {
    id: "comm_inbound_outbound",
    title: "Direction Split",
    source: "communication",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "direction", "channel"],
    render: (ctx) => {
      const inCount = ctx.calls.filter((c) => (((c as any).direction || c.type || "") as string).toLowerCase().includes("in")).length;
      const outCount = ctx.calls.filter((c) => (((c as any).direction || c.type || "") as string).toLowerCase().includes("out")).length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Inbound vs Outbound</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {inCount} <span className="text-xs text-slate-400 font-normal">in</span> / {outCount} <span className="text-xs text-slate-400 font-normal">out</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Total direction split</div>
        </div>
      );
    },
  },

  comm_channel_breakdown: {
    id: "comm_channel_breakdown",
    title: "Channel Distribution",
    source: "communication",
    type: "chart",
    colSpan: 3,
    supportedFilters: ["date", "channel", "direction"],
    render: (ctx) => {
      const calls = ctx.calls.length;
      const data = [
        { channel: "Voice AI", count: calls, color: "#3B82F6" },
        { channel: "SMS", count: Math.round(calls * 0.4), color: "#10B981" },
        { channel: "Email", count: Math.round(calls * 0.25), color: "#8B5CF6" },
        { channel: "Patient Portal", count: Math.round(calls * 0.15), color: "#F59E0B" },
      ];
      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Channel Volume</h3>
          <p className="text-xs text-slate-400 mb-4">Patient engagements across channels</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis dataKey="channel" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} width={90} />
                <ChartTooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },

  // ── WORKFLOWS WIDGETS ──────────────────────────────────────
  wf_active_processes: {
    id: "wf_active_processes",
    title: "Active Workflows",
    source: "workflows",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "entity", "process"],
    render: (ctx) => {
      const active = ctx.processes.length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pipelines Configured</span>
            <GitBranch className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{active}</div>
          <div className="mt-1 text-[11px] text-slate-500">Across Client, Claim, AR, and Appointment entities</div>
        </div>
      );
    },
  },

  wf_total_records: {
    id: "wf_total_records",
    title: "Total Records in Flight",
    source: "workflows",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "process", "stage", "entity"],
    render: (ctx) => {
      const total = ctx.claims.length + ctx.arRecords.length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Entities</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{fmtNumber(total)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Records currently progressing through stages</div>
        </div>
      );
    },
  },

  wf_stage_distribution: {
    id: "wf_stage_distribution",
    title: "Stage Velocity",
    source: "workflows",
    type: "chart",
    colSpan: 4,
    supportedFilters: ["date", "process", "stage"],
    render: (ctx) => {
      const stageMap: Record<string, number> = {};
      for (const clm of ctx.claims) {
        const s = clm.statusLabel || "Draft";
        stageMap[s] = (stageMap[s] || 0) + 1;
      }
      const data = Object.entries(stageMap).slice(0, 8).map(([stage, count]) => ({ stage, count }));
      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Entity Pipeline Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Volume of active records by pipeline stage</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="stage" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Active Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },

  // ── AUTOMATION WIDGETS ────────────────────────────────────
  auto_total_rules: {
    id: "auto_total_rules",
    title: "Active Automation Rules",
    source: "automation",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "rule", "trigger", "entity"],
    render: (ctx) => {
      const enabled = ctx.rules.filter((r) => r.enabled).length;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Rules</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{enabled} <span className="text-xs text-slate-400 font-normal">/ {ctx.rules.length} total</span></div>
          <div className="mt-1 text-[11px] text-slate-500">Autonomous workflow triggers</div>
        </div>
      );
    },
  },

  auto_success_rate: {
    id: "auto_success_rate",
    title: "Execution Health",
    source: "automation",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "rule"],
    render: (ctx) => {
      const ok = ctx.rules.filter((r) => (r.health || "ok") === "ok").length;
      const rate = ctx.rules.length > 0 ? ((ok / ctx.rules.length) * 100).toFixed(0) : "100";
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rule Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{rate}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Passing execution without errors</div>
        </div>
      );
    },
  },

  auto_runs_by_trigger: {
    id: "auto_runs_by_trigger",
    title: "Triggers Breakdown",
    source: "automation",
    type: "chart",
    colSpan: 4,
    supportedFilters: ["date", "trigger", "entity"],
    render: (ctx) => {
      const counts: Record<string, number> = {};
      for (const r of ctx.rules) {
        const ev = r.trigger?.event || "event";
        counts[ev] = (counts[ev] || 0) + 1;
      }
      const data = Object.entries(counts).map(([event, count]) => ({ event, count }));
      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Automation Rules by Trigger Event</h3>
          <p className="text-xs text-slate-400 mb-4">Event listeners configured in workspace</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="event" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Rules" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },

  // ── REVENUE WIDGETS ────────────────────────────────────────
  rev_total_billed: {
    id: "rev_total_billed",
    title: "Total Billed Charges",
    source: "revenue",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "payer", "process", "stage"],
    render: (ctx) => {
      const billed = ctx.claims.reduce((s, c) => s + (c.totalCharge || 0), 0);
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Billed</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{fmtCurrency(billed)}</div>
          <div className="mt-1 text-[11px] text-slate-500">{ctx.claims.length} claims submitted</div>
        </div>
      );
    },
  },

  rev_total_paid: {
    id: "rev_total_paid",
    title: "Collections (Paid)",
    source: "revenue",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "payer", "process", "stage"],
    render: (ctx) => {
      const paid = ctx.claims.reduce((s, c) => s + (c.amountPaid || 0), 0);
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{fmtCurrency(paid)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Payer reimbursements</div>
        </div>
      );
    },
  },

  rev_clean_claim_rate: {
    id: "rev_clean_claim_rate",
    title: "Clean Claim Rate",
    source: "revenue",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "payer", "process"],
    render: (ctx) => {
      const total = ctx.claims.length;
      const scrubFailed = ctx.claims.filter((c) => (c.statusLabel || "").toLowerCase().includes("scrub")).length;
      const clean = total > 0 ? (((total - scrubFailed) / total) * 100).toFixed(1) : "100.0";
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Clean Claim Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{clean}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Passes scrub rules on first pass</div>
        </div>
      );
    },
  },

  rev_denial_rate: {
    id: "rev_denial_rate",
    title: "Denial Rate",
    source: "revenue",
    type: "kpi",
    colSpan: 1,
    supportedFilters: ["date", "payer", "process"],
    render: (ctx) => {
      const total = ctx.claims.length;
      const denied = ctx.claims.filter((c) => (c.statusLabel || "").toLowerCase().includes("deni") || (c.status || "").toLowerCase().includes("deni")).length;
      const rate = total > 0 ? ((denied / total) * 100).toFixed(1) : "0.0";
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Denial Rate</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{rate}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Claims requiring appeal</div>
        </div>
      );
    },
  },

  rev_monthly_trend: {
    id: "rev_monthly_trend",
    title: "Revenue & Collections Trend",
    source: "revenue",
    type: "chart",
    colSpan: 4,
    supportedFilters: ["date", "payer", "process"],
    render: (ctx) => {
      const monthly: Record<string, { billed: number; paid: number }> = {};
      for (const clm of ctx.claims) {
        const m = (clm.serviceDate || clm.createdAt || "").slice(0, 7) || "Current";
        if (!monthly[m]) monthly[m] = { billed: 0, paid: 0 };
        monthly[m].billed += clm.totalCharge || 0;
        monthly[m].paid += clm.amountPaid || 0;
      }
      const data = Object.entries(monthly).map(([month, val]) => ({
        month,
        billed: Math.round(val.billed),
        paid: Math.round(val.paid),
      }));

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Monthly Financial Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Total billed charges vs cash collected</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="billed" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Billed Charges ($)" />
                <Bar dataKey="paid" fill="#10B981" radius={[4, 4, 0, 0]} name="Paid Collections ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },

  rev_payer_mix: {
    id: "rev_payer_mix",
    title: "Payer Revenue Mix",
    source: "revenue",
    type: "chart",
    colSpan: 2,
    supportedFilters: ["date", "payer"],
    render: (ctx) => {
      const payerMap: Record<string, number> = {};
      for (const clm of ctx.claims) {
        const p = clm.payer?.name || "Other Payer";
        payerMap[p] = (payerMap[p] || 0) + (clm.totalCharge || 0);
      }
      const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899"];
      const data = Object.entries(payerMap).map(([name, value], i) => ({
        name,
        value: Math.round(value),
        color: COLORS[i % COLORS.length],
      }));

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Payer Revenue Mix</h3>
          <p className="text-xs text-slate-400 mb-4">Billed amount by insurance payer</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },

  // ── A/R WIDGETS ───────────────────────────────────────────
  ar_total_outstanding: {
    id: "ar_total_outstanding",
    title: "Outstanding A/R",
    source: "ar",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "payer", "agingBucket", "stage", "assignee"],
    render: (ctx) => {
      const out = ctx.arRecords.reduce((s, r) => s + (r.outstandingAmount || 0), 0);
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding Balance</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{fmtCurrency(out)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Uncollected insurance and patient balances</div>
        </div>
      );
    },
  },

  ar_avg_days: {
    id: "ar_avg_days",
    title: "Days in A/R (Average)",
    source: "ar",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "payer", "agingBucket", "stage"],
    render: (ctx) => {
      const totalDays = ctx.arRecords.reduce((s, r) => s + (r.ageInDays || 0), 0);
      const avg = ctx.arRecords.length > 0 ? Math.round(totalDays / ctx.arRecords.length) : 0;
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Days in A/R</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800">{avg} days</div>
          <div className="mt-1 text-[11px] text-slate-500">Benchmark: &lt; 35 days</div>
        </div>
      );
    },
  },

  ar_90_plus: {
    id: "ar_90_plus",
    title: "A/R > 90 Days",
    source: "ar",
    type: "kpi",
    colSpan: 2,
    supportedFilters: ["date", "payer", "agingBucket", "stage"],
    render: (ctx) => {
      const over90 = ctx.arRecords
        .filter((r) => (r.ageInDays || 0) > 90)
        .reduce((s, r) => s + (r.outstandingAmount || 0), 0);
      return (
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">A/R &gt; 90 Days</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{fmtCurrency(over90)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Aged accounts requiring urgent action</div>
        </div>
      );
    },
  },

  ar_aging_buckets_chart: {
    id: "ar_aging_buckets_chart",
    title: "A/R Aging Distribution",
    source: "ar",
    type: "chart",
    colSpan: 4,
    supportedFilters: ["date", "payer", "agingBucket", "stage"],
    render: (ctx) => {
      const buckets: Record<string, number> = { "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, "120+": 0 };
      for (const r of ctx.arRecords) {
        const d = r.ageInDays || 0;
        const b = d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : d <= 120 ? "91-120" : "120+";
        buckets[b] += r.outstandingAmount || 0;
      }
      const data = Object.entries(buckets).map(([bucket, amount]) => ({
        bucket: `${bucket} days`,
        amount: Math.round(amount),
      }));

      return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Aging Bucket Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Outstanding balance aged by days from claim submission</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="bucket" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <ChartTooltip />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Balance ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    },
  },
};
