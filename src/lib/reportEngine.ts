import { ReportDataSource, ReportDefinition, ReportBucketRule, ReportMetric } from "../app/types/invoiceTypes";

export interface FieldMetadata {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "time" | "duration" | "status" | "currency" | "bucket";
  category: "core" | "custom" | "calculated";
  description?: string;
}

export const DATA_SOURCE_METADATA: Record<
  ReportDataSource,
  {
    name: string;
    description: string;
    icon: string;
    primaryDateField?: string;
    fields: FieldMetadata[];
  }
> = {
  calls: {
    name: "Calls & Telephony",
    description: "Inbound/outbound call logs, durations, sentiment, clinic shifts & agents",
    icon: "Phone",
    primaryDateField: "date",
    fields: [
      { key: "id", label: "Call ID", type: "string", category: "core" },
      { key: "client", label: "Client / Patient", type: "string", category: "core" },
      { key: "type", label: "Direction (Inbound/Outbound)", type: "string", category: "core" },
      { key: "status", label: "Call Status", type: "status", category: "core" },
      { key: "service", label: "Service / Reason", type: "string", category: "core" },
      { key: "responsible", label: "Agent / Staff", type: "string", category: "core" },
      { key: "date", label: "Call Date", type: "date", category: "core" },
      { key: "time", label: "Call Time (HH:MM)", type: "time", category: "core" },
      { key: "dayOfWeek", label: "Day of Week", type: "string", category: "core" },
      { key: "duration", label: "Duration (Seconds)", type: "number", category: "core" },
      { key: "durationFormatted", label: "Duration (Formatted)", type: "duration", category: "core" },
      { key: "sentiment", label: "AI Sentiment", type: "status", category: "core" },
      { key: "cost", label: "AI Call Cost ($)", type: "currency", category: "core" },
      { key: "shift", label: "Shift Timing (Working Hours vs After Hours)", type: "string", category: "core" },
      // Calculated / Categorized Dimensions
      { key: "timeOfDay", label: "Working Hours vs After Hours", type: "bucket", category: "calculated", description: "Clinic shift indicator (9AM-6PM vs After Hours)" },
      { key: "durationBucket", label: "Call Duration Tier (<1m, 1-2m, 2-5m, 5m+)", type: "bucket", category: "calculated", description: "Segmented call duration buckets" },
    ],
  },
  appointments: {
    name: "Appointments & Visits",
    description: "Booked consultations, clinical services, doctor schedules & cancellations",
    icon: "Calendar",
    primaryDateField: "date",
    fields: [
      { key: "id", label: "Appointment ID", type: "string", category: "core" },
      { key: "client", label: "Client / Patient", type: "string", category: "core" },
      { key: "service", label: "Appointment Type / Service", type: "string", category: "core" },
      { key: "provider", label: "Doctor / Provider", type: "string", category: "core" },
      { key: "date", label: "Appointment Date", type: "date", category: "core" },
      { key: "dayOfWeek", label: "Day of Week", type: "string", category: "core" },
      { key: "time", label: "Appointment Time", type: "time", category: "core" },
      { key: "duration", label: "Duration (Mins)", type: "number", category: "core" },
      { key: "status", label: "Visit Status", type: "status", category: "core" },
    ],
  },
  processes: {
    name: "Processes & Deals",
    description: "Patient intake, insurance verification, active stages & pipeline velocity",
    icon: "GitBranch",
    primaryDateField: "created",
    fields: [
      { key: "id", label: "Deal / Process ID", type: "string", category: "core" },
      { key: "client", label: "Client / Patient", type: "string", category: "core" },
      { key: "process", label: "Process Name", type: "string", category: "core" },
      { key: "stage", label: "Current Stage", type: "string", category: "core" },
      { key: "status", label: "Stage Status", type: "status", category: "core" },
      { key: "timeInStage", label: "Days in Current Stage", type: "number", category: "core" },
      { key: "responsible", label: "Assigned Staff", type: "string", category: "core" },
      { key: "created", label: "Date Initiated", type: "date", category: "core" },
      { key: "lastActivity", label: "Last Activity Date", type: "date", category: "core" },
    ],
  },
  clients: {
    name: "Clients & Registry",
    description: "Registered patients, custom demographic fields, lifetime spend & appointments count",
    icon: "Users",
    primaryDateField: "created",
    fields: [
      { key: "client", label: "Client Name", type: "string", category: "core" },
      { key: "clientId", label: "Client ID", type: "string", category: "core" },
      { key: "status", label: "Account Status", type: "status", category: "core" },
      { key: "process", label: "Active Process", type: "string", category: "core" },
      { key: "stage", label: "Pipeline Stage", type: "string", category: "core" },
      { key: "appointmentsCount", label: "Total Appointments", type: "number", category: "core" },
      { key: "callsCount", label: "Total Calls", type: "number", category: "core" },
      { key: "value", label: "Total Spend ($)", type: "currency", category: "core" },
      { key: "responsible", label: "Care Coordinator", type: "string", category: "core" },
      { key: "created", label: "Registered Date", type: "date", category: "core" },
      { key: "lastContact", label: "Last Contact Date", type: "date", category: "core" },
      // Custom registry fields
      { key: "hospitalLocation", label: "Hospital Location", type: "string", category: "custom" },
      { key: "doctor", label: "Assigned Doctor", type: "string", category: "custom" },
      { key: "bitrix_id", label: "Bitrix CRM ID", type: "string", category: "custom" },
    ],
  },
  revenue: {
    name: "Revenue & Billing",
    description: "Invoices, paid settlements, payment modes, outstanding balances & services",
    icon: "DollarSign",
    primaryDateField: "created",
    fields: [
      { key: "id", label: "Invoice ID", type: "string", category: "core" },
      { key: "client", label: "Client Name", type: "string", category: "core" },
      { key: "amount", label: "Invoice Amount ($)", type: "currency", category: "core" },
      { key: "status", label: "Payment Status", type: "status", category: "core" },
      { key: "service", label: "Billed Service", type: "string", category: "core" },
      { key: "paymentMode", label: "Payment Mode", type: "string", category: "core" },
      { key: "dueDate", label: "Due Date", type: "date", category: "core" },
      { key: "created", label: "Invoice Date", type: "date", category: "core" },
    ],
  },
  team: {
    name: "Team & Productivity",
    description: "Staff performance, calls completed, appointments booked & satisfaction ratings",
    icon: "Award",
    fields: [
      { key: "member", label: "Staff Member", type: "string", category: "core" },
      { key: "role", label: "Role / Department", type: "string", category: "core" },
      { key: "calls", label: "Calls Handled", type: "number", category: "core" },
      { key: "appts", label: "Appointments Booked", type: "number", category: "core" },
      { key: "rating", label: "Rating (1-5)", type: "number", category: "core" },
      { key: "status", label: "Staff Status", type: "status", category: "core" },
    ],
  },
  messaging: {
    name: "Messaging & WhatsApp",
    description: "Omnichannel message volume, bot containment rate & agent handoffs",
    icon: "MessageSquare",
    fields: [
      { key: "id", label: "Session ID", type: "string", category: "core" },
      { key: "client", label: "Client Name", type: "string", category: "core" },
      { key: "channel", label: "Communication Channel", type: "string", category: "core" },
      { key: "messages", label: "Messages Count", type: "number", category: "core" },
      { key: "botContained", label: "Bot Contained (Yes/No)", type: "string", category: "core" },
      { key: "status", label: "Delivery Status", type: "status", category: "core" },
      { key: "responsible", label: "Handled By", type: "string", category: "core" },
      { key: "created", label: "Date", type: "date", category: "core" },
    ],
  },
};

