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

export default function ReportViewerModal({ isOpen, onClose, report }: ReportViewerModalProps) {
  const { getReportData } = useInvoices();
  const [dateRange, setDateRange] = useState("last_30");

  const reportData = useMemo(() => {
    if (!report) return { kpis: [], table: [], chartData: [] };
    return getReportData(report.dataSource, { dateRange });
  }, [report, dateRange, getReportData]);

  if (!report) return null;

  const handleExportCSV = () => {
    if (!reportData.table || reportData.table.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = Object.keys(reportData.table[0]);
    const csvRows = [
      headers.join(","),
      ...reportData.table.map((row: any) =>
        headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(",")
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

  const getStatusBadge = (statusStr: string) => {
    const s = String(statusStr).toLowerCase();
    if (s === "paid") {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Paid</span>;
    }
    if (s === "sent") {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">Sent</span>;
    }
    if (s === "overdue") {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">Overdue</span>;
    }
    if (s === "void") {
      return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">Void</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">{statusStr}</span>;
  };

  const maxServiceVal = reportData.pieData
    ? Math.max(...reportData.pieData.map((d: any) => d.value), 1)
    : 1;

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
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {report.description || `Live aggregation from ${report.dataSource.toUpperCase()} data source`}
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Timeframe:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
              <option value="last_90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
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
      <div className="space-y-6 max-h-[78vh] overflow-y-auto pr-1">
        {/* KPI Cards Grid */}
        {reportData.kpis && reportData.kpis.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {reportData.kpis.map((kpi: any, idx: number) => {
              const bgColors = ["bg-blue-50/60 border-blue-100", "bg-emerald-50/60 border-emerald-100", "bg-amber-50/60 border-amber-100", "bg-purple-50/60 border-purple-100"];
              const textColors = ["text-blue-600", "text-emerald-600", "text-amber-600", "text-purple-600"];
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${bgColors[idx % bgColors.length]} space-y-1 transition-all hover:shadow-md`}
                >
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {kpi.label}
                  </span>
                  <span className={`text-2xl font-bold ${textColors[idx % textColors.length]}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                    {kpi.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Visual Performance Section */}
        {reportData.chartData && reportData.chartData.length > 0 && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Visual Insights & Distribution
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Updated real-time from active store</span>
            </div>

            <div className="grid grid-cols-12 gap-6 items-center">
              {/* Left Column: Primary Chart */}
              <div className={reportData.pieData ? "col-span-7" : "col-span-12"}>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {report.chartType === "line" ? (
                      <LineChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: "#3B82F6" }} />
                      </LineChart>
                    ) : (
                      <BarChart data={reportData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                        <Bar dataKey="invoiced" name="Invoiced ($)" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="collected" name="Collected ($)" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        {reportData.chartData[0]?.calls && <Bar dataKey="calls" name="Calls" fill="#8B5CF6" radius={[6, 6, 0, 0]} maxBarSize={40} />}
                        {reportData.chartData[0]?.count && <Bar dataKey="count" name="Count" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={40} />}
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Clean Revenue Breakdown Bars */}
              {reportData.pieData && (
                <div className="col-span-5 border-l border-slate-100 pl-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Revenue by Service</span>
                    <span className="text-[11px] text-slate-400 font-medium">Total Breakdown</span>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {reportData.pieData.map((item: any, idx: number) => {
                      const pct = Math.round((item.value / maxServiceVal) * 100);
                      const barColors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                            <span className="truncate max-w-[170px]">{item.name}</span>
                            <span className="font-bold text-slate-900">${item.value.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${barColors[idx % barColors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Data Table */}
        {reportData.table && reportData.table.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-slate-500" /> Detailed Data Records ({reportData.table.length} rows)
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    {Object.keys(reportData.table[0]).map((head) => (
                      <th key={head} className="py-3 px-4">
                        {head.replace(/([A-Z])/g, " $1").toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {reportData.table.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {Object.keys(row).map((key) => {
                        const val = row[key];
                        return (
                          <td key={key} className="py-3 px-4">
                            {key === "status" ? (
                              getStatusBadge(val)
                            ) : key === "id" ? (
                              <span className="font-bold text-blue-600">{val}</span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
