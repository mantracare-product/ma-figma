import React, { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import { useInvoices } from "../context/InvoiceContext";
import { ReportDefinition, ReportDataSource } from "../types/invoiceTypes";
import ReportViewerModal from "../components/reports/ReportViewerModal";
import CustomReportBuilderModal from "../components/reports/CustomReportBuilderModal";
import { Modal } from "../components/ui/Modal";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { toast } from "sonner";
import {
  BarChart3,
  Plus,
  Eye,
  Download,
  Trash2,
  Copy,
  Pencil,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Search,
  FileSpreadsheet,
  Check,
  ChevronRight,
} from "lucide-react";

const PREBUILT_TEMPLATES: Array<{
  id: string;
  name: string;
  desc: string;
  dataSource: ReportDataSource;
  fields: string[];
}> = [
  {
    id: "tpl-rev",
    name: "Revenue & Collection Summary",
    desc: "Monthly total invoiced, payments collected, overdue status & balances",
    dataSource: "revenue",
    fields: ["id", "client", "amount", "status", "dueDate"],
  },
  {
    id: "tpl-calls",
    name: "Call Volume & Sentiment Analysis",
    desc: "Inbound/outbound call metrics, average duration, AI sentiment & transcripts",
    dataSource: "calls",
    fields: ["id", "client", "service", "duration", "status"],
  },
  {
    id: "tpl-appts",
    name: "Appointments & Cancellation Rate",
    desc: "Provider workloads, scheduled visits, completed vs cancelled appointments",
    dataSource: "appointments",
    fields: ["id", "client", "provider", "dueDate", "status"],
  },
  {
    id: "tpl-clients",
    name: "Client Funnel & Registry Metrics",
    desc: "Client conversion stages, custom registry fields & registration dates",
    dataSource: "clients",
    fields: ["id", "client", "status", "created"],
  },
  {
    id: "tpl-processes",
    name: "Process & Deal Pipeline Tracking",
    desc: "Active process stages, time in stage, deal status & assignment",
    dataSource: "processes",
    fields: ["id", "client", "process", "stage", "status", "timeInStage"],
  },
];

export default function Reports() {
  const { reports, deleteReport, saveReport } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderInitialReport, setBuilderInitialReport] = useState<ReportDefinition | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.dataSource.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  };

  const handleEditReport = (report: ReportDefinition) => {
    setBuilderInitialReport(report);
    setIsBuilderOpen(true);
  };

  const handleDuplicateReport = (report: ReportDefinition) => {
    const dup = saveReport({
      name: `${report.name} (Copy)`,
      description: report.description,
      type: "custom", // Force copy to be a custom editable report
      dataSource: report.dataSource,
      templateKey: report.templateKey,
      viewType: report.viewType,
      chartType: report.chartType,
      selectedFields: report.selectedFields,
      fieldCalculations: report.fieldCalculations,
      reportingPeriod: report.reportingPeriod,
      calculatedColumns: report.calculatedColumns,
      sortBy: report.sortBy,
      filterConditions: report.filterConditions,
      showChart: report.showChart,
      sharedWith: report.sharedWith,
    });
    toast.success(`Copied as Custom Report: "${dup.name}". You can now edit or delete it.`);
  };

  const handleSelectTemplate = (tpl: (typeof PREBUILT_TEMPLATES)[0]) => {
    setIsTemplatePickerOpen(false);
    setIsCreateChoiceOpen(false);
    // Pre-fill builder with template details
    setBuilderInitialReport({
      id: `tpl-${Date.now()}`,
      name: `${tpl.name}`,
      description: tpl.desc,
      type: "custom",
      dataSource: tpl.dataSource,
      selectedFields: tpl.fields,
      showChart: true,
      chartType: "bar",
      lastRun: "Just now",
    });
    setIsBuilderOpen(true);
  };

  const handleDelete = (reportId: string, name: string) => {
    deleteReport(reportId);
    toast.success(`Report "${name}" deleted`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-2.5">
        <PageHeader
          title="Reports"
          subtitle="Generate pre-built performance reports or build custom queries from live operational data"
          badge={
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
              Analytics
            </span>
          }
        >
          <div className="flex items-center gap-2">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Reports Works" />
            <button
              onClick={() => setIsCreateChoiceOpen(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white rounded-full font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" /> Create Report
            </button>
          </div>
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <BarChart3 className="w-3.5 h-3.5 text-[#1456f0]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {reports.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Total Reports</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs">
            <Eye className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              {reports.length * 4}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Views This Month</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs opacity-75">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-xs text-[#222222]" style={{ fontFamily: "Outfit, sans-serif" }}>
              0
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Scheduled Delivery</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full text-[9px] font-bold">
              COMING SOON
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-2.5 rounded-xl border border-border shadow-2xs flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by name, type, or data source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-[11px] font-medium text-slate-500">
            {filteredReports.length} Available Reports
          </span>
        </div>

        {/* Reports Table */}
        <div className="bg-white/90 backdrop-blur-xl rounded-xl border border-white/80 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white text-xs font-semibold uppercase tracking-wider">
              <tr className="h-7">
                <th className="py-1 px-3 font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>REPORT NAME</th>
                <th className="py-1 px-3 font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>TYPE</th>
                <th className="py-1 px-3 font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>DATA SOURCE</th>
                <th className="py-1 px-3 font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>LAST RUN</th>
                <th className="py-1 px-3 text-right font-semibold text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredReports.map((report) => (
                <tr key={report.id} className="h-[30px] hover:bg-slate-50/80 transition-colors">
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="font-semibold text-slate-900 hover:text-blue-600 text-xs text-left truncate max-w-xs"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {report.name}
                      </button>
                      {report.sharedWith && report.sharedWith.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-700 font-medium">
                          Shared
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-1 px-3 whitespace-nowrap">
                    {report.type === "template" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Template
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Custom
                      </span>
                    )}
                  </td>

                  <td className="py-1 px-3 font-mono text-[11px] font-semibold text-slate-700 uppercase whitespace-nowrap">
                    {report.dataSource}
                  </td>

                  <td className="py-1 px-3 text-xs text-slate-600 whitespace-nowrap">
                    {report.lastRun}
                  </td>

                  <td className="py-1 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>

                      {/* Edit Button for Custom Reports and Copies */}
                      {report.type === "custom" && (
                        <button
                          onClick={() => handleEditReport(report)}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                          title="Edit Custom Report"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}

                      {/* Duplicate Button */}
                      <button
                        onClick={() => handleDuplicateReport(report)}
                        className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Duplicate as Custom Report"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {/* Delete Button for Custom Reports and Copies */}
                      {report.type === "custom" && (
                        <button
                          onClick={() => handleDelete(report.id, report.name)}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Choice Modal */}
      <Modal
        isOpen={isCreateChoiceOpen}
        onClose={() => setIsCreateChoiceOpen(false)}
        title="Create New Report"
        footer={null}
      >
        <div className="grid grid-cols-2 gap-4 py-2">
          <button
            onClick={() => {
              setIsCreateChoiceOpen(false);
              setIsTemplatePickerOpen(true);
            }}
            className="p-5 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl text-left space-y-2 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600">Use a Template</h4>
            <p className="text-xs text-slate-500">Pick from pre-built templates like Revenue, Call Performance, or Appointments.</p>
          </button>

          <button
            onClick={() => {
              setIsCreateChoiceOpen(false);
              setBuilderInitialReport(null);
              setIsBuilderOpen(true);
            }}
            className="p-5 border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 rounded-2xl text-left space-y-2 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-purple-600">Start from Scratch</h4>
            <p className="text-xs text-slate-500">Build a custom report from scratch: pick data source, columns, filters & charts.</p>
          </button>
        </div>
      </Modal>

      {/* Template Picker Modal */}
      <Modal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        title="Select a Pre-built Report Template"
        maxWidth="lg"
        footer={null}
      >
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-500 mb-3">
            Select a template below to open the builder pre-filled with recommended metrics. You can customize fields, filters, and charts before saving.
          </p>
          {PREBUILT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="w-full p-4 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left flex items-center justify-between transition-all group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600">{tpl.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-600 font-semibold">
                    {tpl.dataSource}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{tpl.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
          ))}
        </div>
      </Modal>

      {/* Report Execution Viewer */}
      <ReportViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        report={selectedReport}
      />

      {/* Custom Report Builder */}
      <CustomReportBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        initialReport={builderInitialReport}
        onSaved={(created) => handleViewReport(created)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Reports Works"
        summary="Reports provides live aggregated operational & financial reporting directly from your shared in-memory mock system."
        bullets={[
          "View pre-built templates or click '+ Create Report' to build from a template or scratch",
          "Duplicate any template to create a fully editable custom report",
          "Click the Pencil icon on custom reports to edit fields, aggregations, periods & charts",
          "Export report datasets to CSV with a single click",
        ]}
        guideUrl="/guide/reports"
      />
    </div>
  );
}
