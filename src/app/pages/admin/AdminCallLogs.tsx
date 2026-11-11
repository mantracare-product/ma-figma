/**
 * AdminCallLogs.tsx
 * Path: src/app/pages/admin/AdminCallLogs.tsx
 *
 * Dedicated Admin Console for Cross-Organization Call Logs:
 * - Real-time cross-tenant call records
 * - Filters: Organization, Carrier Provider, Direction, Status, Date Range, Search
 * - 32px table rows with mono chips and tabular-nums
 * - Audio playback & AI transcript drawer
 * - CSV export
 */

import React, { useState, useMemo } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import {
  useAdminCallLogs,
  AdminCallLogItem,
  TelephonyProviderName,
} from "../../../lib/telephonyAdminStore";
import { useOrganization } from "../../context/OrganizationContext";
import {
  PhoneCall,
  Search,
  Download,
  Filter,
  Play,
  Pause,
  Volume2,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Radio,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "../../../lib/productAnalyticsStore";

function formatSeconds(sec: number): string {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function AdminCallLogs() {
  const { callLogs } = useAdminCallLogs();
  const { organizations } = useOrganization();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Call Detail / Audio Drawer
  const [selectedCall, setSelectedCall] = useState<AdminCallLogItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Filtered dataset
  const filteredCalls = useMemo(() => {
    return callLogs.filter((call) => {
      if (orgFilter !== "all" && call.orgId !== orgFilter) return false;
      if (providerFilter !== "all" && call.provider !== providerFilter) return false;
      if (directionFilter !== "all" && call.direction !== directionFilter) return false;
      if (statusFilter !== "all" && call.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = call.id.toLowerCase().includes(q);
        const matchesCaller = call.caller.toLowerCase().includes(q);
        const matchesCallee = call.callee.toLowerCase().includes(q);
        const matchesOrg = call.orgName.toLowerCase().includes(q);
        const matchesOutcome = call.aiOutcome.toLowerCase().includes(q);
        if (!matchesId && !matchesCaller && !matchesCallee && !matchesOrg && !matchesOutcome) return false;
      }

      return true;
    });
  }, [callLogs, orgFilter, providerFilter, directionFilter, statusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = filteredCalls.length;
    const answered = filteredCalls.filter((c) => c.status === "Answered").length;
    const answeredPct = total > 0 ? ((answered / total) * 100).toFixed(1) : "0.0";
    const totalMinutes = (
      filteredCalls.reduce((acc, c) => acc + (c.duration || 0), 0) / 60
    ).toFixed(1);
    const totalCost = filteredCalls.reduce((acc, c) => acc + (c.cost || 0), 0).toFixed(2);
    return { total, answered, answeredPct, totalMinutes, totalCost };
  }, [filteredCalls]);

  const handleExportCsv = () => {
    const headers = [
      "Call ID",
      "Timestamp",
      "Organization",
      "Org ID",
      "Provider",
      "Direction",
      "Caller",
      "Callee",
      "Duration (s)",
      "Status",
      "AI Outcome",
      "Cost ($)",
    ];
    const rows = filteredCalls.map((c) => [
      c.id,
      new Date(c.timestamp).toLocaleString(),
      c.orgName,
      c.orgCode,
      c.provider,
      c.direction,
      c.caller,
      c.callee,
      c.duration,
      c.status,
      c.aiOutcome,
      `$${c.cost.toFixed(2)}`,
    ]);
    exportToCsv("mantra-cross-org-calls", headers, rows);
    toast.success("Exported call logs to CSV");
  };

  // Table Columns
  const columns: TableColumn<AdminCallLogItem>[] = [
    {
      key: "id",
      header: "CALL ID",
      render: (row) => (
        <span className="font-mono font-bold text-gray-900 text-xs tabular-nums">
          {row.id}
        </span>
      ),
    },
    {
      key: "timestamp",
      header: "TIME",
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono tabular-nums whitespace-nowrap">
          {new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "orgCode",
      header: "ORG ID",
      width: "110px",
      render: (row) => (
        <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
          {row.orgCode}
        </span>
      ),
    },
    {
      key: "orgName",
      header: "ORGANIZATION",
      render: (row) => (
        <span className="text-xs font-medium text-gray-900 truncate max-w-[150px] block" title={row.orgName}>
          {row.orgName}
        </span>
      ),
    },
    {
      key: "direction",
      header: "DIR",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            row.direction === "Inbound"
              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
              : "bg-purple-50 text-purple-700 border border-purple-200/60"
          }`}
        >
          {row.direction === "Inbound" ? (
            <ArrowDownLeft className="w-3 h-3 text-blue-600" />
          ) : (
            <ArrowUpRight className="w-3 h-3 text-purple-600" />
          )}
          {row.direction}
        </span>
      ),
    },
    {
      key: "caller",
      header: "FROM",
      render: (row) => (
        <span className="font-mono text-xs text-gray-700 tabular-nums">{row.caller}</span>
      ),
    },
    {
      key: "callee",
      header: "TO",
      render: (row) => (
        <span className="font-mono text-xs text-gray-700 tabular-nums">{row.callee}</span>
      ),
    },
    {
      key: "duration",
      header: "DURATION",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-medium text-gray-800 tabular-nums">
          {formatSeconds(row.duration)}
        </span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (row) => {
        if (row.status === "Answered") {
          return (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              Answered
            </span>
          );
        }
        if (row.status === "Missed") {
          return (
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              Missed
            </span>
          );
        }
        return (
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {row.status}
          </span>
        );
      },
    },
    {
      key: "aiOutcome",
      header: "AI OUTCOME",
      render: (row) => {
        let badgeColor = "bg-slate-100 text-slate-700";
        if (row.aiOutcome === "Appointment Booked") badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200/60";
        if (row.aiOutcome === "Inquiry Resolved") badgeColor = "bg-blue-50 text-blue-800 border-blue-200/60";
        if (row.aiOutcome === "Transferred to Human") badgeColor = "bg-indigo-50 text-indigo-800 border-indigo-200/60";
        if (row.aiOutcome === "Callback Scheduled") badgeColor = "bg-purple-50 text-purple-800 border-purple-200/60";

        return (
          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {row.aiOutcome}
          </span>
        );
      },
    },
    {
      key: "cost",
      header: "COST",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-700 tabular-nums">
          ${(row.cost || 0).toFixed(2)}
        </span>
      ),
    },
  ];

  // Table Row Actions (⋮)
  const rowActions: TableRowAction<AdminCallLogItem>[] = [
    {
      label: "Audio Recording & Transcript",
      icon: <Volume2 className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => setSelectedCall(item),
    },
    {
      label: "View AI Summary",
      icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (item) => setSelectedCall(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Cross-Org Call Logs"
        subtitle="Global inspection of clinical telephony sessions, AI outcome classification, and audio recordings"
      />

      <div className="p-6 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Calls Processed</span>
              <PhoneCall className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {metrics.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Cross-organization live volume</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Answer Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-display text-emerald-700 tabular-nums">
              {metrics.answeredPct}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{metrics.answered} answered successfully</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Minutes</span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              {metrics.totalMinutes} min
            </div>
            <div className="text-[11px] text-gray-500 mt-1">AI voice compute time</div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Carrier Toll Cost</span>
              <Radio className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-display text-gray-900 tabular-nums">
              ${metrics.totalCost}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Twilio, Exotel & Plivo billables</div>
          </div>
        </div>

        {/* Filters Toolbar powered by PageTopBar */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search ID, phone, caller..."
          onExport={handleExportCsv}
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              {/* Organization filter */}
              <div className="relative">
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[140px] transition-colors truncate"
                >
                  <option value="all">All Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Provider filter */}
              <div className="relative">
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                >
                  <option value="all">All Providers</option>
                  <option value="Twilio">Twilio</option>
                  <option value="Exotel">Exotel</option>
                  <option value="Plivo">Plivo</option>
                  <option value="Telnyx">Telnyx</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Direction filter */}
              <div className="relative">
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
                >
                  <option value="all">All Directions</option>
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[120px] transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="Answered">Answered</option>
                  <option value="Missed">Missed</option>
                  <option value="Voicemail">Voicemail</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          }
        />

        {/* Table */}
        <TableComponent
          data={filteredCalls}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
          onRowClick={(item) => setSelectedCall(item)}
        />
      </div>

      {/* Audio Playback & Transcript Drawer */}
      <DrawerShell
        isOpen={!!selectedCall}
        onClose={() => {
          setSelectedCall(null);
          setIsPlaying(false);
        }}
        title={`Call Session ${selectedCall?.id}`}
        subtitle={`${selectedCall?.orgName} (${selectedCall?.orgCode}) · ${selectedCall?.provider}`}
        width="max-w-xl"
        icon={<PhoneCall className="w-5 h-5 text-blue-600" />}
      >
        {selectedCall && (
          <div className="p-6 space-y-6">
            {/* Audio Player Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Audio Recording</span>
                <span className="font-mono tabular-nums">{formatSeconds(selectedCall.duration)}</span>
              </div>

              {selectedCall.recordingUrl ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white cursor-pointer transition-colors shadow-md shrink-0"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-500 transition-all ${
                        isPlaying ? "w-2/3 animate-pulse" : "w-1/4"
                      }`}
                    />
                  </div>

                  <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2">
                  No recording available for this call session (short duration or caller hangup).
                </div>
              )}
            </div>

            {/* AI Clinical Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  AI Clinical Assessment & Outcome
                </h4>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Outcome: {selectedCall.aiOutcome}
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                {selectedCall.summary || "No automated AI summary was generated for this session."}
              </p>
            </div>

            {/* Call Metadata */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Session Telemetry
              </h4>

              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">From / Caller</span>
                <span className="font-mono text-slate-800 font-semibold">{selectedCall.caller}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">To / Callee</span>
                <span className="font-mono text-slate-800 font-semibold">{selectedCall.callee}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">Carrier Provider</span>
                <span className="text-slate-800 font-medium">{selectedCall.provider}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">Duration</span>
                <span className="font-mono text-slate-800 font-medium">
                  {selectedCall.duration} seconds ({formatSeconds(selectedCall.duration)})
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-500">Carrier Transit Fee</span>
                <span className="font-mono text-slate-800 font-semibold">
                  ${selectedCall.cost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
}

