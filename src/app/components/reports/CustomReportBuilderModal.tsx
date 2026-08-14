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
  X,
  PieChart,
  LineChart,
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState<ReportDataSource>("revenue");

  // Selected Fields
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "id",
    "client",
    "amount",
    "status",
  ]);

  // Field selection popup state
  const [isFieldPopupOpen, setIsFieldPopupOpen] = useState(false);
  const [tempSelectedFields, setTempSelectedFields] = useState<string[]>([]);

  // Section 1: Reporting Period
  const [periodType, setPeriodType] = useState<
    "this_month" | "last_month" | "this_week" | "custom"
  >("this_month");
  const [customDays, setCustomDays] = useState<number>(30);

  // Section 2: Per-Field Calculations
  const [fieldCalculations, setFieldCalculations] = useState<
    Record<string, "sum" | "avg" | "count" | "min" | "max">
  >({});

  // Section 3: Sort By
  const [sortByField, setSortByField] = useState("amount");
  const [sortByDir, setSortByDir] = useState<"asc" | "desc">("desc");

  // Section 4: Filter Conditions (Row-level AND/OR)
  const [matchType, setMatchType] = useState<"AND" | "OR">("AND");
  const [filterConditions, setFilterConditions] = useState<
    Array<{
      id: string;
      field: string;
      operator: "equals" | "contains" | "gt" | "lt";
      value: string;
      logic?: "AND" | "OR";
    }>
  >([{ id: "f-init-1", field: "status", operator: "equals", value: "paid", logic: "AND" }]);

  // Chart settings (Merged into Step 2)
  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  // Step 3: Sharing
  const [sharedWith, setSharedWith] = useState<string[]>(["John Smith"]);
  const [selectedTeamMemberToAdd, setSelectedTeamMemberToAdd] = useState("");

  const dataSources: { id: ReportDataSource; name: string; desc: string }[] = [
    {
      id: "revenue",
      name: "Revenue & Invoicing",
      desc: "Invoices, line items, payment status & collections",
    },
    {
      id: "calls",
      name: "Calls & Telephony",
      desc: "AI call volume, durations, sentiment & transcripts",
    },
    {
      id: "appointments",
      name: "Appointments & Bookings",
      desc: "Scheduled visits, provider loads & cancellation rates",
    },
    {
      id: "clients",
      name: "Clients & Funnels",
      desc: "Client stages, custom registry fields & conversion rates",
    },
    {
      id: "processes",
      name: "Processes",
      desc: "Deal/process records, stages, status & assignment",
    },
    {
      id: "team",
      name: "Team & Staff",
      desc: "Agent productivity, appointments handled & ratings",
    },
    {
      id: "messaging",
      name: "Messaging & WhatsApp",
      desc: "Outbound templates, message volume & bot containment",
    },
  ];

  const clientCustomFields = getAllFields("client");

  // Default fields per data source
  const getAvailableFieldsForSource = (src: ReportDataSource): string[] => {
    switch (src) {
      case "revenue":
        return ["id", "client", "amount", "status", "dueDate", "created", "service", "paymentMode"];
      case "calls":
        return ["id", "client", "service", "duration", "status", "sentiment", "cost", "created", "responsible"];
      case "appointments":
        return ["id", "service", "client", "provider", "date", "status", "created"];
      case "clients":
        return [
          "client",
          "stage",
          "process",
          "value",
          "status",
          "responsible",
          "created",
          "lastContact",
          ...clientCustomFields.map((f) => f.key),
        ];
      case "processes":
        return [
          "id",
          "client",
          "process",
          "stage",
          "status",
          "timeInStage",
          "created",
          "lastActivity",
          "responsible",
        ];
      case "team":
        return ["member", "role", "calls", "appts", "rating", "status", "created", "responsible"];
      case "messaging":
        return ["id", "client", "channel", "status", "messages", "botContained", "created", "responsible"];
      default:
        return ["id", "client", "status", "created"];
    }
  };

  // Pre-fill state whenever initialReport changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        setReportName(initialReport.name);
        setReportDescription(initialReport.description || "");
        setDataSource(initialReport.dataSource || "revenue");
        setSelectedFields(
          initialReport.selectedFields && initialReport.selectedFields.length > 0
            ? initialReport.selectedFields
            : getAvailableFieldsForSource(initialReport.dataSource || "revenue").slice(0, 4)
        );
        setFieldCalculations(initialReport.fieldCalculations || {});
        setPeriodType(initialReport.reportingPeriod?.type || "this_month");
        setCustomDays(initialReport.reportingPeriod?.customDays || 30);
        setSortByField(initialReport.sortBy?.field || "amount");
        setSortByDir(initialReport.sortBy?.direction || "desc");
        setMatchType(initialReport.filterConditions?.matchType || "AND");
        setFilterConditions(
          (initialReport.filterConditions?.conditions || []).map((c) => ({
            ...c,
            logic: c.logic || initialReport.filterConditions?.matchType || "AND",
          }))
        );
        setShowChart(initialReport.showChart !== false);
        setChartType(initialReport.chartType || "bar");
        setSharedWith(initialReport.sharedWith || ["John Smith"]);
        setStep(1);
      } else {
        setStep(1);
        setReportName("");
        setReportDescription("");
        setDataSource("revenue");
        setSelectedFields(["id", "client", "amount", "status"]);
        setFieldCalculations({});
        setPeriodType("this_month");
        setCustomDays(30);
        setSortByField("amount");
        setSortByDir("desc");
        setMatchType("AND");
        setFilterConditions([
          { id: "f-init-1", field: "status", operator: "equals", value: "paid", logic: "AND" },
        ]);
        setShowChart(true);
        setChartType("bar");
        setSharedWith(["John Smith"]);
      }
    }
  }, [isOpen, initialReport]);

  // Update default selected fields when data source changes in step 1
  const handleSelectDataSource = (src: ReportDataSource) => {
    setDataSource(src);
    const available = getAvailableFieldsForSource(src);
    setSelectedFields(available.slice(0, 5));
    setFieldCalculations({});
    setSortByField(available[0] || "id");
  };

  // Type-gating helper for calculation dropdowns
  const getAvailableFunctionsForField = (field: string) => {
    if (
      field === "amount" ||
      field === "duration" ||
      field === "cost" ||
      field === "value" ||
      field === "calls" ||
      field === "appts" ||
      field === "messages" ||
      field === "timeInStage"
    ) {
      return [
        { id: "sum", label: "Sum" },
        { id: "avg", label: "Average" },
        { id: "count", label: "Count" },
        { id: "min", label: "Min" },
        { id: "max", label: "Max" },
      ];
    }
    if (field === "rating") {
      return [
        { id: "avg", label: "Average" },
        { id: "count", label: "Count" },
        { id: "min", label: "Min" },
        { id: "max", label: "Max" },
      ];
    }
    if (field === "dueDate" || field === "created" || field === "date" || field === "lastActivity" || field === "lastContact") {
      return [
        { id: "count", label: "Count" },
        { id: "min", label: "Min (Earliest)" },
        { id: "max", label: "Max (Latest)" },
      ];
    }
    // All other categorical/text fields get Count
    return [{ id: "count", label: "Count" }];
  };

  const handleOpenFieldPopup = () => {
    setTempSelectedFields([...selectedFields]);
    setIsFieldPopupOpen(true);
  };

  const handleApplyFieldPopup = () => {
    if (tempSelectedFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }
    setSelectedFields(tempSelectedFields);
    // clean up any calcs for removed fields
    const nextCalcs = { ...fieldCalculations };
    Object.keys(nextCalcs).forEach((k) => {
      if (!tempSelectedFields.includes(k)) delete nextCalcs[k];
    });
    setFieldCalculations(nextCalcs);
    setIsFieldPopupOpen(false);
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

  const handleAddFilterCondition = () => {
    const available = getAvailableFieldsForSource(dataSource);
    setFilterConditions([
      ...filterConditions,
      {
        id: `filter-${Date.now()}`,
        field: available[0] || "status",
        operator: "equals",
        value: "",
        logic: "AND",
      },
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

  const availableSourceFields = getAvailableFieldsForSource(dataSource);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={
          <div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {initialReport ? `Edit / Customize Report: ${initialReport.name}` : "Custom Report Builder"}
            </h3>
            <p className="text-xs text-slate-500">
              Step {step} of 3 — {step === 1 ? "Choose Data Source" : step === 2 ? "Configure Fields, Filters & Chart" : "Save & Share"}
            </p>
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

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
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
          {/* Step Progress Bar (3 steps) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-semibold text-slate-500">
            <span className={step === 1 ? "text-blue-600 font-bold" : ""}>1. Data Source</span>
            <span>→</span>
            <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Fields & Rules</span>
            <span>→</span>
            <span className={step === 3 ? "text-blue-600 font-bold" : ""}>3. Save & Share</span>
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
                    onClick={() => handleSelectDataSource(ds.id)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      dataSource === ds.id
                        ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
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

          {/* Step 2: Fields & Rules */}
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
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Period Selection
                    </label>
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
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Number of Days
                      </label>
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

              {/* SUB-SECTION 2: Columns & Per-Field Aggregations */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-blue-600" /> 2. Columns & Per-Field Aggregations
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {selectedFields.length} column(s) active
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenFieldPopup}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Field
                  </button>
                </div>

                {/* Selected Fields List with Per-Field Aggregation Dropdown */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedFields.map((fieldKey) => {
                    const funcs = getAvailableFunctionsForField(fieldKey);
                    const isCustom = clientCustomFields.some((c) => c.key === fieldKey);
                    const customObj = clientCustomFields.find((c) => c.key === fieldKey);
                    const label = customObj ? `${customObj.label} (Custom)` : fieldKey;

                    return (
                      <div
                        key={fieldKey}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold capitalize ${
                              isCustom ? "text-purple-900" : "text-slate-800"
                            }`}
                          >
                            {label}
                          </span>
                          {funcs.length > 1 && (
                            <span className="text-[10px] text-slate-400">
                              ({funcs.map((f) => f.id).join("/")})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {funcs.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400">Calculate:</span>
                              <select
                                value={fieldCalculations[fieldKey] || ""}
                                onChange={(e) =>
                                  setFieldCalculations({
                                    ...fieldCalculations,
                                    [fieldKey]: e.target.value as any,
                                  })
                                }
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold"
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

                          <button
                            type="button"
                            onClick={() => handleRemoveField(fieldKey)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                            title="Remove column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SUB-SECTION 3: Sort By */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <ArrowUpDown className="w-4 h-4 text-blue-600" /> 3. Sort By Column
                  </span>
                  <span className="text-[11px] text-slate-400">Explicit order control</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sort Column
                    </label>
                    <select
                      value={sortByField}
                      onChange={(e) => setSortByField(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableSourceFields.map((f) => (
                        <option key={f} value={f}>
                          {f.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Direction
                    </label>
                    <select
                      value={sortByDir}
                      onChange={(e) => setSortByDir(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Descending (High → Low / Z → A)</option>
                      <option value="asc">Ascending (Low → High / A → Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SUB-SECTION 4: Filter Conditions (Left-aligned AND/OR pill) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Filter className="w-4 h-4 text-blue-600" /> 4. Filter Conditions
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Record-level filtering rules</span>
                </div>

                <div className="space-y-2">
                  {filterConditions.map((cond, idx) => (
                    <div
                      key={cond.id}
                      className="flex items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-xl text-xs shadow-2xs"
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
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-colors ${
                                (cond.logic || "AND") === "AND"
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "text-slate-500 hover:text-slate-700"
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
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-colors ${
                                cond.logic === "OR"
                                  ? "bg-blue-600 text-white shadow-2xs"
                                  : "text-slate-500 hover:text-slate-700"
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
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {availableSourceFields.map((f) => (
                          <option key={f} value={f}>
                            {f}
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
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="gt">is greater than</option>
                        <option value="lt">is less than</option>
                      </select>

                      {/* Value */}
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
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveFilterCondition(cond.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove condition"
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

              {/* SUB-SECTION 5: Visual Chart Summary (Merged into Step 2) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> 5. Visual Chart Summary
                  </span>
                  <span className="text-[11px] text-slate-400">Chart rendering options</span>
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl">
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
                    <span className="text-[11px] text-slate-400">
                      Display dynamic aggregated graphical overview above data table
                    </span>
                  </div>
                </label>

                {showChart && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {[
                      { id: "bar", label: "Bar Chart", desc: "Totals & Comparisons", icon: BarChart3 },
                      { id: "line", label: "Line Chart", desc: "Trend Over Time", icon: LineChart },
                      { id: "pie", label: "Pie / Donut", desc: "Category Distribution", icon: PieChart },
                    ].map((ct) => {
                      const isSelected = chartType === ct.id;
                      const Icon = ct.icon;
                      return (
                        <div
                          key={ct.id}
                          onClick={() => setChartType(ct.id as any)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="font-bold text-xs text-slate-900">{ct.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{ct.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Save & Share */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Report Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 High Value Clients & Revenue"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  placeholder="Describe what this custom report computes..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Sharing Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-purple-600" /> Sharing Access
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
                        className="hover:text-rose-600 font-bold"
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

      {/* Field Selection Popup Dialog (Section 3d) */}
      {isFieldPopupOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Columns</h3>
                <p className="text-xs text-slate-500">
                  Choose fields from <strong>{dataSource.toUpperCase()}</strong> data source
                </p>
              </div>
              <button
                onClick={() => setIsFieldPopupOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {availableSourceFields.map((fKey) => {
                const isChecked = tempSelectedFields.includes(fKey);
                const isCustom = clientCustomFields.some((c) => c.key === fKey);
                const customObj = clientCustomFields.find((c) => c.key === fKey);
                const label = customObj ? `${customObj.label} (Custom)` : fKey;

                return (
                  <label
                    key={fKey}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold text-xs text-slate-800 capitalize">
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setTempSelectedFields(tempSelectedFields.filter((f) => f !== fKey));
                        } else {
                          setTempSelectedFields([...tempSelectedFields, fKey]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFieldPopupOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleApplyFieldPopup}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                ADD ({tempSelectedFields.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
