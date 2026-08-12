import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { ReportDataSource, ReportDefinition } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import { toast } from "sonner";
import {
  BarChart3,
  Table as TableIcon,
  Check,
  ChevronRight,
  Database,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (report: ReportDefinition) => void;
}

export default function CustomReportBuilderModal({
  isOpen,
  onClose,
  onSaved,
}: CustomReportBuilderModalProps) {
  const { saveReport } = useInvoices();
  const { getAllFields } = useFieldRegistry();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [dataSource, setDataSource] = useState<ReportDataSource>("revenue");
  const [selectedFields, setSelectedFields] = useState<string[]>(["id", "client", "amount", "status"]);
  const [viewType, setViewType] = useState<"table" | "table_chart">("table_chart");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  const dataSources: { id: ReportDataSource; name: string; desc: string }[] = [
    { id: "revenue", name: "Revenue & Invoicing", desc: "Invoices, line items, payment status & collections" },
    { id: "calls", name: "Calls & Telephony", desc: "AI call volume, durations, sentiment & transcripts" },
    { id: "appointments", name: "Appointments & Bookings", desc: "Scheduled visits, provider loads & cancellation rates" },
    { id: "clients", name: "Clients & Funnels", desc: "Client stages, custom registry fields & conversion rates" },
    { id: "team", name: "Team & Staff", desc: "Agent productivity, appointments handled & ratings" },
    { id: "messaging", name: "Messaging & WhatsApp", desc: "Outbound templates, message volume & bot containment" },
  ];

  const clientCustomFields = getAllFields("client");

  const handleToggleField = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldKey));
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const handleSave = () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    const created = saveReport({
      name: reportName.trim(),
      description: reportDescription.trim() || undefined,
      type: "custom",
      dataSource,
      selectedFields,
      viewType,
      chartType,
    });

    toast.success(`Custom report "${created.name}" created!`);
    onSaved(created);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div>
          <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Custom Report Builder
          </h3>
          <p className="text-xs text-slate-500">Step {step} of 4 — Configure custom metrics & visualization</p>
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Save & Run Report
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-semibold text-slate-500">
          <span className={step === 1 ? "text-blue-600 font-bold" : ""}>1. Data Source</span>
          <span>→</span>
          <span className={step === 2 ? "text-blue-600 font-bold" : ""}>2. Fields</span>
          <span>→</span>
          <span className={step === 3 ? "text-blue-600 font-bold" : ""}>3. Layout</span>
          <span>→</span>
          <span className={step === 4 ? "text-blue-600 font-bold" : ""}>4. Save</span>
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

        {/* Step 2: Pick Fields */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-700">Select columns to include in table:</p>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {["id", "client", "amount", "status", "dueDate", "created", "service", "provider", "duration"].map((f) => (
                <label key={f} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f)}
                    onChange={() => handleToggleField(f)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="capitalize font-medium text-slate-800">{f}</span>
                </label>
              ))}

              {/* Custom fields from FieldRegistryContext if Clients is selected */}
              {dataSource === "clients" &&
                clientCustomFields.map((cf) => (
                  <label key={cf.key} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(cf.key)}
                      onChange={() => handleToggleField(cf.key)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="font-semibold text-purple-900">{cf.label} (Custom)</span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Step 3: Layout & Visualization */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Presentation Layout</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setViewType("table")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    viewType === "table" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <TableIcon className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-slate-900 block">Table Only</span>
                  <span className="text-[11px] text-slate-500">Structured data rows & columns</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewType("table_chart")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    viewType === "table_chart" ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <BarChart3 className="w-5 h-5 text-blue-600 mb-1" />
                  <span className="text-xs font-bold text-slate-900 block">Table + Visual Chart</span>
                  <span className="text-[11px] text-slate-500">Summary chart above data table</span>
                </button>
              </div>
            </div>

            {viewType === "table_chart" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Chart Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Trend Chart</option>
                  <option value="pie">Distribution Pie Chart</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Name & Description */}
        {step === 4 && (
          <div className="space-y-4">
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
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
