import React, { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import { useInvoices } from "../context/InvoiceContext";
import { ReportDefinition, ReportDataSource } from "../types/invoiceTypes";
import ReportViewerModal from "../components/reports/ReportViewerModal";
import CustomReportBuilderModal from "../components/reports/CustomReportBuilderModal";
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

export default function Reports() {
  const { reports, deleteReport, saveReport } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderInitialReport, setBuilderInitialReport] = useState<ReportDefinition | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.dataSource.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredReports.length);
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

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
      groupBy: report.groupBy,
      timeGrouping: report.timeGrouping,
      breakdownBy: report.breakdownBy,
      metric: report.metric,
      xAxisLabel: report.xAxisLabel,
      yAxisLabel: report.yAxisLabel,
      yAxisMode: report.yAxisMode,
      sharedWith: report.sharedWith,
    });
    toast.success(`Copied as Custom Report: "${dup.name}". You can now edit or delete it.`);
  };

  const handleCreateReport = () => {
    setBuilderInitialReport(null);
    setIsBuilderOpen(true);
  };

  const handleDelete = (reportId: string, name: string) => {
    deleteReport(reportId);
    toast.success(`Report "${name}" deleted`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Reports"
          subtitle="Generate pre-built performance reports or build custom queries from live operational data"
        >
          <div className="flex items-center gap-2">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Reports Works" />
          </div>
        </PageHeader>

        {/* Action / Search Toolbar */}
        <div className="bg-card rounded-t-xl p-2.5 px-3 border border-border shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search reports by name, type, or data source..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-[36px] bg-input-background border border-input rounded-lg pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Create Report Button */}
            <button
              onClick={handleCreateReport}
              className="h-[36px] px-3.5 bg-[#1E293B] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4 text-blue-400" /> Create Report
            </button>
          </div>
        </div>

        {/* Reports Table with Dark Thead */}
        <div className="bg-white rounded-b-xl border border-t-0 border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1E293B] text-white">
                <tr className="h-[34px]">
                  <th className="py-1.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>REPORT NAME</th>
                  <th className="py-1.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>TYPE</th>
                  <th className="py-1.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>DATA SOURCE</th>
                  <th className="py-1.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>LAST RUN</th>
                  <th className="py-1.5 px-3 text-right font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'Outfit, sans-serif' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => (
                    <tr key={report.id} className="h-[32px] hover:bg-slate-50/80 transition-colors">
                      <td className="py-1 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="font-semibold text-slate-900 hover:text-blue-600 text-xs text-left truncate max-w-xs cursor-pointer"
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
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Template
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Custom
                          </span>
                        )}
                      </td>

                      <td className="py-1 px-3 font-mono text-[11px] font-semibold text-slate-700 uppercase whitespace-nowrap">
                        {report.dataSource}
                      </td>

                      <td className="py-1 px-3 text-xs text-slate-600 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {report.lastRun}
                      </td>

                      <td className="py-1 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>

                          {/* Edit Button for Custom Reports and Copies */}
                          {report.type === "custom" && (
                            <button
                              onClick={() => handleEditReport(report)}
                              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit Custom Report"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}

                          {/* Duplicate Button */}
                          <button
                            onClick={() => handleDuplicateReport(report)}
                            className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Duplicate as Custom Report"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* Delete Button for Custom Reports and Copies */}
                          {report.type === "custom" && (
                            <button
                              onClick={() => handleDelete(report.id, report.name)}
                              className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Standard Pagination Footer (matching Clients.tsx) */}
          <div className="px-4 py-2 border-t border-border bg-white flex items-center justify-between text-xs text-muted-foreground select-none">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-input rounded px-2 py-0.5 bg-input-background text-xs cursor-pointer focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2">
                Showing {filteredReports.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredReports.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="First page"
              >
                <span className="text-xs">«</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Previous page"
              >
                <span className="text-xs">‹</span>
              </button>
              <span className="px-2 font-medium text-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Next page"
              >
                <span className="text-xs">›</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                title="Last page"
              >
                <span className="text-xs">»</span>
              </button>
            </div>
          </div>
        </div>


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
    </div>
  );
}
