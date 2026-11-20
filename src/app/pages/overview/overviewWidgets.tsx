/**
 * Widget registry of the Overview dashboards. Every widget reads the shared DashboardDataContext (already filtered by the
 * page filters except the date, which each widget applies through ctx.period so deltas and sparklines can compare with
 * the previous period). Real data only. Ids of the earlier widgets are kept so saved custom dashboards keep working.
 */
import React from "react";
import {
  Activity, AlertTriangle, BadgeDollarSign, CheckCircle2, Clock, GitBranch, Hourglass, MessageSquare, MessagesSquare, PhoneCall, PhoneMissed,
  Receipt, ShieldCheck, Target, Timer, TrendingUp, Trophy, Wallet, Zap, Inbox, Send, Percent, ListChecks, Layers,
} from "lucide-react";
import type { WidgetDef, DashboardDataContext } from "./overviewTypes";
import type { CallLog } from "../../../lib/processLogsStore";
import type { Claim } from "../../../lib/claimsStore";
import type { ArRecord } from "../../../lib/arStore";
import { claimsOnly, getClaimWorkflow, getClaimWorkflows } from "../../../lib/claimWorkflows";
import { readLocalRecordFields } from "../../../lib/recordWriter";
import {
  avg, CHANNEL_LABEL, dayKey, dayLabel, durationSeconds, firstResponses, groupByTime, humanize, inPeriod, inRange, messageRows, metric, monthKey, monthLabel,
  parseTs, pctChange, sum, type Metric, type MsgRow,
} from "./overviewData";
import {
  Areas, Bars, ChartCard, Combo, C, Donut, fmtCur, fmtDur, fmtMinutes, fmtNum, fmtPct, HBars, KpiTile, Lines, PALETTE, StackedHBars, type Slice,
} from "./overviewKit";

// ── shared helpers ───────────────────────────────────────────────────────────────────────────────

type Ctx = DashboardDataContext;
const lc = (v: unknown) => String(v ?? "").toLowerCase();

function kpi(ctx: Ctx, m: Metric, o: { label: string; fmt: (n: number) => string; icon: any; accent?: string; goodWhenUp?: boolean; noDelta?: boolean; hint?: string }) {
  return (
    <KpiTile
      label={o.label}
      value={o.fmt(m.value)}
      icon={o.icon}
      accent={o.accent}
      goodWhenUp={o.goodWhenUp}
      delta={o.noDelta ? undefined : pctChange(m.cur, m.prev)}
      deltaLabel={ctx.period.hasPeriod ? "vs prev." : "30d trend"}
      spark={o.noDelta ? undefined : m.spark}
      hint={o.hint}
    />
  );
}

const countBy = <T,>(items: T[], key: (x: T) => string | undefined, fallback = "Unassigned"): Slice[] => {
  const m = new Map<string, number>();
  for (const it of items) { const k = key(it) || fallback; m.set(k, (m.get(k) || 0) + 1); }
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};
const topN = (rows: Slice[], n: number): Slice[] => {
  if (rows.length <= n) return rows;
  const head = rows.slice(0, n - 1);
  return [...head, { name: "Other", value: sum(rows.slice(n - 1).map((r) => r.value)) }];
};

// calls
const callTs = (c: CallLog) => parseTs((c as any).createdAt || c.date);
const isCompleted = (c: CallLog) => lc(c.status) === "completed";
const isFailed = (c: CallLog) => ["failed", "no answer", "missed", "busy", "dropped"].includes(lc(c.status));
const callDir = (c: CallLog) => { const d = lc((c as any).direction || c.type); return d.includes("in") ? "Inbound" : d.includes("out") ? "Outbound" : "Other"; };

// claims
const claimTs = (c: Claim) => parseTs(c.submittedAt || c.createdAt || c.serviceDate);
const isDenied = (c: Claim) => !!c.denialCategory;
const isPaid = (c: Claim) => (c.amountPaid || 0) > 0 && !c.denialCategory;
const denialRate = (cs: Claim[]) => { const d = cs.filter(isDenied).length; const p = cs.filter(isPaid).length; return d + p ? (d / (d + p)) * 100 : 0; };
const firstPass = (cs: Claim[]) => { const s = cs.filter((c) => !!c.submittedAt); return s.length ? (s.filter((c) => (c.submissionCount || 1) === 1 && c.status !== "Rejected").length / s.length) * 100 : 0; };
const eligOf = (c: Claim): string => ((readLocalRecordFields("claim", c.id) as any)?.elig_status as string) || "";
const ELIG_LABEL = (s: string) => (s === "active" ? "Verified" : s === "not_found" || s === "provider_setup" ? "Needs fix" : s === "inactive" ? "Inactive" : s === "inconclusive" || s === "pending_review" ? "Inconclusive / in review" : "");
const stageNameOf = (c: Claim) => {
  const wf = getClaimWorkflow(c.processId) || getClaimWorkflows()[0];
  return wf?.stages.find((s) => s.id === c.currentStageId)?.name || c.statusLabel || "No stage";
};
const isClosedStage = (c: Claim) => { const wf = getClaimWorkflow(c.processId); const st = wf?.stages.find((s) => s.id === c.currentStageId); return st?.stageCategory === "success" || st?.stageCategory === "lost"; };

