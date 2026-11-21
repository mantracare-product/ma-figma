export interface DashboardMetric {
  id: string;
  title: string;
  type: "kpi" | "chart";
  // KPI Card properties
  kpiValue?: string | number;
  kpiSubtitle?: string;
  kpiIcon?: "Phone" | "DollarSign" | "CheckCircle" | "Clock" | "Users" | "Activity" | "TrendingUp" | "Sparkles" | "FileText" | "MessageSquare";
  kpiColor?: "blue" | "emerald" | "amber" | "rose" | "purple" | "cyan";
  // Chart properties
  chartType?: "bar" | "line" | "pie" | "donut" | "stacked_bar";
  dataSource?: "calls" | "revenue" | "appointments" | "processes" | "clients" | "messaging";
  groupBy?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesKey?: string;
  chartData?: Array<Record<string, any>>;
  reportId?: string;
}

export interface DashboardTab {
  id: string;
  name: string;
  isDefault?: boolean;
  metrics: DashboardMetric[];
}

export const DASHBOARDS_STORAGE_KEY = "ma_overview_dashboards_v2";
export const DASHBOARD_ACTIVE_TAB_KEY = "ma_overview_active_tab_v2";
export const DASHBOARDS_STORE_EVENT = "ma_overview_dashboards_changed";

