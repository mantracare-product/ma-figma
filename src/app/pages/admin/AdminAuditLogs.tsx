import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import PageHeader from "../../components/layout/PageHeader";
import { TableComponent, TableColumn } from "../../components/ui/TableComponent";
import { Drawer } from "../../components/ui/drawer";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  useAuditLogs,
  AuditLogEntry,
  AuditAction,
  AuditModule,
} from "../../../lib/auditLogsStore";
import {
  Search,
  Download,
  Calendar,
  Filter,
  Eye,
  ArrowRight,
  Globe,
  Monitor,
  User,
  Shield,
  Clock,
  Layers,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";

const ACTION_COLORS: Record<AuditAction, { bg: string; text: string; border: string }> = {
  created: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60" },
  updated: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/60" },
  deleted: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60" },
  suspended: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60" },
  reactivated: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60" },
  login: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200/60" },
  export: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200/60" },
  assigned: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200/60" },
  unassigned: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  reset_password: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60" },
  invite_sent: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/60" },
  refunded: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60" },
};

function formatIsoTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function AdminAuditLogs() {
  const { logs } = useAuditLogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Unique lists for dropdown filters
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.actorName));
    return Array.from(set);
  }, [logs]);

  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.module));
    return Array.from(set);
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterModule !== "all" && log.module !== filterModule) return false;
      if (filterAction !== "all" && log.action !== filterAction) return false;
      if (filterActor !== "all" && log.actorName !== filterActor) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchActor =
          log.actorName.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q);
        const matchTarget =
          log.targetName.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q);
        const matchSummary = log.summary.toLowerCase().includes(q);
        const matchIp = log.ip.includes(q);
        if (!matchActor && !matchTarget && !matchSummary && !matchIp) return false;
      }
      return true;
    });
  }, [logs, filterModule, filterAction, filterActor, searchQuery]);

  // CSV Export
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Action",
      "Module",
      "Entity Type",
      "Entity ID",
      "Target Name",
      "Summary",
      "IP Address",
      "User Agent",
    ];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actorName}"`,
      `"${l.actorEmail}"`,
      `"${l.actorRole}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.targetName.replace(/"/g, '""')}"`,
      `"${l.summary.replace(/"/g, '""')}"`,
      `"${l.ip}"`,
      `"${l.userAgent.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mantra_admin_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLogs.length} audit log entries`);
  };

  // Table Columns
  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      align: "left",
      width: "160px",
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-600 tabular-nums">
          {formatIsoTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      align: "left",
      width: "180px",
      render: (log) => (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-bold text-slate-900 truncate">
              {log.actorName}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {log.actorRole}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate">
            {log.actorEmail}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      width: "110px",
      render: (log) => {
        const style = ACTION_COLORS[log.action] || {
          bg: "bg-slate-100",
          text: "text-slate-700",
          border: "border-slate-200",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
          >
            {log.action}
          </span>
        );
      },
    },
    {
      key: "module",
      header: "Module",
      align: "left",
      width: "130px",
      render: (log) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
          <Layers className="w-3 h-3 text-slate-400" />
          {log.module}
        </span>
      ),
    },
    {
      key: "target",
      header: "Target Entity",
      align: "left",
      width: "190px",
      render: (log) => (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-slate-900 truncate" title={log.targetName}>
            {log.targetName}
          </span>
          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
            {log.entityId}
          </span>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Summary of Change",
      align: "left",
      render: (log) => (
        <span className="text-xs text-slate-600 line-clamp-1" title={log.summary}>
          {log.summary}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      align: "right",
      width: "120px",
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-500 tabular-nums">
          {log.ip}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable chronicle of administrative modifications, role adjustments, and security dispatches across MantraAssist"
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            Read Only
          </span>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Pill Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor, target entity, IP, or summary..."
              className="w-full h-9 pl-9 pr-3 rounded-full border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0] transition-all"
            />
          </div>

          {/* Right Action: CSV Export */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Module Filter */}
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="h-7.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Modules</option>
            {uniqueModules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-7.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
            <option value="suspended">Suspended</option>
            <option value="reactivated">Reactivated</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
            <option value="reset_password">Reset Password</option>
          </select>

          {/* Actor Filter */}
          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="h-7.5 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Actors</option>
            {uniqueActors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {(filterModule !== "all" ||
            filterAction !== "all" ||
            filterActor !== "all" ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterModule("all");
                setFilterAction("all");
                setFilterActor("all");
                setSearchQuery("");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Table Component with Dark Navy Header & Row Click */}
      <TableComponent
        columns={columns}
        data={filteredLogs}
        getRowId={(log) => log.id}
        actionIcon="menu"
        onRowClick={(log) => setSelectedLog(log)}
        enableSelection={false}
        enableColumnCustomization={true}
        emptyMessage="No audit logs matched your active filters."
      />

      {/* Audit Detail Drawer with Before/After Diff */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="max-w-2xl w-[640px]"
        title={
          selectedLog && (
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  ACTION_COLORS[selectedLog.action]?.bg || "bg-slate-100"
                } ${ACTION_COLORS[selectedLog.action]?.text || "text-slate-700"} ${
                  ACTION_COLORS[selectedLog.action]?.border || "border-slate-200"
                }`}
              >
                {selectedLog.action}
              </span>
              <h3 className="text-sm font-bold text-slate-900 truncate">
                Audit Event: {selectedLog.id}
              </h3>
            </div>
          )
        }
      >
        {selectedLog && (
          <div className="space-y-5 pb-16 text-xs">
            {/* Summary Banner */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Summary of Action
              </p>
              <p className="text-sm font-bold text-slate-900 leading-relaxed">
                {selectedLog.summary}
              </p>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums pt-1">
                Occurred: {formatIsoTime(selectedLog.timestamp)}
              </p>
            </div>

            {/* Actor & Entity Metadata Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Actor Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <User className="w-3.5 h-3.5" />
                  <span>Actor / Admin</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedLog.actorName}</p>
                  <p className="text-[11px] text-slate-500">{selectedLog.actorEmail}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {selectedLog.actorRole}
                  </span>
                </div>
              </div>

              {/* Entity Target Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Target Entity</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedLog.targetName}</p>
                  <p className="text-[11px] text-slate-500">{selectedLog.entityType}</p>
                  <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {selectedLog.entityId}
                  </span>
                </div>
              </div>
            </div>

            {/* Request Context (IP, UA) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Network &amp; Client Context
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">IP Address:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedLog.ip}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">User Agent:</span>
                  <span className="font-mono text-[10px] text-slate-700 break-all">
                    {selectedLog.userAgent}
                  </span>
                </div>
              </div>
            </div>

            {/* Before vs After Diff View */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                <span>State Change Diff (Before &amp; After)</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Before Box */}
                <div className="rounded-xl border border-rose-200/80 bg-rose-50/20 overflow-hidden">
                  <div className="px-3 py-1.5 bg-rose-50 border-b border-rose-200/60 text-rose-700 font-bold text-[10px] uppercase tracking-wider">
                    - Previous Value
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-800 overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.before
                      ? JSON.stringify(selectedLog.before, null, 2)
                      : "(None / Initial Creation)"}
                  </pre>
                </div>

                {/* After Box */}
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 overflow-hidden">
                  <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200/60 text-emerald-700 font-bold text-[10px] uppercase tracking-wider">
                    + New Value
                  </div>
                  <pre className="p-3 text-[11px] font-mono text-slate-800 overflow-x-auto max-h-60 leading-relaxed">
                    {selectedLog.after
                      ? JSON.stringify(selectedLog.after, null, 2)
                      : "(None / Entity Deleted)"}
                  </pre>
                </div>
              </div>
            </div>

            {/* Entity Navigation Button */}
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Link
                to={
                  selectedLog.module === "Organizations"
                    ? "/admin/organizations"
                    : selectedLog.module === "Users"
                    ? "/admin/settings/users"
                    : selectedLog.module === "Phone Numbers"
                    ? "/admin/telephony/numbers"
                    : selectedLog.module === "Orders"
                    ? "/admin/billing/orders"
                    : selectedLog.module === "Subscriptions"
                    ? "/admin/billing/subscriptions"
                    : "/admin/custom-fields"
                }
                onClick={() => setSelectedLog(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Navigate to {selectedLog.module}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

