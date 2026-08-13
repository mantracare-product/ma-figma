import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { ReportDataSource, ReportDefinition } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
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
} from "lucide-react";

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (report: ReportDefinition) => void;
  initialReport?: ReportDefinition | null;
}

const MOCK_TEAM_MEMBERS = [
  "John Smith",
  "Sarah Johnson",
  "Dr. Robert Martinez",
  "Lisa Anderson",
  "Michael Chen",
  "Emily Davis",
];

export default function CustomReportBuilderModal({
  isOpen,
  onClose,
  onSaved,
  initialReport,
}: CustomReportBuilderModalProps) {
  const { saveReport } = useInvoices();
  const { getAllFields } = useFieldRegistry();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState<ReportDataSource>("revenue");
  
  // Selected Fields
  const [selectedFields, setSelectedFields] = useState<string[]>(["id", "client", "amount", "status"]);
  
  // Section 1: Reporting Period
  const [periodType, setPeriodType] = useState<"this_month" | "last_month" | "this_week" | "custom">("this_month");
  const [customDays, setCustomDays] = useState<number>(30);

  // Section 2: Per-Field Calculations
  const [fieldCalculations, setFieldCalculations] = useState<Record<string, "sum" | "avg" | "count" | "min" | "max">>({});

  // Section 3: Stacked Calculated Columns
  const [calculatedColumns, setCalculatedColumns] = useState<
    Array<{ id: string; field: string; func: "sum" | "avg" | "count" | "min" | "max"; label?: string }>
  >([]);
  const [newCalcField, setNewCalcField] = useState("amount");
  const [newCalcFunc, setNewCalcFunc] = useState<"sum" | "avg" | "count" | "min" | "max">("sum");
  const [newCalcLabel, setNewCalcLabel] = useState("");

  // Section 4: Sort By
  const [sortByField, setSortByField] = useState("amount");
  const [sortByDir, setSortByDir] = useState<"asc" | "desc">("desc");

  // Section 5: Filter Conditions (Single-level AND/OR)
  const [matchType, setMatchType] = useState<"AND" | "OR">("AND");
  const [filterConditions, setFilterConditions] = useState<
    Array<{ id: string; field: string; operator: "equals" | "contains" | "gt" | "lt"; value: string }>
  >([
    { id: "f-init-1", field: "status", operator: "equals", value: "paid" },
  ]);

  // Step 3: Layout & Chart Checkbox
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  // Step 4: Sharing
  const [sharedWith, setSharedWith] = useState<string[]>(["John Smith"]);
  const [selectedTeamMemberToAdd, setSelectedTeamMemberToAdd] = useState("");

  // Pre-fill state whenever initialReport changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        setReportName(initialReport.name);
        setReportDescription(initialReport.description || "");
        setDataSource(initialReport.dataSource || "revenue");
        setSelectedFields(initialReport.selectedFields || ["id", "client", "amount", "status"]);
        setFieldCalculations(initialReport.fieldCalculations || {});
        setPeriodType(initialReport.reportingPeriod?.type || "this_month");
        setCustomDays(initialReport.reportingPeriod?.customDays || 30);
        setCalculatedColumns(initialReport.calculatedColumns || []);
        setSortByField(initialReport.sortBy?.field || "amount");
        setSortByDir(initialReport.sortBy?.direction || "desc");
        setMatchType(initialReport.filterConditions?.matchType || "AND");
        setFilterConditions(initialReport.filterConditions?.conditions || []);
        setShowChart(initialReport.showChart !== false);
        setChartType(initialReport.chartType || "bar");
        setSharedWith(initialReport.sharedWith || ["John Smith"]);
      } else {
        setStep(1);
        setReportName("");
        setReportDescription("");
        setDataSource("revenue");
        setSelectedFields(["id", "client", "amount", "status"]);
        setFieldCalculations({});
        setPeriodType("this_month");
        setCustomDays(30);
        setCalculatedColumns([]);
        setSortByField("amount");
        setSortByDir("desc");
        setMatchType("AND");
        setFilterConditions([{ id: "f-init-1", field: "status", operator: "equals", value: "paid" }]);
        setShowChart(true);
        setChartType("bar");
        setSharedWith(["John Smith"]);
      }
    }
  }, [isOpen, initialReport]);

  const dataSources: { id: ReportDataSource; name: string; desc: string }[] = [
    { id: "revenue", name: "Revenue & Invoicing", desc: "Invoices, line items, payment status & collections" },
    { id: "calls", name: "Calls & Telephony", desc: "AI call volume, durations, sentiment & transcripts" },
    { id: "appointments", name: "Appointments & Bookings", desc: "Scheduled visits, provider loads & cancellation rates" },
    { id: "clients", name: "Clients & Funnels", desc: "Client stages, custom registry fields & conversion rates" },
    { id: "team", name: "Team & Staff", desc: "Agent productivity, appointments handled & ratings" },
    { id: "messaging", name: "Messaging & WhatsApp", desc: "Outbound templates, message volume & bot containment" },
  ];

  const clientCustomFields = getAllFields("client");

  // Type-gating helper for calculation dropdowns
  const getAvailableFunctionsForField = (field: string) => {
    if (field === "amount" || field === "duration") {
      return [
        { id: "sum", label: "Sum" },
        { id: "avg", label: "Average" },
        { id: "count", label: "Count" },
        { id: "min", label: "Min" },
        { id: "max", label: "Max" },
      ];
    }
    if (field === "dueDate") {
      return [
        { id: "count", label: "Count" },
        { id: "min", label: "Min (Earliest)" },
        { id: "max", label: "Max (Latest)" },
      ];
    }
    if (field === "service") {
      return [{ id: "count", label: "Count" }];
    }
    return [];
  };

  const handleToggleField = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
      const nextCalcs = { ...fieldCalculations };
      delete nextCalcs[fieldKey];
      setFieldCalculations(nextCalcs);
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const handleAddCalculatedColumn = () => {
    const funcs = getAvailableFunctionsForField(newCalcField);
    const isValidFunc = funcs.some((f) => f.id === newCalcFunc);
    const chosenFunc = isValidFunc ? newCalcFunc : (funcs[0]?.id as any) || "count";

    const newItem = {
      id: `calc-${Date.now()}`,
      field: newCalcField,
      func: chosenFunc,
      label: newCalcLabel.trim() || `${newCalcField.toUpperCase()}: ${chosenFunc.toUpperCase()}`,
    };

    setCalculatedColumns([...calculatedColumns, newItem]);
    setNewCalcLabel("");
    toast.success(`Calculated column "${newItem.label}" added`);
  };

  const handleRemoveCalculatedColumn = (id: string) => {
    setCalculatedColumns(calculatedColumns.filter((c) => c.id !== id));
  };

  const handleAddFilterCondition = () => {
    setFilterConditions([
      ...filterConditions,
      { id: `filter-${Date.now()}`, field: "amount", operator: "gt", value: "100" },
    ]);
  };

  const handleRemoveFilterCondition = (id: string) => {
    setFilterConditions(filterConditions.filter((f) => f.id !== id));
  };

  const handleAddRecipient = () => {
    if (selectedTeamMemberToAdd && !sharedWith.includes(selectedTeamMemberToAdd)) {
      setSharedWith([...sharedWith, selectedTeamMemberToAdd]);
      setSelectedTeamMemberToAdd("");
    }
  };

  const handleRemoveRecipient = (name: string) => {
    setSharedWith(sharedWith.filter((n) => n !== name));
  };

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
        type: periodType,
        customDays: periodType === "custom" ? customDays : undefined,
      },
      calculatedColumns,
      sortBy: {
        field: sortByField,
        direction: sortByDir,
      },
      filterConditions: {
        matchType,
        conditions: filterConditions,
      },
      showChart,
      chartType: showChart ? chartType : undefined,
      viewType: showChart ? "table_chart" : "table",
      sharedWith,
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
        <div>
          <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            {initialReport ? `Edit / Customize Report: ${initialReport.name}` : "Custom Report Builder"}
          </h3>
          <p className="text-xs text-slate-500">Step {step} of 4 — Configure metrics, periods, calculations & sharing</p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> Save & View Report
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-semibold text-slate-500">
          <span className={step === 1 ? "text-blue-600 font-bold" : ""}>1. Data Source</span>
          <span>→</span>
          <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Fields & Rules</span>
          <span>→</span>
          <span className={step === 3 ? "text-blue-600 font-bold" : ""}>3. Layout</span>
          <span>→</span>
          <span className={step === 4 ? "text-blue-600 font-bold" : ""}>4. Save & Share</span>
        </div>

        {/* Step 1: Select Data Source */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-700">Choose primary data source:</p>
            <div className="grid grid-cols-2 gap-3">
              {dataSources.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => setDataSource(ds.id)}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    dataSource === ds.id
                      ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{ds.name}</span>
                    {dataSource === ds.id && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500">{ds.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Fields & Rules — Divided into 5 distinct visual sub-sections */}
        {step === 2 && (
          <div className="space-y-6">
            {/* SUB-SECTION 1: Reporting Period */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-blue-600" /> 1. Reporting Period
                </span>
                <span className="text-[11px] text-slate-400">Relative date range window</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Period Selection</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_week">This Week</option>
                    <option value="custom">Custom (Last X Days)</option>
                  </select>
                </div>

                {periodType === "custom" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Number of Days</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SUB-SECTION 2: Columns & Field Aggregations (Type-Gated) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-blue-600" /> 2. Columns & Per-Field Aggregations
                </span>
                <span className="text-[11px] text-slate-400">Type-gated aggregation dropdowns</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {["id", "client", "amount", "status", "dueDate", "created", "service", "provider", "duration"].map((f) => {
                  const isSelected = selectedFields.includes(f);
                  const funcs = getAvailableFunctionsForField(f);
                  return (
                    <div key={f} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleField(f)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="capitalize font-semibold text-slate-800">{f}</span>
                        {funcs.length > 0 && <span className="text-[10px] text-slate-400">({funcs.map(x=>x.id).join("/")})</span>}
                      </label>

                      {isSelected && funcs.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Calculate:</span>
                          <select
                            value={fieldCalculations[f] || ""}
                            onChange={(e) =>
                              setFieldCalculations({
                                ...fieldCalculations,
                                [f]: e.target.value as any,
                              })
                            }
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold"
                          >
                            <option value="">Display Only</option>
                            {funcs.map((fn) => (
                              <option key={fn.id} value={fn.id}>
                                {fn.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom fields from FieldRegistryContext */}
                {dataSource === "clients" &&
                  clientCustomFields.map((cf) => (
                    <div key={cf.key} className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(cf.key)}
                          onChange={() => handleToggleField(cf.key)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="font-semibold text-purple-900">{cf.label} (Custom)</span>
                      </label>
                    </div>
                  ))}
              </div>
            </div>

            {/* SUB-SECTION 3: Stacked Calculated Columns */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-blue-600" /> 3. Stacked Calculated Columns
                </span>
                <span className="text-[11px] text-slate-400">Add summary metrics to output</span>
              </div>

              {/* Added Stack List */}
              {calculatedColumns.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {calculatedColumns.map((col) => (
                    <div key={col.id} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <span className="font-bold text-blue-900">{col.label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCalculatedColumn(col.id)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Calculated Column Row */}
              <div className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 border border-slate-200 rounded-lg">
                <div className="col-span-4">
                  <select
                    value={newCalcField}
                    onChange={(e) => {
                      setNewCalcField(e.target.value);
                      const available = getAvailableFunctionsForField(e.target.value);
                      if (available.length > 0) setNewCalcFunc(available[0].id as any);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
                  >
                    <option value="amount">Amount (Numeric)</option>
                    <option value="duration">Duration (Numeric)</option>
                    <option value="dueDate">DueDate (Date)</option>
                    <option value="service">Service (Text)</option>
                  </select>
                </div>

                <div className="col-span-3">
                  <select
                    value={newCalcFunc}
                    onChange={(e) => setNewCalcFunc(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-blue-700"
                  >
                    {getAvailableFunctionsForField(newCalcField).map((fn) => (
                      <option key={fn.id} value={fn.id}>
                        {fn.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Custom Label (optional)"
                    value={newCalcLabel}
                    onChange={(e) => setNewCalcLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={handleAddCalculatedColumn}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 4: Sort By */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <ArrowUpDown className="w-4 h-4 text-blue-600" /> 4. Sort By Column
                </span>
                <span className="text-[11px] text-slate-400">Explicit order control</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sort Column</label>
                  <select
                    value={sortByField}
                    onChange={(e) => setSortByField(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    {selectedFields.map((f) => (
                      <option key={f} value={f}>
                        {f.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Direction</label>
                  <select
                    value={sortByDir}
                    onChange={(e) => setSortByDir(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="desc">Descending (High → Low / Z → A)</option>
                    <option value="asc">Ascending (Low → High / A → Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SUB-SECTION 5: Filter Conditions (Single-Level AND/OR) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Filter className="w-4 h-4 text-blue-600" /> 5. Filter Conditions
                  </span>
                  {/* Single-Level AND/OR Match Toggle */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 ml-2">
                    <button
                      type="button"
                      onClick={() => setMatchType("AND")}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                        matchType === "AND" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchType("OR")}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                        matchType === "OR" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      OR
                    </button>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">Single-level rules engine</span>
              </div>

              <div className="space-y-2">
                {filterConditions.map((cond, idx) => (
                  <div key={cond.id} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg text-xs">
                    {idx > 0 && <span className="font-bold text-blue-600 text-[11px] px-1">{matchType}</span>}
                    <select
                      value={cond.field}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((fc) => (fc.id === cond.id ? { ...fc, field: e.target.value } : fc))
                        )
                      }
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium"
                    >
                      <option value="status">Status</option>
                      <option value="amount">Amount</option>
                      <option value="dueDate">Due Date</option>
                      <option value="client">Client</option>
                      <option value="service">Service</option>
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((fc) => (fc.id === cond.id ? { ...fc, operator: e.target.value as any } : fc))
                        )
                      }
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-600"
                    >
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="gt">is greater than</option>
                      <option value="lt">is less than</option>
                    </select>

                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) =>
                        setFilterConditions(
                          filterConditions.map((fc) => (fc.id === cond.id ? { ...fc, value: e.target.value } : fc))
                        )
                      }
                      placeholder="Value"
                      className="flex-1 px-2.5 py-1 border border-slate-200 rounded-md"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveFilterCondition(cond.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddFilterCondition}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Condition Row
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Layout & Show Chart Toggle */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-white border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  checked={showChart}
                  onChange={(e) => setShowChart(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Show Visual Chart Summary</span>
                  <span className="text-[11px] text-slate-500">Render aggregated visual chart above the structured data table</span>
                </div>
              </label>

              {showChart && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700">Select Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bar">Bar Chart (Comparisons & Totals)</option>
                    <option value="line">Line Trend Chart (Time-series performance)</option>
                    <option value="pie">Distribution Pie Chart (Service & status breakdown)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Name & Sharing (UI-Only Display) */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Report Name *</label>
              <input
                type="text"
                placeholder="e.g. Q3 High Value Clients & Revenue"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (optional)</label>
              <textarea
                placeholder="Describe what this custom report computes..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Sharing Section (UI-Only Display) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-purple-600" /> Sharing (Display Only)
                </span>
                <span className="text-[11px] text-slate-400">Team member access tags</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {sharedWith.map((member) => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold rounded-full"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(member)}
                      className="hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <select
                  value={selectedTeamMemberToAdd}
                  onChange={(e) => setSelectedTeamMemberToAdd(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                >
                  <option value="">Select team member to share with...</option>
                  {MOCK_TEAM_MEMBERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
