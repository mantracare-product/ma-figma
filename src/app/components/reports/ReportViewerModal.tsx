import React, { useState, useMemo } from "react";
import { Modal } from "../ui/Modal";
import { ReportDefinition } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { toast } from "sonner";
import {
  Download,
  Calendar,
  BarChart3,
  Table as TableIcon,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Filter,
  X,
  ChevronRight,
  Plus,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDefinition | null;
}

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "#0F172A",
  borderColor: "#1E293B",
  borderRadius: "12px",
  color: "#F8FAFC",
  fontSize: "12px",
  padding: "10px 14px",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
};

export default function ReportViewerModal({
  isOpen,
  onClose,
  report,
}: ReportViewerModalProps) {
  const { getReportRows } = useInvoices();

  // Collapsible right-side filter panel toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Active filter state (initialized from report)
  const [activeDateRange, setActiveDateRange] = useState("all");
  const [activeMatchType, setActiveMatchType] = useState<"AND" | "OR">("AND");
  const [activeConditions, setActiveConditions] = useState<
    Array<{
      id: string;
      field: string;
      operator: "equals" | "contains" | "gt" | "lt";
      value: string;
      logic?: "AND" | "OR";
    }>
  >([]);

  // Sync state whenever report changes
  React.useEffect(() => {
    if (report) {
      setActiveDateRange(report.reportingPeriod?.type || "all");
      setActiveMatchType(report.filterConditions?.matchType || "AND");
      setActiveConditions(
        report.filterConditions?.conditions
          ? report.filterConditions.conditions.map((c) => ({
              ...c,
              logic: c.logic || report.filterConditions?.matchType || "AND",
            }))
          : []
      );
      setIsFilterPanelOpen(false);
    }
  }, [report]);

  // 1. Fetch raw data source rows
  const rawRows = useMemo(() => {
    if (!report) return [];
    return getReportRows(report.dataSource) || [];
  }, [report, getReportRows]);

  // 2. Filter rows by conditions and timeframe
  const filteredRows = useMemo(() => {
    if (!report) return [];

    return rawRows.filter((row) => {
      // Timeframe filter (if created or date field exists)
      const rowDateStr = row.created || row.date || row.dueDate;
      if (rowDateStr && activeDateRange !== "all") {
        const rowDate = new Date(rowDateStr);
        const now = new Date();
        if (activeDateRange === "this_week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (rowDate < sevenDaysAgo) return false;
        } else if (activeDateRange === "this_month" || activeDateRange === "last_30") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (rowDate < thirtyDaysAgo) return false;
        } else if (activeDateRange === "last_month" || activeDateRange === "last_90") {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(now.getDate() - 90);
          if (rowDate < ninetyDaysAgo) return false;
        }
      }

      // Condition filters
      const validConditions = activeConditions.filter(
        (c) => c.field && c.value !== undefined && c.value.trim() !== ""
      );

      if (validConditions.length === 0) return true;

      const evalCondition = (cond: (typeof validConditions)[0]) => {
        const rowVal = row[cond.field];
        if (rowVal === undefined || rowVal === null) return false;

        const strRowVal = String(rowVal).toLowerCase();
        const strCondVal = cond.value.toLowerCase().trim();

        if (cond.operator === "equals") {
          return strRowVal === strCondVal;
        }
        if (cond.operator === "contains") {
          return strRowVal.includes(strCondVal);
        }
        if (cond.operator === "gt") {
          const numRow = parseFloat(String(rowVal).replace(/[^0-9.-]+/g, ""));
          const numCond = parseFloat(cond.value.replace(/[^0-9.-]+/g, ""));
          if (!isNaN(numRow) && !isNaN(numCond)) {
            return numRow > numCond;
          }
          return strRowVal > strCondVal;
        }
        if (cond.operator === "lt") {
          const numRow = parseFloat(String(rowVal).replace(/[^0-9.-]+/g, ""));
          const numCond = parseFloat(cond.value.replace(/[^0-9.-]+/g, ""));
          if (!isNaN(numRow) && !isNaN(numCond)) {
            return numRow < numCond;
          }
          return strRowVal < strCondVal;
        }
        return true;
      };

      let result = evalCondition(validConditions[0]);
      for (let i = 1; i < validConditions.length; i++) {
        const cond = validConditions[i];
        const condLogic = cond.logic || activeMatchType || "AND";
        const isMatch = evalCondition(cond);
        if (condLogic === "OR") {
          result = result || isMatch;
        } else {
          result = result && isMatch;
        }
      }
      return result;
    });
  }, [rawRows, activeConditions, activeMatchType, activeDateRange, report]);

  // 3. Sort filtered rows
  const sortedRows = useMemo(() => {
    if (!report?.sortBy?.field) return filteredRows;

    const { field, direction } = report.sortBy;
    const isAsc = direction === "asc";

    return [...filteredRows].sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (valA === undefined || valA === null) return isAsc ? -1 : 1;
      if (valB === undefined || valB === null) return isAsc ? 1 : -1;

      // Numeric comparison
      const numA = typeof valA === "number" ? valA : parseFloat(String(valA).replace(/[^0-9.-]+/g, ""));
      const numB = typeof valB === "number" ? valB : parseFloat(String(valB).replace(/[^0-9.-]+/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return isAsc ? numA - numB : numB - numA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return isAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRows, report?.sortBy]);

  // 4. Calculate dynamic aggregations for configured fieldCalculations
  const calculatedAggregations = useMemo(() => {
    if (!report?.fieldCalculations) return [];

    return Object.entries(report.fieldCalculations).map(([field, func]) => {
      const values = filteredRows
        .map((r) => r[field])
        .filter((v) => v !== undefined && v !== null);

      let computedValue = "";
      const numValues = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]+/g, ""))))
        .filter((n) => !isNaN(n));

      if (func === "count") {
        computedValue = `${values.length} records`;
      } else if (func === "sum" && numValues.length > 0) {
        const sum = numValues.reduce((s, n) => s + n, 0);
        computedValue =
          field === "amount" || field === "cost" || field === "value"
            ? `$${sum.toFixed(2)}`
            : `${sum.toFixed(1)}`;
      } else if (func === "avg" && numValues.length > 0) {
        const avg = numValues.reduce((s, n) => s + n, 0) / numValues.length;
        computedValue =
          field === "amount" || field === "cost" || field === "value"
            ? `$${avg.toFixed(2)}`
            : `${avg.toFixed(1)}${field === "timeInStage" ? " days" : ""}`;
      } else if (func === "min" && (numValues.length > 0 || values.length > 0)) {
        if (numValues.length > 0) {
          const min = Math.min(...numValues);
          computedValue =
            field === "amount" || field === "cost" || field === "value"
              ? `$${min.toFixed(2)}`
              : `${min}`;
        } else {
          computedValue = `${values.sort()[0]}`;
        }
      } else if (func === "max" && (numValues.length > 0 || values.length > 0)) {
        if (numValues.length > 0) {
          const max = Math.max(...numValues);
          computedValue =
            field === "amount" || field === "cost" || field === "value"
              ? `$${max.toFixed(2)}`
              : `${max}`;
        } else {
          computedValue = `${values.sort().reverse()[0]}`;
        }
      } else {
        computedValue = `${values.length}`;
      }

      return {
        field,
        func,
        label: `${field.toUpperCase()} (${func.toUpperCase()})`,
        value: computedValue,
      };
    });
  }, [filteredRows, report?.fieldCalculations]);

  // 5. Dynamic chart data aggregation
  const dynamicChartData = useMemo(() => {
    if (!report || filteredRows.length === 0) return { chart: [], distribution: [] };

    // Grouping by a primary category (status, process, service, member, channel, or created date)
    const groupKey =
      report.dataSource === "revenue"
        ? "status"
        : report.dataSource === "processes"
        ? "process"
        : report.dataSource === "calls"
        ? "service"
        : report.dataSource === "appointments"
        ? "service"
        : report.dataSource === "clients"
        ? "stage"
        : report.dataSource === "team"
        ? "member"
        : "channel";

    const counts: Record<string, number> = {};
    const numericTotals: Record<string, number> = {};

    filteredRows.forEach((r) => {
      const g = String(r[groupKey] || "Other");
      counts[g] = (counts[g] || 0) + 1;

      const numVal =
        typeof r.amount === "number"
          ? r.amount
          : typeof r.duration === "number"
          ? r.duration
          : typeof r.timeInStage === "number"
          ? r.timeInStage
          : typeof r.value === "number"
          ? r.value
          : typeof r.calls === "number"
          ? r.calls
          : typeof r.messages === "number"
          ? r.messages
          : 1;

      numericTotals[g] = (numericTotals[g] || 0) + numVal;
    });

    const chart = Object.keys(counts).map((key) => ({
      name: key,
      count: counts[key],
      total: Math.round(numericTotals[key] * 10) / 10,
    }));

    const maxVal = Math.max(...Object.values(numericTotals), 1);
    const distribution = Object.keys(numericTotals).map((name) => ({
      name,
      value: numericTotals[name],
      percentage: Math.round((numericTotals[name] / maxVal) * 100),
    }));

    return { chart, distribution };
  }, [filteredRows, report]);

  if (!report) return null;

  // Determine which columns to display
  const columnsToDisplay =
    report.selectedFields && report.selectedFields.length > 0
      ? report.selectedFields
      : sortedRows.length > 0
      ? Object.keys(sortedRows[0])
      : [];

  const handleExportCSV = () => {
    if (sortedRows.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = columnsToDisplay;
    const csvRows = [
      headers.join(","),
      ...sortedRows.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${report.name.toLowerCase().replace(/\s+/g, "_")}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded successfully!");
  };

  const getStatusBadge = (statusStr: any) => {
    const s = String(statusStr || "").toLowerCase();
    if (s === "paid" || s === "completed" || s === "active") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
          {statusStr}
        </span>
      );
    }
    if (s === "sent" || s === "scheduled" || s === "read") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
          {statusStr}
        </span>
      );
    }
    if (s === "overdue" || s === "failed" || s === "cancelled") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
          {statusStr}
        </span>
      );
    }
    if (s === "pending" || s === "partial" || s === "draft") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          {statusStr}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {String(statusStr)}
      </span>
    );
  };

  const handleAddConditionInPanel = () => {
    const defaultField = columnsToDisplay[0] || "status";
    setActiveConditions([
      ...activeConditions,
      {
        id: `panel-f-${Date.now()}`,
        field: defaultField,
        operator: "equals",
        value: "",
        logic: "AND",
      },
    ]);
  };

  const handleRemoveConditionInPanel = (id: string) => {
    setActiveConditions(activeConditions.filter((c) => c.id !== id));
  };

  const handleResetFilters = () => {
    setActiveDateRange(report?.reportingPeriod?.type || "all");
    setActiveMatchType(report?.filterConditions?.matchType || "AND");
    setActiveConditions(
      report?.filterConditions?.conditions
        ? report.filterConditions.conditions.map((c) => ({
            ...c,
            logic: c.logic || report.filterConditions?.matchType || "AND",
          }))
        : []
    );
    toast.info("Filters reset to default");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center justify-between pr-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {report.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                  {report.dataSource}
                </span>
                {report.sharedWith && report.sharedWith.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    Shared ({report.sharedWith.length})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.description || `Live records from ${report.dataSource.toUpperCase()} data source`}
              </p>
            </div>
          </div>

          {/* Filter Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isFilterPanelOpen || activeConditions.length > 0
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeConditions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] flex items-center justify-center font-bold">
                {activeConditions.length}
              </span>
            )}
          </button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Showing <strong>{sortedRows.length}</strong> of {rawRows.length} records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Download className="w-4 h-4" /> Export CSV Dataset
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="relative">
        <div className="space-y-6 max-h-[76vh] overflow-y-auto pr-1">
          {/* Calculated Field Aggregations Summary Cards */}
          {calculatedAggregations.length > 0 && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
                Calculated Metrics ({calculatedAggregations.length})
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {calculatedAggregations.map((agg, idx) => (
                  <div key={idx} className="p-3 bg-white border border-blue-200 rounded-xl space-y-1 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 block truncate">
                      {agg.label}
                    </span>
                    <span className="text-lg font-bold text-blue-700 block" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {agg.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visual Performance Chart (if showChart !== false) */}
          {report.showChart !== false && dynamicChartData.chart.length > 0 && (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Visual Distribution ({report.chartType === "line" ? "Line Trend" : report.chartType === "pie" ? "Category Breakdown" : "Bar Comparison"})
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Computed live from active filtered dataset</span>
              </div>

              <div className="grid grid-cols-12 gap-6 items-center">
                <div className={report.chartType === "pie" ? "col-span-12" : "col-span-12"}>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {report.chartType === "line" ? (
                        <LineChart data={dynamicChartData.chart} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                          <Line type="monotone" dataKey="total" name="Total" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6" }} />
                          <Line type="monotone" dataKey="count" name="Count" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        </LineChart>
                      ) : report.chartType === "pie" ? (
                        <BarChart data={dynamicChartData.chart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                          <Bar dataKey="count" name="Record Count" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        </BarChart>
                      ) : (
                        <BarChart data={dynamicChartData.chart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                          <Bar dataKey="total" name="Metric Total" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                          <Bar dataKey="count" name="Record Count" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Data Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-slate-500" /> Data Records ({sortedRows.length} rows)
              </span>
              {report.sortBy?.field && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Sorted by <strong>{report.sortBy.field}</strong> ({report.sortBy.direction.toUpperCase()})
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {sortedRows.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No records match the configured filter criteria</p>
                  <p className="text-[11px] text-slate-400">
                    Try adjusting the filter conditions or period in the Filters panel.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      {columnsToDisplay.map((head) => (
                        <th key={head} className="py-3 px-4">
                          {head.replace(/([A-Z])/g, " $1").toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {sortedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {columnsToDisplay.map((colKey) => {
                          const val = row[colKey];
                          return (
                            <td key={colKey} className="py-3 px-4">
                              {colKey === "status" ? (
                                getStatusBadge(val)
                              ) : colKey === "id" ? (
                                <span className="font-bold text-blue-600">{val}</span>
                              ) : colKey === "amount" || colKey === "cost" || colKey === "value" ? (
                                <span className="font-bold text-slate-900">
                                  {typeof val === "number" ? `$${val.toFixed(2)}` : val}
                                </span>
                              ) : colKey === "timeInStage" ? (
                                <span className="font-bold text-blue-700">{val} days</span>
                              ) : (
                                String(val ?? "")
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Right-Side Filter Panel (Section 3g) */}
        {isFilterPanelOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-2xl p-5 z-20 flex flex-col space-y-4 rounded-r-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">Filter Dataset</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Reporting Period
              </label>
              <select
                value={activeDateRange}
                onChange={(e) => setActiveDateRange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="this_week">Last 7 Days / This Week</option>
                <option value="this_month">Last 30 Days / This Month</option>
                <option value="last_month">Last 90 Days / Last Quarter</option>
              </select>
            </div>

            {/* Match Type */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Condition Logic
              </label>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMatchType("AND");
                    setActiveConditions((prev) =>
                      prev.map((c) => ({ ...c, logic: "AND" }))
                    );
                  }}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeMatchType === "AND" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  AND (All Match)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMatchType("OR");
                    setActiveConditions((prev) =>
                      prev.map((c) => ({ ...c, logic: "OR" }))
                    );
                  }}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeMatchType === "OR" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                >
                  OR (Any Match)
                </button>
              </div>
            </div>

            {/* Conditions List */}
            <div className="space-y-2 flex-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Field Conditions ({activeConditions.length})
              </label>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {activeConditions.map((cond, idx) => (
                  <div key={cond.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                        {idx === 0 ? (
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px] uppercase flex-shrink-0">
                            WHERE
                          </span>
                        ) : (
                          <div className="flex items-center bg-slate-200/80 rounded p-0.5 border border-slate-300 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveConditions(
                                  activeConditions.map((c) =>
                                    c.id === cond.id ? { ...c, logic: "AND" } : c
                                  )
                                )
                              }
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                                (cond.logic || activeMatchType || "AND") === "AND"
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              AND
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActiveConditions(
                                  activeConditions.map((c) =>
                                    c.id === cond.id ? { ...c, logic: "OR" } : c
                                  )
                                )
                              }
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                                cond.logic === "OR"
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              OR
                            </button>
                          </div>
                        )}
                        <select
                          value={cond.field}
                          onChange={(e) =>
                            setActiveConditions(
                              activeConditions.map((c) =>
                                c.id === cond.id ? { ...c, field: e.target.value } : c
                              )
                            )
                          }
                          className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg font-bold text-xs truncate"
                        >
                          {columnsToDisplay.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveConditionInPanel(cond.id)}
                        className="text-slate-400 hover:text-rose-600 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          setActiveConditions(
                            activeConditions.map((c) =>
                              c.id === cond.id ? { ...c, operator: e.target.value as any } : c
                            )
                          )
                        }
                        className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                      >
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="gt">gt (&gt;)</option>
                        <option value="lt">lt (&lt;)</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Value..."
                        value={cond.value}
                        onChange={(e) =>
                          setActiveConditions(
                            activeConditions.map((c) =>
                              c.id === cond.id ? { ...c, value: e.target.value } : c
                            )
                          )
                        }
                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddConditionInPanel}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </button>
            </div>

            {/* Panel Actions */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsFilterPanelOpen(false);
                  toast.success("Filters applied!");
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