// A/R
const arTs = (r: ArRecord) => parseTs((r as any).updatedAt || r.createdAt || r.submittedDate);
const BUCKETS = ["0-30", "31-60", "61-90", "91-120", "120+"];
const bucketOf = (d: number) => (d <= 30 ? "0-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : d <= 120 ? "91-120" : "120+");

// messages
function msgs(ctx: Ctx): MsgRow[] {
  const f = ctx.filterValues;
  return messageRows(ctx.conversations).filter((m) => (f.direction === "all" || m.direction === f.direction) && (f.teamMember === "all" || m.member === f.teamMember));
}

// ── registry ─────────────────────────────────────────────────────────────────────────────────────

const R: Record<string, WidgetDef> = {};
const add = (w: Omit<WidgetDef, "colSpan"> & { colSpan?: WidgetDef["colSpan"] }) => { R[w.id] = { colSpan: w.type === "kpi" ? 1 : 2, ...w } as WidgetDef; };

// CALLS ──────────────────────────────────────────────────────────────────────────────────────────
const CALL_FILTERS = ["date", "process", "stage", "direction", "teamMember"] as WidgetDef["supportedFilters"];

add({ id: "calls_total", title: "Total volume", description: "All inbound and outbound calls", source: "calls", type: "kpi", supportedFilters: CALL_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.calls, callTs, ctx.period, (s) => s.length), { label: "Total volume", fmt: fmtNum, icon: PhoneCall, accent: C.blue }) });
add({ id: "calls_completed", title: "Completed", description: "Calls that connected and finished", source: "calls", type: "kpi", supportedFilters: CALL_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.calls, callTs, ctx.period, (s) => s.filter(isCompleted).length), { label: "Completed", fmt: fmtNum, icon: CheckCircle2, accent: C.emerald }) });
add({ id: "calls_failed", title: "Failed / missed", description: "No answer, busy or dropped calls", source: "calls", type: "kpi", supportedFilters: CALL_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.calls, callTs, ctx.period, (s) => s.filter(isFailed).length), { label: "Failed / missed", fmt: fmtNum, icon: PhoneMissed, accent: C.red, goodWhenUp: false }) });
add({ id: "calls_success_rate", title: "Success rate", description: "Completed calls as a share of all calls", source: "calls", type: "kpi", supportedFilters: CALL_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.calls, callTs, ctx.period, (s) => (s.length ? (s.filter(isCompleted).length / s.length) * 100 : 0)), { label: "Success rate", fmt: (n) => fmtPct(n), icon: Target, accent: C.violet }) });
add({ id: "calls_avg_duration", title: "Avg duration", description: "Average length of completed calls", source: "calls", type: "kpi", supportedFilters: CALL_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.calls, callTs, ctx.period, (s) => avg(s.filter(isCompleted).map((c) => durationSeconds((c as any).durationSeconds ?? c.duration)).filter((x) => x > 0))), { label: "Avg duration", fmt: fmtDur, icon: Timer, accent: C.cyan }) });

add({ id: "calls_volume_chart", title: "Call volume & performance", description: "Total vs completed calls over time", source: "calls", type: "chart", span: 8, supportedFilters: CALL_FILTERS,
  render: (ctx) => {
    const g = groupByTime(inPeriod(ctx.calls, callTs, ctx.period), callTs);
    const data = g.map((b) => ({ label: b.label, total: b.items.length, completed: b.items.filter(isCompleted).length }));
    return (
      <ChartCard title="Call volume & performance" subtitle="Total calls against the ones that completed" empty={data.length === 0} emptyText="No calls in this period.">
        <Bars data={data} series={[{ key: "total", name: "Total", color: C.blue }, { key: "completed", name: "Completed", color: C.emerald }]} />
      </ChartCard>
    );
  } });
add({ id: "calls_status_distribution", title: "Status distribution", description: "Calls by outcome", source: "calls", type: "chart", span: 4, supportedFilters: CALL_FILTERS,
  render: (ctx) => {
    const rows = topN(countBy(inPeriod(ctx.calls, callTs, ctx.period), (c) => humanize(c.status || "Unknown")), 6);
    return <ChartCard title="Status distribution" subtitle="How calls ended" empty={rows.length === 0} emptyText="No calls in this period."><Donut data={rows} centerLabel="Calls" /></ChartCard>;
  } });
add({ id: "calls_by_direction", title: "Calls by direction", description: "Inbound vs outbound calls", source: "calls", type: "chart", span: 4, supportedFilters: CALL_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(ctx.calls, callTs, ctx.period), callDir);
    const colors = { Inbound: C.emerald, Outbound: C.blue, Other: C.slate } as Record<string, string>;
    return <ChartCard title="Calls by direction" subtitle="Who started the conversation" empty={rows.length === 0} emptyText="No calls in this period."><Donut data={rows} centerLabel="Calls" colors={rows.map((r) => colors[r.name] || C.slate)} /></ChartCard>;
  } });
