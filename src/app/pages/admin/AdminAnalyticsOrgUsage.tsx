/**
 * AdminAnalyticsOrgUsage.tsx
 * Path: src/app/pages/admin/AdminAnalyticsOrgUsage.tsx
 *
 * Dedicated Admin Console for Cross-Organization Usage Matrix:
 * - Resource consumption per clinical tenant (Users, DIDs, Voice Calls, Storage, Tasks)
 * - 32px dark-header table with mono chips and tabular-nums
 * - Organization drill-down drawer
 * - CSV export
 */

import React, { useState, useMemo } from "react";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import {
  INITIAL_ORG_USAGE,
  OrgUsageItem,
  exportToCsv,
} from "../../../lib/productAnalyticsStore";
import {
  Building2,
  Search,
  Download,
  Users,
  Phone,
  HardDrive,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAnalyticsOrgUsage() {
  const [data, setData] = useState<OrgUsageItem[]>(INITIAL_ORG_USAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Org for Drilldown Drawer
  const [selectedOrg, setSelectedOrg] = useState<OrgUsageItem | null>(null);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.orgName.toLowerCase().includes(q);
        const matchesCode = item.orgCode.toLowerCase().includes(q);
        const matchesIndustry = item.industry.toLowerCase().includes(q);
        const matchesPlan = item.planName.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesIndustry && !matchesPlan) return false;
      }

      return true;
    });
  }, [data, statusFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      "Organization",
      "Org ID",
      "Industry",
      "Plan",
      "Active Users",
      "Phone Numbers",
      "Calls (30d)",
      "Storage (MB)",
      "Task Throughput",
      "AI Accuracy (%)",
      "Status",
    ];
    const rows = filteredData.map((o) => [
      o.orgName,
      o.orgCode,
      o.industry,
      o.planName,
      o.activeUsers,
      o.phoneNumbersCount,
      o.callsLast30Days,
      o.storageMb,
      o.taskThroughput,
      `${o.aiAccuracyScore}%`,
      o.status,
    ]);
    exportToCsv("mantra-organization-usage-matrix", headers, rows);
    toast.success("Exported organization usage matrix to CSV");
  };

  // Table Columns
  const columns: TableColumn<OrgUsageItem>[] = [
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
        <span className="text-xs font-semibold text-gray-900 truncate max-w-[170px] block" title={row.orgName}>
          {row.orgName}
        </span>
      ),
    },
    {
      key: "industry",
      header: "INDUSTRY",
      render: (row) => (
        <span className="text-xs text-gray-600 truncate max-w-[150px] inline-block">{row.industry}</span>
      ),
    },
    {
      key: "planName",
      header: "PLAN TIER",
      render: (row) => (
        <span className="text-xs font-medium text-slate-800">{row.planName}</span>
      ),
    },
    {
      key: "activeUsers",
      header: "USERS",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-800 tabular-nums">{row.activeUsers}</span>
      ),
    },
    {
      key: "phoneNumbersCount",
      header: "NUMBERS",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-800 tabular-nums">{row.phoneNumbersCount}</span>
      ),
    },
    {
      key: "callsLast30Days",
      header: "CALLS (30D)",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-bold text-gray-900 tabular-nums">
          {(row.callsLast30Days || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "storageMb",
      header: "STORAGE",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-700 tabular-nums">
          {(row.storageMb || 0) > 1024 ? `${((row.storageMb || 0) / 1024).toFixed(1)} GB` : `${row.storageMb} MB`}
        </span>
      ),
    },
    {
      key: "taskThroughput",
      header: "TASKS/MO",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono text-gray-800 tabular-nums">
          {(row.taskThroughput || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "aiAccuracyScore",
      header: "AI ACCURACY",
      align: "right",
      render: (row) => (
        <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
          {row.aiAccuracyScore}%
        </span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (row) => {
        if (row.status === "Active") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          );
        }
        if (row.status === "Trial") {
          return (
            <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
              Trial
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
            {row.status}
          </span>
        );
      },
    },
  ];

  // Row Actions (⋮)
  const rowActions: TableRowAction<OrgUsageItem>[] = [
    {
      label: "View Usage Details",
      icon: <Activity className="w-3.5 h-3.5 text-blue-600" />,
      onClick: (item) => setSelectedOrg(item),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
      <PageHeader
        title="Organization Usage Matrix"
        subtitle="Multi-tenant utilization benchmarking, telephony traffic consumption, and storage metrics"
      />

      <div className="p-6 space-y-5">
        {/* Filters Toolbar powered by PageTopBar */}
        <PageTopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search organization, ID, or industry..."
          onExport={handleExportCsv}
          leftElement={
            <div className="flex items-center gap-2 flex-wrap mr-1">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[34px] px-2.5 pr-7 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer appearance-none shadow-2xs max-w-[130px] transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Past due">Past due</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          }
        />

        {/* Data Table */}
        <TableComponent
          data={filteredData}
          columns={columns}
          rowActions={rowActions}
          actionIcon="menu"
          defaultRowsPerPage={20}
          onRowClick={(item) => setSelectedOrg(item)}
        />
      </div>

      {/* Org Usage Drilldown Drawer */}
      <DrawerShell
        isOpen={!!selectedOrg}
        onClose={() => setSelectedOrg(null)}
        title={selectedOrg?.orgName || "Organization Usage"}
        subtitle={`${selectedOrg?.orgCode} · ${selectedOrg?.industry}`}
        width="max-w-xl"
        icon={<Building2 className="w-5 h-5 text-blue-600" />}
      >
        {selectedOrg && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Subscription Plan</span>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{selectedOrg.planName}</div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  {selectedOrg.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Calls Processed (30d)</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {selectedOrg.callsLast30Days.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">AI Accuracy Score</div>
                <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                  {selectedOrg.aiAccuracyScore}%
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Allocated Phone Numbers</div>
                <div className="text-xl font-bold font-mono text-blue-600 mt-1">
                  {selectedOrg.phoneNumbersCount} DIDs
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Active Team Seats</div>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {selectedOrg.activeUsers} Users
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Storage & Document Quotas
              </h4>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-500">Storage Ingestion</span>
                <span className="font-mono text-slate-900 font-medium">
                  {selectedOrg.storageMb} MB / 10,000 MB
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-500">Last Telephony Activity</span>
                <span className="font-mono text-slate-900 font-medium">
                  {new Date(selectedOrg.lastActive).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </DrawerShell>
    </div>
  );
}

