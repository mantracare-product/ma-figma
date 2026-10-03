import React, { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "../ui/Modal";
import { ReportDataSource, ReportDefinition, ReportMetric } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import {
  DATA_SOURCE_METADATA,
  FieldMetadata,
  filterReportRows,
  aggregateChartData,
  getFieldLabel,
  CHART_PALETTE,
} from "../../../lib/reportEngine";
import { toast } from "sonner";
import {
  BarChart3,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Sparkles,
  ArrowUpDown,
  Filter,
  Calendar,
  Layers,
  X,
  PieChart,
  LineChart,
  Search,
  ArrowUp,
  ArrowDown,
  Eye,
  Clock,
  Phone,
  GitBranch,
  DollarSign,
  ChevronDown,
  Activity,
  Sliders,
  Table as TableIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (report: ReportDefinition) => void;
  initialReport?: ReportDefinition | null;
}

export default function CustomReportBuilderModal({
  isOpen,
  onClose,
  onSaved,
  initialReport,
}: CustomReportBuilderModalProps) {
  const { saveReport, getReportRows } = useInvoices();
  const { getAllFields } = useFieldRegistry();

  const [step, setStep] = useState<1 | 2>(1);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState<ReportDataSource>("calls");

  // Selected Columns list
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldCalculations, setFieldCalculations] = useState<
    Record<string, "sum" | "avg" | "count" | "min" | "max">
  >({});
  const [percentTotals, setPercentTotals] = useState<Record<string, boolean>>({});

  // Searchable column dropdown / popover state
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Section 1: Reporting Period
  const [periodType, setPeriodType] = useState<
    "this_month" | "last_month" | "this_week" | "custom" | "all" | "today"
  >("all");
  const [customDays, setCustomDays] = useState<number>(30);

  // Section 3: Sort By
  const [sortByField, setSortByField] = useState("");
  const [sortByDir, setSortByDir] = useState<"asc" | "desc">("desc");

  // Section 4: Filter Conditions
  const [matchType, setMatchType] = useState<"AND" | "OR">("AND");
  const [filterConditions, setFilterConditions] = useState<
    Array<{
      id: string;
      field: string;
      operator: "equals" | "contains" | "gt" | "lt" | "between";
      value: string;
      val2?: string;
      logic?: "AND" | "OR";
    }>
  >([]);

  // Section 5: Visual Chart Summary (X vs Y Graph Builder)
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "stacked_bar" | "line" | "pie">("bar");
  
  // X-Axis (Horizontal Dimension)
  const [xAxisField, setXAxisField] = useState("timeOfDay");
  const [timeGrouping, setTimeGrouping] = useState<"none" | "day" | "dayOfWeek" | "month">("none");
  
  // Y-Axis (Vertical Metric / Actual Data)
  const [yAxisMode, setYAxisMode] = useState<"count" | "field">("count");
  const [yAxisField, setYAxisField] = useState<string>("");
  const [yAxisAggregation, setYAxisAggregation] = useState<"sum" | "avg" | "min" | "max">("sum");
  
  // Secondary Breakdown (Legend / Series for Stacked Bar / Multi-Series)
  const [breakdownBy, setBreakdownBy] = useState("none");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFieldDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-fill state when initialReport changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        setReportName(initialReport.name);
        setReportDescription(initialReport.description || "");
        setDataSource(initialReport.dataSource || "calls");
        setSelectedFields(
          initialReport.selectedFields && initialReport.selectedFields.length > 0
            ? initialReport.selectedFields
            : (DATA_SOURCE_METADATA[initialReport.dataSource || "calls"]?.fields.slice(0, 6).map((f) => f.key) || [])
        );
        setFieldCalculations(initialReport.fieldCalculations || {});
        setPeriodType((initialReport.reportingPeriod?.type as any) || "all");
        setCustomDays(initialReport.reportingPeriod?.customDays || 30);
        setSortByField(initialReport.sortBy?.field || "");
        setSortByDir(initialReport.sortBy?.direction || "desc");
        setFilterConditions(
          (initialReport.filterConditions?.conditions || []).map((c) => {
            const isBetween = c.operator === "between";
            const parts = isBetween ? String(c.value).split(",") : [c.value];
            return {
              ...c,
              value: parts[0] ? parts[0].trim() : c.value,
              val2: parts[1] ? parts[1].trim() : "",
              logic: c.logic || "AND",
            };
          })
        );
        setShowChart(initialReport.showChart !== false && initialReport.chartType !== "table_only");
        setChartType((initialReport.chartType as any) || "bar");
        setXAxisField(initialReport.groupBy || "timeOfDay");
        setTimeGrouping((initialReport.timeGrouping as any) || "none");
        setBreakdownBy(initialReport.breakdownBy || "none");
        
        if (initialReport.yAxisMode) {
          setYAxisMode(initialReport.yAxisMode);
        } else if (initialReport.metric?.field) {
          setYAxisMode("field");
        } else {
          setYAxisMode("count");
        }
        setYAxisField(initialReport.metric?.field || "");
        setYAxisAggregation((initialReport.metric?.aggregation as any) || "sum");

        setStep(2);
      } else {
        setStep(1);
        setReportName("");
        setReportDescription("");
        setDataSource("calls");
        setSelectedFields(DATA_SOURCE_METADATA.calls.fields.slice(0, 6).map((f) => f.key));
        setFieldCalculations({});
        setPercentTotals({});
        setPeriodType("all");
        setCustomDays(30);
        setSortByField("id");
        setSortByDir("desc");
        setFilterConditions([]);
        setShowChart(true);
        setChartType("bar");
        setXAxisField("timeOfDay");
        setTimeGrouping("none");
        setBreakdownBy("none");
        setYAxisMode("count");
        setYAxisField("");
        setYAxisAggregation("sum");
      }
      setIsFieldDropdownOpen(false);
      setFieldSearchQuery("");
    }
  }, [isOpen, initialReport]);

  // When data source is chosen in step 1
  const handleSelectDataSource = (src: ReportDataSource) => {
    setDataSource(src);
    const meta = DATA_SOURCE_METADATA[src];
    const defFields = meta.fields.slice(0, 6).map((f) => f.key);
    setSelectedFields(defFields);
    setFieldCalculations({});
    setSortByField(defFields[0] || "id");
    setBreakdownBy("none");

    if (src === "calls") {
      setXAxisField("timeOfDay");
      setYAxisMode("count");
      setYAxisField("");
    } else if (src === "appointments") {
      setXAxisField("dayOfWeek");
      setBreakdownBy("service");
      setYAxisMode("count");
      setYAxisField("");
    } else if (src === "processes") {
      setXAxisField("process");
      setYAxisMode("count");
      setYAxisField("");
    } else if (src === "clients") {
      setXAxisField("client");
      setYAxisMode("field");
      setYAxisField("appointmentsCount");
      setYAxisAggregation("sum");
    } else if (src === "revenue") {
      setXAxisField("status");
      setYAxisMode("field");
      setYAxisField("amount");
      setYAxisAggregation("sum");
    } else {
      setXAxisField("status");
      setYAxisMode("count");
      setYAxisField("");
    }

    setStep(2);
  };

  // Metadata for current data source
  const sourceMeta = DATA_SOURCE_METADATA[dataSource];
  const allSourceFields = sourceMeta?.fields || [];
  const numericFields = allSourceFields.filter(
    (f) => f.type === "number" || f.type === "currency" || f.key === "duration" || f.key === "appointmentsCount" || f.key === "callsCount"
  );

  // Available functions for a field in the table
  const getCalcOptionsForField = (fieldKey: string) => {
    const fMeta = allSourceFields.find((f) => f.key === fieldKey);
    if (fMeta?.type === "number" || fMeta?.type === "currency" || fieldKey === "duration" || fieldKey === "timeInStage" || fieldKey === "appointmentsCount") {
      return [
        { id: "sum", label: "Total (Sum)" },
        { id: "avg", label: "Average" },
        { id: "count", label: "Count" },
        { id: "min", label: "Minimum" },
        { id: "max", label: "Maximum" },
      ];
    }
    return [{ id: "count", label: "Count" }];
  };

  // Reordering helpers
  const handleMoveField = (index: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= selectedFields.length) return;
    const updated = [...selectedFields];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setSelectedFields(updated);
  };

  const handleRemoveField = (fieldKey: string) => {
    if (selectedFields.length <= 1) {
      toast.error("Report must have at least one column");
      return;
    }
    setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
    const nextCalcs = { ...fieldCalculations };
    delete nextCalcs[fieldKey];
    setFieldCalculations(nextCalcs);
  };

  const handleAddFieldFromDropdown = (fieldKey: string) => {
    if (!selectedFields.includes(fieldKey)) {
      setSelectedFields([...selectedFields, fieldKey]);
      toast.success(`Column added: ${fieldKey}`);
    } else {
      toast.info(`Column "${fieldKey}" is already in table`);
    }
    setIsFieldDropdownOpen(false);
    setFieldSearchQuery("");
  };

  // Quick Filter Presets
  const handleApplyFilterPreset = (preset: { field: string; operator: "equals" | "between"; value: string; val2?: string }) => {
    const newCond = {
      id: `preset-${Date.now()}`,
      field: preset.field,
      operator: preset.operator,
      value: preset.value,
      val2: preset.val2 || "",
      logic: "AND" as const,
    };
    setFilterConditions([...filterConditions, newCond]);
    toast.success(`Filter added: ${preset.field} ${preset.operator} ${preset.value}${preset.val2 ? `..${preset.val2}` : ""}`);
  };

  // Format filter conditions for filtering engine (joining val1 and val2 for between)
  const preparedFilterConditions = useMemo(() => {
    return filterConditions.map((c) => ({
      id: c.id,
      field: c.field,
      operator: c.operator,
      value: c.operator === "between" && c.val2 ? `${c.value}, ${c.val2}` : c.value,
      logic: c.logic || "AND",
    }));
  }, [filterConditions]);

  // Real-time data & live preview computation
  const rawRows = useMemo(() => {
    return getReportRows(dataSource) || [];
  }, [dataSource, getReportRows]);

  const filteredRows = useMemo(() => {
    return filterReportRows(
      rawRows,
      { type: periodType },
      { conditions: preparedFilterConditions, matchType }
    );
  }, [rawRows, periodType, preparedFilterConditions, matchType]);

  // Current metric based on Y-Axis selection
  const currentMetric: ReportMetric = useMemo(() => {
    if (yAxisMode === "field" && yAxisField) {
      const fieldMeta = allSourceFields.find((f) => f.key === yAxisField);
      const fLabel = fieldMeta?.label || yAxisField;
      const aggLabel = yAxisAggregation === "sum" ? "Total" : yAxisAggregation.toUpperCase();
      return {
        aggregation: yAxisAggregation,
        field: yAxisField,
        label: `${aggLabel} of ${fLabel}`,
      };
    }
    return {
      aggregation: "count",
      label: "Count of Records",
    };
  }, [yAxisMode, yAxisField, yAxisAggregation, allSourceFields]);

  // Derived X-Axis and Y-Axis human-readable key labels
  const xAxisLabel = useMemo(() => {
    const fMeta = allSourceFields.find((f) => f.key === xAxisField);
    return fMeta?.label || getFieldLabel(xAxisField);
  }, [xAxisField, allSourceFields]);

  const yAxisLabel = useMemo(() => {
    if (yAxisMode === "field" && yAxisField) {
      const fMeta = allSourceFields.find((f) => f.key === yAxisField);
      const aggName = yAxisAggregation === "sum" ? "Total" : yAxisAggregation === "avg" ? "Avg" : yAxisAggregation.toUpperCase();
      return `${aggName} ${fMeta?.label || yAxisField}`;
    }
    return dataSource === "calls"
      ? "Number of Calls"
      : dataSource === "appointments"
      ? "Number of Appointments"
      : dataSource === "processes"
      ? "Active Clients"
      : dataSource === "clients"
      ? "Number of Clients"
      : "Record Count";
  }, [yAxisMode, yAxisField, yAxisAggregation, allSourceFields, dataSource]);

  const seriesBreakdownLabel = useMemo(() => {
    if (breakdownBy === "none") return null;
    const fMeta = allSourceFields.find((f) => f.key === breakdownBy);
    return fMeta?.label || getFieldLabel(breakdownBy);
  }, [breakdownBy, allSourceFields]);

  // Mini preview aggregation
  const previewAggregation = useMemo(() => {
    return aggregateChartData(filteredRows, {
      groupBy: xAxisField,
      timeGrouping,
      breakdownBy,
      metric: currentMetric,
      xAxisLabel,
      yAxisLabel,
    });
  }, [filteredRows, xAxisField, timeGrouping, breakdownBy, currentMetric, xAxisLabel, yAxisLabel]);

  // Save Report Handler
  const handleSave = () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    const created = saveReport({
      id: initialReport?.type === "custom" ? initialReport.id : undefined,
      name: reportName.trim(),
      description: reportDescription.trim() || undefined,
      type: "custom",
      dataSource,
      selectedFields,
      fieldCalculations,
      reportingPeriod: {
        type: periodType as any,
        customDays: periodType === "custom" ? customDays : undefined,
      },
      sortBy: {
        field: sortByField || selectedFields[0] || "id",
        direction: sortByDir,
      },
      filterConditions: {
        matchType,
        conditions: preparedFilterConditions,
      },
      showChart,
      chartType: showChart ? chartType : undefined,
      groupBy: xAxisField,
      timeGrouping,
      breakdownBy,
      metric: currentMetric,
      xAxisLabel,
      yAxisLabel,
      yAxisMode,
      viewType: showChart ? "table_chart" : "table",
    });

    toast.success(`Report "${created.name}" saved!`);
    onSaved(created);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center justify-between w-full pr-6" style={{ fontFamily: "Outfit, sans-serif" }}>
          <div>
            <h3 className="text-base font-bold text-slate-900">Create Report</h3>
            {/* Step Breadcrumb matching Screenshot 3: (1) Data Source (CALLS) -> (2) Fields & Rules */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className={`flex items-center gap-1 font-semibold ${step === 1 ? "text-blue-600 font-bold" : "text-emerald-700"}`}>
                {step > 1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>}
                Data Source ({dataSource.toUpperCase()})
              </span>
              <span>→</span>
              <span className={`flex items-center gap-1 font-semibold ${step === 2 ? "text-blue-600 font-bold" : "text-slate-400"}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                Fields & Rules
              </span>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              ← Back to Data Source
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
              >
                Next: Fields & Rules <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Save Report
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="max-h-[76vh] overflow-y-auto pr-1" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── STEP 1: DATA SOURCE SELECTION ───────────────────────────────── */}
        {step === 1 && (
          <div className="py-2 space-y-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Primary Operational Data Source:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "calls", name: "Calls & Telephony", desc: "Inbound/outbound call metrics, durations, shifts & sentiment", icon: Phone },
                { id: "appointments", name: "Appointments & Visits", desc: "Scheduled visits, clinical services, doctor workloads & cancellations", icon: Calendar },
                { id: "processes", name: "Processes & Deals", desc: "Patient intake, insurance verification, active stages & velocity", icon: GitBranch },
                { id: "clients", name: "Clients & Registry", desc: "Patient conversion, demographics, spend & appointment counts", icon: Users },
                { id: "revenue", name: "Revenue & Invoicing", desc: "Invoices, paid settlements, payment modes & balances", icon: DollarSign },
                { id: "team", name: "Team & Staff", desc: "Agent productivity, appointments handled & ratings", icon: Sparkles },
              ].map((ds) => {
                const Icon = ds.icon;
                const isSelected = dataSource === ds.id;
                return (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => handleSelectDataSource(ds.id as any)}
                    className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{ds.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-500 pl-10.5">{ds.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: FIELDS & RULES (Matching Screenshot 3 UI) ───────────── */}
        {step === 2 && (
          <div className="space-y-6 py-1">
            {/* Top Inputs: Report Name & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g. Monthly Calls Breakdown"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Brief description of this report"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 1. REPORTING PERIOD */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" /> 1. Reporting Period
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Period Selection
                  </label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_week">This Week (Last 7 Days)</option>
                    <option value="today">Today</option>
                    <option value="all">All Available Records</option>
                    <option value="custom">Custom (Last X Days)</option>
                  </select>
                </div>

                {periodType === "custom" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Number of Days
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 2. COLUMNS TABLE & REPLACED SEARCHABLE FIELD PICKER */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" /> 2. Columns & Per-Field Aggregations
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {selectedFields.length} active columns in report
                  </span>
                </div>
              </div>

              {/* Table matching Screenshot 3: ORDER | COLUMN / CUSTOM NAME | CALCULATE | CALCULATION TYPE | % TOTAL | ACTION */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#1E293B] text-white">
                    <tr className="h-8">
                      <th className="py-1 px-3 w-16 text-center font-semibold text-[10px] uppercase tracking-wider">ORDER</th>
                      <th className="py-1 px-3 font-semibold text-[10px] uppercase tracking-wider">COLUMN / CUSTOM NAME</th>
                      <th className="py-1 px-3 text-center w-24 font-semibold text-[10px] uppercase tracking-wider">CALCULATE</th>
                      <th className="py-1 px-3 w-40 font-semibold text-[10px] uppercase tracking-wider">CALCULATION TYPE</th>
                      <th className="py-1 px-3 text-center w-20 font-semibold text-[10px] uppercase tracking-wider">% TOTAL</th>
                      <th className="py-1 px-3 text-center w-16 font-semibold text-[10px] uppercase tracking-wider">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedFields.map((fieldKey, idx) => {
                      const fMeta = allSourceFields.find((f) => f.key === fieldKey);
                      const label = fMeta?.label || getFieldLabel(fieldKey);
                      const isCalcActive = Boolean(fieldCalculations[fieldKey]);
                      const calcOptions = getCalcOptionsForField(fieldKey);

                      return (
                        <tr key={fieldKey} className="h-9 hover:bg-slate-50/70 transition-colors">
                          {/* ORDER REORDERING */}
                          <td className="py-1 px-3 text-center">
                            <div className="flex items-center justify-center gap-0.5 text-slate-400">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveField(idx, "up")}
                                className="p-0.5 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === selectedFields.length - 1}
                                onClick={() => handleMoveField(idx, "down")}
                                className="p-0.5 hover:text-slate-800 disabled:opacity-20 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* COLUMN NAME */}
                          <td className="py-1 px-3">
                            <span className="font-semibold text-slate-800">
                              {label}
                            </span>
                            {fMeta?.category === "custom" && (
                              <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                Custom
                              </span>
                            )}
                          </td>

                          {/* CALCULATE CHECKBOX */}
                          <td className="py-1 px-3 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isCalcActive}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFieldCalculations({
                                      ...fieldCalculations,
                                      [fieldKey]: calcOptions[0]?.id as any || "count",
                                    });
                                  } else {
                                    const next = { ...fieldCalculations };
                                    delete next[fieldKey];
                                    setFieldCalculations(next);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-[11px] text-slate-600">Calculate</span>
                            </label>
                          </td>

                          {/* CALCULATION TYPE */}
                          <td className="py-1 px-3">
                            {isCalcActive ? (
                              <select
                                value={fieldCalculations[fieldKey] || ""}
                                onChange={(e) =>
                                  setFieldCalculations({
                                    ...fieldCalculations,
                                    [fieldKey]: e.target.value as any,
                                  })
                                }
                                className="w-full px-2 py-1 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-bold text-blue-700 focus:outline-none"
                              >
                                {calcOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400 text-xs italic">None</span>
                            )}
                          </td>

                          {/* % TOTAL */}
                          <td className="py-1 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(percentTotals[fieldKey])}
                              onChange={(e) =>
                                setPercentTotals({ ...percentTotals, [fieldKey]: e.target.checked })
                              }
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>

                          {/* ACTION (DELETE) */}
                          <td className="py-1 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveField(fieldKey)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── SEARCHABLE FIELD PICKER ────────── */}
              <div className="relative pt-1" ref={dropdownRef}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-xl text-xs text-left font-medium text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="text-slate-500">Select a field to add...</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isFieldDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFieldDropdownOpen(true)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Column
                  </button>
                </div>

                {/* Popover Dropdown with Search & Categorized Sections */}
                {isFieldDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-3 max-h-72 overflow-y-auto">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fieldSearchQuery}
                        onChange={(e) => setFieldSearchQuery(e.target.value)}
                        placeholder="Search field name or category..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Section: Standard Fields */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block px-1">
                        📌 Standard {dataSource.toUpperCase()} Fields
                      </span>
                      {allSourceFields
                        .filter(
                          (f) =>
                            f.category !== "custom" &&
                            (f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase()) ||
                              f.key.toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                        )
                        .map((f) => (
                          <div
                            key={f.key}
                            onClick={() => handleAddFieldFromDropdown(f.key)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                          >
                            <span className="font-semibold text-slate-800">+ {f.label}</span>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {f.type}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Section: Custom Registry Fields */}
                    {allSourceFields.some((f) => f.category === "custom") && (
                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block px-1">
                          🏷️ Custom Registry Fields
                        </span>
                        {allSourceFields
                          .filter(
                            (f) =>
                              f.category === "custom" &&
                              (f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase()) ||
                                f.key.toLowerCase().includes(fieldSearchQuery.toLowerCase()))
                          )
                          .map((f) => (
                            <div
                              key={f.key}
                              onClick={() => handleAddFieldFromDropdown(f.key)}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 cursor-pointer text-xs transition-colors"
                            >
                              <span className="font-semibold text-slate-800">+ {f.label}</span>
                              <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                                custom ({f.type})
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. SORT BY COLUMN */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-blue-600" /> 3. Sort by Column
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sort Column
                  </label>
                  <select
                    value={sortByField}
                    onChange={(e) => setSortByField(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectedFields.map((fKey) => {
                      const fMeta = allSourceFields.find((f) => f.key === fKey);
                      return (
                        <option key={fKey} value={fKey}>
                          {fMeta?.label || getFieldLabel(fKey)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Direction
                  </label>
                  <select
                    value={sortByDir}
                    onChange={(e) => setSortByDir(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Descending (High to Low / Z to A)</option>
                    <option value="asc">Ascending (Low to High / A to Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. FILTER CONDITIONS (With Range / Between and Preset Shortcuts) */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-blue-600" /> 4. Filter Conditions
                  </span>
                  <p className="text-[11px] text-slate-500">Record-level filtering rules (shifts, durations, statuses, dates)</p>
                </div>

                {/* Quick 1-Click Filter Shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dataSource === "calls" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApplyFilterPreset({ field: "timeOfDay", operator: "equals", value: "Working Hours (9AM - 6PM)" })}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        + Working Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyFilterPreset({ field: "duration", operator: "between", value: "60", val2: "120" })}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        + 1–2 Min Calls
                      </button>
                    </>
                  )}
                  {dataSource === "appointments" && (
                    <button
                      type="button"
                      onClick={() => handleApplyFilterPreset({ field: "status", operator: "equals", value: "Completed" })}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      + Completed Only
                    </button>
                  )}
                  {dataSource === "processes" && (
                    <button
                      type="button"
                      onClick={() => handleApplyFilterPreset({ field: "status", operator: "equals", value: "Pending" })}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      + Active Deals
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {filterConditions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1">
                    No filter conditions applied. All matching records will be included.
                  </p>
                ) : (
                  filterConditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="flex items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-xl text-xs shadow-2xs flex-wrap"
                    >
                      {/* Left-edge connector pill */}
                      <div className="w-16 flex-shrink-0 flex items-center justify-center">
                        {idx === 0 ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px] uppercase">
                            WHERE
                          </span>
                        ) : (
                          <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setFilterConditions(
                                  filterConditions.map((fc) =>
                                    fc.id === cond.id ? { ...fc, logic: "AND" } : fc
                                  )
                                )
                              }
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                (cond.logic || "AND") === "AND"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-500"
                              }`}
                            >
                              AND
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setFilterConditions(
                                  filterConditions.map((fc) =>
                                    fc.id === cond.id ? { ...fc, logic: "OR" } : fc
                                  )
                                )
                              }
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                cond.logic === "OR"
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-500"
                              }`}
                            >
                              OR
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Field */}
                      <select
                        value={cond.field}
                        onChange={(e) =>
                          setFilterConditions(
                            filterConditions.map((fc) =>
                              fc.id === cond.id ? { ...fc, field: e.target.value } : fc
                            )
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      >
                        {allSourceFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={cond.operator}
                        onChange={(e) =>
                          setFilterConditions(
                            filterConditions.map((fc) =>
                              fc.id === cond.id ? { ...fc, operator: e.target.value as any } : fc
                            )
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                      >
                        <option value="equals">equals</option>
                        <option value="between">is between (range)</option>
                        <option value="contains">contains</option>
                        <option value="gt">is greater than (&gt;)</option>
                        <option value="lt">is less than (&lt;)</option>
                      </select>

                      {/* Value Input(s) */}
                      {cond.operator === "between" ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                          <input
                            type="text"
                            value={cond.value}
                            onChange={(e) =>
                              setFilterConditions(
                                filterConditions.map((fc) =>
                                  fc.id === cond.id ? { ...fc, value: e.target.value } : fc
                                )
                              )
                            }
                            placeholder="Min (e.g. 60)"
                            className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[11px] text-slate-400 font-semibold">to</span>
                          <input
                            type="text"
                            value={cond.val2 || ""}
                            onChange={(e) =>
                              setFilterConditions(
                                filterConditions.map((fc) =>
                                  fc.id === cond.id ? { ...fc, val2: e.target.value } : fc
                                )
                              )
                            }
                            placeholder="Max (e.g. 120)"
                            className="w-1/2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) =>
                            setFilterConditions(
                              filterConditions.map((fc) =>
                                fc.id === cond.id ? { ...fc, value: e.target.value } : fc
                              )
                            )
                          }
                          placeholder="Filter value..."
                          className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setFilterConditions(filterConditions.filter((fc) => fc.id !== cond.id))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove condition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() =>
                    setFilterConditions([
                      ...filterConditions,
                      {
                        id: `f-${Date.now()}`,
                        field: allSourceFields[0]?.key || "status",
                        operator: "equals",
                        value: "",
                        val2: "",
                        logic: "AND",
                      },
                    ])
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Condition Row
                </button>
              </div>
            </div>

            {/* 5. VISUAL CHART SUMMARY (X vs Y Graph Builder with Clear Keys) */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> 5. Visual Chart Summary (X vs Y Graph)
                  </span>
                  <p className="text-[11px] text-slate-500">Configure horizontal and vertical axes with explicit data keys & labels</p>
                </div>
              </div>

              {/* Checkbox: Render Visual Chart on Report */}
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <input
                  type="checkbox"
                  checked={showChart}
                  onChange={(e) => setShowChart(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Render Visual Chart on Report
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Display dynamic graphical overview with X-Axis & Y-Axis labels above data table
                  </span>
                </div>
              </label>

              {showChart && (
                <div className="space-y-4 pt-1">
                  {/* Chart Type Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "bar", label: "Bar Chart", desc: "Totals & Comparisons", icon: BarChart3 },
                      { id: "stacked_bar", label: "Stacked Bar", desc: "Multi-Series Breakdown", icon: Layers },
                      { id: "line", label: "Line Chart", desc: "Trend Over Time", icon: LineChart },
                      { id: "pie", label: "Pie / Donut", desc: "Category Distribution", icon: PieChart },
                    ].map((ct) => {
                      const Icon = ct.icon;
                      const isSelected = chartType === ct.id;
                      return (
                        <div
                          key={ct.id}
                          onClick={() => setChartType(ct.id as any)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-2xs"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="font-bold text-xs text-slate-900">{ct.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">{ct.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── EXPLICIT X vs Y AXIS SELECTION CARDS ────────────────── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-2xs">
                    {/* CARD 1: X-AXIS (Horizontal Dimension) */}
                    <div className="space-y-2 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-blue-600" />
                          X-Axis Dimension
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                          HORIZONTAL
                        </span>
                      </div>

                      <select
                        value={xAxisField}
                        onChange={(e) => setXAxisField(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {allSourceFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label} ({f.type})
                          </option>
                        ))}
                      </select>

                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Axis Key: <strong className="text-slate-800">{xAxisLabel}</strong>
                      </div>

                      {/* Date Interval selection if date field */}
                      {(xAxisField === "date" || xAxisField === "created") && (
                        <div className="flex items-center gap-1 text-[10px] pt-1">
                          <span className="text-slate-400 font-semibold">Interval:</span>
                          {[
                            { id: "dayOfWeek", label: "Day of Week" },
                            { id: "day", label: "Exact Date" },
                            { id: "month", label: "Month" },
                          ].map((int) => (
                            <button
                              key={int.id}
                              type="button"
                              onClick={() => setTimeGrouping(int.id as any)}
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                timeGrouping === int.id
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-slate-200 text-slate-600"
                              }`}
                            >
                              {int.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CARD 2: Y-AXIS (Vertical Metric / Actual Data) */}
                    <div className="space-y-2 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          Y-Axis Metric / Data
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                          VERTICAL
                        </span>
                      </div>

                      {/* Mode Choice: Count vs Actual Data Field */}
                      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setYAxisMode("count");
                            setYAxisField("");
                          }}
                          className={`py-1 rounded font-bold transition-colors ${
                            yAxisMode === "count"
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Record Count
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setYAxisMode("field");
                            if (!yAxisField && numericFields.length > 0) {
                              setYAxisField(numericFields[0].key);
                            }
                          }}
                          className={`py-1 rounded font-bold transition-colors ${
                            yAxisMode === "field"
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Data Field
                        </button>
                      </div>

                      {/* If Actual Data Field selected, show field and aggregation dropdowns */}
                      {yAxisMode === "field" ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <select
                            value={yAxisField}
                            onChange={(e) => setYAxisField(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                          >
                            {numericFields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={yAxisAggregation}
                            onChange={(e) => setYAxisAggregation(e.target.value as any)}
                            className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 focus:outline-none"
                          >
                            <option value="sum">Sum</option>
                            <option value="avg">Avg</option>
                            <option value="max">Max</option>
                            <option value="min">Min</option>
                          </select>
                        </div>
                      ) : (
                        <div className="py-1 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
                          Count volume of records per {xAxisLabel}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Axis Key: <strong className="text-emerald-700">{yAxisLabel}</strong>
                      </div>
                    </div>

                    {/* CARD 3: SECONDARY BREAKDOWN (Stack / Series Legend) */}
                    <div className="space-y-2 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          Breakdown (Series / Legend)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          OPTIONAL
                        </span>
                      </div>

                      <select
                        value={breakdownBy}
                        onChange={(e) => setBreakdownBy(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="none">-- None (Single Series) --</option>
                        {allSourceFields
                          .filter((f) => f.key !== xAxisField && (f.type === "string" || f.type === "status"))
                          .map((f) => (
                            <option key={f.key} value={f.key}>
                              Breakdown by: {f.label}
                            </option>
                          ))}
                      </select>

                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Series Key:{" "}
                        <strong className="text-purple-700">
                          {seriesBreakdownLabel ? seriesBreakdownLabel : "None (Single Metric)"}
                        </strong>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Used for multi-bar comparisons (e.g. Appointment Type vs Day of Week)
                      </p>
                    </div>
                  </div>

                  {/* ── REAL-TIME LIVE CHART PREVIEW WITH EXPLICIT AXIS KEYS & LEGENDS ── */}
                  <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Live Graph Preview
                        </span>
                        <span className="text-xs text-slate-400">
                          ({previewAggregation.chartData.length} categories · {previewAggregation.totalRecords} records)
                        </span>
                      </div>

                      {/* Graph Keys Indicator Bar */}
                      <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-bold">
                          X: {xAxisLabel}
                        </span>
                        <span className="text-slate-300">vs</span>
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md font-bold">
                          Y: {yAxisLabel}
                        </span>
                        {seriesBreakdownLabel && (
                          <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-md font-bold">
                            Series: {seriesBreakdownLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-56 w-full pt-1">
                      {previewAggregation.chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          No matching records for live preview. Check filter conditions.
                        </div>
                      ) : chartType === "pie" ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                            <Pie
                              data={previewAggregation.chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                            >
                              {previewAggregation.chartData.map((_, i) => (
                                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : chartType === "line" ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={previewAggregation.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: "#64748B" }}
                              label={{ value: xAxisLabel, position: "insideBottom", offset: -15, fill: "#334155", fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#64748B" }}
                              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -2, fill: "#334155", fontSize: 11, fontWeight: 700 }}
                            />
                            <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                            {previewAggregation.seriesKeys.map((k, i) => (
                              <Line
                                key={k}
                                type="monotone"
                                dataKey={k}
                                name={k === "value" ? yAxisLabel : k}
                                stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                                strokeWidth={2.5}
                              />
                            ))}
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={previewAggregation.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: "#64748B" }}
                              label={{ value: xAxisLabel, position: "insideBottom", offset: -15, fill: "#334155", fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#64748B" }}
                              label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -2, fill: "#334155", fontSize: 11, fontWeight: 700 }}
                            />
                            <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "8px", border: "none", color: "#fff", fontSize: "11px" }} />
                            <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                            {previewAggregation.seriesKeys.map((k, i) => (
                              <Bar
                                key={k}
                                dataKey={k}
                                name={k === "value" ? yAxisLabel : k}
                                stackId={chartType === "stacked_bar" ? "stack" : undefined}
                                fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                                radius={chartType === "stacked_bar" ? undefined : [4, 4, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Live Records Table Sample */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 mt-3">
                      <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                          Live Data Sample ({filteredRows.length} matching records)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Showing first {Math.min(5, filteredRows.length)} rows
                        </span>
                      </div>
                      {filteredRows.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No records match current filters or timeframe.
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-44">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider sticky top-0">
                              <tr>
                                {selectedFields.slice(0, 7).map((fKey) => (
                                  <th key={fKey} className="py-1.5 px-3 whitespace-nowrap">
                                    {allSourceFields.find((f) => f.key === fKey)?.label || fKey}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                              {filteredRows.slice(0, 5).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50/80">
                                  {selectedFields.slice(0, 7).map((fKey) => (
                                    <td key={fKey} className="py-1.5 px-3 truncate max-w-[140px]">
                                      {String(row[fKey] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
