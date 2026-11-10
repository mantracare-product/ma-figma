/**
 * productAnalyticsStore.ts
 * Path: src/lib/productAnalyticsStore.ts
 *
 * Centralized analytics computations and dataset for Admin Product Analytics:
 * - Overview platform KPIs
 * - Calls analytics & outcomes
 * - Process movement & funnel bottleneck diagnostics
 * - Organization usage matrix
 * - Revenue & Invoices aggregation (NO separate invoices page)
 */

export interface AnalyticsFilter {
  dateRange: "7d" | "30d" | "90d" | "1y" | "all";
  orgId: string; // "all" or specific orgId
  industry: string; // "all" or specific
  plan: string; // "all" or specific
  provider: string; // "all" or specific
}

export const DEFAULT_ANALYTICS_FILTER: AnalyticsFilter = {
  dateRange: "30d",
  orgId: "all",
  industry: "all",
  plan: "all",
  provider: "all",
};

// Overview Platform Metric Cards
export interface OverviewKpis {
  totalOrganizations: number;
  totalOrganizationsChange: string;
  activeAiAgents: number;
  activeAiAgentsChange: string;
  callsProcessed: number;
  callsProcessedChange: string;
  automationRuns: number;
  automationRunsChange: string;
  netMrr: number;
  netMrrChange: string;
  avgResolutionRate: number;
  avgResolutionRateChange: string;
}

export const OVERVIEW_KPIS: OverviewKpis = {
  totalOrganizations: 18,
  totalOrganizationsChange: "+12.5% vs last month",
  activeAiAgents: 42,
  activeAiAgentsChange: "+6 active agents",
  callsProcessed: 34890,
  callsProcessedChange: "+18.2% volume",
  automationRuns: 128450,
  automationRunsChange: "+24.0% runs",
  netMrr: 12840,
  netMrrChange: "+14.8% mrr",
  avgResolutionRate: 91.4,
  avgResolutionRateChange: "+3.2% resolution",
};

// Call Analytics Data
export interface CallAnalyticsData {
  totalCalls: number;
  answeredRate: number;
  totalMinutes: number;
  avgDurationSec: number;
  inboundCount: number;
  outboundCount: number;
  statusSplit: { label: string; count: number; percentage: number; color: string }[];
  outcomeSplit: { label: string; count: number; percentage: number; color: string }[];
  hourlyVolume: { hour: string; calls: number }[];
  dailyVolume: { date: string; inbound: number; outbound: number }[];
}

export const CALLS_ANALYTICS_DATA: CallAnalyticsData = {
  totalCalls: 34890,
  answeredRate: 94.2,
  totalMinutes: 72150,
  avgDurationSec: 124,
  inboundCount: 26820,
  outboundCount: 8070,
  statusSplit: [
    { label: "Answered", count: 32866, percentage: 94.2, color: "bg-emerald-500" },
    { label: "Missed", count: 1220, percentage: 3.5, color: "bg-rose-500" },
    { label: "Voicemail", count: 520, percentage: 1.5, color: "bg-amber-500" },
    { label: "Busy / Dropped", count: 284, percentage: 0.8, color: "bg-slate-400" },
  ],
  outcomeSplit: [
    { label: "Appointment Booked", count: 14653, percentage: 42.0, color: "bg-emerald-600" },
    { label: "Inquiry Resolved", count: 11164, percentage: 32.0, color: "bg-blue-600" },
    { label: "Transferred to Human", count: 5233, percentage: 15.0, color: "bg-indigo-600" },
    { label: "Callback Scheduled", count: 2791, percentage: 8.0, color: "bg-purple-600" },
    { label: "No Action / Hangup", count: 1049, percentage: 3.0, color: "bg-slate-400" },
  ],
  hourlyVolume: [
    { hour: "08:00", calls: 1420 },
    { hour: "09:00", calls: 2890 },
    { hour: "10:00", calls: 4120 },
    { hour: "11:00", calls: 4680 },
    { hour: "12:00", calls: 3820 },
    { hour: "13:00", calls: 3100 },
    { hour: "14:00", calls: 4250 },
    { hour: "15:00", calls: 4390 },
    { hour: "16:00", calls: 3740 },
    { hour: "17:00", calls: 2120 },
    { hour: "18:00", calls: 980 },
    { hour: "19:00", calls: 380 },
  ],
  dailyVolume: [
    { date: "Day 1", inbound: 780, outbound: 210 },
    { date: "Day 5", inbound: 920, outbound: 290 },
    { date: "Day 10", inbound: 850, outbound: 260 },
    { date: "Day 15", inbound: 1100, outbound: 340 },
    { date: "Day 20", inbound: 980, outbound: 310 },
    { date: "Day 25", inbound: 1050, outbound: 320 },
    { date: "Day 30", inbound: 1180, outbound: 380 },
  ],
};