// ─── Evaluate a custom CASE / WHEN bucket rule against a record ───────────────
export function evaluateBucketRule(row: Record<string, any>, rule: ReportBucketRule): string {
  const rawVal = row[rule.targetField];
  if (rawVal === undefined || rawVal === null) return rule.elseLabel || "Other";

  for (const c of rule.cases) {
    const isMatched = matchCaseCondition(rawVal, c.operator, c.val1, c.val2);
    if (isMatched) return c.label;
  }

  return rule.elseLabel || "Other";
}

function matchCaseCondition(
  rawVal: any,
  operator: "between" | "equals" | "gt" | "lt" | "contains",
  val1: any,
  val2?: any
): boolean {
  // If target is time (e.g. "14:30" and checking "09:00" between "18:00")
  if (typeof rawVal === "string" && rawVal.includes(":") && typeof val1 === "string" && val1.includes(":")) {
    const norm = (t: string) => {
      const parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
    };
    const tVal = norm(rawVal);
    const t1 = norm(val1);
    const t2 = val2 ? norm(val2) : null;

    if (operator === "between" && t2 !== null) {
      return tVal >= t1 && tVal <= t2;
    }
    if (operator === "gt") return tVal > t1;
    if (operator === "lt") return tVal < t1;
    if (operator === "equals") return tVal === t1;
  }

  // Numeric comparison
  const numRaw = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]+/g, ""));
  const num1 = typeof val1 === "number" ? val1 : parseFloat(String(val1));
  const num2 = val2 !== undefined ? (typeof val2 === "number" ? val2 : parseFloat(String(val2))) : NaN;

  if (!isNaN(numRaw) && !isNaN(num1)) {
    if (operator === "between" && !isNaN(num2)) {
      return numRaw >= Math.min(num1, num2) && numRaw <= Math.max(num1, num2);
    }
    if (operator === "gt") return numRaw > num1;
    if (operator === "lt") return numRaw < num1;
    if (operator === "equals") return numRaw === num1;
  }

  // String comparison
  const sRaw = String(rawVal).toLowerCase().trim();
  const s1 = String(val1).toLowerCase().trim();

  if (operator === "equals") return sRaw === s1;
  if (operator === "contains") return sRaw.includes(s1);

  return false;
}

