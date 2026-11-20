/**
 * Data helpers for the Overview dashboards: timestamps, periods (with the previous period for deltas), bucketing for
 * sparklines and time series, and the flat message / record shapes the widgets read. Pure functions, no React.
 */
import type { Conversation } from "../../../lib/useConversations";
import type { DashboardPeriod } from "./overviewTypes";

const DAY = 86400000;

/** Best-effort timestamp: numbers, ISO / "YYYY-MM-DD HH:mm", "Yesterday, 04:30 PM", "10:40 AM" (today). */
export function parseTs(v: unknown, now: number = Date.now()): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim();
  const direct = Date.parse(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(" ", "T") : s);
  if (Number.isFinite(direct)) return direct;
  const m = /^(?:(Yesterday|Today),?\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(s);
  if (m) {
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    let h = Number(m[2]) % 12;
    if ((m[4] || "").toUpperCase() === "PM") h += 12;
    if (!m[4]) h = Number(m[2]);
    const t = base.getTime() + h * 3600000 + Number(m[3]) * 60000;
    return /yesterday/i.test(m[1] || "") ? t - DAY : t;
  }
  return undefined;
}

export const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function buildPeriod(date: string, customFrom: string, customTo: string, now: number = Date.now()): DashboardPeriod {
  const sod = startOfDay(now);
  let from = -Infinity;
  let to = Infinity;
  let label = "All time";
  if (date === "today") { from = sod; to = now; label = "Today"; }
  else if (date === "last_7_days") { from = now - 7 * DAY; to = now; label = "Last 7 days"; }
  else if (date === "last_30_days") { from = now - 30 * DAY; to = now; label = "Last 30 days"; }
  else if (date === "this_month") { const d = new Date(now); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); to = now; label = "This month"; }
  else if (date === "custom") {
    from = customFrom ? new Date(customFrom + "T00:00:00").getTime() : -Infinity;
    to = customTo ? new Date(customTo + "T23:59:59").getTime() : Infinity;
    label = "Custom range";
  }
  const hasPeriod = Number.isFinite(from);
  // deltas compare the selected period with the one right before it; with "All time" the last 30 days with the 30 before
  const dTo = Number.isFinite(to) ? to : now;
  const dFrom = hasPeriod ? from : now - 30 * DAY;
  const len = Math.max(DAY, dTo - dFrom);
  return { from, to, label, hasPeriod, dFrom, dTo, pFrom: dFrom - len, pTo: dFrom, deltaLabel: hasPeriod ? "vs previous period" : "last 30 days vs the 30 before" };
}

export const inRange = (t: number | undefined, from: number, to: number) => t !== undefined && t >= from && t <= to;

/** Items (with timestamps) inside the selected period; items with no usable timestamp are kept (they are undated, not out of range). */
export function inPeriod<T>(items: T[], ts: (x: T) => number | undefined, p: DashboardPeriod): T[] {
  if (!p.hasPeriod) return items;
  return items.filter((x) => { const t = ts(x); return t === undefined || inRange(t, p.from, p.to); });
}

export interface Metric { value: number; cur: number; prev: number; spark: number[] }

/** A KPI: value over the selected period, current vs previous window for the delta, and a 12-point sparkline over the delta window. */
export function metric<T>(items: T[], ts: (x: T) => number | undefined, p: DashboardPeriod, fn: (subset: T[]) => number, points = 12): Metric {
  const value = fn(inPeriod(items, ts, p));
  const win = (a: number, b: number) => items.filter((x) => inRange(ts(x), a, b));
  const cur = fn(win(p.dFrom, p.dTo));
  const prev = fn(win(p.pFrom, p.pTo));
  const step = (p.dTo - p.dFrom) / points;
  const spark: number[] = [];
  for (let i = 0; i < points; i++) spark.push(fn(win(p.dFrom + i * step, p.dFrom + (i + 1) * step - 1)));
  return { value, cur, prev, spark };
}

/** % change cur vs prev, null when there is nothing to compare. */
export const pctChange = (cur: number, prev: number): number | null => (prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100);

export const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const monthKey = (t: number) => new Date(t).toISOString().slice(0, 7);
export const dayLabel = (k: string) => { const d = new Date(k + "T12:00:00"); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
export const monthLabel = (k: string) => { const d = new Date(k + "-15T12:00:00"); return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }); };

/** Group timestamped items by day (or by month when the span is long): [{key, label, items}] sorted, capped to the last `max` buckets that have data. */
export function groupByTime<T>(items: T[], ts: (x: T) => number | undefined, max = 14): Array<{ key: string; label: string; items: T[] }> {
  const dated = items.map((x) => ({ x, t: ts(x) })).filter((r): r is { x: T; t: number } => r.t !== undefined);
  if (dated.length === 0) return [];
  const min = Math.min(...dated.map((r) => r.t));
  const maxT = Math.max(...dated.map((r) => r.t));
  const monthly = maxT - min > 45 * DAY;
  const map = new Map<string, T[]>();
  for (const r of dated) { const k = monthly ? monthKey(r.t) : dayKey(r.t); (map.get(k) || map.set(k, []).get(k)!).push(r.x); }
  return Array.from(map.keys()).sort().slice(-max).map((k) => ({ key: k, label: monthly ? monthLabel(k) : dayLabel(k), items: map.get(k)! }));
}

// ── messages ────────────────────────────────────────────────────────────────────────────────────

export const CHANNEL_LABEL: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Email", website: "Website chat", companion: "Companion chat", voice: "Voice" };

export interface MsgRow {
  convId: string;
  channel: string;
  direction: "inbound" | "outbound";
  ts: number | undefined;
  status?: "sent" | "delivered" | "read";
  member?: string;
}

/** Messages of the customer-facing conversations (internal team chat is left out). */
export function messageRows(convs: Conversation[], now: number = Date.now()): MsgRow[] {
  const out: MsgRow[] = [];
  for (const c of convs) {
    if (c.isTeam || c.channel === "team") continue;
    for (const m of c.messages || []) {
      out.push({ convId: c.id, channel: c.channel, direction: m.sender === "contact" ? "inbound" : "outbound", ts: parseTs(m.timestamp, now), status: m.status, member: m.senderId || m.senderName });
    }
  }
  return out;
}

/** First response time per conversation, in minutes: first inbound message to the next outbound one (same data day). */
export function firstResponses(convs: Conversation[], now: number = Date.now()): Array<{ convId: string; channel: string; minutes: number; at: number }> {
  const out: Array<{ convId: string; channel: string; minutes: number; at: number }> = [];
  for (const c of convs) {
    if (c.isTeam || c.channel === "team") continue;
    const msgs = (c.messages || []).map((m) => ({ inbound: m.sender === "contact", t: parseTs(m.timestamp, now) }));
    const i = msgs.findIndex((m) => m.inbound && m.t !== undefined);
    if (i < 0) continue;
    const r = msgs.slice(i + 1).find((m) => !m.inbound && m.t !== undefined);
    if (!r) continue;
    const mins = (r.t! - msgs[i].t!) / 60000;
    if (mins >= 0 && mins < 24 * 60) out.push({ convId: c.id, channel: c.channel, minutes: mins, at: r.t! });
  }
  return out;
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** "4:32" or seconds -> seconds. */
export function durationSeconds(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "");
  const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return Number(s) || 0;
  return m[3] !== undefined ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
}

export const humanize = (k: string) => String(k || "").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (m) => m.toUpperCase());
