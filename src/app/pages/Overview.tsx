import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Phone,
  CheckCircle,
  Clock,
  ChevronDown,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  ArrowRight,
  Calendar,
  Star,
  Pin,
  Eye,
  Plus,
  X,
  Trash2,
  DollarSign,
  Users,
  Activity,
  FileText,
  MessageSquare,
  Check,
  LayoutDashboard,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { getStoredCallLogs, PROCESS_LOGS_STORE_EVENT, type CallLog } from "../../lib/processLogsStore";
import { isFreshWorkspace } from "../../lib/onboardingWorkspace";
import { getStoredTasks, TASKS_STORE_EVENT } from "../../lib/tasksStore";
import type { TaskEntity } from "../../types/task";
import {
  getStoredNotifications,
  NOTIFICATIONS_STORE_EVENT,
  InAppNotification,
} from "../../lib/notificationsStore";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";
import { useInvoices } from "../context/InvoiceContext";
import { ReportDefinition } from "../types/invoiceTypes";
import ReportViewerModal from "../components/reports/ReportViewerModal";
import {
  aggregateChartData,
  filterReportRows,
  CHART_PALETTE,
} from "../../lib/reportEngine";
import {
  getPinnedReportIds,
  unpinReport,
  PINNED_REPORTS_EVENT,
} from "../../lib/pinnedReportsStore";
import {
  getStoredDashboardTabs,
  getActiveDashboardTabId,
  setActiveDashboardTabId,
  addCustomDashboardTab,
  deleteDashboardTab,
  addMetricToDashboard,
  removeMetricFromDashboard,
  DASHBOARDS_STORE_EVENT,
  type DashboardTab,
  type DashboardMetric,
} from "../../lib/dashboardStore";
import { toast } from "sonner";

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "#0F172A",
  borderColor: "#1E293B",
  borderRadius: "12px",
  color: "#F8FAFC",
  fontSize: "12px",
};

function getMetricIcon(iconName?: string) {
  switch (iconName) {
    case "Phone": return Phone;
    case "DollarSign": return DollarSign;
    case "CheckCircle": return CheckCircle;
    case "Clock": return Clock;
    case "Users": return Users;
    case "Sparkles": return Sparkles;
    case "TrendingUp": return TrendingUp;
    case "MessageSquare": return MessageSquare;
    case "FileText": return FileText;
    case "Activity": return Activity;
    default: return TrendingUp;
  }
}

function getKpiColorStyles(color?: string) {
  switch (color) {
    case "emerald":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-100/80",
        text: "text-[#10b981]",
        subText: "text-emerald-600 font-semibold",
      };
    case "amber":
      return {
        bg: "bg-amber-50",
        border: "border-amber-100/80",
        text: "text-amber-500",
        subText: "text-amber-600 font-semibold",
      };
    case "rose":
      return {
        bg: "bg-rose-50",
        border: "border-rose-100/80",
        text: "text-rose-500",
        subText: "text-rose-600 font-semibold",
      };
    case "purple":
      return {
        bg: "bg-purple-50",
        border: "border-purple-100/80",
        text: "text-purple-600",
        subText: "text-purple-600 font-semibold",
      };
    case "cyan":
      return {
        bg: "bg-cyan-50",
        border: "border-cyan-100/80",
        text: "text-cyan-600",
        subText: "text-cyan-600 font-semibold",
      };
    case "blue":
    default:
      return {
        bg: "bg-blue-50",
        border: "border-blue-100/80",
        text: "text-[#1456f0]",
        subText: "text-blue-600 font-semibold",
      };
  }
}

interface DashboardKpiCardProps {
  metric: DashboardMetric;
  onRemove?: () => void;
}