// ─── Filter rows by date range & filter rules ────────────────────────────────
export function filterReportRows(
  rows: Record<string, any>[],
  reportingPeriod?: ReportDefinition["reportingPeriod"],
  filterConditions?: ReportDefinition["filterConditions"]
): Record<string, any>[] {
  const periodType = reportingPeriod?.type || "all";

  return rows.filter((row) => {
    // 1. Date window filtering
    if (periodType !== "all") {
      const dateStr = row.date || row.created || row.dueDate || row.lastActivity;
      if (dateStr) {
        const rowDate = new Date(dateStr);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (periodType === "today") {
          if (rowDate < startOfDay) return false;
        } else if (periodType === "yesterday") {
          const yestStart = new Date(startOfDay);
          yestStart.setDate(yestStart.getDate() - 1);
          if (rowDate < yestStart || rowDate >= startOfDay) return false;
        } else if (periodType === "this_week" || periodType === "last_7_days") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (rowDate < weekAgo) return false;
        } else if (periodType === "this_month" || periodType === "last_30") {
          const thirtyAgo = new Date();
          thirtyAgo.setDate(now.getDate() - 30);
          if (rowDate < thirtyAgo) return false;
        } else if (periodType === "last_month" || periodType === "last_90") {
          const ninetyAgo = new Date();
          ninetyAgo.setDate(now.getDate() - 90);
          if (rowDate < ninetyAgo) return false;
        }
      }
    }

    // 2. Custom Condition rules
    const conditions = (filterConditions?.conditions || []).filter(
      (c) => c.field && c.value !== undefined && String(c.value).trim() !== ""
    );

    if (conditions.length === 0) return true;

    const matchType = filterConditions?.matchType || "AND";

    const evalCond = (cond: (typeof conditions)[0]) => {
      const rowVal = row[cond.field];
      if (rowVal === undefined || rowVal === null) return false;
      const sRow = String(rowVal).toLowerCase().trim();
      const sVal = String(cond.value).toLowerCase().trim();

      if (cond.operator === "equals") return sRow === sVal;
      if (cond.operator === "contains") return sRow.includes(sVal);
      if (cond.operator === "between") {
        const parts = String(cond.value).split(",").map((s) => s.trim());
        const minStr = parts[0] ?? "";
        const maxStr = parts[1] ?? "";
        const numRow = parseFloat(sRow.replace(/[^0-9.-]+/g, ""));
        const numMin = parseFloat(minStr);
        const numMax = parseFloat(maxStr);
        if (!isNaN(numRow) && !isNaN(numMin) && !isNaN(numMax)) {
          return numRow >= numMin && numRow <= numMax;
        }
        return sRow >= minStr.toLowerCase() && sRow <= maxStr.toLowerCase();
      }
      if (cond.operator === "gt") {
        const nr = parseFloat(sRow.replace(/[^0-9.-]+/g, ""));
        const nv = parseFloat(sVal.replace(/[^0-9.-]+/g, ""));
        return !isNaN(nr) && !isNaN(nv) ? nr > nv : sRow > sVal;
      }
      if (cond.operator === "lt") {
        const nr = parseFloat(sRow.replace(/[^0-9.-]+/g, ""));
        const nv = parseFloat(sVal.replace(/[^0-9.-]+/g, ""));
        return !isNaN(nr) && !isNaN(nv) ? nr < nv : sRow < sVal;
      }
      return true;
    };

    let matched = evalCond(conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
      const cond = conditions[i];
      const logic = cond.logic || matchType;
      const res = evalCond(cond);
      if (logic === "OR") {
        matched = matched || res;
      } else {
        matched = matched && res;
      }
    }
    return matched;
  });
}