// Process Movement Data
export interface ProcessFunnelStage {
  stageId: string;
  stageName: string;
  tasksEntered: number;
  tasksCompleted: number;
  conversionRate: number; // percentage
  avgDwellTimeHours: number;
  isBottleneck?: boolean;
  bottleneckReason?: string;
}

export interface ProcessMovementData {
  totalWorkflows: number;
  activeInstances: number;
  completionRate: number;
  funnelStages: ProcessFunnelStage[];
  bottlenecks: { stage: string; avgTime: string; stuckCount: number; impact: "High" | "Medium" | "Low" }[];
}

export const PROCESS_MOVEMENT_DATA: ProcessMovementData = {
  totalWorkflows: 14,
  activeInstances: 1420,
  completionRate: 83.6,
  funnelStages: [
    {
      stageId: "stg-1",
      stageName: "Initial Lead / Inbound Inquiry",
      tasksEntered: 2450,
      tasksCompleted: 2380,
      conversionRate: 97.1,
      avgDwellTimeHours: 0.4,
    },
    {
      stageId: "stg-2",
      stageName: "Insurance & Eligibility Check",
      tasksEntered: 2380,
      tasksCompleted: 1840,
      conversionRate: 77.3,
      avgDwellTimeHours: 36.2,
      isBottleneck: true,
      bottleneckReason: "Awaiting manual payer pre-authorization clearing",
    },
    {
      stageId: "stg-3",
      stageName: "Doctor Consultation Booking",
      tasksEntered: 1840,
      tasksCompleted: 1720,
      conversionRate: 93.5,
      avgDwellTimeHours: 2.1,
    },
    {
      stageId: "stg-4",
      stageName: "Pre-Op Prep & Consent Forms",
      tasksEntered: 1720,
      tasksCompleted: 1560,
      conversionRate: 90.7,
      avgDwellTimeHours: 14.5,
      isBottleneck: true,
      bottleneckReason: "Digital signature reminders awaiting patient response",
    },
    {
      stageId: "stg-5",
      stageName: "Procedure Completed & Post-Op Care",
      tasksEntered: 1560,
      tasksCompleted: 1490,
      conversionRate: 95.5,
      avgDwellTimeHours: 4.8,
    },
  ],
  bottlenecks: [
    {
      stage: "Insurance & Eligibility Check",
      avgTime: "36.2 hrs",
      stuckCount: 184,
      impact: "High",
    },
    {
      stage: "Pre-Op Prep & Consent Forms",
      avgTime: "14.5 hrs",
      stuckCount: 78,
      impact: "Medium",
    },
    {
      stage: "Diagnostic Imaging Lab Review",
      avgTime: "11.0 hrs",
      stuckCount: 42,
      impact: "Low",
    },
  ],
};

// Organization Usage Data
export interface OrgUsageItem {
  orgId: string;
  orgName: string;
  orgCode: string;
  industry: string;
  planName: string;
  activeUsers: number;
  phoneNumbersCount: number;
  callsLast30Days: number;
  storageMb: number;
  taskThroughput: number;
  lastActive: string;
  status: "Active" | "Trial" | "Past due" | "Suspended";
  aiAccuracyScore: number;
}