export const INITIAL_DASHBOARD_TABS: DashboardTab[] = [
  {
    id: "call_overview",
    name: "Call overview",
    isDefault: true,
    metrics: [], // Uses the core overview analytics
  },
  {
    id: "communication",
    name: "Communication",
    isDefault: true,
    metrics: [
      {
        id: "comm-1",
        title: "Total Messages",
        type: "kpi",
        kpiValue: "1,420",
        kpiSubtitle: "+18% this month",
        kpiIcon: "MessageSquare",
        kpiColor: "blue",
      },
      {
        id: "comm-2",
        title: "Bot Containment",
        type: "kpi",
        kpiValue: "88.4%",
        kpiSubtitle: "Autonomous resolution",
        kpiIcon: "Sparkles",
        kpiColor: "emerald",
      },
      {
        id: "comm-3",
        title: "WhatsApp Outbound",
        type: "kpi",
        kpiValue: "980",
        kpiSubtitle: "Primary channel",
        kpiIcon: "TrendingUp",
        kpiColor: "purple",
      },
      {
        id: "comm-4",
        title: "Avg Response Time",
        type: "kpi",
        kpiValue: "1.2s",
        kpiSubtitle: "Instant AI reply",
        kpiIcon: "Clock",
        kpiColor: "cyan",
      },
      {
        id: "comm-chart-1",
        title: "Daily Message Volume",
        type: "chart",
        chartType: "bar",
        xAxisLabel: "Day",
        yAxisLabel: "Messages",
        chartData: [
          { name: "Mon", value: 240 },
          { name: "Tue", value: 310 },
          { name: "Wed", value: 380 },
          { name: "Thu", value: 290 },
          { name: "Fri", value: 200 },
        ],
      },
      {
        id: "comm-chart-2",
        title: "Channel Distribution",
        type: "chart",
        chartType: "donut",
        xAxisLabel: "Channel",
        yAxisLabel: "Share",
        chartData: [
          { name: "WhatsApp", value: 980 },
          { name: "SMS", value: 310 },
          { name: "Email", value: 130 },
        ],
      },
    ],
  },
  {
    id: "workflows",
    name: "Workflows",
    isDefault: true,
    metrics: [
      {
        id: "wf-1",
        title: "Active Deals",
        type: "kpi",
        kpiValue: "48",
        kpiSubtitle: "Across 4 active pipelines",
        kpiIcon: "TrendingUp",
        kpiColor: "blue",
      },
      {
        id: "wf-2",
        title: "Avg Stage Velocity",
        type: "kpi",
        kpiValue: "5.4 days",
        kpiSubtitle: "-1.2 days faster",
        kpiIcon: "Clock",
        kpiColor: "emerald",
      },
      {
        id: "wf-3",
        title: "Intake Conversion",
        type: "kpi",
        kpiValue: "76.8%",
        kpiSubtitle: "From initial contact",
        kpiIcon: "CheckCircle",
        kpiColor: "purple",
      },
      {
        id: "wf-4",
        title: "Pending Tasks",
        type: "kpi",
        kpiValue: "14",
        kpiSubtitle: "Assigned to team",
        kpiIcon: "Users",
        kpiColor: "amber",
      },
      {
        id: "wf-chart-1",
        title: "Deals by Pipeline Stage",
        type: "chart",
        chartType: "bar",
        xAxisLabel: "Stage",
        yAxisLabel: "Active Deals",
        chartData: [
          { name: "Initial Contact", value: 18 },
          { name: "Insurance Verify", value: 14 },
          { name: "Appt Scheduled", value: 10 },
          { name: "Completed", value: 6 },
        ],
      },
      {
        id: "wf-chart-2",
        title: "Clients by Process",
        type: "chart",
        chartType: "donut",
        xAxisLabel: "Process",
        yAxisLabel: "Clients",
        chartData: [
          { name: "Patient Intake", value: 19 },
          { name: "Appt Scheduling", value: 14 },
          { name: "Follow-up Calls", value: 9 },
          { name: "Billing Support", value: 6 },
        ],
      },
    ],
  },
  {
    id: "automation",
    name: "Automation",
    isDefault: true,
    metrics: [
      {
        id: "auto-1",
        title: "Automated Runs",
        type: "kpi",
        kpiValue: "3,842",
        kpiSubtitle: "Actions executed this month",
        kpiIcon: "Sparkles",
        kpiColor: "blue",
      },
      {
        id: "auto-2",
        title: "Autonomous Fill Rate",
        type: "kpi",
        kpiValue: "94.1%",
        kpiSubtitle: "AI Scribe clinical notes",
        kpiIcon: "CheckCircle",
        kpiColor: "emerald",
      },
      {
        id: "auto-3",
        title: "Auto-Invoiced",
        type: "kpi",
        kpiValue: "$28,450",
        kpiSubtitle: "Zero manual data entry",
        kpiIcon: "DollarSign",
        kpiColor: "purple",
      },
      {
        id: "auto-4",
        title: "Time Saved",
        type: "kpi",
        kpiValue: "142 hrs",
        kpiSubtitle: "Staff capacity unlocked",
        kpiIcon: "Clock",
        kpiColor: "cyan",
      },
      {
        id: "auto-chart-1",
        title: "Weekly Automation Volume",
        type: "chart",
        chartType: "line",
        xAxisLabel: "Week",
        yAxisLabel: "Automations",
        chartData: [
          { name: "W1", value: 620 },
          { name: "W2", value: 890 },
          { name: "W3", value: 1140 },
          { name: "W4", value: 1192 },
        ],
      },
      {
        id: "auto-chart-2",
        title: "Automation by Trigger Type",
        type: "chart",
        chartType: "donut",
        xAxisLabel: "Trigger",
        yAxisLabel: "Runs",
        chartData: [
          { name: "Call Ended", value: 1420 },
          { name: "Stage Moved", value: 980 },
          { name: "AI Scribe Done", value: 840 },
          { name: "Invoice Sent", value: 602 },
        ],
      },
    ],
  },
  {
    id: "revenue",
    name: "Revenue",
    isDefault: true,
    metrics: [
      {
        id: "rev-1",
        title: "Total Invoiced",
        type: "kpi",
        kpiValue: "$42,850",
        kpiSubtitle: "84 total invoices",
        kpiIcon: "DollarSign",
        kpiColor: "blue",
      },
      {
        id: "rev-2",
        title: "Collected Revenue",
        type: "kpi",
        kpiValue: "$36,200",
        kpiSubtitle: "84.5% settlement rate",
        kpiIcon: "CheckCircle",
        kpiColor: "emerald",
      },
      {
        id: "rev-3",
        title: "Outstanding Balance",
        type: "kpi",
        kpiValue: "$6,650",
        kpiSubtitle: "12 pending invoices",
        kpiIcon: "Clock",
        kpiColor: "amber",
      },
      {
        id: "rev-4",
        title: "Overdue Invoices",
        type: "kpi",
        kpiValue: "3",
        kpiSubtitle: "Follow-up required",
        kpiIcon: "TrendingUp",
        kpiColor: "rose",
      },
      {
        id: "rev-chart-1",
        title: "Monthly Invoiced vs Collected ($)",
        type: "chart",
        chartType: "bar",
        xAxisLabel: "Month",
        yAxisLabel: "Revenue ($)",
        chartData: [
          { name: "May", value: 8200 },
          { name: "Jun", value: 11500 },
          { name: "Jul", value: 14800 },
          { name: "Aug", value: 16350 },
        ],
      },
      {
        id: "rev-chart-2",
        title: "Revenue by Clinical Service",
        type: "chart",
        chartType: "donut",
        xAxisLabel: "Service",
        yAxisLabel: "Amount ($)",
        chartData: [
          { name: "Consultation", value: 18400 },
          { name: "Therapy", value: 12200 },
          { name: "Diagnostics", value: 7600 },
          { name: "Follow-up", value: 4650 },
        ],
      },
    ],
  },
  {
    id: "ar",
    name: "A/R",
    isDefault: true,
    metrics: [
      {
        id: "ar-1",
        title: "Total A/R Balance",
        type: "kpi",
        kpiValue: "$18,420",
        kpiSubtitle: "Open receivables",
        kpiIcon: "DollarSign",
        kpiColor: "rose",
      },
      {
        id: "ar-2",
        title: "Current (0-30 Days)",
        type: "kpi",
        kpiValue: "$12,180",
        kpiSubtitle: "66.1% of receivables",
        kpiIcon: "CheckCircle",
        kpiColor: "emerald",
      },
      {
        id: "ar-3",
        title: "31-60 Days",
        type: "kpi",
        kpiValue: "$4,120",
        kpiSubtitle: "Reminders active",
        kpiIcon: "Clock",
        kpiColor: "amber",
      },
      {
        id: "ar-4",
        title: "90+ Days",
        type: "kpi",
        kpiValue: "$2,120",
        kpiSubtitle: "Claims review needed",
        kpiIcon: "TrendingUp",
        kpiColor: "purple",
      },
      {
        id: "ar-chart-1",
        title: "A/R Aging Breakdown ($)",
        type: "chart",
        chartType: "bar",
        xAxisLabel: "Aging Tier",
        yAxisLabel: "Balance ($)",
        chartData: [
          { name: "0-30 Days", value: 12180 },
          { name: "31-60 Days", value: 4120 },
          { name: "61-90 Days", value: 1650 },
          { name: "90+ Days", value: 2120 },
        ],
      },
      {
        id: "ar-chart-2",
        title: "A/R by Payor Type",
        type: "chart",
        chartType: "donut",
        xAxisLabel: "Payor",
        yAxisLabel: "Share",
        chartData: [
          { name: "Commercial Ins", value: 8900 },
          { name: "Self-Pay Patient", value: 5800 },
          { name: "Medicare/Medicaid", value: 3720 },
        ],
      },
    ],
  },
];