// ─── Extract grouping key from row based on groupBy & rules ───────────────────
export function getRowGroupKey(
  row: Record<string, any>,
  groupBy: string,
  timeGrouping?: "none" | "day" | "dayOfWeek" | "week" | "month" | "hour",
  bucketRules?: ReportBucketRule[]
): string {
  // Check if groupBy matches a custom bucket rule name or id
  const matchingRule = bucketRules?.find((r) => r.id === groupBy || r.name === groupBy);
  if (matchingRule) {
    return evaluateBucketRule(row, matchingRule);
  }

  // Support shift alias for timeOfDay
  if (groupBy === "shift" && row.timeOfDay) {
    return String(row.timeOfDay);
  }

  const raw = row[groupBy];
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return "Other / Unknown";
  }

  // If timeGrouping is requested for date fields
  if (timeGrouping && timeGrouping !== "none") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      if (timeGrouping === "dayOfWeek") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return days[d.getDay()];
      }
      if (timeGrouping === "month") {
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
      if (timeGrouping === "day") {
        return d.toISOString().split("T")[0];
      }
    }
  }

  return String(raw);
}

// Helper to look up human label for field
export function getFieldLabel(key: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  if (key === "shift" || key === "timeOfDay") return "Shift Timing";
  if (key === "durationBucket") return "Duration Tier";
  if (key === "dayOfWeek") return "Day of Week";
  for (const ds of Object.values(DATA_SOURCE_METADATA)) {
    const f = ds.fields.find((field) => field.key === key);
    if (f) return f.label;
  }
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ─── Aggregate rows into chart series ─────────────────────────────────────────
export interface ChartAggregationResult {
  chartData: Array<Record<string, any>>;
  seriesKeys: string[];
  totalRecords: number;
  primaryMetricTotal: number;
  topCategory: string;
  summaryLabel: string;
  xAxisLabel: string;
  yAxisLabel: string;
}

export const CHART_PALETTE = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // purple-500
  "#EC4899", // pink-500
  "#06B6D4", // cyan-500
  "#6366F1", // indigo-500
  "#F97316", // orange-500
  "#14B8A6", // teal-500
];

