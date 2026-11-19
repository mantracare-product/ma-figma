import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RefreshCw,
  Search,
  Download,
  Filter,
  Layers,
  LayoutGrid,
  List,
  AlertCircle,
  Clock,
  DollarSign,
  ChevronRight,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn } from "../components/ui/TableComponent";
import {
  ArRecord,
  getStoredArRecords,
  saveArRecord,
  getArWorkflows,
  getArWorkflow,
  AR_CHANGED_EVENT,
  agingBucketOf,
  migrateExistingClaimsToAr,
} from "../../lib/arStore";
import { arService } from "../../lib/arService";
import { DEFAULT_ENTITY_PROCESSES, PROCESS_STORE_EVENT, Stage } from "../../lib/useProcessStore";
import ARDetailDrawer from "../components/ar/ARDetailDrawer";
import { useCurrentPermissions } from "@/hooks/useCurrentPermissions";
import { useNavigate } from "react-router";

const fmtMoney = (n: number | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export default function ArCycle() {
  const navigate = useNavigate();
  const { hasPermission } = useCurrentPermissions();
  const [records, setRecords] = useState<ArRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>("");
  const [selectedPayerFilter, setSelectedPayerFilter] = useState<string>("all");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState<string>("all");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>("all");
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<ArRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const workflowPicked = useRef(false);

  // 1. Initial migrations & loading
  useEffect(() => {
    migrateExistingClaimsToAr();
    const load = () => {
      setRecords(getStoredArRecords());
    };
    load();
    window.addEventListener(AR_CHANGED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(AR_CHANGED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // 2. Workflows
  const arWorkflows = useMemo(() => {
    const list = getArWorkflows();
    return list.length > 0 ? list : [DEFAULT_ENTITY_PROCESSES.ar];
  }, []);

  // 3. Workflow counts and selection
  const workflowCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      const pid = r.processId || arWorkflows[0]?.id;
      counts[pid] = (counts[pid] || 0) + 1;
    }
    return counts;
  }, [records, arWorkflows]);

  useEffect(() => {
    if (workflowPicked.current) return;
    if (arWorkflows.length === 0) return;
    // Default to the workflow with the most records
    let best = arWorkflows[0].id;
    let max = -1;
    for (const wf of arWorkflows) {
      const c = workflowCounts[wf.id] || 0;
      if (c > max) {
        max = c;
        best = wf.id;
      }
    }
    setSelectedProcessFilter(best);
  }, [arWorkflows, workflowCounts]);

  const activeWorkflow = useMemo(() => {
    return arWorkflows.find((w) => w.id === selectedProcessFilter) || arWorkflows[0];
  }, [arWorkflows, selectedProcessFilter]);

  // 4. Distinct values for filters
  const uniquePayers = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.payerName).filter(Boolean)));
  }, [records]);

  const uniqueAssignees = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.assigneeName).filter(Boolean))) as string[];
  }, [records]);

  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.providerName).filter(Boolean)));
  }, [records]);

  // 5. Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Process filter
      if (selectedProcessFilter && (r.processId || arWorkflows[0]?.id) !== selectedProcessFilter) {
        return false;
      }
      // Payer filter
      if (selectedPayerFilter !== "all" && r.payerName !== selectedPayerFilter) {
        return false;
      }
      // Assignee filter
      if (selectedAssigneeFilter !== "all") {
        if (selectedAssigneeFilter === "none" && r.assigneeName) return false;
        if (selectedAssigneeFilter !== "none" && r.assigneeName !== selectedAssigneeFilter) return false;
      }
      // Stage filter
      if (selectedStageFilter !== "all" && r.currentStageId !== selectedStageFilter && r.statusLabel !== selectedStageFilter) {
        return false;
      }
      // Aging Bucket filter
      if (selectedBucketFilter !== "all") {
        const bucket = agingBucketOf(r.ageInDays);
        if (bucket !== selectedBucketFilter) return false;
      }
      // Provider filter
      if (selectedProviderFilter !== "all" && r.providerName !== selectedProviderFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.claimNumber?.toLowerCase().includes(q) ||
          r.patientName?.toLowerCase().includes(q) ||
          r.payerName?.toLowerCase().includes(q) ||
          r.providerName?.toLowerCase().includes(q) ||
          r.statusLabel?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    records,
    selectedProcessFilter,
    arWorkflows,
    selectedPayerFilter,
    selectedAssigneeFilter,
    selectedStageFilter,
    selectedBucketFilter,
    selectedProviderFilter,
    searchQuery,
  ]);

  // Summary totals
  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        acc.billed += r.billedAmount || 0;
        acc.paid += r.paidAmount || 0;
        acc.adjustments += r.adjustmentAmount || 0;
        acc.patientResp += r.patientResponsibility || 0;
        acc.outstanding += r.outstandingAmount || 0;
        return acc;
      },
      { billed: 0, paid: 0, adjustments: 0, patientResp: 0, outstanding: 0 }
    );
  }, [filteredRecords]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }
    const headers = [
      "Claim Number",
      "Patient Name",
      "Payer Name",
      "Provider Name",
      "Date of Service",
      "Submitted Date",
      "Age (Days)",
      "Billed Amount",
      "Paid Amount",
      "Adjustments",
      "Patient Responsibility",
      "Outstanding Balance",
      "Stage",
      "Assignee",
      "Next Follow-up",
    ];
    const rows = filteredRecords.map((r) => [
      `"${r.claimNumber || ""}"`,
      `"${r.patientName || ""}"`,
      `"${r.payerName || ""}"`,
      `"${r.providerName || ""}"`,
      `"${r.dateOfService || ""}"`,
      `"${r.submittedDate || ""}"`,
      r.ageInDays || 0,
      r.billedAmount || 0,
      r.paidAmount || 0,
      r.adjustmentAmount || 0,
      r.patientResponsibility || 0,
      r.outstandingAmount || 0,
      `"${r.statusLabel || ""}"`,
      `"${r.assigneeName || ""}"`,
      `"${r.nextFollowUpDate || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AR_Cycle_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("AR records exported to CSV");
  };

  // Permission Gate
  if (!hasPermission("arCycle", "read")) {
    return (
      <div className="p-8 text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-1">
            You do not have permission to view the A/R Cycle module. Contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  // Table Columns
  const columns: TableColumn<ArRecord>[] = [
    {
      key: "claimNumber",
      header: "Claim / AR #",
      render: (r) => (
        <div className="font-semibold text-blue-600 hover:underline cursor-pointer">
          {r.claimNumber}
        </div>
      ),
    },
    {
      key: "patientName",
      header: "Patient",
      render: (r) => <div className="font-medium text-slate-800">{r.patientName}</div>,
    },
    {
      key: "payerName",
      header: "Payer",
      render: (r) => <div className="text-slate-600 truncate max-w-[130px]">{r.payerName}</div>,
    },
    {
      key: "dateOfService",
      header: "DOS",
      render: (r) => <span className="text-slate-600 text-xs">{r.dateOfService}</span>,
    },
    {
      key: "submittedDate",
      header: "Submitted",
      render: (r) => <span className="text-slate-500 text-xs">{r.submittedDate?.slice(0, 10)}</span>,
    },
    {
      key: "ageInDays",
      header: "Age",
      render: (r) => {
        const bucket = agingBucketOf(r.ageInDays);
        const color =
          bucket === "0-30"
            ? "text-slate-700 bg-slate-100"
            : bucket === "31-60"
            ? "text-blue-700 bg-blue-50"
            : bucket === "61-90"
            ? "text-amber-700 bg-amber-50"
            : "text-rose-700 bg-rose-50";
        return (
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${color}`}>
            {r.ageInDays}d
          </span>
        );
      },
    },
    {
      key: "billedAmount",
      header: "Billed",
      render: (r) => <span className="font-medium text-slate-700">{fmtMoney(r.billedAmount)}</span>,
    },
    {
      key: "paidAmount",
      header: "Paid",
      render: (r) => <span className="font-semibold text-emerald-600">{fmtMoney(r.paidAmount)}</span>,
    },
    {
      key: "adjustmentAmount",
      header: "Adjustments",
      render: (r) => <span className="text-slate-500">{fmtMoney(r.adjustmentAmount)}</span>,
    },
    {
      key: "patientResponsibility",
      header: "Patient Resp",
      render: (r) => (
        <span className={r.patientResponsibility > 0 ? "font-semibold text-amber-600" : "text-slate-400"}>
          {fmtMoney(r.patientResponsibility)}
        </span>
      ),
    },
    {
      key: "outstandingAmount",
      header: "Outstanding",
      render: (r) => (
        <span className="font-bold text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded">
          {fmtMoney(r.outstandingAmount)}
        </span>
      ),
    },
    {
      key: "statusLabel",
      header: "Stage",
      render: (r) => {
        const isClosed = r.statusLabel?.toLowerCase().includes("closed") || r.statusLabel?.toLowerCase().includes("written");
        const isDenied = r.statusLabel?.toLowerCase().includes("denied");
        return (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              isClosed
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : isDenied
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {r.statusLabel}
          </span>
        );
      },
    },
    {
      key: "assigneeName",
      header: "Assignee",
      render: (r) => <span className="text-xs text-slate-600">{r.assigneeName || "—"}</span>,
    },
    {
      key: "nextFollowUpDate",
      header: "Next Follow-up",
      render: (r) => <span className="text-xs text-slate-500">{r.nextFollowUpDate || "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Top Header */}
      <PageHeader
        title="A/R Cycle"
        subtitle="Manage accounts receivable, payer follow-ups, appeals, and balance settlement"
      />

      {/* Main Top Bar */}
      <div className="px-6 py-3">
        <PageTopBar
          isBottomPanelAttached={true}
          leftElement={
            <select
              aria-label="Workflow"
              value={selectedProcessFilter}
              onChange={(e) => {
                workflowPicked.current = true;
                setSelectedProcessFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[36px] text-xs px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs"
            >
              {arWorkflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({workflowCounts[wf.id] || 0})
                </option>
              ))}
            </select>
          }
          showSearch={true}
          searchQuery={searchQuery}
          onSearchChange={(v) => {
            setSearchQuery(v);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search AR #, patient, payer, provider..."
          secondaryActions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Payer Filter */}
              <select
                aria-label="Payer"
                value={selectedPayerFilter}
                onChange={(e) => {
                  setSelectedPayerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All payers</option>
                {uniquePayers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {/* Aging Bucket Filter */}
              <select
                aria-label="Aging Bucket"
                value={selectedBucketFilter}
                onChange={(e) => {
                  setSelectedBucketFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All aging buckets</option>
                <option value="0-30">0-30 days</option>
                <option value="31-60">31-60 days</option>
                <option value="61-90">61-90 days</option>
                <option value="91-120">91-120 days</option>
                <option value="120+">120+ days</option>
              </select>

              {/* Stage Filter */}
              <select
                aria-label="Stage"
                value={selectedStageFilter}
                onChange={(e) => {
                  setSelectedStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All stages</option>
                {(activeWorkflow?.stages || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Assignee Filter */}
              <select
                aria-label="Assignee"
                value={selectedAssigneeFilter}
                onChange={(e) => {
                  setSelectedAssigneeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer shadow-2xs"
              >
                <option value="all">All assignees</option>
                <option value="none">Unassigned</option>
                {uniqueAssignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === "list" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="List view"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("board")}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewMode === "board" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Board view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Board</span>
                </button>
              </div>

              {/* Export */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="h-[36px] px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </button>
            </div>
          }
        />
      </div>

      {/* Metrics Bar */}
      <div className="px-6 py-2">
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Billed</span>
            <p className="text-base font-bold text-slate-800">{fmtMoney(totals.billed)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</span>
            <p className="text-base font-bold text-emerald-600">{fmtMoney(totals.paid)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Adjustments</span>
            <p className="text-base font-bold text-slate-600">{fmtMoney(totals.adjustments)}</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Patient Balance</span>
            <p className="text-base font-bold text-amber-600">{fmtMoney(totals.patientResp)}</p>
          </div>
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 shadow-2xs">
            <span className="text-[10px] text-blue-600 uppercase font-bold">Outstanding A/R</span>
            <p className="text-base font-bold text-blue-700">{fmtMoney(totals.outstanding)}</p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 py-4">
        {viewMode === "list" ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <TableComponent
              data={filteredRecords}
              columns={columns}
              getRowId={(r) => r.id}
              onRowClick={(r) => setSelectedRecord(r)}
              pagination={true}
              emptyMessage="No AR records found"
            />
          </div>
        ) : (
          /* Kanban Board View */
          <div className="flex gap-4 overflow-x-auto pb-6">
            {(activeWorkflow?.stages || []).map((stage: Stage) => {
              const stageRecords = filteredRecords.filter(
                (r) => r.currentStageId === stage.id || r.statusLabel === stage.name
              );
              const stageTotal = stageRecords.reduce((s, r) => s + (r.outstandingAmount || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="w-80 shrink-0 bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col max-h-[calc(100vh-280px)]"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color || "#3B82F6" }}
                      />
                      <span className="text-xs font-bold text-slate-800 truncate">{stage.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-white text-slate-600 border border-slate-200">
                        {stageRecords.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{fmtMoney(stageTotal)}</span>
                  </div>

                  {/* Cards List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {stageRecords.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                        No records
                      </p>
                    ) : (
                      stageRecords.map((r) => {
                        const bucket = agingBucketOf(r.ageInDays);
                        return (
                          <div
                            key={r.id}
                            onClick={() => setSelectedRecord(r)}
                            className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-blue-600">{r.claimNumber}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  bucket === "0-30"
                                    ? "bg-slate-100 text-slate-700"
                                    : bucket === "31-60"
                                    ? "bg-blue-50 text-blue-700"
                                    : bucket === "61-90"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {r.ageInDays}d
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-800 truncate">{r.patientName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{r.payerName}</p>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Outstanding</span>
                                <span className="font-bold text-blue-700">{fmtMoney(r.outstandingAmount)}</span>
                              </div>
                              {r.nextFollowUpDate && (
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">Follow-up</span>
                                  <span className="text-[10px] font-semibold text-slate-600">
                                    {r.nextFollowUpDate}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AR Detail Drawer */}
      <ARDetailDrawer
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        onRecordUpdated={(upd) => {
          setSelectedRecord(upd);
          setRecords((prev) => prev.map((r) => (r.id === upd.id ? upd : r)));
        }}
        onOpenClaim={(claimId) => {
          setSelectedRecord(null);
          navigate(`/claims?claimId=${claimId}`);
        }}
      />
    </div>
  );
}
