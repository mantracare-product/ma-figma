/**
 * AdminAnalyticsCalls.tsx
 * Path: src/app/pages/admin/AdminAnalyticsCalls.tsx
 *
 * Dedicated Admin Console for Voice Calls Analytics & Telemetry:
 * - Mathematical consistency: Completed + Incomplete + Failed === Total Calls
 * - Inbound + Outbound === Total Calls
 * - Donut status segment counts sum exactly to Total Calls
 * - 4 KPI cards in one row on desktop (Completed, Incomplete, Failed, Avg Duration)
 * - Grouped Bar Chart: Calls by Organization (Inbound & Outbound) with sorting and Top 10 / View All toggle
 * - Donut Chart: Call Distribution with center total and interactive 2-column legend
 * - Stacked Area Chart: Inbound vs Outbound over time with gradient fills and shared tooltip
 * - Dense Table: Organization Telemetry Breakdown with ORG ID, metrics, and completion rate progress bar
 * - TopBarExportButton in top bar for full CSV export
 * - Loading skeletons, card-level error fallbacks, and friendly empty state
 */

import React, { useState, useMemo, useCallback } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import { TopBarExportButton } from "../../components/admin/TopBarActions";
import TableComponent, { TableColumn } from "../../components/ui/TableComponent";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  getFilteredCallsAnalytics,
  exportCallsAnalyticsCsv,
  formatDurationMinutesSeconds,
  CallsFilterState,
  OrgCallTelemetry,
  BASELINE_ORG_TELEMETRY,
} from "../../../lib/callsAnalyticsService";
import { useOrganization } from "../../context/OrganizationContext";
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  X,
  RotateCcw,
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

type SortMode = "total" | "inbound" | "outbound" | "alpha";