export function getStoredDashboardTabs(): DashboardTab[] {
  if (typeof window === "undefined") return INITIAL_DASHBOARD_TABS;
  try {
    const raw = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
    if (!raw) return INITIAL_DASHBOARD_TABS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_DASHBOARD_TABS;
  } catch (err) {
    console.error("Failed to read dashboard tabs from localStorage:", err);
    return INITIAL_DASHBOARD_TABS;
  }
}

export function saveDashboardTabs(tabs: DashboardTab[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(tabs));
    window.dispatchEvent(new CustomEvent(DASHBOARDS_STORE_EVENT, { detail: { tabs } }));
  } catch (err) {
    console.error("Failed to save dashboard tabs:", err);
  }
}

export function getActiveDashboardTabId(): string {
  if (typeof window === "undefined") return "call_overview";
  try {
    return localStorage.getItem(DASHBOARD_ACTIVE_TAB_KEY) || "call_overview";
  } catch {
    return "call_overview";
  }
}

export function setActiveDashboardTabId(tabId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARD_ACTIVE_TAB_KEY, tabId);
    window.dispatchEvent(new CustomEvent(DASHBOARDS_STORE_EVENT, { detail: { activeTabId: tabId } }));
  } catch {}
}

export function addCustomDashboardTab(name: string): DashboardTab {
  const tabs = getStoredDashboardTabs();
  const id = `dash-${Date.now()}`;
  const newTab: DashboardTab = {
    id,
    name: name.trim() || "New Dashboard",
    isDefault: false,
    metrics: [],
  };
  const updated = [...tabs, newTab];
  saveDashboardTabs(updated);
  setActiveDashboardTabId(id);
  return newTab;
}

export function deleteDashboardTab(tabId: string): void {
  const tabs = getStoredDashboardTabs();
  const updated = tabs.filter((t) => t.id !== tabId);
  saveDashboardTabs(updated);
  setActiveDashboardTabId("call_overview");
}

export function addMetricToDashboard(tabId: string, metric: Omit<DashboardMetric, "id">): DashboardMetric {
  const tabs = getStoredDashboardTabs();
  const metricId = `metric-${Date.now()}`;
  const newMetric: DashboardMetric = {
    ...metric,
    id: metricId,
  };

  const updated = tabs.map((tab) => {
    if (tab.id === tabId) {
      return {
        ...tab,
        metrics: [...tab.metrics, newMetric],
      };
    }
    return tab;
  });

  saveDashboardTabs(updated);
  return newMetric;
}

export function removeMetricFromDashboard(tabId: string, metricId: string): void {
  const tabs = getStoredDashboardTabs();
  const updated = tabs.map((tab) => {
    if (tab.id === tabId) {
      return {
        ...tab,
        metrics: tab.metrics.filter((m) => m.id !== metricId),
      };
    }
    return tab;
  });
  saveDashboardTabs(updated);
}
