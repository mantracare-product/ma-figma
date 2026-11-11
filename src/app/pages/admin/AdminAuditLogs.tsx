import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
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
  ChevronDown,
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

export interface AdminAuditLogsProps {
  isSettingsTab?: boolean;
}

export default function AdminAuditLogs({ isSettingsTab = false }: AdminAuditLogsProps) {
  const { logs } = useAuditLogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "today" | "7d" | "30d">("all");
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

      if (dateRangeFilter !== "all") {
        const logTime = new Date(log.timestamp).getTime();
        const now = Date.now();
        if (dateRangeFilter === "today" && now - logTime > 86400000) return false;
        if (dateRangeFilter === "7d" && now - logTime > 7 * 86400000) return false;
        if (dateRangeFilter === "30d" && now - logTime > 30 * 86400000) return false;
      }

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
  }, [logs, filterModule, filterAction, filterActor, dateRangeFilter, searchQuery]);

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

  // Table Columns matching Image 7
  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: "timestamp",
      header: "TIMESTAMP",
      align: "left",
      width: "170px",
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-600 tabular-nums">
          {formatIsoTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "ACTOR",
      align: "left",
      width: "180px",
      render: (log) => (
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
            {log.actorName.charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-900 truncate block" title={log.actorName}>
              {log.actorName}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              {log.actorRole}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "ACTION",
      align: "center",
      width: "115px",
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
            {log.action.replace("_", " ")}
          </span>
        );
      },
    },
    {
      key: "module",
      header: "MODULE",
      align: "left",
      width: "140px",
      render: (log) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{log.module}</span>
        </span>
      ),
    },
    {
      key: "targetEntity",
      header: "TARGET ENTITY",
      align: "left",
      width: "190px",
      render: (log) => (
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-900 truncate block" title={log.targetName}>
            {log.targetName}
          </span>
          <span className="text-[10px] font-mono text-slate-400 block truncate">
            {log.entityId}
          </span>
        </div>
      ),
    },
    {
      key: "summary",
      header: "SUMMARY OF CHANGE",
      align: "left",
      render: (log) => (
        <Tooltip text={log.summary} placement="top">
          <span className="text-xs text-slate-700 truncate max-w-[440px] block cursor-default">
            {log.summary}
          </span>
        </Tooltip>
      ),
    },
    {
      key: "ip",
      header: "IP ADDRESS",
      align: "left",
      width: "110px",
      render: (log) => (
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {log.ip}
        </span>
      ),
    },
  ];

  const body = (
    <div className={isSettingsTab ? "w-full space-y-4" : "px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-6 animate-in fade-in duration-200"}>
      {/* Standard PageTopBar with Compact Filters & Export Button */}
      <PageTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search audit logs by actor, entity, or summary..."
        onExport={handleExportCsv}
        leftElement={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Module Filter */}
            <div className="relative">
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
              >
                <option value="all">All Modules</option>
                {uniqueModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Action Filter */}
            <div className="relative">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
              >
                <option value="all">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="login">Login</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
                <option value="invite_sent">Invite Sent</option>
                <option value="reset_password">Reset Pass</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Actor Filter */}
            <div className="relative">
              <select
                value={filterActor}
                onChange={(e) => setFilterActor(e.target.value)}
                className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors truncate"
              >
                <option value="all">All Actors</option>
                {uniqueActors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        }
      />

      {/* Table Container matching Organizations */}
      <div className="w-full">
        <TableComponent
          columns={columns}
          data={filteredLogs}
          getRowId={(log) => log.id}
          actionIcon="menu"
          onRowClick={(log) => setSelectedLog(log)}
          enableSelection={true}
          enableColumnCustomization={false}
          defaultRowsPerPage={20}
          pageSizeOptions={[20, 50, 100]}
          emptyMessage="No audit logs matched your active filters."
        />
      </div>
    </div>
  );

  return (
    <div className={isSettingsTab ? "" : "min-h-screen bg-[#fafafa]"}>
      {!isSettingsTab && (
        <PageHeader
          title="Audit Logs"
          subtitle="Immutable chronicle of administrative modifications, role adjustments, and security dispatches across MantraAssist"
        />
      )}
      {body}

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
                    : selectedLog.module === "Phone Numbers" || selectedLog.module === "Telephony"
                    ? "/admin/integrations/telephony?tab=numbers"
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

