import React, { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction, TableBulkAction } from "../components/ui/TableComponent";
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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

        {/* Action / Search Toolbar powered by PageTopBar */}
        <PageTopBar
          isBottomPanelAttached={true}
          searchQuery={searchQuery}
          onSearchChange={(v) => {
            setSearchQuery(v);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search reports by name, type, or data source..."
          filterPresets={[
            {
              id: "all",
              label: "All Reports",
              count: reports.length,
              isActive: !searchQuery,
              onClick: () => {
                setSearchQuery("");
                setCurrentPage(1);
              },
            },
            {
              id: "templates",
              label: "Templates",
              count: reports.filter((r) => r.type === "template").length,
              isActive: searchQuery.toLowerCase() === "template",
              onClick: () => {
                setSearchQuery("template");
                setCurrentPage(1);
              },
            },
            {
              id: "custom",
              label: "Custom Reports",
              count: reports.filter((r) => r.type === "custom").length,
              isActive: searchQuery.toLowerCase() === "custom",
              onClick: () => {
                setSearchQuery("custom");
                setCurrentPage(1);
              },
            },
            {
              id: "appointments",
              label: "Appointments Data",
              count: reports.filter((r) => r.dataSource === "appointments").length,
              isActive: searchQuery.toLowerCase() === "appointments",
              onClick: () => {
                setSearchQuery("appointments");
                setCurrentPage(1);
              },
            },
            {
              id: "processes",
              label: "Processes Data",
              count: reports.filter((r) => r.dataSource === "processes").length,
              isActive: searchQuery.toLowerCase() === "processes",
              onClick: () => {
                setSearchQuery("processes");
                setCurrentPage(1);
              },
            },
          ]}
          filterFields={[
            {
              id: "name",
              label: "Report Name",
              type: "text",
              placeholder: "Filter by report name...",
              value: searchQuery,
              onChange: (val) => {
                setSearchQuery(val || "");
                setCurrentPage(1);
              },
            },
            {
              id: "type",
              label: "Report Type",
              type: "select",
              value: searchQuery.toLowerCase() === "template" ? "template" : searchQuery.toLowerCase() === "custom" ? "custom" : "all",
              onChange: (val) => {
                setSearchQuery(val === "all" ? "" : val || "");
                setCurrentPage(1);
              },
              options: [
                { label: "All Types", value: "all" },
                { label: "Template", value: "template" },
                { label: "Custom", value: "custom" },
              ],
            },
            {
              id: "datasource",
              label: "Data Source",
              type: "select",
              value: ["appointments", "processes", "calls", "clients", "revenue", "team", "messaging"].includes(searchQuery.toLowerCase()) ? searchQuery.toLowerCase() : "all",
              onChange: (val) => {
                setSearchQuery(val === "all" ? "" : val || "");
                setCurrentPage(1);
              },
              options: [
                { label: "All Data Sources", value: "all" },
                { label: "Appointments", value: "appointments" },
                { label: "Processes", value: "processes" },
                { label: "Calls", value: "calls" },
                { label: "Clients", value: "clients" },
                { label: "Revenue", value: "revenue" },
                { label: "Team", value: "team" },
                { label: "Messaging", value: "messaging" },
              ],
            },
          ]}
          primaryAction={{
            label: "Create Report",
            icon: <Plus className="w-4 h-4" />,
            onClick: handleCreateReport,
          }}
        />

        {/* Reports Table with TableComponent */}
        {(() => {
          const reportColumns: TableColumn<ReportDefinition>[] = [
            {
              id: "name",
              header: "REPORT NAME",
              align: "left",
              render: (report) => (
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
              ),
            },
            {
              id: "type",
              header: "TYPE",
              align: "center",
              render: (report) =>
                report.type === "template" ? (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Template
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Custom
                  </span>
                ),
            },
            {
              id: "dataSource",
              header: "DATA SOURCE",
              align: "center",
              render: (report) => (
                <span className="font-mono text-[11px] font-semibold text-slate-700 uppercase">
                  {report.dataSource}
                </span>
              ),
            },
            {
              id: "lastRun",
              header: "LAST RUN",
              align: "center",
              render: (report) => (
                <span className="text-xs text-slate-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {report.lastRun}
                </span>
              ),
            },
          ];

          const reportRowActions: TableRowAction<ReportDefinition>[] = [
            {
              label: "View Report",
              icon: <Eye className="w-3.5 h-3.5 text-[#1A73E8]" />,
              onClick: (report) => handleViewReport(report),
            },
            {
              label: "Edit Custom Report",
              icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
              hidden: (report) => report.type !== "custom",
              onClick: (report) => handleEditReport(report),
            },
            {
              label: "Duplicate Report",
              icon: <Copy className="w-3.5 h-3.5 text-slate-600" />,
              onClick: (report) => handleDuplicateReport(report),
            },
            {
              label: "Delete",
              icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
              isDanger: true,
              hidden: (report) => report.type !== "custom",
              onClick: (report) => handleDelete(report.id, report.name),
            },
          ];

          const reportBulkActions: TableBulkAction[] = [
            {
              label: "Delete Selected",
              icon: <Trash2 className="w-3.5 h-3.5" />,
              variant: "danger",
              onClick: (ids) => {
                ids.forEach((id) => {
                  const r = reports.find((rep) => rep.id === id);
                  if (r && r.type === "custom") {
                    deleteReport(String(id));
                  }
                });
                setSelectedRows(new Set());
                toast.success("Deleted selected reports");
              },
            },
          ];

          return (
            <TableComponent
              data={filteredReports}
              columns={reportColumns}
              getRowId={(report) => report.id}
              rowActions={reportRowActions}
              bulkActions={reportBulkActions}
              selectedIds={selectedRows}
              onSelectionChange={(ids) => setSelectedRows(new Set(Array.from(ids) as string[]))}
              onRowClick={(report) => handleViewReport(report)}
              defaultRowsPerPage={rowsPerPage}
              emptyMessage="No reports found matching your filters."
            />
          );
        })()}


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