export default function AdminAnalyticsCalls() {
  const { organizations } = useOrganization();

  // ── Filters State ──
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [customStart, setCustomStart] = useState("2026-10-12");
  const [customEnd, setCustomEnd] = useState("2026-11-11");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Chart UI Controls ──
  const [barSortMode, setBarSortMode] = useState<SortMode>("total");
  const [viewAllOrgs, setViewAllOrgs] = useState(false);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  // ── Error & Loading States ──
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Filter state for analytics service
  const filterState: CallsFilterState = useMemo(
    () => ({
      dateRange,
      customStartDate: customStart,
      customEndDate: customEnd,
      selectedOrgIds,
      searchQuery,
    }),
    [dateRange, customStart, customEnd, selectedOrgIds, searchQuery]
  );

  // Compute telemetry metrics with guaranteed mathematical consistency
  const { orgData, kpis, timeSeries } = useMemo(() => {
    return getFilteredCallsAnalytics(filterState);
  }, [filterState]);

  // Handle Org filter selection from dropdown, bar click, or table row click
  const handleSelectOrg = useCallback((orgId: string) => {
    if (orgId === "all") {
      setSelectedOrgIds([]);
    } else {
      setSelectedOrgIds([orgId]);
    }
  }, []);

  const handleClearOrgFilter = useCallback(() => {
    setSelectedOrgIds([]);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedOrgIds([]);
    setDateRange("30d");
    setSearchQuery("");
  }, []);

  // Top Bar CSV Export
  const handleExportCsv = useCallback(() => {
    exportCallsAnalyticsCsv(filterState, kpis, orgData);
    toast.success("Exported Voice Calls Analytics to CSV");
  }, [filterState, kpis, orgData]);

  // Sorted & Sliced Organizations for the Bar Chart
  const chartOrgList = useMemo(() => {
    const list = [...orgData];
    if (barSortMode === "total") {
      list.sort((a, b) => b.totalCalls - a.totalCalls);
    } else if (barSortMode === "inbound") {
      list.sort((a, b) => b.inbound - a.inbound);
    } else if (barSortMode === "outbound") {
      list.sort((a, b) => b.outbound - a.outbound);
    } else if (barSortMode === "alpha") {
      list.sort((a, b) => a.orgName.localeCompare(b.orgName));
    }
    return viewAllOrgs ? list : list.slice(0, 10);
  }, [orgData, barSortMode, viewAllOrgs]);

  // Selected Organization Name for Filter Chip
  const activeOrgName = useMemo(() => {
    if (selectedOrgIds.length === 0) return null;
    const found = BASELINE_ORG_TELEMETRY.find((o) => o.orgId === selectedOrgIds[0]);
    return found ? found.orgName : selectedOrgIds[0];
  }, [selectedOrgIds]);

  // Table Columns
  const columns: TableColumn<OrgCallTelemetry>[] = useMemo(
    () => [
      {
        key: "orgCode",
        header: "ORG ID",
        width: 110,
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
            {row.orgCode}
          </span>
        ),
      },
      {
        key: "orgName",
        header: "ORGANIZATION",
        render: (row) => (
          <span
            className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[220px] block"
            title={row.orgName}
          >
            {row.orgName}
          </span>
        ),
      },
      {
        key: "totalCalls",
        header: "TOTAL CALLS",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-bold text-gray-900 tabular-nums">
            {row.totalCalls.toLocaleString()}
          </span>
        ),
      },
      {
        key: "inbound",
        header: "INBOUND",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-blue-700 tabular-nums">
            {row.inbound.toLocaleString()}
          </span>
        ),
      },
      {
        key: "outbound",
        header: "OUTBOUND",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-purple-700 tabular-nums">
            {row.outbound.toLocaleString()}
          </span>
        ),
      },
      {
        key: "completed",
        header: "COMPLETED",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-emerald-700 tabular-nums">
            {row.completed.toLocaleString()}
          </span>
        ),
      },
      {
        key: "incomplete",
        header: "INCOMPLETE",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-amber-700 tabular-nums">
            {row.incomplete.toLocaleString()}
          </span>
        ),
      },
      {
        key: "failed",
        header: "FAILED",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-rose-700 tabular-nums">
            {row.failed.toLocaleString()}
          </span>
        ),
      },
      {
        key: "avgDurationSec",
        header: "AVG DURATION",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
            {formatDurationMinutesSeconds(row.avgDurationSec)}
          </span>
        ),
      },
      {
        key: "completionRate",
        header: "COMPLETION RATE",
        align: "right",
        width: 170,
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, row.completionRate))}%` }}
              />
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums w-12 text-right">
              {row.completionRate.toFixed(1)}%
            </span>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      {/* Top Bar with Title, Subtitle, and Export CSV Button */}
      <PageHeader
        title="Voice Calls Analytics"
        subtitle="Cross-organization telephony session telemetry, outcome classification, and duration trends"
        actions={<TopBarExportButton onExport={handleExportCsv} />}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ── 1. Filter Bar ── */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search organization name or ORG ID..."
          onExport={handleExportCsv}
          leftElement={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Organization Filter Selector */}
              <div className="relative">
                <select
                  value={selectedOrgIds.length === 1 ? selectedOrgIds[0] : "all"}
                  onChange={(e) => handleSelectOrg(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[170px] transition-colors truncate"
                  aria-label="Filter by Organization"
                >
                  <option value="all">All Organizations ({BASELINE_ORG_TELEMETRY.length})</option>
                  {BASELINE_ORG_TELEMETRY.map((org) => (
                    <option key={org.orgId} value={org.orgId}>
                      {org.orgName} ({org.orgCode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Date Range Selector */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(e.target.value as "7d" | "30d" | "90d" | "custom")
                  }
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                  aria-label="Select Date Range"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last Quarter</option>
                  <option value="custom">Custom Range</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Custom Date Pickers (if custom selected) */}
              {dateRange === "custom" && (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 h-[34px] shadow-2xs">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="text-xs text-slate-700 border-none outline-none bg-transparent"
                    aria-label="Custom start date"
                  />
                  <span className="text-slate-400 text-xs font-mono">-</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="text-xs text-slate-700 border-none outline-none bg-transparent"
                    aria-label="Custom end date"
                  />
                </div>
              )}

              {/* Clearable Active Org Filter Chip */}
              {activeOrgName && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200/80 rounded-lg text-xs font-semibold text-blue-800 shadow-2xs">
                  <span className="truncate max-w-[140px]">{activeOrgName}</span>
                  <button
                    type="button"
                    onClick={handleClearOrgFilter}
                    className="hover:bg-blue-200/60 rounded p-0.5 text-blue-600 cursor-pointer transition-colors"
                    aria-label="Clear organization filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Clear All Filters Button */}
              {(selectedOrgIds.length > 0 || searchQuery.trim() !== "" || dateRange !== "30d") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-[34px] px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          }
        />

        {/* Global Error Banner */}
        {hasError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Failed to fetch call telemetry records. Please try again.</span>
            </div>
            <button
              type="button"
              onClick={() => setHasError(false)}
              className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-semibold hover:bg-rose-100 cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── 2. KPI Row: Exactly 4 Cards in ONE Row on Desktop ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Completed Calls */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-gray-300">
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <Tooltip text="Completed = call finished with a recorded outcome" placement="top">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-help flex items-center gap-1">
                    Completed Calls
                  </span>
                </Tooltip>
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div
                className="text-2xl font-bold text-gray-900 tabular-nums"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {kpis.completed.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                {kpis.completedPct.toFixed(1)}% of total
              </span>
              <div className="flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{kpis.completedTrend.value}%</span>
              </div>
            </div>
          </div>

          {/* Card 2: Incomplete Calls */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-gray-300">
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <Tooltip
                  text="Incomplete = dropped, no answer, busy, voicemail or abandoned"
                  placement="top"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-help flex items-center gap-1">
                    Incomplete Calls
                  </span>
                </Tooltip>
                <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div
                className="text-2xl font-bold text-gray-900 tabular-nums"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {kpis.incomplete.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                {kpis.incompletePct.toFixed(1)}% of total
              </span>
              {/* Fewer incomplete is good -> green down arrow */}
              <div className="flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                <ArrowDownRight className="w-3 h-3" />
                <span>-{kpis.incompleteTrend.value}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Failed Calls */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-gray-300">
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <Tooltip text="Failed = carrier or system error" placement="top">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-help flex items-center gap-1">
                    Failed Calls
                  </span>
                </Tooltip>
                <div className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div
                className="text-2xl font-bold text-gray-900 tabular-nums"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {kpis.failed.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                {kpis.failedPct.toFixed(1)}% of total
              </span>
              {/* Fewer failed calls is good -> green down arrow */}
              <div className="flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                <ArrowDownRight className="w-3 h-3" />
                <span>-{kpis.failedTrend.value}%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Avg Call Duration */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-gray-300">
            <div>
              <div className="flex items-center justify-between text-gray-500 mb-2">
                <Tooltip
                  text="Average duration calculated across all answered and completed voice interactions"
                  placement="top"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-help flex items-center gap-1">
                    Avg Call Duration
                  </span>
                </Tooltip>
                <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div
                className="text-2xl font-bold text-gray-900 tabular-nums"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {kpis.avgDurationFormatted}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Per successful call</span>
              <div className="flex items-center gap-0.5 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{kpis.avgDurationTrend.value}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Chart Row 1: Calls by Organization (Full Width Card) ── */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <h3
                  className="text-sm font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Calls by Organization
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Inbound vs Outbound telephony traffic distributed across tenant workspaces
              </p>
            </div>

            {/* Controls: Legend, Sorter, View All */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span>Inbound</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  <span>Outbound</span>
                </div>
              </div>

              {/* Sort selector */}
              <div className="relative">
                <select
                  value={barSortMode}
                  onChange={(e) => setBarSortMode(e.target.value as SortMode)}
                  className="h-8 px-2.5 pr-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs"
                  aria-label="Sort chart organizations"
                >
                  <option value="total">Sort: Total Calls</option>
                  <option value="inbound">Sort: Inbound</option>
                  <option value="outbound">Sort: Outbound</option>
                  <option value="alpha">Sort: A to Z</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View all / Top 10 Toggle */}
              {orgData.length > 10 && (
                <button
                  type="button"
                  onClick={() => setViewAllOrgs(!viewAllOrgs)}
                  className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  {viewAllOrgs ? "Show Top 10" : `View all (${orgData.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Bar Chart Container */}
          {chartOrgList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <PhoneCall className="w-8 h-8 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No organizational calls found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try widening your date range or removing the search filter
              </p>
            </div>
          ) : (
            <div className={viewAllOrgs ? "overflow-x-auto" : ""}>
              <div
                style={{
                  minWidth: viewAllOrgs ? Math.max(760, chartOrgList.length * 70) : undefined,
                  height: 280,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartOrgList}
                    margin={{ top: 15, right: 15, left: -10, bottom: 40 }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const payload = e.activePayload[0].payload as OrgCallTelemetry;
                        handleSelectOrg(payload.orgId);
                        toast.info(`Filtered telemetry to ${payload.orgName}`);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="orgName"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={50}
                      tickFormatter={(name: string) =>
                        name.length > 16 ? `${name.slice(0, 14)}…` : name
                      }
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload as OrgCallTelemetry;
                        return (
                          <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                            <p className="font-bold text-gray-900 border-b border-slate-100 pb-1">
                              {data.orgName}
                            </p>
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                                Inbound:
                              </span>
                              <strong className="text-gray-900 font-mono">
                                {data.inbound.toLocaleString()}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                                Outbound:
                              </span>
                              <strong className="text-gray-900 font-mono">
                                {data.outbound.toLocaleString()}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-slate-800 pt-1 border-t border-slate-100 font-semibold">
                              <span>Total Calls:</span>
                              <span className="font-mono text-blue-600">
                                {data.totalCalls.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic pt-0.5">
                              Click bar to filter to this organization
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="inbound"
                      name="Inbound"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="outbound"
                      name="Outbound"
                      fill="#8B5CF6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Chart Row 2: Two Cards Side by Side (Equal Height) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Call Distribution (Donut Chart) */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <h3
                  className="text-sm font-bold text-gray-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Call Distribution
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Breakdown of telephony sessions by terminal outcome and connection status
              </p>
            </div>

            {/* Donut Chart with Center Total Counter */}
            <div className="relative w-full h-56 flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpis.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    onMouseEnter={(_, index) => setHoveredDonutIndex(index)}
                    onMouseLeave={() => setHoveredDonutIndex(null)}
                  >
                    {kpis.statusDistribution.map((entry, index) => (
                      <Cell
                        key={entry.id}
                        fill={entry.color}
                        opacity={
                          hoveredDonutIndex === null || hoveredDonutIndex === index ? 1 : 0.4
                        }
                        className="transition-opacity duration-200 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const entry = payload[0].payload as {
                        name: string;
                        value: number;
                        percentage: number;
                        color: string;
                      };
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}</span>
                          </div>
                          <div className="text-slate-600 flex justify-between gap-3">
                            <span>Count:</span>
                            <strong className="text-gray-900 font-mono">
                              {entry.value.toLocaleString()}
                            </strong>
                          </div>
                          <div className="text-slate-600 flex justify-between gap-3">
                            <span>Share:</span>
                            <strong className="text-gray-900 font-mono">
                              {entry.percentage.toFixed(1)}%
                            </strong>
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight tabular-nums"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {kpis.totalCalls.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  TOTAL CALLS
                </span>
              </div>
            </div>

            {/* Interactive 2-Column Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-100 text-xs">
              {kpis.statusDistribution.map((item, index) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredDonutIndex(index)}
                  onMouseLeave={() => setHoveredDonutIndex(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                    hoveredDonutIndex === index ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums shrink-0 ml-2">
                    <span className="text-gray-900 font-semibold">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-slate-400">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Inbound vs Outbound Over Time (Stacked Area Chart) */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <h3
                    className="text-sm font-bold text-gray-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Inbound vs Outbound Over Time
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span>Inbound</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                    <span>Outbound</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {dateRange === "90d"
                  ? "Weekly concurrency trajectory over the past quarter"
                  : "Daily concurrency and call flow trajectory over selected period"}
              </p>
            </div>

            {/* Area Chart with SVG Gradient Fills */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeries}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const inboundVal = (payload[0]?.value as number) || 0;
                      const outboundVal = (payload[1]?.value as number) || 0;
                      const totalVal = inboundVal + outboundVal;
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-lg text-xs space-y-1.5 min-w-[170px]">
                          <p className="font-bold text-gray-900 border-b border-slate-100 pb-1">
                            {label}
                          </p>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                              Inbound:
                            </span>
                            <strong className="text-gray-900 font-mono">
                              {inboundVal.toLocaleString()}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                              Outbound:
                            </span>
                            <strong className="text-gray-900 font-mono">
                              {outboundVal.toLocaleString()}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-800 pt-1 border-t border-slate-100 font-semibold">
                            <span>Day Total:</span>
                            <span className="font-mono text-blue-600">
                              {totalVal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    name="Inbound"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inboundGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    name="Outbound"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outboundGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── 5. Organization Telemetry Breakdown Table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-sm font-bold text-gray-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Organization Telemetry Breakdown
              </h3>
              <p className="text-xs text-gray-500">
                Workspace-level call volume, termination statuses, and completion rates (Click any
                row to filter)
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-600 font-mono">
              Showing {orgData.length} organizations
            </div>
          </div>

          <TableComponent
            data={orgData}
            columns={columns}
            getRowId={(row) => row.orgId}
            onRowClick={(row) => {
              handleSelectOrg(row.orgId);
              toast.info(`Filtered telemetry to ${row.orgName}`);
            }}
            defaultRowsPerPage={20}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage="No organizational telemetry records match the current filter selection."
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