add({ id: "calls_by_hour", title: "Calls by hour of day", description: "When calls happen", source: "calls", type: "chart", span: 4, supportedFilters: CALL_FILTERS,
  render: (ctx) => {
    const cs = inPeriod(ctx.calls, callTs, ctx.period).map((c) => callTs(c)).filter((t): t is number => t !== undefined);
    const hrs = new Array(24).fill(0);
    cs.forEach((t) => { hrs[new Date(t).getHours()] += 1; });
    const used = hrs.map((v, h) => (v ? h : -1)).filter((h) => h >= 0);
    const [a, b] = used.length ? [Math.max(0, Math.min(...used) - 1), Math.min(23, Math.max(...used) + 1)] : [0, 0];
    const data = hrs.map((v, h) => ({ label: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`, calls: v, h })).filter((r) => r.h >= a && r.h <= b);
    return <ChartCard title="Calls by hour of day" subtitle="Busiest times for calls" empty={cs.length === 0} emptyText="No calls with a time in this period."><Bars data={data} series={[{ key: "calls", name: "Calls", color: C.violet }]} legend={false} /></ChartCard>;
  } });
add({ id: "calls_top_processes", title: "Top processes by calls", description: "Processes that generate the most calls", source: "calls", type: "chart", span: 4, supportedFilters: CALL_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(ctx.calls, callTs, ctx.period), (c) => c.process, "No process").slice(0, 8);
    return <ChartCard title="Top processes by calls" subtitle="Calls per process" empty={rows.length === 0} emptyText="No calls in this period."><HBars data={rows} color={C.blue} /></ChartCard>;
  } });

// COMMUNICATION ─────────────────────────────────────────────────────────────────────────────────
const COMM_FILTERS = ["date", "channel", "direction", "teamMember"] as WidgetDef["supportedFilters"];
const mTs = (m: MsgRow) => m.ts;
const CH_COLORS: Record<string, string> = { whatsapp: C.emerald, sms: C.blue, email: C.amber, website: C.violet, companion: C.cyan };
const chName = (k: string) => CHANNEL_LABEL[k] || humanize(k);

add({ id: "comm_total_messages", title: "Messages sent", description: "Outbound messages across channels", source: "communication", type: "kpi", supportedFilters: COMM_FILTERS,
  render: (ctx) => kpi(ctx, metric(msgs(ctx).filter((m) => m.direction === "outbound"), mTs, ctx.period, (s) => s.length), { label: "Messages sent", fmt: fmtNum, icon: Send, accent: C.blue }) });
add({ id: "comm_received", title: "Messages received", description: "Inbound messages across channels", source: "communication", type: "kpi", supportedFilters: COMM_FILTERS,
  render: (ctx) => kpi(ctx, metric(msgs(ctx).filter((m) => m.direction === "inbound"), mTs, ctx.period, (s) => s.length), { label: "Messages received", fmt: fmtNum, icon: Inbox, accent: C.emerald }) });
add({ id: "comm_open_conversations", title: "Open conversations", description: "Conversations not yet resolved", source: "communication", type: "kpi", supportedFilters: COMM_FILTERS,
  render: (ctx) => <KpiTile label="Open conversations" value={fmtNum(ctx.conversations.filter((c) => !c.isTeam && c.channel !== "team" && c.status === "open").length)} icon={MessagesSquare} accent={C.violet} hint={`${fmtNum(ctx.conversations.filter((c) => !c.isTeam && c.channel !== "team" && c.unreadCount > 0).length)} with unread messages`} /> });
add({ id: "comm_first_response", title: "Avg first response", description: "Time from a customer's first message to the reply", source: "communication", type: "kpi", supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const rows = firstResponses(ctx.conversations);
    const m = metric(rows, (r) => r.at, ctx.period, (s) => avg(s.map((r) => r.minutes)));
    return kpi(ctx, m, { label: "Avg first response", fmt: (n) => (rows.length ? fmtMinutes(n) : "—"), icon: Clock, accent: C.cyan, goodWhenUp: false });
  } });
add({ id: "comm_delivery_rate", title: "Delivery rate", description: "Sent messages that were delivered or read", source: "communication", type: "kpi", supportedFilters: COMM_FILTERS,
  render: (ctx) => kpi(ctx, metric(msgs(ctx).filter((m) => m.direction === "outbound" && m.status), mTs, ctx.period, (s) => (s.length ? (s.filter((m) => m.status === "delivered" || m.status === "read").length / s.length) * 100 : 0)), { label: "Delivery rate", fmt: (n) => fmtPct(n), icon: CheckCircle2, accent: C.amber }) });

add({ id: "comm_volume_by_channel", title: "Message volume over time", description: "Messages per day stacked by channel", source: "communication", type: "chart", span: 8, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const rows = inPeriod(msgs(ctx), mTs, ctx.period);
    const chans = Array.from(new Set(rows.map((m) => m.channel)));
    const data = groupByTime(rows, mTs).map((b) => Object.assign({ label: b.label }, ...chans.map((c) => ({ [c]: b.items.filter((m) => m.channel === c).length }))));
    return (
      <ChartCard title="Message volume over time" subtitle="Messages per day, stacked by channel" empty={data.length === 0} emptyText="No messages in this period.">
        <Bars data={data} stacked series={chans.map((c) => ({ key: c, name: chName(c), color: CH_COLORS[c] || C.slate }))} />
      </ChartCard>
    );
  } });
add({ id: "comm_channel_breakdown", title: "Conversations by channel", description: "Share of conversations per channel", source: "communication", type: "chart", span: 4, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const rows = countBy(ctx.conversations.filter((c) => !c.isTeam && c.channel !== "team"), (c) => chName(c.channel));
    const keyOf = (n: string) => Object.keys(CHANNEL_LABEL).find((k) => CHANNEL_LABEL[k] === n) || "";
    return <ChartCard title="Conversations by channel" subtitle="Where customers talk to you" empty={rows.length === 0} emptyText="No conversations yet."><Donut data={rows} centerLabel="Conversations" colors={rows.map((r) => CH_COLORS[keyOf(r.name)] || C.slate)} /></ChartCard>;
  } });
add({ id: "comm_inbound_outbound", title: "Inbound vs outbound by day", description: "Message direction per day", source: "communication", type: "chart", span: 6, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const data = groupByTime(inPeriod(msgs(ctx), mTs, ctx.period), mTs).map((b) => ({ label: b.label, inbound: b.items.filter((m) => m.direction === "inbound").length, outbound: b.items.filter((m) => m.direction === "outbound").length }));
    return (
      <ChartCard title="Inbound vs outbound by day" subtitle="Messages received and sent each day" empty={data.length === 0} emptyText="No messages in this period.">
        <Bars data={data} stacked series={[{ key: "inbound", name: "Inbound", color: C.emerald }, { key: "outbound", name: "Outbound", color: C.blue }]} />
      </ChartCard>
    );
  } });
add({ id: "comm_first_response_trend", title: "First response time trend", description: "Average minutes to first reply per day", source: "communication", type: "chart", span: 6, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const rows = inPeriod(firstResponses(ctx.conversations), (r) => r.at, ctx.period);
    const data = groupByTime(rows, (r) => r.at).map((b) => ({ label: b.label, minutes: Math.round(avg(b.items.map((r) => r.minutes)) * 10) / 10 }));
    return (
      <ChartCard title="First response time trend" subtitle="Average minutes until the first reply" empty={data.length === 0} emptyText="No replies to measure in this period.">
        <Lines data={data} series={[{ key: "minutes", name: "Avg first response", color: C.cyan }]} format={(n) => fmtMinutes(n)} />
      </ChartCard>
    );
  } });
add({ id: "comm_delivery_status", title: "Delivery status by channel", description: "Sent, delivered and read messages per channel", source: "communication", type: "chart", span: 6, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const rows = inPeriod(msgs(ctx).filter((m) => m.direction === "outbound" && m.status), mTs, ctx.period);
    const chans = Array.from(new Set(rows.map((m) => m.channel)));
    const data = chans.map((c) => ({ name: chName(c), sent: rows.filter((m) => m.channel === c && m.status === "sent").length, delivered: rows.filter((m) => m.channel === c && m.status === "delivered").length, read: rows.filter((m) => m.channel === c && m.status === "read").length }));
    return (
      <ChartCard title="Delivery status by channel" subtitle="Where outbound messages ended up" empty={data.length === 0} emptyText="No delivery data in this period.">
        <StackedHBars data={data} series={[{ key: "read", name: "Read", color: C.emerald }, { key: "delivered", name: "Delivered", color: C.blue }, { key: "sent", name: "Sent", color: C.slate }]} />
      </ChartCard>
    );
  } });
add({ id: "comm_calls_vs_messages", title: "Calls vs messages volume", description: "Calls and messages per day", source: "communication", type: "chart", span: 6, supportedFilters: COMM_FILTERS,
  render: (ctx) => {
    const callsIn = inPeriod(ctx.calls, callTs, ctx.period);
    const mRows = inPeriod(msgs(ctx), mTs, ctx.period);
    const days = new Set<string>();
    callsIn.forEach((c) => { const t = callTs(c); if (t !== undefined) days.add(dayKey(t)); });
    mRows.forEach((m) => { if (m.ts !== undefined) days.add(dayKey(m.ts)); });
    const data = Array.from(days).sort().slice(-14).map((k) => ({ label: dayLabel(k), calls: callsIn.filter((c) => { const t = callTs(c); return t !== undefined && dayKey(t) === k; }).length, messages: mRows.filter((m) => m.ts !== undefined && dayKey(m.ts) === k).length }));
    return (
      <ChartCard title="Calls vs messages volume" subtitle="Calls (bars) against messages (line) per day" empty={data.length === 0} emptyText="No calls or messages in this period.">
        <Combo data={data} bar={{ key: "calls", name: "Calls", color: C.blue }} line={{ key: "messages", name: "Messages", color: C.emerald }} />
      </ChartCard>
    );
  } });

// WORKFLOWS ─────────────────────────────────────────────────────────────────────────────────────
const WF_FILTERS = ["date", "entity", "process", "stage", "owner"] as WidgetDef["supportedFilters"];
const DAYMS = 86400000;
const open = (ctx: Ctx) => ctx.records.filter((r) => r.stageCategory === "in_progress");
const recTs = (r: Ctx["records"][number]) => r.createdAt;

add({ id: "wf_active_processes", title: "Active records", description: "Records currently moving through a workflow", source: "workflows", type: "kpi", supportedFilters: WF_FILTERS,
  render: (ctx) => kpi(ctx, metric(open(ctx), recTs, ctx.period, (s) => s.length), { label: "Active records", fmt: fmtNum, icon: Layers, accent: C.blue }) });
add({ id: "wf_total_records", title: "Moved this period", description: "Stage moves in the selected period", source: "workflows", type: "kpi", supportedFilters: WF_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.stageMoves, (m) => parseTs(m.at), ctx.period, (s) => s.length), { label: "Moved this period", fmt: fmtNum, icon: GitBranch, accent: C.violet }) });
add({ id: "wf_avg_time", title: "Avg time in stage", description: "How long active records have waited in their stage", source: "workflows", type: "kpi", supportedFilters: WF_FILTERS,
  render: (ctx) => { const ages = open(ctx).filter((r) => r.updatedAt).map((r) => (Date.now() - r.updatedAt!) / DAYMS); return <KpiTile label="Avg time in stage" value={ages.length ? `${avg(ages).toFixed(1)}d` : "—"} icon={Hourglass} accent={C.cyan} hint="Active records, now" />; } });
add({ id: "wf_stuck", title: "Stuck over 7 days", description: "Active records that have not moved for 7+ days", source: "workflows", type: "kpi", supportedFilters: WF_FILTERS,
  render: (ctx) => { const n = open(ctx).filter((r) => r.updatedAt && Date.now() - r.updatedAt > 7 * DAYMS).length; return <KpiTile label="Stuck over 7 days" value={fmtNum(n)} icon={AlertTriangle} accent={n ? C.red : C.slate} hint="Waiting 7+ days in one stage" />; } });
add({ id: "wf_win_rate", title: "Win rate", description: "Won records as a share of closed records", source: "workflows", type: "kpi", supportedFilters: WF_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.records.filter((r) => r.stageCategory !== "in_progress"), (r) => r.updatedAt, ctx.period, (s) => (s.length ? (s.filter((r) => r.stageCategory === "success").length / s.length) * 100 : 0)), { label: "Win rate", fmt: (n) => fmtPct(n), icon: Trophy, accent: C.emerald }) });

add({ id: "wf_stage_distribution", title: "Records by stage", description: "Where records sit right now", source: "workflows", type: "chart", span: 8, supportedFilters: WF_FILTERS,
  render: (ctx) => {
    const rows = countBy(open(ctx), (r) => r.stageName).slice(0, 10);
    return <ChartCard title="Records by stage" subtitle="Active records in each stage" empty={rows.length === 0} emptyText="No active records."><HBars data={rows} colors={PALETTE} /></ChartCard>;
  } });
add({ id: "wf_by_process", title: "Records by process", description: "Share of active records per process", source: "workflows", type: "chart", span: 4, supportedFilters: WF_FILTERS,
  render: (ctx) => {
    const rows = topN(countBy(open(ctx), (r) => r.processName), 6);
    return <ChartCard title="Records by process" subtitle="Active records per workflow" empty={rows.length === 0} emptyText="No active records."><Donut data={rows} centerLabel="Records" /></ChartCard>;
  } });
add({ id: "wf_moves_over_time", title: "Stage moves over time", description: "Stage moves per day", source: "workflows", type: "chart", span: 6, supportedFilters: WF_FILTERS,
  render: (ctx) => {
    const rows = inPeriod(ctx.stageMoves, (m) => parseTs(m.at), ctx.period);
    const data = groupByTime(rows, (m) => parseTs(m.at)).map((b) => ({ label: b.label, moves: b.items.length }));
    return <ChartCard title="Stage moves over time" subtitle="How often records change stage" empty={data.length === 0} emptyText="No stage moves in this period."><Areas data={data} series={[{ key: "moves", name: "Moves", color: C.violet }]} /></ChartCard>;
  } });
add({ id: "wf_time_in_stage", title: "Avg time in stage by stage", description: "Days active records have waited, per stage", source: "workflows", type: "chart", span: 6, supportedFilters: WF_FILTERS,
  render: (ctx) => {
    const m = new Map<string, number[]>();
    open(ctx).forEach((r) => { if (r.updatedAt) (m.get(r.stageName) || m.set(r.stageName, []).get(r.stageName)!).push((Date.now() - r.updatedAt) / DAYMS); });
    const data = Array.from(m, ([label, v]) => ({ label, days: Math.round(avg(v) * 10) / 10 })).sort((a, b) => b.days - a.days).slice(0, 8);
    return <ChartCard title="Avg time in stage by stage" subtitle="Average days waiting, longest first" empty={data.length === 0} emptyText="No active records."><Bars data={data} series={[{ key: "days", name: "Days", color: C.amber }]} legend={false} format={(n) => `${fmtNum(n)}d`} /></ChartCard>;
  } });
add({ id: "wf_won_lost", title: "Won vs lost over time", description: "Records closed as won or lost", source: "workflows", type: "chart", span: 12, supportedFilters: WF_FILTERS,
  render: (ctx) => {
    const rows = inPeriod(ctx.records.filter((r) => r.stageCategory !== "in_progress"), (r) => r.updatedAt, ctx.period);
    const data = groupByTime(rows, (r) => r.updatedAt).map((b) => ({ label: b.label, won: b.items.filter((r) => r.stageCategory === "success").length, lost: b.items.filter((r) => r.stageCategory === "lost").length }));
    return <ChartCard title="Won vs lost over time" subtitle="Records that reached a won or lost stage" empty={data.length === 0} emptyText="No records closed in this period."><Bars data={data} stacked series={[{ key: "won", name: "Won", color: C.emerald }, { key: "lost", name: "Lost", color: C.red }]} /></ChartCard>;
  } });

// AUTOMATION ────────────────────────────────────────────────────────────────────────────────────
const AUTO_FILTERS = ["date", "rule", "trigger", "entity", "status"] as WidgetDef["supportedFilters"];
const runTs = (r: Ctx["runs"][number]) => parseTs(r.firstAt);
/** One run = the actions one rule executed together (same rule, same minute). */
function executions(runs: Ctx["runs"]) {
  const m = new Map<string, Ctx["runs"]>();
  for (const r of runs) { const k = `${r.ruleId || r.ruleName || r.actionKey}|${String(r.firstAt).slice(0, 16)}`; (m.get(k) || m.set(k, []).get(k)!).push(r); }
  return Array.from(m.values()).map((g) => ({ ruleId: g[0].ruleId, ruleName: g[0].ruleName || g[0].actionKey, at: parseTs(g[0].firstAt), actions: g, failed: g.some((x) => x.status === "failed") }));
}
type Exec = ReturnType<typeof executions>[number];
const exTs = (e: Exec) => e.at;
const ruleOf = (ctx: Ctx, id?: string) => ctx.rules.find((r) => r.id === id);

add({ id: "auto_total_rules", title: "Runs", description: "Rule executions", source: "automation", type: "kpi", supportedFilters: AUTO_FILTERS,
  render: (ctx) => kpi(ctx, metric(executions(ctx.runs), exTs, ctx.period, (s) => s.length), { label: "Runs", fmt: fmtNum, icon: Zap, accent: C.blue }) });
add({ id: "auto_success_rate", title: "Success rate", description: "Runs where every action succeeded", source: "automation", type: "kpi", supportedFilters: AUTO_FILTERS,
  render: (ctx) => kpi(ctx, metric(executions(ctx.runs), exTs, ctx.period, (s) => (s.length ? (s.filter((e) => !e.failed).length / s.length) * 100 : 0)), { label: "Success rate", fmt: (n) => fmtPct(n), icon: ShieldCheck, accent: C.emerald }) });
add({ id: "auto_failures", title: "Failures needing retry", description: "Actions that failed and can be retried", source: "automation", type: "kpi", supportedFilters: AUTO_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.runs, runTs, ctx.period, (s) => s.filter((r) => r.status === "failed").length), { label: "Failures to retry", fmt: fmtNum, icon: AlertTriangle, accent: C.red, goodWhenUp: false }) });
add({ id: "auto_tasks_created", title: "Tasks created", description: "Tasks created by rules", source: "automation", type: "kpi", supportedFilters: AUTO_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.tasks.filter((t) => t.source === "rule"), (t) => parseTs(t.createdAt), ctx.period, (s) => s.length), { label: "Tasks created", fmt: fmtNum, icon: ListChecks, accent: C.violet }) });
add({ id: "auto_avg_actions", title: "Avg actions per run", description: "Actions a rule executes in one run", source: "automation", type: "kpi", supportedFilters: AUTO_FILTERS,
  render: (ctx) => kpi(ctx, metric(executions(ctx.runs), exTs, ctx.period, (s) => avg(s.map((e) => e.actions.length))), { label: "Avg actions per run", fmt: (n) => fmtNum(Math.round(n * 10) / 10), icon: Activity, accent: C.cyan }) });

add({ id: "auto_runs_over_time", title: "Runs over time", description: "Succeeded vs failed runs per day", source: "automation", type: "chart", span: 8, supportedFilters: AUTO_FILTERS,
  render: (ctx) => {
    const ex = inPeriod(executions(ctx.runs), exTs, ctx.period);
    const data = groupByTime(ex, exTs).map((b) => ({ label: b.label, succeeded: b.items.filter((e) => !e.failed).length, failed: b.items.filter((e) => e.failed).length }));
    return <ChartCard title="Runs over time" subtitle="Rule runs per day, succeeded and failed" empty={data.length === 0} emptyText="No rule runs in this period."><Areas data={data} stacked series={[{ key: "succeeded", name: "Succeeded", color: C.emerald }, { key: "failed", name: "Failed", color: C.red }]} /></ChartCard>;
  } });
add({ id: "auto_outcome", title: "Outcome split", description: "Share of succeeded and failed runs", source: "automation", type: "chart", span: 4, supportedFilters: AUTO_FILTERS,
  render: (ctx) => {
    const ex = inPeriod(executions(ctx.runs), exTs, ctx.period);
    const rows = [{ name: "Succeeded", value: ex.filter((e) => !e.failed).length }, { name: "Failed", value: ex.filter((e) => e.failed).length }];
    return <ChartCard title="Outcome split" subtitle="How runs ended" empty={ex.length === 0} emptyText="No rule runs in this period."><Donut data={rows} centerLabel="Runs" colors={[C.emerald, C.red]} /></ChartCard>;
  } });
add({ id: "auto_runs_by_rule", title: "Runs by rule", description: "The ten busiest rules", source: "automation", type: "chart", span: 6, supportedFilters: AUTO_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(executions(ctx.runs), exTs, ctx.period), (e) => e.ruleName).slice(0, 10);
    return <ChartCard title="Runs by rule" subtitle="Top 10 rules by number of runs" empty={rows.length === 0} emptyText="No rule runs in this period."><HBars data={rows} color={C.blue} nameWidth={150} /></ChartCard>;
  } });
add({ id: "auto_failures_by_action", title: "Failures by action", description: "Which actions fail most", source: "automation", type: "chart", span: 6, supportedFilters: AUTO_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(ctx.runs, runTs, ctx.period).filter((r) => r.status === "failed"), (r) => humanize(r.actionKey)).slice(0, 8);
    return <ChartCard title="Failures by action" subtitle="Failed actions by type" empty={rows.length === 0} emptyText="No failed actions in this period."><Bars data={rows.map((r) => ({ label: r.name, failures: r.value }))} series={[{ key: "failures", name: "Failures", color: C.red }]} legend={false} /></ChartCard>;
  } });
add({ id: "auto_runs_by_trigger", title: "Runs by trigger", description: "What starts the rules that run", source: "automation", type: "chart", span: 12, supportedFilters: AUTO_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(executions(ctx.runs), exTs, ctx.period), (e) => humanize(ruleOf(ctx, e.ruleId)?.trigger?.event || "Unknown")).slice(0, 10);
    return <ChartCard title="Runs by trigger" subtitle="Runs grouped by the event that started them" empty={rows.length === 0} emptyText="No rule runs in this period."><HBars data={rows} colors={PALETTE} nameWidth={170} /></ChartCard>;
  } });

// REVENUE ───────────────────────────────────────────────────────────────────────────────────────
const REV_FILTERS = ["date", "payer", "process", "provider"] as WidgetDef["supportedFilters"];
const billed = (ctx: Ctx) => claimsOnly(ctx.claims);

add({ id: "rev_pipeline", title: "Records in pipeline", description: "Insurance records that are not closed yet", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.claims.filter((c) => !isClosedStage(c)), claimTs, ctx.period, (s) => s.length), { label: "Records in pipeline", fmt: fmtNum, icon: Layers, accent: C.blue }) });
add({ id: "rev_total_billed", title: "Billed", description: "Total charges on claims", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(billed(ctx), claimTs, ctx.period, (s) => sum(s.map((c) => c.totalCharge || 0))), { label: "Billed", fmt: fmtCur, icon: Receipt, accent: C.violet }) });
add({ id: "rev_total_paid", title: "Paid", description: "Insurance payments received", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(billed(ctx), claimTs, ctx.period, (s) => sum(s.map((c) => c.amountPaid || 0))), { label: "Paid", fmt: fmtCur, icon: BadgeDollarSign, accent: C.emerald }) });
add({ id: "rev_first_pass", title: "First-pass rate", description: "Submitted claims accepted on the first submission", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(billed(ctx), claimTs, ctx.period, firstPass), { label: "First-pass rate", fmt: (n) => fmtPct(n), icon: Target, accent: C.cyan }) });
add({ id: "rev_clean_claim_rate", title: "Clean claim rate", description: "Claims that pass the scrub rules first time", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(billed(ctx), claimTs, ctx.period, (s) => (s.length ? ((s.length - s.filter((c) => lc(c.statusLabel).includes("scrub")).length) / s.length) * 100 : 100)), { label: "Clean claim rate", fmt: (n) => fmtPct(n), icon: ShieldCheck, accent: C.blue }) });
add({ id: "rev_elig_verified", title: "Eligibility verified rate", description: "Eligibility checks that came back active", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.claims.filter((c) => !!eligOf(c)), claimTs, ctx.period, (s) => (s.length ? (s.filter((c) => eligOf(c) === "active").length / s.length) * 100 : 0)), { label: "Eligibility verified", fmt: (n) => fmtPct(n), icon: CheckCircle2, accent: C.emerald }) });
add({ id: "rev_denial_rate", title: "Denial rate", description: "Denied claims as a share of paid + denied", source: "revenue", type: "kpi", supportedFilters: REV_FILTERS,
  render: (ctx) => kpi(ctx, metric(billed(ctx), claimTs, ctx.period, denialRate), { label: "Denial rate", fmt: (n) => fmtPct(n), icon: AlertTriangle, accent: C.red, goodWhenUp: false }) });

add({ id: "rev_pipeline_funnel", title: "Pipeline by phase and stage", description: "Records in every stage, in pipeline order", source: "revenue", type: "chart", span: 8, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const cs = inPeriod(ctx.claims, claimTs, ctx.period);
    const wfs = getClaimWorkflows();
    const order = (wf: { workflowType?: string }) => (wf.workflowType === "eligibility" ? 0 : wf.workflowType === "prior_auth" ? 1 : 2);
    const sorted = [...wfs].sort((a, b) => order(a) - order(b));
    const rows: Slice[] = [];
    const colors: string[] = [];
    const used: Array<{ name: string; color: string }> = [];
    sorted.forEach((wf, wi) => {
      const color = PALETTE[wi % PALETTE.length];
      let any = false;
      wf.stages.forEach((st) => {
        const n = cs.filter((c) => c.processId === wf.id && c.currentStageId === st.id).length;
        if (n > 0) { rows.push({ name: rows.some((r) => r.name === st.name) ? `${st.name} (${wf.name.slice(0, 8)})` : st.name, value: n }); colors.push(color); any = true; }
      });
      if (any) used.push({ name: wf.name, color });
    });
    const shown = rows.slice(0, 14);
    return (
      <ChartCard title="Pipeline by phase and stage" subtitle="Eligibility, prior auth, charge capture, claim, denial: records per stage" empty={shown.length === 0} emptyText="No records in this period.">
        <HBars data={shown} colors={colors} nameWidth={140} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11px] text-slate-600">{used.map((u) => <span key={u.name} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: u.color }} />{u.name}</span>)}</div>
      </ChartCard>
    );
  } });
add({ id: "rev_payer_mix", title: "Payer mix", description: "Billed amount per payer", source: "revenue", type: "chart", span: 4, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const m = new Map<string, number>();
    inPeriod(billed(ctx), claimTs, ctx.period).forEach((c) => m.set(c.payer?.name || "Unassigned", (m.get(c.payer?.name || "Unassigned") || 0) + (c.totalCharge || 0)));
    const rows = topN(Array.from(m, ([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value), 6);
    return <ChartCard title="Payer mix" subtitle="Share of billed charges" empty={rows.length === 0 || sum(rows.map((r) => r.value)) === 0} emptyText="No billed charges in this period."><Donut data={rows} centerLabel="Billed" format={fmtCur} /></ChartCard>;
  } });
add({ id: "rev_first_pass_trend", title: "First-pass trend", description: "First-pass acceptance by month", source: "revenue", type: "chart", span: 4, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const sub = inPeriod(billed(ctx).filter((c) => !!c.submittedAt), claimTs, ctx.period);
    const data = groupByTime(sub, claimTs, 8).map((b) => ({ label: b.label, rate: Math.round(firstPass(b.items) * 10) / 10 }));
    return <ChartCard title="First-pass trend" subtitle="Accepted on the first submission" empty={data.length === 0} emptyText="No submitted claims in this period."><Lines data={data} series={[{ key: "rate", name: "First-pass rate", color: C.cyan }]} format={(n) => `${fmtNum(n)}%`} domain={[0, 100]} /></ChartCard>;
  } });
add({ id: "rev_elig_results", title: "Eligibility results", description: "Outcome of eligibility checks", source: "revenue", type: "chart", span: 4, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(ctx.claims.filter((c) => !!eligOf(c)), claimTs, ctx.period), (c) => ELIG_LABEL(eligOf(c)) || "Other");
    const colors = rows.map((r) => (r.name === "Verified" ? C.emerald : r.name === "Needs fix" ? C.amber : r.name === "Inactive" ? C.red : C.violet));
    return <ChartCard title="Eligibility results" subtitle="Verified, needs fix, inactive" empty={rows.length === 0} emptyText="No eligibility checks in this period."><Donut data={rows} centerLabel="Checks" colors={colors} /></ChartCard>;
  } });
add({ id: "rev_work_queues", title: "Work queues", description: "Open tasks per work queue", source: "revenue", type: "chart", span: 4, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const rows = countBy(ctx.tasks.filter((t) => t.queueId && t.status !== "completed"), (t) => humanize(t.queueId!)).slice(0, 8);
    return <ChartCard title="Work queues" subtitle="Open tasks waiting in each queue" empty={rows.length === 0} emptyText="No open tasks in the work queues."><HBars data={rows} color={C.emerald} nameWidth={118} /></ChartCard>;
  } });
add({ id: "rev_monthly_trend", title: "Billed vs paid by month", description: "Charges billed and insurance payments per month", source: "revenue", type: "chart", span: 12, supportedFilters: REV_FILTERS,
  render: (ctx) => {
    const data = groupByTime(inPeriod(billed(ctx), claimTs, ctx.period), claimTs, 12).map((b) => ({ label: b.label, billed: Math.round(sum(b.items.map((c) => c.totalCharge || 0))), paid: Math.round(sum(b.items.map((c) => c.amountPaid || 0))) }));
    return <ChartCard title="Billed vs paid by month" subtitle="Charges and payments over time" empty={data.length === 0} emptyText="No claims in this period."><Bars data={data} series={[{ key: "billed", name: "Billed", color: C.blue }, { key: "paid", name: "Paid", color: C.emerald }]} format={fmtCur} /></ChartCard>;
  } });

// A/R ───────────────────────────────────────────────────────────────────────────────────────────
const AR_FILTERS = ["date", "payer", "stage", "agingBucket", "assignee"] as WidgetDef["supportedFilters"];
const arSum = (s: ArRecord[]) => sum(s.map((r) => r.outstandingAmount || 0));

add({ id: "ar_total_outstanding", title: "Total outstanding", description: "Open insurance and patient balances", source: "ar", type: "kpi", supportedFilters: AR_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.arRecords, arTs, ctx.period, arSum), { label: "Total outstanding", fmt: fmtCur, icon: Wallet, accent: C.blue, goodWhenUp: false }) });
add({ id: "ar_avg_days", title: "Days in A/R", description: "Average age of outstanding balances", source: "ar", type: "kpi", supportedFilters: AR_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.arRecords, arTs, ctx.period, (s) => avg(s.map((r) => r.ageInDays || 0))), { label: "Days in A/R", fmt: (n) => `${fmtNum(Math.round(n * 10) / 10)}d`, icon: Clock, accent: C.cyan, goodWhenUp: false }) });
add({ id: "ar_90_plus", title: "Over 90 days", description: "Share of the balance older than 90 days", source: "ar", type: "kpi", supportedFilters: AR_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.arRecords, arTs, ctx.period, (s) => (arSum(s) ? (arSum(s.filter((r) => r.ageInDays > 90)) / arSum(s)) * 100 : 0)), { label: "Over 90 days", fmt: (n) => fmtPct(n), icon: Hourglass, accent: C.amber, goodWhenUp: false }) });
add({ id: "ar_denial_rate", title: "Denial rate", description: "A/R records with a denial", source: "ar", type: "kpi", supportedFilters: AR_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.arRecords, arTs, ctx.period, (s) => (s.length ? (s.filter((r) => !!r.denialCategory).length / s.length) * 100 : 0)), { label: "Denial rate", fmt: (n) => fmtPct(n), icon: AlertTriangle, accent: C.red, goodWhenUp: false }) });
add({ id: "ar_collected", title: "Collected this period", description: "Payments received on A/R records", source: "ar", type: "kpi", supportedFilters: AR_FILTERS,
  render: (ctx) => kpi(ctx, metric(ctx.arRecords, arTs, ctx.period, (s) => sum(s.map((r) => r.paidAmount || 0))), { label: "Collected", fmt: fmtCur, icon: BadgeDollarSign, accent: C.emerald }) });

add({ id: "ar_aging_buckets_chart", title: "Aging buckets", description: "Outstanding balance by age", source: "ar", type: "chart", span: 8, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const rs = inPeriod(ctx.arRecords, arTs, ctx.period);
    const data = BUCKETS.map((b) => ({ label: `${b} days`, outstanding: Math.round(arSum(rs.filter((r) => bucketOf(r.ageInDays || 0) === b))) }));
    return <ChartCard title="Aging buckets" subtitle="Outstanding balance by days since submission" empty={rs.length === 0} emptyText="No outstanding balances in this period."><Bars data={data} series={[{ key: "outstanding", name: "Outstanding", color: C.amber }]} legend={false} format={fmtCur} /></ChartCard>;
  } });
add({ id: "ar_by_payer", title: "Outstanding by payer", description: "Outstanding balance per payer", source: "ar", type: "chart", span: 4, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const m = new Map<string, number>();
    inPeriod(ctx.arRecords, arTs, ctx.period).forEach((r) => m.set(r.payerName || "Unassigned", (m.get(r.payerName || "Unassigned") || 0) + (r.outstandingAmount || 0)));
    const rows = topN(Array.from(m, ([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value), 6);
    return <ChartCard title="Outstanding by payer" subtitle="Who owes the most" empty={sum(rows.map((r) => r.value)) === 0} emptyText="No outstanding balances in this period."><Donut data={rows} centerLabel="Outstanding" format={fmtCur} /></ChartCard>;
  } });
add({ id: "ar_by_stage", title: "Records by A/R stage", description: "Where A/R records sit", source: "ar", type: "chart", span: 6, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const rows = countBy(inPeriod(ctx.arRecords, arTs, ctx.period), (r) => r.statusLabel || "No stage").slice(0, 8);
    return <ChartCard title="Records by A/R stage" subtitle="Follow-up work by stage" empty={rows.length === 0} emptyText="No A/R records in this period."><HBars data={rows} colors={PALETTE} /></ChartCard>;
  } });
add({ id: "ar_denials_by_category", title: "Denials by category", description: "Why claims were denied", source: "ar", type: "chart", span: 6, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const rows = topN(countBy(inPeriod(ctx.arRecords, arTs, ctx.period).filter((r) => r.denialCategory), (r) => humanize(r.denialCategory!)), 6);
    return <ChartCard title="Denials by category" subtitle="Denied records by reason category" empty={rows.length === 0} emptyText="No denials in this period."><Donut data={rows} centerLabel="Denials" /></ChartCard>;
  } });
add({ id: "ar_rate_collections", title: "Denial rate and collections", description: "Collections (bars) and denial rate (line) over time", source: "ar", type: "chart", span: 6, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const data = groupByTime(inPeriod(ctx.arRecords, arTs, ctx.period), arTs, 8).map((b) => ({ label: b.label, collected: Math.round(sum(b.items.map((r) => r.paidAmount || 0))), rate: Math.round((b.items.length ? (b.items.filter((r) => !!r.denialCategory).length / b.items.length) * 100 : 0) * 10) / 10 }));
    return (
      <ChartCard title="Denial rate and collections" subtitle="Collected amount against the denial rate" empty={data.length === 0} emptyText="No A/R activity in this period.">
        <Combo data={data} bar={{ key: "collected", name: "Collected", color: C.emerald }} line={{ key: "rate", name: "Denial rate", color: C.red }} barFormat={fmtCur} lineFormat={(n) => `${fmtNum(n)}%`} />
      </ChartCard>
    );
  } });
add({ id: "ar_appeals", title: "Appeals won vs lost", description: "Outcome of appealed records", source: "ar", type: "chart", span: 6, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const wfStage = (r: ArRecord) => getClaimWorkflow(r.processId)?.stages.find((s) => s.id === r.currentStageId)?.stageCategory;
    const ap = inPeriod(ctx.arRecords.filter((r) => !!r.appealDraft || lc(r.statusLabel).includes("appeal")), arTs, ctx.period);
    const data = groupByTime(ap, arTs, 8).map((b) => ({ label: b.label, won: b.items.filter((r) => wfStage(r) === "success").length, lost: b.items.filter((r) => wfStage(r) === "lost").length, pending: b.items.filter((r) => wfStage(r) !== "success" && wfStage(r) !== "lost").length }));
    return <ChartCard title="Appeals won vs lost" subtitle="Appealed records by outcome" empty={data.length === 0} emptyText="No appeals in this period."><Bars data={data} stacked series={[{ key: "won", name: "Won", color: C.emerald }, { key: "lost", name: "Lost", color: C.red }, { key: "pending", name: "In progress", color: C.slate }]} /></ChartCard>;
  } });
add({ id: "ar_patient_balance", title: "Patient balance outstanding", description: "Balance owed by patients, by age", source: "ar", type: "chart", span: 6, supportedFilters: AR_FILTERS,
  render: (ctx) => {
    const rs = inPeriod(ctx.arRecords, arTs, ctx.period);
    const data = BUCKETS.map((b) => ({ label: `${b} days`, patient: Math.round(sum(rs.filter((r) => bucketOf(r.ageInDays || 0) === b).map((r) => r.patientResponsibility || 0))) }));
    return <ChartCard title="Patient balance outstanding" subtitle="Patient responsibility by age" empty={sum(data.map((d) => d.patient)) === 0} emptyText="No patient balances in this period."><Bars data={data} series={[{ key: "patient", name: "Patient balance", color: C.violet }]} legend={false} format={fmtCur} /></ChartCard>;
  } });

void inRange; void monthKey; void monthLabel; void MessageSquare; void Percent; void Activity; void TrendingUp; void Timer;

export const WIDGET_REGISTRY: Record<string, WidgetDef> = R;