export function aggregateChartData(
  rows: Record<string, any>[],
  config: {
    groupBy?: string;
    timeGrouping?: "none" | "day" | "dayOfWeek" | "week" | "month" | "hour";
    breakdownBy?: string;
    metric?: ReportMetric;
    bucketRules?: ReportBucketRule[];
    xAxisLabel?: string;
    yAxisLabel?: string;
  }
): ChartAggregationResult {
  const groupBy = config.groupBy || "status";
  const breakdownBy = config.breakdownBy && config.breakdownBy !== "none" ? config.breakdownBy : null;
  const metric = config.metric || { aggregation: "count" };

  const computedXAxisLabel = config.xAxisLabel || getFieldLabel(groupBy);
  let computedYAxisLabel = config.yAxisLabel;
  if (!computedYAxisLabel) {
    if (metric.field) {
      const fLabel = getFieldLabel(metric.field);
      computedYAxisLabel = `${metric.aggregation === "sum" ? "Total" : metric.aggregation.toUpperCase()} ${fLabel}`;
    } else {
      computedYAxisLabel = metric.label || "Count of Records";
    }
  }

  if (rows.length === 0) {
    return {
      chartData: [],
      seriesKeys: ["count"],
      totalRecords: 0,
      primaryMetricTotal: 0,
      topCategory: "None",
      summaryLabel: "0 records",
      xAxisLabel: computedXAxisLabel,
      yAxisLabel: computedYAxisLabel,
    };
  }

  // ─── Scenario 1: Breakdown By Secondary Dimension (Grouped / Stacked) ──────
  if (breakdownBy) {
    const matrix: Record<string, Record<string, number>> = {};
    const seriesSet = new Set<string>();

    rows.forEach((r) => {
      const g = getRowGroupKey(r, groupBy, config.timeGrouping, config.bucketRules);
      const b = String(r[breakdownBy] || "Other");
      seriesSet.add(b);

      if (!matrix[g]) matrix[g] = {};

      const numVal =
        metric.field && typeof r[metric.field] === "number"
          ? r[metric.field]
          : 1;

      matrix[g][b] = (matrix[g][b] || 0) + (metric.aggregation === "count" ? 1 : numVal);
    });

    const seriesKeys = Array.from(seriesSet);
    const chartData = Object.keys(matrix).map((name) => {
      const point: Record<string, any> = { name };
      let sum = 0;
      seriesKeys.forEach((s) => {
        const val = matrix[name][s] || 0;
        point[s] = Math.round(val * 10) / 10;
        sum += val;
      });
      point._total = Math.round(sum * 10) / 10;
      return point;
    });

    // Find top category
    let topCat = chartData[0]?.name || "None";
    let maxTotal = -1;
    chartData.forEach((c) => {
      if (c._total > maxTotal) {
        maxTotal = c._total;
        topCat = c.name;
      }
    });

    return {
      chartData,
      seriesKeys,
      totalRecords: rows.length,
      primaryMetricTotal: rows.length,
      topCategory: topCat,
      summaryLabel: `${rows.length} total records across ${chartData.length} categories`,
      xAxisLabel: computedXAxisLabel,
      yAxisLabel: computedYAxisLabel,
    };
  }

  // ─── Scenario 2: Single Dimension Grouping ──────────────────────────────────
  const groups: Record<string, { count: number; values: number[] }> = {};

  rows.forEach((r) => {
    const g = getRowGroupKey(r, groupBy, config.timeGrouping, config.bucketRules);
    if (!groups[g]) groups[g] = { count: 0, values: [] };

    groups[g].count += 1;

    if (metric.field) {
      const rawNum = r[metric.field];
      const n = typeof rawNum === "number" ? rawNum : parseFloat(String(rawNum).replace(/[^0-9.-]+/g, ""));
      if (!isNaN(n)) {
        groups[g].values.push(n);
      }
    }
  });

  let grandTotalMetric = 0;
  let topCategoryName = "None";
  let topCategoryValue = -1;

  const chartData = Object.keys(groups).map((name) => {
    const entry = groups[name];
    let computedVal = entry.count;

    if (metric.aggregation === "sum" && entry.values.length > 0) {
      computedVal = entry.values.reduce((a, b) => a + b, 0);
    } else if (metric.aggregation === "avg" && entry.values.length > 0) {
      computedVal = entry.values.reduce((a, b) => a + b, 0) / entry.values.length;
    } else if (metric.aggregation === "min" && entry.values.length > 0) {
      computedVal = Math.min(...entry.values);
    } else if (metric.aggregation === "max" && entry.values.length > 0) {
      computedVal = Math.max(...entry.values);
    }

    computedVal = Math.round(computedVal * 10) / 10;
    grandTotalMetric += computedVal;

    if (computedVal > topCategoryValue) {
      topCategoryValue = computedVal;
      topCategoryName = name;
    }

    return {
      name,
      value: computedVal,
      count: entry.count,
    };
  });

  return {
    chartData,
    seriesKeys: ["value"],
    totalRecords: rows.length,
    primaryMetricTotal: Math.round(grandTotalMetric * 10) / 10,
    topCategory: topCategoryName,
    summaryLabel: `${rows.length} records · Top: ${topCategoryName} (${topCategoryValue})`,
    xAxisLabel: computedXAxisLabel,
    yAxisLabel: computedYAxisLabel,
  };
}