export const INITIAL_ORG_USAGE: OrgUsageItem[] = [
  {
    orgId: "org-1",
    orgName: "Eye Mantra Hospital",
    orgCode: "ORG-0001",
    industry: "Ophthalmology & Eye Care",
    planName: "Enterprise Health Scale",
    activeUsers: 14,
    phoneNumbersCount: 2,
    callsLast30Days: 14200,
    storageMb: 4120,
    taskThroughput: 1890,
    lastActive: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    status: "Active",
    aiAccuracyScore: 96.8,
  },
  {
    orgId: "org-2",
    orgName: "Demo Mantra Care",
    orgCode: "ORG-0002",
    industry: "Multi-Specialty Clinic",
    planName: "AI Clinic Receptionist Pro",
    activeUsers: 8,
    phoneNumbersCount: 1,
    callsLast30Days: 8940,
    storageMb: 2450,
    taskThroughput: 980,
    lastActive: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    status: "Active",
    aiAccuracyScore: 94.2,
  },
  {
    orgId: "org-3",
    orgName: "Heart Care Clinic",
    orgCode: "ORG-0003",
    industry: "Cardiology & Vascular",
    planName: "AI Receptionist Starter",
    activeUsers: 4,
    phoneNumbersCount: 1,
    callsLast30Days: 4120,
    storageMb: 1100,
    taskThroughput: 420,
    lastActive: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    status: "Active",
    aiAccuracyScore: 95.1,
  },
  {
    orgId: "org-4",
    orgName: "Apex Orthopedics Group",
    orgCode: "ORG-0004",
    industry: "Orthopedics & Sports Medicine",
    planName: "AI Clinic Receptionist Pro",
    activeUsers: 5,
    phoneNumbersCount: 0,
    callsLast30Days: 1820,
    storageMb: 680,
    taskThroughput: 280,
    lastActive: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: "Trial",
    aiAccuracyScore: 91.5,
  },
  {
    orgId: "org-5",
    orgName: "Beacon Dental Spa",
    orgCode: "ORG-0005",
    industry: "Dental & Orthodontics",
    planName: "AI Receptionist Starter",
    activeUsers: 3,
    phoneNumbersCount: 0,
    callsLast30Days: 2410,
    storageMb: 520,
    taskThroughput: 190,
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "Past due",
    aiAccuracyScore: 89.4,
  },
];

// Revenue & Invoices Analytics Data
export interface RevenueAnalyticsData {
  mrr: number;
  projectedArr: number;
  totalInvoiced30d: number;
  paidAmount: number;
  overdueAmount: number;
  openAmount: number;
  collectionRate: number; // percentage
  arpu: number; // average revenue per user / org
  planBreakdown: { planName: string; count: number; mrr: number; percentage: number }[];
  revenueTrend: { month: string; mrr: number; expansion: number }[];
}

export const REVENUE_ANALYTICS_DATA: RevenueAnalyticsData = {
  mrr: 12840,
  projectedArr: 154080,
  totalInvoiced30d: 14210,
  paidAmount: 13401,
  overdueAmount: 149,
  openAmount: 660,
  collectionRate: 94.3,
  arpu: 713,
  planBreakdown: [
    { planName: "Enterprise Health Scale", count: 4, mrr: 2156, percentage: 41.5 },
    { planName: "AI Clinic Receptionist Pro", count: 8, mrr: 2392, percentage: 38.2 },
    { planName: "AI Receptionist Starter", count: 6, mrr: 894, percentage: 14.1 },
    { planName: "Add-ons & Credits Top-ups", count: 18, mrr: 410, percentage: 6.2 },
  ],
  revenueTrend: [
    { month: "Nov", mrr: 9100, expansion: 450 },
    { month: "Dec", mrr: 9800, expansion: 620 },
    { month: "Jan", mrr: 10650, expansion: 780 },
    { month: "Feb", mrr: 11400, expansion: 810 },
    { month: "Mar", mrr: 12100, expansion: 940 },
    { month: "Apr", mrr: 12840, expansion: 1120 },
  ],
};

/**
 * Reusable CSV Exporter
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  try {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((item) => {
            const str = String(item ?? "");
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to export CSV:", err);
  }
}