function DashboardKpiCard({ metric, onRemove }: DashboardKpiCardProps) {
  const IconComponent = getMetricIcon(metric.kpiIcon);
  const styles = getKpiColorStyles(metric.kpiColor);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center justify-between gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] group relative">
      <div className="flex items-center gap-4 min-w-0">
        <div className={`w-12 h-12 rounded-2xl ${styles.bg} border ${styles.border} flex items-center justify-center ${styles.text} shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display truncate">
            {metric.title}
          </p>
          <p
            className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums truncate"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {metric.kpiValue ?? "—"}
          </p>
          {metric.kpiSubtitle && (
            <p className={`text-[11px] ${styles.subText} mt-0.5 truncate`}>
              {metric.kpiSubtitle}
            </p>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
          title="Remove metric"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

interface DashboardChartCardProps {
  metric: DashboardMetric;
  onRemove?: () => void;
}

function DashboardChartCard({ metric, onRemove }: DashboardChartCardProps) {
  const isLine = metric.chartType === "line";
  const isPie = metric.chartType === "pie" || metric.chartType === "donut";
  const data = metric.chartData || [];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between transition-all hover:shadow-xs group">
      <div>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4
                className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {metric.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {metric.xAxisLabel && metric.yAxisLabel
                  ? `${metric.xAxisLabel} vs ${metric.yAxisLabel}`
                  : `${data.length} categories · Live metric`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide">
              {metric.chartType || "bar"}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Remove metric from dashboard"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chart Body */}
        <div className="h-64 w-full my-2">
          {data.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Data Points</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                Metric configured without recorded series values.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {isLine ? (
                <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={metric.yAxisLabel || "Value"}
                    stroke="#1456f0"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              ) : isPie ? (
                <PieChart>
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={metric.chartType === "donut" ? 45 : 0}
                    outerRadius={75}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                  <Bar
                    dataKey="value"
                    name={metric.yAxisLabel || "Value"}
                    fill="#1456f0"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Card Footer Metric Summary */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Data Points: <strong className="text-slate-700">{data.length}</strong>
        </span>
        <span className="truncate max-w-[200px]">
          Total Sum:{" "}
          <strong className="text-slate-700">
            {data.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0).toLocaleString()}
          </strong>
        </span>
      </div>
    </div>
  );
}

interface PinnedReportChartCardProps {
  report: ReportDefinition;
  rows: Record<string, any>[];
  onViewReport: () => void;
  onUnpin: () => void;
}

function PinnedReportChartCard({
  report,
  rows,
  onViewReport,
  onUnpin,
}: PinnedReportChartCardProps) {
  const filteredRows = useMemo(() => {
    return filterReportRows(rows, report.reportingPeriod, report.filterConditions);
  }, [rows, report.reportingPeriod, report.filterConditions]);

  const chartAggregation = useMemo(() => {
    return aggregateChartData(filteredRows, {
      groupBy: report.groupBy,
      timeGrouping: report.timeGrouping,
      breakdownBy: report.breakdownBy,
      metric: report.metric,
      bucketRules: report.bucketRules,
      xAxisLabel: report.xAxisLabel,
      yAxisLabel: report.yAxisLabel,
    });
  }, [filteredRows, report]);

  const isPie = report.chartType === "pie" || report.chartType === "donut";
  const isLine = report.chartType === "line";

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between transition-all hover:shadow-xs group">
      <div>
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className="text-xs font-bold uppercase tracking-wider text-slate-900 truncate"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {report.name}
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 uppercase shrink-0">
                  {report.dataSource}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {report.description ||
                  `${chartAggregation.chartData.length} categories · ${chartAggregation.totalRecords} records`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200/60 rounded text-blue-700 font-bold">
                X: {chartAggregation.xAxisLabel}
              </span>
              <span className="text-slate-300">vs</span>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 rounded text-emerald-800 font-bold">
                Y: {chartAggregation.yAxisLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onViewReport}
              className="px-2.5 py-1 text-xs font-semibold text-[#1456f0] bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Open full report viewer with records table and drilldowns"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">View Report</span>
            </button>

            <button
              type="button"
              onClick={onUnpin}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Unpin this report from Overview"
            >
              <Pin className="w-3.5 h-3.5 fill-[#1456f0] text-[#1456f0] hover:fill-rose-500 hover:text-rose-500" />
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-64 w-full my-2">
          {chartAggregation.chartData.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">No Records Found</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                No data points match this report's filter rules.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {isLine ? (
                <LineChart
                  data={chartAggregation.chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                  />
                  {chartAggregation.seriesKeys.map((k, i) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={k === "value" ? chartAggregation.yAxisLabel : k}
                      stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              ) : isPie ? (
                <PieChart>
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                  />
                  <Pie
                    data={chartAggregation.chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={report.chartType === "donut" ? 45 : 0}
                    outerRadius={75}
                  >
                    {chartAggregation.chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart
                  data={chartAggregation.chartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <ChartTooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                  />
                  {chartAggregation.seriesKeys.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      name={k === "value" ? chartAggregation.yAxisLabel : k}
                      stackId={report.chartType === "stacked_bar" ? "stack" : undefined}
                      fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                      radius={report.chartType === "stacked_bar" ? undefined : [4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Card Footer Metric Summary */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Total Records: <strong className="text-slate-700">{chartAggregation.totalRecords}</strong>
        </span>
        <span className="truncate max-w-[200px]">
          Summary: <strong className="text-slate-700">{chartAggregation.summaryLabel}</strong>
        </span>
      </div>
    </div>
  );
}

const distributionData = [
  { id: 1, name: "Skipped", value: 45, color: "#3b82f6" },
  { id: 2, name: "Scheduled", value: 65, color: "#6366f1" },
  { id: 3, name: "Triggered", value: 80, color: "#8b5cf6" },
  { id: 4, name: "Failed", value: 21, color: "#94a3b8" },
  { id: 5, name: "Queued", value: 35, color: "#a855f7" },
  { id: 6, name: "Incomplete", value: 40, color: "#10b981" },
  { id: 7, name: "Busy", value: 38, color: "#2dd4bf" },
  { id: 8, name: "Completed", value: 179, color: "#2563eb" },
  { id: 9, name: "Cancelled", value: 25, color: "#60a5fa" },
  { id: 10, name: "No answer", value: 45, color: "#38bdf8" },
];

const conversionData = [
  { id: 1, stage: "Initial Contact", value: 573 },
  { id: 2, stage: "Insurance Verify", value: 412 },
  { id: 3, stage: "Appointment", value: 285 },
  { id: 4, stage: "Follow-up", value: 198 },
  { id: 5, stage: "Consultation Done", value: 179 },
  { id: 6, stage: "Payment Settled", value: 142 },
];

export default function Overview() {
  const navigate = useNavigate();

  // Filter dropdown state matching attached image
  const [filterDate, setFilterDate] = useState("All time");
  const [filterProcess, setFilterProcess] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [filterDirection, setFilterDirection] = useState("All");
  const [filterMember, setFilterMember] = useState("All");

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Dashboards & Active Tab state
  const [dashboardTabs, setDashboardTabs] = useState<DashboardTab[]>(() => getStoredDashboardTabs());
  const [activeTabId, setActiveTab] = useState<string>(() => getActiveDashboardTabId());

  // Creation Modals
  const [isCreateTabModalOpen, setIsCreateTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");

  const [isAddMetricModalOpen, setIsAddMetricModalOpen] = useState(false);
  const [metricType, setMetricType] = useState<"kpi" | "chart" | "report">("kpi");
  const [metricTitle, setMetricTitle] = useState("");
  const [kpiValue, setKpiValue] = useState("");
  const [kpiSubtitle, setKpiSubtitle] = useState("");
  const [kpiIcon, setKpiIcon] = useState<any>("TrendingUp");
  const [kpiColor, setKpiColor] = useState<any>("blue");
  const [chartType, setChartType] = useState<"bar" | "line" | "donut" | "pie">("bar");
  const [chartTemplate, setChartTemplate] = useState("weekly_volume");
  const [selectedReportId, setSelectedReportId] = useState("");

  // Storage and store event subscriptions
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => getStoredCallLogs());
  const [tasks, setTasks] = useState<TaskEntity[]>(() => getStoredTasks());
  const [, setNotifications] = useState<InAppNotification[]>(() => getStoredNotifications());

  const { reports, getReportRows } = useInvoices();
  const [pinnedReportIds, setPinnedReportIds] = useState<string[]>(() => getPinnedReportIds());
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);

  // Synchronize dashboard tabs and active tab
  useEffect(() => {
    const handleDashboardsChange = () => {
      setDashboardTabs(getStoredDashboardTabs());
      setActiveTab(getActiveDashboardTabId());
    };
    window.addEventListener(DASHBOARDS_STORE_EVENT, handleDashboardsChange);
    window.addEventListener("storage", handleDashboardsChange);
    return () => {
      window.removeEventListener(DASHBOARDS_STORE_EVENT, handleDashboardsChange);
      window.removeEventListener("storage", handleDashboardsChange);
    };
  }, []);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handlePinnedChange = () => {
      setPinnedReportIds(getPinnedReportIds());
    };
    window.addEventListener(PINNED_REPORTS_EVENT, handlePinnedChange);
    window.addEventListener("storage", handlePinnedChange);
    return () => {
      window.removeEventListener(PINNED_REPORTS_EVENT, handlePinnedChange);
      window.removeEventListener("storage", handlePinnedChange);
    };
  }, []);

  const pinnedReports = useMemo(() => {
    return pinnedReportIds
      .map((id) => reports.find((r) => r.id === id))
      .filter((r): r is ReportDefinition => Boolean(r));
  }, [pinnedReportIds, reports]);

  useEffect(() => {
    const handleUpdate = () => {
      setCallLogs(getStoredCallLogs());
    };
    const handleTasksUpdate = () => {
      setTasks(getStoredTasks());
    };
    const handleNotifsUpdate = () => {
      setNotifications(getStoredNotifications());
    };

    window.addEventListener(PROCESS_LOGS_STORE_EVENT, handleUpdate);
    window.addEventListener("organizationChanged", handleUpdate);
    window.addEventListener("mantra_organization_changed", handleUpdate);
    window.addEventListener(TASKS_STORE_EVENT, handleTasksUpdate);
    window.addEventListener(NOTIFICATIONS_STORE_EVENT, handleNotifsUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("storage", handleTasksUpdate);
    window.addEventListener("storage", handleNotifsUpdate);

    return () => {
      window.removeEventListener(PROCESS_LOGS_STORE_EVENT, handleUpdate);
      window.removeEventListener("organizationChanged", handleUpdate);
      window.removeEventListener("mantra_organization_changed", handleUpdate);
      window.removeEventListener(TASKS_STORE_EVENT, handleTasksUpdate);
      window.removeEventListener(NOTIFICATIONS_STORE_EVENT, handleNotifsUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("storage", handleTasksUpdate);
      window.removeEventListener("storage", handleNotifsUpdate);
    };
  }, []);

  const isFresh = isFreshWorkspace();

  const totalCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.length : 573);
  const completedCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.filter(c => c.status === "Completed").length : 179);
  const failedCalls = isFresh ? 0 : (callLogs.length > 0 ? callLogs.filter(c => c.status === "Failed").length : 21);
  const successRate = totalCalls > 0 ? `${((completedCalls / totalCalls) * 100).toFixed(1)}%` : "0.0%";
  const avgDuration = isFresh ? "0m 00s" : "0m 14s";

  // Most recent tasks for banner (maximum 3)
  const displayedTasks = useMemo(() => {
    return tasks.slice(0, 3);
  }, [tasks]);

  // Current active tab object
  const currentTab = useMemo(() => {
    return dashboardTabs.find((t) => t.id === activeTabId) || dashboardTabs[0] || {
      id: "call_overview",
      name: "Call overview",
      metrics: [],
      isDefault: true,
    };
  }, [dashboardTabs, activeTabId]);

  // Split current tab metrics into KPI cards and Chart widgets
  const kpiMetrics = useMemo(() => {
    return currentTab.metrics.filter((m) => m.type === "kpi");
  }, [currentTab]);

  const chartMetrics = useMemo(() => {
    return currentTab.metrics.filter((m) => m.type === "chart");
  }, [currentTab]);

  // Handle Create Dashboard
  const handleCreateDashboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabName.trim()) {
      toast.error("Please enter a dashboard name");
      return;
    }
    const created = addCustomDashboardTab(newTabName.trim());
    setDashboardTabs(getStoredDashboardTabs());
    setActiveTab(created.id);
    setNewTabName("");
    setIsCreateTabModalOpen(false);
    toast.success(`Dashboard "${created.name}" created successfully`);
  };

  // Handle Add Metric Submission
  const handleAddMetricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricTitle.trim()) {
      toast.error("Please provide a title for the metric");
      return;
    }

    if (metricType === "kpi") {
      addMetricToDashboard(currentTab.id, {
        title: metricTitle.trim(),
        type: "kpi",
        kpiValue: kpiValue.trim() || "0",
        kpiSubtitle: kpiSubtitle.trim(),
        kpiIcon,
        kpiColor,
      });
    } else if (metricType === "chart") {
      let data: Array<{ name: string; value: number }> = [];
      if (chartTemplate === "weekly_volume") {
        data = [
          { name: "Mon", value: 45 },
          { name: "Tue", value: 68 },
          { name: "Wed", value: 92 },
          { name: "Thu", value: 74 },
          { name: "Fri", value: 50 },
        ];
      } else if (chartTemplate === "channels") {
        data = [
          { name: "Voice AI", value: 340 },
          { name: "WhatsApp", value: 210 },
          { name: "SMS", value: 110 },
          { name: "Web Chat", value: 95 },
        ];
      } else if (chartTemplate === "departments") {
        data = [
          { name: "Clinical Intake", value: 42 },
          { name: "Consultation", value: 38 },
          { name: "Billing", value: 22 },
          { name: "Diagnostics", value: 16 },
        ];
      } else {
        data = [
          { name: "Category A", value: 50 },
          { name: "Category B", value: 80 },
          { name: "Category C", value: 65 },
          { name: "Category D", value: 90 },
        ];
      }

      addMetricToDashboard(currentTab.id, {
        title: metricTitle.trim(),
        type: "chart",
        chartType,
        chartData: data,
        xAxisLabel: "Category",
        yAxisLabel: "Volume",
      });
    } else if (metricType === "report") {
      const rep = reports.find((r) => r.id === selectedReportId);
      if (!rep) {
        toast.error("Please select a valid report to pin");
        return;
      }
      const repRows = getReportRows(rep.dataSource);
      const filtered = filterReportRows(repRows, rep.reportingPeriod, rep.filterConditions);
      const agg = aggregateChartData(filtered, {
        groupBy: rep.groupBy,
        timeGrouping: rep.timeGrouping,
        breakdownBy: rep.breakdownBy,
        metric: rep.metric,
        bucketRules: rep.bucketRules,
        xAxisLabel: rep.xAxisLabel,
        yAxisLabel: rep.yAxisLabel,
      });

      addMetricToDashboard(currentTab.id, {
        title: metricTitle.trim() || rep.name,
        type: "chart",
        chartType: rep.chartType as any,
        chartData: agg.chartData,
        reportId: rep.id,
        xAxisLabel: agg.xAxisLabel,
        yAxisLabel: agg.yAxisLabel,
      });
    }

    setDashboardTabs(getStoredDashboardTabs());
    setIsAddMetricModalOpen(false);
    setMetricTitle("");
    setKpiValue("");
    setKpiSubtitle("");
    toast.success(`Metric added to ${currentTab.name}`);
  };

  const handleRemoveMetric = (metricId: string) => {
    removeMetricFromDashboard(currentTab.id, metricId);
    setDashboardTabs(getStoredDashboardTabs());
    toast.success("Metric removed from dashboard");
  };

  const hasAnyFilterActive =
    filterDate !== "All time" ||
    filterProcess !== "All" ||
    filterStage !== "All" ||
    filterDirection !== "All" ||
    filterMember !== "All";

  const handleResetFilters = () => {
    setFilterDate("All time");
    setFilterProcess("All");
    setFilterStage("All");
    setFilterDirection("All");
    setFilterMember("All");
    setOpenDropdown(null);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <PageHeader
        title="Overview Analytics"
        subtitle="Track call performance, automation health, active tasks, and team notifications"
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
            Analytics
          </span>
        }
      />
      <div className="px-10 sm:px-12 pt-4 pb-7.5 sm:pt-5 sm:pb-8 w-full">
        {/* Strict 6-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-start">
          {/* FULL-WIDTH ACTIVE TASKS BANNER (Most recent tasks, maximum 3) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-6 bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-xs font-bold uppercase tracking-wider text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Active Tasks
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 tabular-nums">
                      {tasks.length} total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Most recent execution deliverables &amp; patient follow-ups
                  </p>
                </div>
              </div>

              <Link
                to="/tasks"
                className="text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View all tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Tasks List: Maximum 3 tasks in a single row */}
            {displayedTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                No active tasks.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {displayedTasks.map((task) => {
                  const allItems = task.checklists?.flatMap((c) => c.items) || [];
                  const completedItems = allItems.filter((i) => i.isCompleted);
                  const totalItems = allItems.length;
                  const isCompleted = task.status === "completed";
                  const targetUrl = `/${task.scopeLevel === "admin" ? "admin/tasks" : "tasks"}/${task.id}`;

                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(targetUrl)}
                      className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200/60 transition-all cursor-pointer flex items-center justify-between gap-3 group min-w-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {totalItems > 0 ? (
                          <div className="shrink-0 flex items-center">
                            <CircularProgressRing
                              value={completedItems.length}
                              max={totalItems}
                              size={22}
                              strokeWidth={2.5}
                              indicatorColor={isCompleted ? "#10b981" : "#1456f0"}
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {task.isImportant && (
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                            <span
                              className={`text-xs font-semibold truncate ${
                                isCompleted
                                  ? "line-through text-slate-400"
                                  : "text-slate-900 group-hover:text-[#1456f0]"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-medium">
                            {task.deadline && (
                              <span className="flex items-center gap-1 tabular-nums">
                                <Calendar className="w-3 h-3" />
                                {task.deadline}
                              </span>
                            )}
                            {totalItems > 0 && (
                              <span className="tabular-nums">
                                · {completedItems.length}/{totalItems} done
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                          {task.stageName || "Task Created"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#1456f0] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DASHBOARD TABS & FILTER BAR (Matching reference image media_1795257999016_c7ec24cf.png) */}
          <div
            ref={filterBarRef}
            className="col-span-1 md:col-span-2 lg:col-span-6 bg-white/95 backdrop-blur-xl rounded-[22px] border border-white/80 shadow-[0_2px_14px_rgba(0,0,0,0.02)] p-2.5 sm:px-4 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 relative z-20"
          >
            {/* Left: Dashboard Tabs Switcher Pill Bar + Plus Button */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-0.5">
              <div className="bg-[#f1f4f9] p-1 rounded-full flex items-center gap-1 shrink-0 border border-slate-200/40">
                {dashboardTabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      className={`inline-flex items-center rounded-full text-xs transition-all whitespace-nowrap select-none ${
                        isActive
                          ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/50"
                          : "text-slate-500 hover:text-slate-900 font-medium hover:bg-white/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setActiveDashboardTabId(tab.id);
                        }}
                        className="px-3.5 py-1.5 cursor-pointer"
                      >
                        {tab.name}
                      </button>
                      {!tab.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete dashboard "${tab.name}"?`)) {
                              deleteDashboardTab(tab.id);
                              setDashboardTabs(getStoredDashboardTabs());
                              if (activeTabId === tab.id) {
                                setActiveTab("call_overview");
                              }
                              toast.success("Dashboard deleted");
                            }
                          }}
                          className="pr-2.5 -ml-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete dashboard"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Dashboard (+) Button */}
              <button
                type="button"
                onClick={() => setIsCreateTabModalOpen(true)}
                title="Create custom dashboard"
                className="w-7 h-7 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>

            {/* Right: Dropdown Filter Pills (Date, Process, Stage, Direction, Member) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* 1. Date Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
                  className="h-8 rounded-full border border-slate-200/90 bg-white hover:border-slate-300 px-3 py-1 flex items-center gap-1.5 text-xs shadow-2xs transition-all cursor-pointer select-none"
                >
                  <span className="text-slate-400 font-normal">Date:</span>
                  <span className="text-slate-900 font-bold">{filterDate}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {openDropdown === "date" && (
                  <div className="absolute right-0 top-9.5 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {["All time", "Today", "Yesterday", "Last 7 days", "Last 30 days", "This month", "This quarter"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFilterDate(val);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/80 hover:text-[#1456f0] flex items-center justify-between cursor-pointer"
                      >
                        <span className={filterDate === val ? "font-bold text-[#1456f0]" : ""}>{val}</span>
                        {filterDate === val && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Process Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "process" ? null : "process")}
                  className="h-8 rounded-full border border-slate-200/90 bg-white hover:border-slate-300 px-3 py-1 flex items-center gap-1.5 text-xs shadow-2xs transition-all cursor-pointer select-none"
                >
                  <span className="text-slate-400 font-normal">Process:</span>
                  <span className="text-slate-900 font-bold">{filterProcess}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {openDropdown === "process" && (
                  <div className="absolute right-0 top-9.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {["All", "Patient Intake", "Appointment Scheduling", "Follow-up Calls", "Billing Support"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFilterProcess(val);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/80 hover:text-[#1456f0] flex items-center justify-between cursor-pointer"
                      >
                        <span className={filterProcess === val ? "font-bold text-[#1456f0]" : ""}>{val}</span>
                        {filterProcess === val && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Stage Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "stage" ? null : "stage")}
                  className="h-8 rounded-full border border-slate-200/90 bg-white hover:border-slate-300 px-3 py-1 flex items-center gap-1.5 text-xs shadow-2xs transition-all cursor-pointer select-none"
                >
                  <span className="text-slate-400 font-normal">Stage:</span>
                  <span className="text-slate-900 font-bold">{filterStage}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {openDropdown === "stage" && (
                  <div className="absolute right-0 top-9.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {["All", "Initial Contact", "Insurance Verify", "Schedule Appointment", "Completed"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFilterStage(val);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/80 hover:text-[#1456f0] flex items-center justify-between cursor-pointer"
                      >
                        <span className={filterStage === val ? "font-bold text-[#1456f0]" : ""}>{val}</span>
                        {filterStage === val && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Direction Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "direction" ? null : "direction")}
                  className="h-8 rounded-full border border-slate-200/90 bg-white hover:border-slate-300 px-3 py-1 flex items-center gap-1.5 text-xs shadow-2xs transition-all cursor-pointer select-none"
                >
                  <span className="text-slate-400 font-normal">Direction:</span>
                  <span className="text-slate-900 font-bold">{filterDirection}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {openDropdown === "direction" && (
                  <div className="absolute right-0 top-9.5 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {["All", "Inbound", "Outbound", "Internal"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFilterDirection(val);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/80 hover:text-[#1456f0] flex items-center justify-between cursor-pointer"
                      >
                        <span className={filterDirection === val ? "font-bold text-[#1456f0]" : ""}>{val}</span>
                        {filterDirection === val && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Member Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "member" ? null : "member")}
                  className="h-8 rounded-full border border-slate-200/90 bg-white hover:border-slate-300 px-3 py-1 flex items-center gap-1.5 text-xs shadow-2xs transition-all cursor-pointer select-none"
                >
                  <span className="text-slate-400 font-normal">Member:</span>
                  <span className="text-slate-900 font-bold">{filterMember}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>
                {openDropdown === "member" && (
                  <div className="absolute right-0 top-9.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {["All", "Dr. Sarah Jenkins", "Alex Rivera", "Dr. David Miller", "Elena Rostova", "AI Assistant"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setFilterMember(val);
                          setOpenDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50/80 hover:text-[#1456f0] flex items-center justify-between cursor-pointer"
                      >
                        <span className={filterMember === val ? "font-bold text-[#1456f0]" : ""}>{val}</span>
                        {filterMember === val && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset link if any filter is customized */}
              {hasAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-[#1456f0] hover:text-blue-700 hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DASHBOARD CONTENT SWITCHER */}
          {activeTabId === "call_overview" ? (
            /* ──────────────── CALL OVERVIEW VIEW ──────────────── */
            <>
              {/* ROW: 4 Core Call Stat Cards (Span 6, 4 columns) */}
              <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Calls */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#1456f0] flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                      TOTAL CALLS
                    </p>
                    <p
                      className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {totalCalls}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {isFresh ? "No calls registered yet" : "Across selected filters"}
                    </p>
                  </div>
                </div>

                {/* Card 2: Completed */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-[#10b981] flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                      COMPLETED
                    </p>
                    <p
                      className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {completedCalls}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 tabular-nums">
                      {isFresh ? "0% success rate" : `${successRate} success rate`}
                    </p>
                  </div>
                </div>

                {/* Card 3: Failed / Missed */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-[#ef4444] flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                      FAILED / MISSED
                    </p>
                    <p
                      className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {failedCalls}
                    </p>
                    <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                      {isFresh ? "Clean record" : "Requires attention"}
                    </p>
                  </div>
                </div>

                {/* Card 4: Avg Duration */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-5 flex items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                      AVG. DURATION
                    </p>
                    <p
                      className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight mt-0.5 tabular-nums font-mono"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {avgDuration}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Per successful call
                    </p>
                  </div>
                </div>
              </div>

              {/* Any additional user-added KPI metrics in Call Overview */}
              {kpiMetrics.length > 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {kpiMetrics.map((metric) => (
                    <DashboardKpiCard
                      key={metric.id}
                      metric={metric}
                      onRemove={() => handleRemoveMetric(metric.id)}
                    />
                  ))}
                </div>
              )}

              {/* ROW: Call Distribution (Span 3) + Conversion Overview (Span 3) - Strictly 2 graphs per row */}
              <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-base font-bold text-[#222222] mb-1"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Call Distribution
                  </h3>
                </div>

                {isFresh && callLogs.length === 0 ? (
                  <div className="relative w-full h-56 flex items-center justify-center my-2">
                    <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-200 flex flex-col items-center justify-center">
                      <span
                        className="text-3xl font-bold text-slate-300 tracking-tight"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        0
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        TOTAL CALLS
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-56 flex items-center justify-center my-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {distributionData.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span
                        className="text-3xl font-bold text-[#222222] tracking-tight tabular-nums"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {totalCalls}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        TOTAL CALLS
                      </span>
                    </div>
                  </div>
                )}

                {isFresh && callLogs.length === 0 ? (
                  <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-400">
                    Awaiting caller outcomes &amp; stages
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                    {distributionData.map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-600 font-medium truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversion Overview */}
              <div className="col-span-1 md:col-span-1 lg:col-span-3 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <h3
                      className="font-bold text-sm text-[#222222]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Conversion Overview
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Funnel Stages</span>
                </div>

                {isFresh && callLogs.length === 0 ? (
                  <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">No Funnel Activity Yet</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                      Conversion stages will populate in real-time as callers navigate through AI dialogues.
                    </p>
                  </div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conversionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="stage" stroke="#94a3b8" fontSize={10} interval={0} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <ChartTooltip />
                        <Bar dataKey="value" fill="#1456f0" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Performance Analysis */}
              <div className="col-span-1 md:col-span-2 lg:col-span-6 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3
                    className="font-bold text-sm text-[#222222]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Performance Analysis
                  </h3>
                </div>

                {isFresh && callLogs.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/60">
                      <p className="text-xs font-bold text-[#1456f0] mb-0.5">Fresh Workspace Ready</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Your practice setup is complete. Connect your phone number or launch an agent workflow to start tracking peak call windows.
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                      <p className="text-xs font-bold text-emerald-600 mb-0.5">AI Engine Primed</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Your services, business details, and knowledge base sources entered during onboarding are synchronized and ready to assist callers.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/60">
                      <p className="text-xs font-bold text-[#1456f0] mb-0.5">Peak Call Windows</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Call completion rates peak at <strong>86.4%</strong> between 2:00 PM and 4:30 PM across all timezones.
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                      <p className="text-xs font-bold text-emerald-600 mb-0.5">Automated Workflows</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        AI Receptionist handled <strong>74% of initial intakes</strong> without human intervention needed.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Any additional user-added charts in Call Overview (strictly 2 graphs per row) */}
              {chartMetrics.length > 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {chartMetrics.map((metric) => (
                    <DashboardChartCard
                      key={metric.id}
                      metric={metric}
                      onRemove={() => handleRemoveMetric(metric.id)}
                    />
                  ))}
                </div>
              )}

              {/* PINNED REPORTS (Strictly 2 graphs per row, at the bottom of the overview) */}
              {pinnedReports.length > 0 && (
                <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pinnedReports.map((rep) => (
                    <PinnedReportChartCard
                      key={rep.id}
                      report={rep}
                      rows={getReportRows(rep.dataSource)}
                      onViewReport={() => setSelectedReport(rep)}
                      onUnpin={() => {
                        unpinReport(rep.id);
                        setPinnedReportIds(getPinnedReportIds());
                        toast.success(`Unpinned "${rep.name}" from Overview`);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ──────────────── CUSTOM / SPECIALIZED DASHBOARDS VIEW ──────────────── */
            <>
              {currentTab.metrics.length === 0 ? (
                /* Empty state when dashboard has no metrics yet */
                <div className="col-span-1 md:col-span-2 lg:col-span-6 bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/80 shadow-2xs p-10 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center mb-3">
                    <LayoutDashboard className="w-7 h-7" />
                  </div>
                  <h3
                    className="text-base font-bold text-slate-800"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    No Metrics in "{currentTab.name}"
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                    Customize this dashboard by adding KPI statistics cards or visual analytics graphs.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMetricTitle("");
                      setKpiValue("");
                      setKpiSubtitle("");
                      setIsAddMetricModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#1456f0] hover:bg-blue-600 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Metric</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* KPI Stat Cards (4 columns responsive grid) */}
                  {kpiMetrics.length > 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {kpiMetrics.map((metric) => (
                        <DashboardKpiCard
                          key={metric.id}
                          metric={metric}
                          onRemove={() => handleRemoveMetric(metric.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Chart Metrics (Strictly 2 graphs per row) */}
                  {chartMetrics.length > 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {chartMetrics.map((metric) => (
                        <DashboardChartCard
                          key={metric.id}
                          metric={metric}
                          onRemove={() => handleRemoveMetric(metric.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* CREATE NEW DASHBOARD MODAL */}
      {isCreateTabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-sm font-bold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Create New Dashboard
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add a dedicated dashboard tab for your metrics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTabModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDashboard} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Operations, Patient Success, Marketing"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTabModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1456f0] hover:bg-blue-600 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Create Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD METRIC MODAL */}
      {isAddMetricModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[24px] shadow-2xl border border-slate-100 w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className="text-sm font-bold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Add Metric to {currentTab.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Add a KPI stat card, visual graph, or pin a custom report
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMetricModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMetricSubmit} className="mt-4 space-y-4">
              {/* Metric Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Metric Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetricType("kpi")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      metricType === "kpi"
                        ? "bg-blue-50 border-[#1456f0] text-[#1456f0]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    KPI Stat Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("chart")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      metricType === "chart"
                        ? "bg-blue-50 border-[#1456f0] text-[#1456f0]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Visual Graph
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("report")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      metricType === "report"
                        ? "bg-blue-50 border-[#1456f0] text-[#1456f0]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    From Reports
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Metric Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Total Inquiries, Weekly Intake, Revenue by Source"
                  value={metricTitle}
                  onChange={(e) => setMetricTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0]"
                />
              </div>

              {/* Type = KPI Options */}
              {metricType === "kpi" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Primary Value
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1,420, $24,500, 94.2%"
                        value={kpiValue}
                        onChange={(e) => setKpiValue(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Subtitle / Trend
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +14% vs last month"
                        value={kpiSubtitle}
                        onChange={(e) => setKpiSubtitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Color Theme
                      </label>
                      <select
                        value={kpiColor}
                        onChange={(e) => setKpiColor(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="blue">Blue</option>
                        <option value="emerald">Emerald</option>
                        <option value="purple">Purple</option>
                        <option value="amber">Amber</option>
                        <option value="rose">Rose</option>
                        <option value="cyan">Cyan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Icon
                      </label>
                      <select
                        value={kpiIcon}
                        onChange={(e) => setKpiIcon(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="TrendingUp">Trending Up</option>
                        <option value="DollarSign">Dollar Sign</option>
                        <option value="Phone">Phone</option>
                        <option value="CheckCircle">Check Circle</option>
                        <option value="Clock">Clock</option>
                        <option value="Sparkles">Sparkles</option>
                        <option value="Users">Users</option>
                        <option value="MessageSquare">Message Square</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Type = Visual Chart Options */}
              {metricType === "chart" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Chart Type
                      </label>
                      <select
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value as any)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="donut">Donut Chart</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Data Template
                      </label>
                      <select
                        value={chartTemplate}
                        onChange={(e) => setChartTemplate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="weekly_volume">Weekly Volume Trends</option>
                        <option value="channels">Channel Distribution</option>
                        <option value="departments">Department Breakdown</option>
                        <option value="custom">Standard Series</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Type = From Reports */}
              {metricType === "report" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Select Report
                    </label>
                    <select
                      value={selectedReportId}
                      onChange={(e) => {
                        setSelectedReportId(e.target.value);
                        const r = reports.find((rep) => rep.id === e.target.value);
                        if (r && !metricTitle) {
                          setMetricTitle(r.name);
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choose a report --</option>
                      {reports.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name} ({rep.dataSource.toUpperCase()} · {rep.chartType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMetricModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1456f0] hover:bg-blue-600 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Add Metric
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Execution Viewer modal when opening from a pinned card */}
      {selectedReport && (
        <ReportViewerModal
          isOpen={Boolean(selectedReport)}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
        />
      )}
    </div>
  );
}
