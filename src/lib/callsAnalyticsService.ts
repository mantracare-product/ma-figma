/**
 * callsAnalyticsService.ts
 * Path: src/lib/callsAnalyticsService.ts
 *
 * Dedicated analytics service for Voice Calls Telemetry & Organization Telemetry Breakdown.
 * Enforces mathematical consistency:
 * - Completed + Incomplete + Failed === Total Calls
 * - Inbound + Outbound === Total Calls
 * - Donut status segment counts sum exactly to Total Calls
 */

export interface OrgCallTelemetry {
  orgId: string;
  orgCode: string;
  orgName: string;
  totalCalls: number;
  inbound: number;
  outbound: number;
  completed: number;
  incomplete: number;
  failed: number;
  avgDurationSec: number;
  completionRate: number; // percentage (0-100)
  statusSplit: {
    completed: number;
    incomplete: number;
    failed: number;
    noAnswer: number;
    busy: number;
    cancelled: number;
  };
}

export interface CallsFilterState {
  dateRange: "7d" | "30d" | "90d" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  selectedOrgIds: string[]; // empty or ["all"] means all
  searchQuery: string;
}

export interface TimeSeriesPoint {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
}

export interface CallsAggregatedKpis {
  totalCalls: number;
  inboundTotal: number;
  outboundTotal: number;
  completed: number;
  completedPct: number;
  completedTrend: { value: number; isUp: boolean; isGood: boolean };
  incomplete: number;
  incompletePct: number;
  incompleteTrend: { value: number; isUp: boolean; isGood: boolean };
  failed: number;
  failedPct: number;
  failedTrend: { value: number; isUp: boolean; isGood: boolean };
  avgDurationSec: number;
  avgDurationFormatted: string;
  avgDurationTrend: { value: number; isUp: boolean; isGood: boolean };
  statusDistribution: {
    id: string;
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
}

// ── Master Baseline Dataset across Tenant Organizations ──
export const BASELINE_ORG_TELEMETRY: OrgCallTelemetry[] = [
  {
    orgId: "eye-mantra",
    orgCode: "ORG-0001",
    orgName: "Eye Mantra Super Specialty",
    totalCalls: 6420,
    inbound: 4815,
    outbound: 1605,
    completed: 5585,
    incomplete: 675,
    failed: 160,
    avgDurationSec: 138,
    completionRate: 87.0,
    statusSplit: {
      completed: 5585,
      incomplete: 220,
      failed: 160,
      noAnswer: 235,
      busy: 130,
      cancelled: 90,
    },
  },
  {
    orgId: "demo",
    orgCode: "ORG-0002",
    orgName: "Demo Mantra Care",
    totalCalls: 4850,
    inbound: 3640,
    outbound: 1210,
    completed: 4120,
    incomplete: 610,
    failed: 120,
    avgDurationSec: 124,
    completionRate: 84.9,
    statusSplit: {
      completed: 4120,
      incomplete: 190,
      failed: 120,
      noAnswer: 210,
      busy: 120,
      cancelled: 90,
    },
  },
  {
    orgId: "1",
    orgCode: "ORG-0003",
    orgName: "Heart Care Clinic",
    totalCalls: 3960,
    inbound: 2970,
    outbound: 990,
    completed: 3445,
    incomplete: 420,
    failed: 95,
    avgDurationSec: 146,
    completionRate: 87.0,
    statusSplit: {
      completed: 3445,
      incomplete: 140,
      failed: 95,
      noAnswer: 150,
      busy: 80,
      cancelled: 50,
    },
  },
  {
    orgId: "5",
    orgCode: "ORG-0007",
    orgName: "Metro Health Network",
    totalCalls: 3240,
    inbound: 2592,
    outbound: 648,
    completed: 2850,
    incomplete: 315,
    failed: 75,
    avgDurationSec: 132,
    completionRate: 88.0,
    statusSplit: {
      completed: 2850,
      incomplete: 100,
      failed: 75,
      noAnswer: 115,
      busy: 60,
      cancelled: 40,
    },
  },
  {
    orgId: "2",
    orgCode: "ORG-0004",
    orgName: "Zenith Wellness & Yoga",
    totalCalls: 2840,
    inbound: 2130,
    outbound: 710,
    completed: 2385,
    incomplete: 380,
    failed: 75,
    avgDurationSec: 112,
    completionRate: 84.0,
    statusSplit: {
      completed: 2385,
      incomplete: 120,
      failed: 75,
      noAnswer: 140,
      busy: 70,
      cancelled: 50,
    },
  },
  {
    orgId: "7",
    orgCode: "ORG-0009",
    orgName: "Horizon Pediatrics",
    totalCalls: 2640,
    inbound: 2112,
    outbound: 528,
    completed: 2310,
    incomplete: 270,
    failed: 60,
    avgDurationSec: 140,
    completionRate: 87.5,
    statusSplit: {
      completed: 2310,
      incomplete: 90,
      failed: 60,
      noAnswer: 100,
      busy: 50,
      cancelled: 30,
    },
  },
  {
    orgId: "3",
    orgCode: "ORG-0005",
    orgName: "Skyline Realty Group",
    totalCalls: 2420,
    inbound: 1694,
    outbound: 726,
    completed: 1980,
    incomplete: 370,
    failed: 70,
    avgDurationSec: 158,
    completionRate: 81.8,
    statusSplit: {
      completed: 1980,
      incomplete: 130,
      failed: 70,
      noAnswer: 120,
      busy: 70,
      cancelled: 50,
    },
  },
  {
    orgId: "4",
    orgCode: "ORG-0006",
    orgName: "Apex Auto Care",
    totalCalls: 2150,
    inbound: 1610,
    outbound: 540,
    completed: 1765,
    incomplete: 325,
    failed: 60,
    avgDurationSec: 104,
    completionRate: 82.1,
    statusSplit: {
      completed: 1765,
      incomplete: 110,
      failed: 60,
      noAnswer: 115,
      busy: 60,
      cancelled: 40,
    },
  },
  {
    orgId: "6",
    orgCode: "ORG-0008",
    orgName: "Beacon Dermatology",
    totalCalls: 1980,
    inbound: 1485,
    outbound: 495,
    completed: 1680,
    incomplete: 250,
    failed: 50,
    avgDurationSec: 120,
    completionRate: 84.8,
    statusSplit: {
      completed: 1680,
      incomplete: 80,
      failed: 50,
      noAnswer: 90,
      busy: 50,
      cancelled: 30,
    },
  },
  {
    orgId: "8",
    orgCode: "ORG-0010",
    orgName: "Nova Surgical Institute",
    totalCalls: 1820,
    inbound: 1274,
    outbound: 546,
    completed: 1565,
    incomplete: 215,
    failed: 40,
    avgDurationSec: 164,
    completionRate: 86.0,
    statusSplit: {
      completed: 1565,
      incomplete: 70,
      failed: 40,
      noAnswer: 80,
      busy: 40,
      cancelled: 25,
    },
  },
  {
    orgId: "9",
    orgCode: "ORG-0011",
    orgName: "Summit Orthopedics",
    totalCalls: 1540,
    inbound: 1155,
    outbound: 385,
    completed: 1325,
    incomplete: 180,
    failed: 35,
    avgDurationSec: 128,
    completionRate: 86.0,
    statusSplit: {
      completed: 1325,
      incomplete: 60,
      failed: 35,
      noAnswer: 65,
      busy: 35,
      cancelled: 20,
    },
  },
  {
    orgId: "10",
    orgCode: "ORG-0012",
    orgName: "Pacific Dental Group",
    totalCalls: 1430,
    inbound: 1073,
    outbound: 357,
    completed: 1210,
    incomplete: 185,
    failed: 35,
    avgDurationSec: 116,
    completionRate: 84.6,
    statusSplit: {
      completed: 1210,
      incomplete: 60,
      failed: 35,
      noAnswer: 70,
      busy: 35,
      cancelled: 20,
    },
  },
];

/** Format seconds to m:ss (e.g. 124 -> "2:04") */
export function formatDurationMinutesSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/** Get scale multiplier based on date range */
export function getDateRangeMultiplier(range: CallsFilterState["dateRange"]): number {
  switch (range) {
    case "7d":
      return 0.233; // 7 / 30
    case "90d":
      return 3.0;
    case "custom":
      return 0.5;
    case "30d":
    default:
      return 1.0;
  }
}

/** Scale an org telemetry row based on date range */
export function scaleOrgTelemetry(row: OrgCallTelemetry, mult: number): OrgCallTelemetry {
  if (mult === 1.0) return row;

  const totalCalls = Math.max(1, Math.round(row.totalCalls * mult));
  const inbound = Math.round(totalCalls * (row.inbound / row.totalCalls));
  const outbound = totalCalls - inbound;

  const completed = Math.round(totalCalls * (row.completed / row.totalCalls));
  const failed = Math.round(totalCalls * (row.failed / row.totalCalls));
  const incomplete = totalCalls - completed - failed;

  // Status split proportions
  const origInc = row.statusSplit.incomplete + row.statusSplit.noAnswer + row.statusSplit.busy + row.statusSplit.cancelled || 1;
  const noAnswer = Math.round(incomplete * (row.statusSplit.noAnswer / origInc));
  const busy = Math.round(incomplete * (row.statusSplit.busy / origInc));
  const cancelled = Math.round(incomplete * (row.statusSplit.cancelled / origInc));
  const subIncomplete = incomplete - noAnswer - busy - cancelled;

  return {
    ...row,
    totalCalls,
    inbound,
    outbound,
    completed,
    incomplete,
    failed,
    completionRate: (completed / totalCalls) * 100,
    statusSplit: {
      completed,
      incomplete: subIncomplete,
      failed,
      noAnswer,
      busy,
      cancelled,
    },
  };
}

/**
 * Filter and compute organization-wise analytics
 */
export function getFilteredCallsAnalytics(filter: CallsFilterState): {
  orgData: OrgCallTelemetry[];
  kpis: CallsAggregatedKpis;
  timeSeries: TimeSeriesPoint[];
} {
  const mult = getDateRangeMultiplier(filter.dateRange);

  // 1. Filter organizations
  let rows = BASELINE_ORG_TELEMETRY.map((r) => scaleOrgTelemetry(r, mult));

  // Filter by selected organizations
  if (filter.selectedOrgIds.length > 0 && !filter.selectedOrgIds.includes("all")) {
    rows = rows.filter((r) => filter.selectedOrgIds.includes(r.orgId) || filter.selectedOrgIds.includes(r.orgCode));
  }

  // Filter by search query
  if (filter.searchQuery.trim()) {
    const q = filter.searchQuery.toLowerCase().trim();
    rows = rows.filter(
      (r) => r.orgName.toLowerCase().includes(q) || r.orgCode.toLowerCase().includes(q)
    );
  }

  // 2. Compute Aggregated KPIs
  let totalCalls = 0;
  let inboundTotal = 0;
  let outboundTotal = 0;
  let completed = 0;
  let incomplete = 0;
  let failed = 0;
  let durationWeightedSum = 0;

  const statusSum = {
    completed: 0,
    incomplete: 0,
    failed: 0,
    noAnswer: 0,
    busy: 0,
    cancelled: 0,
  };

  rows.forEach((r) => {
    totalCalls += r.totalCalls;
    inboundTotal += r.inbound;
    outboundTotal += r.outbound;
    completed += r.completed;
    incomplete += r.incomplete;
    failed += r.failed;
    durationWeightedSum += r.avgDurationSec * r.totalCalls;

    statusSum.completed += r.statusSplit.completed;
    statusSum.incomplete += r.statusSplit.incomplete;
    statusSum.failed += r.statusSplit.failed;
    statusSum.noAnswer += r.statusSplit.noAnswer;
    statusSum.busy += r.statusSplit.busy;
    statusSum.cancelled += r.statusSplit.cancelled;
  });

  const avgDurationSec = totalCalls > 0 ? Math.round(durationWeightedSum / totalCalls) : 0;
  const completedPct = totalCalls > 0 ? (completed / totalCalls) * 100 : 0;
  const incompletePct = totalCalls > 0 ? (incomplete / totalCalls) * 100 : 0;
  const failedPct = totalCalls > 0 ? (failed / totalCalls) * 100 : 0;

  // Status Distribution for Donut Chart (same colors product uses)
  const statusDistribution = [
    {
      id: "completed",
      name: "Completed",
      value: statusSum.completed,
      percentage: totalCalls > 0 ? (statusSum.completed / totalCalls) * 100 : 0,
      color: "#2563EB", // Primary Royal Blue
    },
    {
      id: "incomplete",
      name: "Incomplete",
      value: statusSum.incomplete,
      percentage: totalCalls > 0 ? (statusSum.incomplete / totalCalls) * 100 : 0,
      color: "#F59E0B", // Amber Warning
    },
    {
      id: "failed",
      name: "Failed",
      value: statusSum.failed,
      percentage: totalCalls > 0 ? (statusSum.failed / totalCalls) * 100 : 0,
      color: "#EF4444", // Danger Red
    },
    {
      id: "no-answer",
      name: "No answer",
      value: statusSum.noAnswer,
      percentage: totalCalls > 0 ? (statusSum.noAnswer / totalCalls) * 100 : 0,
      color: "#06B6D4", // Cyan Sky
    },
    {
      id: "busy",
      name: "Busy",
      value: statusSum.busy,
      percentage: totalCalls > 0 ? (statusSum.busy / totalCalls) * 100 : 0,
      color: "#8B5CF6", // Violet / Purple
    },
    {
      id: "cancelled",
      name: "Cancelled",
      value: statusSum.cancelled,
      percentage: totalCalls > 0 ? (statusSum.cancelled / totalCalls) * 100 : 0,
      color: "#94A3B8", // Slate Neutral
    },
  ];

  // 3. Generate Time Series Points based on selected date range
  const timeSeries = generateTimeSeries(filter.dateRange, inboundTotal, outboundTotal);

  const kpis: CallsAggregatedKpis = {
    totalCalls,
    inboundTotal,
    outboundTotal,
    completed,
    completedPct,
    completedTrend: { value: 4.8, isUp: true, isGood: true },
    incomplete,
    incompletePct,
    incompleteTrend: { value: 1.6, isUp: false, isGood: true }, // fewer incomplete calls is good
    failed,
    failedPct,
    failedTrend: { value: 0.9, isUp: false, isGood: true }, // fewer failed calls is good
    avgDurationSec,
    avgDurationFormatted: formatDurationMinutesSeconds(avgDurationSec),
    avgDurationTrend: { value: 8.2, isUp: true, isGood: true },
    statusDistribution,
  };

  return { orgData: rows, kpis, timeSeries };
}

/**
 * Generate daily/weekly points that sum exactly to total inbound and outbound
 */
function generateTimeSeries(
  dateRange: CallsFilterState["dateRange"],
  totalInbound: number,
  totalOutbound: number
): TimeSeriesPoint[] {
  let count = 30;
  let isWeekly = false;

  if (dateRange === "7d") {
    count = 7;
  } else if (dateRange === "90d") {
    count = 13; // 13 weeks in a quarter
    isWeekly = true;
  } else if (dateRange === "custom") {
    count = 14;
  }

  // Weight curve for realistic day-to-day fluctuations
  const weights: number[] = [];
  let weightSum = 0;
  for (let i = 0; i < count; i++) {
    // sinusoidal variation with weekday/weekend effect
    const dayOfWeek = i % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const base = isWeekend ? 0.65 : 1.0;
    const wave = 0.85 + 0.3 * Math.sin((i / count) * Math.PI * 4);
    const w = base * wave;
    weights.push(w);
    weightSum += w;
  }

  const points: TimeSeriesPoint[] = [];
  let runningInbound = 0;
  let runningOutbound = 0;

  const now = new Date(2026, 10, 11); // Nov 11, 2026 reference

  for (let i = 0; i < count; i++) {
    const fraction = weights[i] / weightSum;
    let dayInbound = Math.round(totalInbound * fraction);
    let dayOutbound = Math.round(totalOutbound * fraction);

    // Adjust last point to prevent rounding drift
    if (i === count - 1) {
      dayInbound = totalInbound - runningInbound;
      dayOutbound = totalOutbound - runningOutbound;
    } else {
      runningInbound += dayInbound;
      runningOutbound += dayOutbound;
    }

    let dateLabel = "";
    if (isWeekly) {
      dateLabel = `Wk ${i + 1}`;
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - (count - 1 - i));
      dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    points.push({
      date: dateLabel,
      inbound: dayInbound,
      outbound: dayOutbound,
      total: dayInbound + dayOutbound,
    });
  }

  return points;
}

/** Export calls telemetry dataset to CSV */
export function exportCallsAnalyticsCsv(
  filter: CallsFilterState,
  kpis: CallsAggregatedKpis,
  orgData: OrgCallTelemetry[]
) {
  const lines: string[] = [];

  // Filter Header
  lines.push("MANTRAASSIST - VOICE CALLS TELEMETRY & ORGANIZATIONAL BREAKDOWN");
  lines.push(`Exported On,${new Date().toISOString()}`);
  lines.push(`Date Range,${filter.dateRange}`);
  lines.push(`Filtered Organizations,${filter.selectedOrgIds.join("; ") || "All Organizations"}`);
  lines.push("");

  // Section 1: Overall KPIs
  lines.push("--- OVERALL TELEPHONY KPIS ---");
  lines.push("Metric,Value,Percentage,Trend vs Prior");
  lines.push(`Total Calls,${kpis.totalCalls},100%,-`);
  lines.push(`Inbound Calls,${kpis.inboundTotal},${((kpis.inboundTotal / (kpis.totalCalls || 1)) * 100).toFixed(1)}%,-`);
  lines.push(`Outbound Calls,${kpis.outboundTotal},${((kpis.outboundTotal / (kpis.totalCalls || 1)) * 100).toFixed(1)}%,-`);
  lines.push(`Completed Calls,${kpis.completed},${kpis.completedPct.toFixed(1)}%,+${kpis.completedTrend.value}%`);
  lines.push(`Incomplete Calls,${kpis.incomplete},${kpis.incompletePct.toFixed(1)}%,-${kpis.incompleteTrend.value}%`);
  lines.push(`Failed Calls,${kpis.failed},${kpis.failedPct.toFixed(1)}%,-${kpis.failedTrend.value}%`);
  lines.push(`Average Duration,${kpis.avgDurationFormatted},-,+${kpis.avgDurationTrend.value}%`);
  lines.push("");

  // Section 2: Status Breakdown
  lines.push("--- CALL CONNECTION & STATUS BREAKDOWN ---");
  lines.push("Status,Calls,Percentage");
  kpis.statusDistribution.forEach((s) => {
    lines.push(`"${s.name}",${s.value},${s.percentage.toFixed(1)}%`);
  });
  lines.push("");

  // Section 3: Organization Breakdown Table
  lines.push("--- ORGANIZATION CALL METRICS ---");
  lines.push("ORG ID,Organization Name,Total Calls,Inbound,Outbound,Completed,Incomplete,Failed,Avg Duration,Completion Rate (%)");
  orgData.forEach((o) => {
    lines.push(
      `"${o.orgCode}","${o.orgName.replace(/"/g, '""')}",${o.totalCalls},${o.inbound},${o.outbound},${o.completed},${o.incomplete},${o.failed},"${formatDurationMinutesSeconds(o.avgDurationSec)}",${o.completionRate.toFixed(1)}%`
    );
  });

  const csvContent = "data:text/csv;charset=utf-8," + lines.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `mantra_voice_calls_analytics_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

