import React, { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import { useInvoices } from "../context/InvoiceContext";
import { ReportDefinition } from "../types/invoiceTypes";
import ReportViewerModal from "../components/reports/ReportViewerModal";
import CustomReportBuilderModal from "../components/reports/CustomReportBuilderModal";
import { Modal } from "../components/ui/Modal";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { toast } from "sonner";
import {
  BarChart3,
  Plus,
  Play,
  Download,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Search,
  FileSpreadsheet,
} from "lucide-react";

export default function Reports() {
  const { reports, deleteReport, saveReport } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.dataSource.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRunReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  };

  const handleDuplicateReport = (report: ReportDefinition) => {
    const dup = saveReport({
      name: `${report.name} (Copy)`,
      description: report.description,
      type: report.type,
      dataSource: report.dataSource,
      templateKey: report.templateKey,
      viewType: report.viewType,
      chartType: report.chartType,
      selectedFields: report.selectedFields,
    });
    toast.success(`Report duplicated: "${dup.name}"`);
  };

  const handleDelete = (reportId: string, name: string) => {
    deleteReport(reportId);
    toast.success(`Report "${name}" deleted`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-8">
        <PageHeader
          title="Reports"
          subtitle="Generate pre-built performance reports or build custom queries from live operational data"
        >
          <div className="flex items-center gap-3">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Reports Works" />
            <button
              onClick={() => setIsCreateChoiceOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" /> Create Report
            </button>
          </div>
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: "#3B82F6" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              {reports.length}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Total Reports</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderColor: "rgba(16, 185, 129, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <Play className="w-4 h-4" style={{ color: "#10B981" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              {reports.length * 4}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Runs This Month</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border opacity-75 cursor-not-allowed"
            style={{
              backgroundColor: "rgba(100, 116, 139, 0.1)",
              borderColor: "rgba(100, 116, 139, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              0
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Scheduled Delivery</span>
            <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
              COMING SOON
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by name, type, or data source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-xs font-medium text-slate-500">
            {filteredReports.length} Available Reports
          </span>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Report Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Data Source</th>
                <th className="py-3.5 px-4">Last Run</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <button
                        onClick={() => handleRunReport(report)}
                        className="font-bold text-slate-900 hover:text-blue-600 text-sm text-left block"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {report.name}
                      </button>
                      {report.description && (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-lg line-clamp-1">
                          {report.description}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {report.type === "template" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Template
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        Custom
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 uppercase">
                    {report.dataSource}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {report.lastRun}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleRunReport(report)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Run Report
                      </button>

                      <button
                        onClick={() => handleDuplicateReport(report)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {report.type === "custom" && (
                        <button
                          onClick={() => handleDelete(report.id, report.name)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
              toast.info("Select one of the pre-built templates from the list to run immediately");
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
        onSaved={(created) => handleRunReport(created)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Reports Works"
        summary="Reports provides live aggregated operational & financial reporting directly from your shared in-memory mock system."
        bullets={[
          "Run pre-built templates for Revenue, Calls, Appointments, and Funnels",
          "Build custom reports step-by-step from any data source",
          "Include custom registry fields in client reporting",
          "Export report datasets to CSV with a single click",
        ]}
        guideUrl="/guide/reports"
      />
    </div>
  );
}
