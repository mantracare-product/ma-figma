import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Plus,
  Search,
  Send,
  FileCheck,
  Pencil,
  Eye,
  Settings as SettingsIcon,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/Button";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { Tooltip } from "../components/ui/Tooltip";
import { DataExportModal } from "../components/common/DataExportModal";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import {
  Claim,
  ClaimStatus,
  getStoredClaims,
  CLAIMS_CHANGED_EVENT,
  saveClaim,
} from "../../lib/claimsStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT } from "../../lib/useProcessStore";
import ClaimSubmissionModal from "../components/claims/ClaimSubmissionModal";
import ClaimStatusModal from "../components/claims/ClaimStatusModal";
import CMS1500Modal from "../components/claims/CMS1500Modal";
import ClaimProgressBar from "../components/claims/ClaimProgressBar";
import ClaimDetailDrawer from "../components/claims/ClaimDetailDrawer";
import { InfoTooltip } from "../components/help/InfoTooltip";

export default function Claims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");
  const [selectedPayerFilter, setSelectedPayerFilter] = useState<string>("all");
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [storeTick, setStoreTick] = useState(0);

  // Workflow integration: retrieve configured insurance & claims process
  useEffect(() => {
    const handleStoreChange = () => setStoreTick((t) => t + 1);
    window.addEventListener(PROCESS_STORE_EVENT, handleStoreChange);
    window.addEventListener("storage", handleStoreChange);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, []);

  const insuranceProcesses = useMemo(() => {
    const procs = getStoredProcesses();
    const list = procs.filter((p) => p.entityType === "insurance");
    return list.length > 0 ? list : [DEFAULT_ENTITY_PROCESSES.insurance];
  }, [storeTick]);

  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>("");

  const insuranceProcess = useMemo(() => {
    if (selectedProcessFilter) {
      const found = insuranceProcesses.find((p) => p.id === selectedProcessFilter);
      if (found) return found;
    }
    return insuranceProcesses[0] || DEFAULT_ENTITY_PROCESSES.insurance;
  }, [insuranceProcesses, selectedProcessFilter]);

  // Modals state
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [activeSubmissionClaim, setActiveSubmissionClaim] = useState<Claim | null>(null);
  const [activeStatusClaim, setActiveStatusClaim] = useState<Claim | null>(null);
  const [activeCMS1500Claim, setActiveCMS1500Claim] = useState<Claim | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState<Claim | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Load claims
  const refreshClaims = () => {
    setClaims(getStoredClaims());
  };

  useEffect(() => {
    refreshClaims();
    const handleClaimsChanged = () => refreshClaims();
    window.addEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChanged);
    return () => window.removeEventListener(CLAIMS_CHANGED_EVENT, handleClaimsChanged);
  }, []);

  const handleEditClaim = (claim: Claim) => {
    setSelectedClaimForDetail(claim);
    setIsCreateMode(false);
    setIsDetailDrawerOpen(true);
  };

  const handleStatusChange = (claimId: string, newStatus: ClaimStatus) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;
    const updated: Claim = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveClaim(updated);
    refreshClaims();
  };

  const handleStageChange = (claimId: string, stageId: string, stageName?: string) => {
    const target = claims.find((c) => c.id === claimId);
    if (!target) return;
    const stageObj = insuranceProcess.stages.find((s) => s.id === stageId);
    const name = stageName || stageObj?.name || stageId;

    let newStatus: ClaimStatus = target.status;
    const lower = name.toLowerCase();
    if (lower.includes("paid")) newStatus = "Paid";
    else if (lower.includes("accept") || lower.includes("verified")) newStatus = "Accepted";
    else if (lower.includes("submit")) newStatus = "Submitted";
    else if (lower.includes("review")) newStatus = "Under Review";
    else if (lower.includes("ready") || lower.includes("pending")) newStatus = "Ready to Submit";
    else if (lower.includes("reject") || lower.includes("fail") || lower.includes("denied")) newStatus = "Rejected";
    else if (lower.includes("draft")) newStatus = "Draft";

    const updated: Claim = {
      ...target,
      currentStageId: stageId,
      statusLabel: name,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveClaim(updated);
    refreshClaims();
    toast.success(`Claim moved to ${name} ✓`);
  };

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Tab filter
      if (selectedStatusTab === "ready" && claim.status !== "Ready to Submit") return false;
      if (selectedStatusTab === "submitted" && !["Submitted", "Under Review"].includes(claim.status)) return false;
      if (selectedStatusTab === "accepted" && claim.status !== "Accepted") return false;
      if (selectedStatusTab === "paid" && claim.status !== "Paid") return false;
      if (selectedStatusTab === "draft" && claim.status !== "Draft") return false;

      // Payer filter
      if (selectedPayerFilter !== "all" && claim.payer.name !== selectedPayerFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = claim.claimNumber.toLowerCase().includes(q);
        const matchesPatient = claim.patientName.toLowerCase().includes(q);
        const matchesPayer = claim.payer.name.toLowerCase().includes(q) || claim.payer.payerId.toLowerCase().includes(q);
        const matchesICD = claim.diagnosisCodes.some(
          (d) => d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
        );
        const matchesCPT = claim.lines.some(
          (l) => l.cptCode.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
        );
        if (!matchesNumber && !matchesPatient && !matchesPayer && !matchesICD && !matchesCPT) {
          return false;
        }
      }

      return true;
    });
  }, [claims, selectedStatusTab, selectedPayerFilter, searchQuery]);

  // Statistics for tab counts
  const stats = useMemo(() => {
    const totalCount = claims.length;
    const paidCount = claims.filter((c) => c.status === "Paid").length;
    const readyCount = claims.filter((c) => c.status === "Ready to Submit").length;
    const submittedCount = claims.filter((c) => ["Submitted", "Under Review", "Accepted"].includes(c.status)).length;
    const draftCount = claims.filter((c) => c.status === "Draft").length;

    return {
      totalCount,
      paidCount,
      readyCount,
      submittedCount,
      draftCount,
    };
  }, [claims]);

  // Unique payers for filter dropdown
  const uniquePayers = useMemo(() => {
    const set = new Set<string>();
    claims.forEach((c) => set.add(c.payer.name));
    return Array.from(set);
  }, [claims]);

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "Paid":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">Paid</span>;
      case "Accepted":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">Accepted</span>;
      case "Submitted":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">Submitted (837P)</span>;
      case "Ready to Submit":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">Ready to Submit</span>;
      case "Under Review":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 whitespace-nowrap">Under Review</span>;
      case "Draft":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">Draft</span>;
      case "Rejected":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredClaims.length);
  const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* Top Header */}
        <PageHeader
          title="Insurance & Claims"
          subtitle="End-to-end RCM: Auto-link appointments, CPT codes, and AI Scribe ICD-10 notes into electronic 837P claims and CMS-1500 forms."
        />

        {/* Filter and Search Bar powered by PageTopBar */}
        <PageTopBar
          isBottomPanelAttached={true}
          searchQuery={searchQuery}
          onSearchChange={(v) => {
            setSearchQuery(v);
            setCurrentPage(1);
          }}
          searchPlaceholder="Search by Claim #, Patient Name, Insurance Payer, ICD-10 or CPT code..."
          filterPresets={[
            {
              id: "all",
              label: "All Claims",
              count: claims.length,
              isActive: selectedStatusTab === "all",
              onClick: () => {
                setSelectedStatusTab("all");
                setCurrentPage(1);
              },
            },
            {
              id: "ready",
              label: "Ready to Submit",
              count: stats.readyCount,
              isActive: selectedStatusTab === "ready",
              onClick: () => {
                setSelectedStatusTab("ready");
                setCurrentPage(1);
              },
            },
            {
              id: "submitted",
              label: "Submitted & Review",
              count: stats.submittedCount,
              isActive: selectedStatusTab === "submitted",
              onClick: () => {
                setSelectedStatusTab("submitted");
                setCurrentPage(1);
              },
            },
            {
              id: "paid",
              label: "Paid Claims",
              count: stats.paidCount,
              isActive: selectedStatusTab === "paid",
              onClick: () => {
                setSelectedStatusTab("paid");
                setCurrentPage(1);
              },
            },
            {
              id: "draft",
              label: "Drafts",
              count: stats.draftCount,
              isActive: selectedStatusTab === "draft",
              onClick: () => {
                setSelectedStatusTab("draft");
                setCurrentPage(1);
              },
            },
          ]}
          filterFields={[
            {
              id: "query",
              label: "Patient Name / Claim #",
              type: "text",
              placeholder: "Filter by patient or ID...",
              value: searchQuery,
              onChange: (val) => {
                setSearchQuery(val || "");
                setCurrentPage(1);
              },
            },
            {
              id: "status",
              label: "Claim Status",
              type: "select",
              value: selectedStatusTab,
              onChange: (val) => {
                setSelectedStatusTab(val || "all");
                setCurrentPage(1);
              },
              options: [
                { label: `All Claims (${claims.length})`, value: "all" },
                { label: `Ready to Submit (${stats.readyCount})`, value: "ready" },
                { label: `Submitted & Review (${stats.submittedCount})`, value: "submitted" },
                { label: `Paid (${stats.paidCount})`, value: "paid" },
                { label: `Drafts (${stats.draftCount})`, value: "draft" },
              ],
            },
            {
              id: "payer",
              label: "Insurance Payer",
              type: "select",
              value: selectedPayerFilter,
              onChange: (val) => {
                setSelectedPayerFilter(val || "all");
                setCurrentPage(1);
              },
              options: [
                { label: "All Payers", value: "all" },
                ...uniquePayers.map((p) => ({ label: p, value: p })),
              ],
            },
          ]}
          secondaryActions={
            <div className="flex items-center gap-2">
              <select
                value={selectedStatusTab}
                onChange={(e) => {
                  setSelectedStatusTab(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="all">All Claims ({claims.length})</option>
                <option value="ready">Ready to Submit ({stats.readyCount})</option>
                <option value="submitted">Submitted & Review ({stats.submittedCount})</option>
                <option value="paid">Paid ({stats.paidCount})</option>
                <option value="draft">Drafts ({stats.draftCount})</option>
              </select>

              <select
                value={selectedPayerFilter}
                onChange={(e) => {
                  setSelectedPayerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option value="all">All Payers</option>
                {uniquePayers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {insuranceProcesses.length > 1 && (
                <select
                  value={selectedProcessFilter || insuranceProcesses[0].id}
                  onChange={(e) => {
                    setSelectedProcessFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-[36px] text-xs px-3 bg-white border border-border rounded-xl font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {insuranceProcesses.map((proc) => (
                    <option key={proc.id} value={proc.id}>
                      {proc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          }
          primaryAction={{
            label: "Create Claim",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => {
              setSelectedClaimForDetail(null);
              setIsCreateMode(true);
              setIsDetailDrawerOpen(true);
            },
          }}
          afterPrimaryAction={
            <div className="flex items-center gap-2">
              <Tooltip text="Export Claims">
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                  aria-label="Export Claims"
                  title="Export Claims"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                </button>
              </Tooltip>
              <Tooltip text="Configure Insurance & Claims Workflow">
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/process?entity=insurance&processId=${insuranceProcess.id}`, {
                      state: { processId: insuranceProcess.id, processName: insuranceProcess.name },
                    });
                  }}
                  className="p-2 h-[36px] w-[36px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-border bg-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                  aria-label="Configure Insurance & Claims Workflow"
                  title="Configure Insurance & Claims Workflow"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-600" />
                </button>
              </Tooltip>
            </div>
          }
        />

        {/* Unified DataExportModal */}
        <DataExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export Claims"
          subtitle="Export 837P and CMS-1500 insurance claims with payer, diagnosis, and billing details"
          data={claims}
          filenamePrefix="insurance_claims"
          dateFieldKey="serviceDate"
          dateLabel="Service Date"
          statusFieldKey="status"
          statusLabel="Claim Status"
          statusOptions={[
            { label: "Ready to Submit", value: "ready" },
            { label: "Submitted", value: "submitted" },
            { label: "Paid", value: "paid" },
            { label: "Draft", value: "draft" },
          ]}
          allFields={[
            { key: "claimNumber", label: "Claim #", getValue: (c) => c.claimNumber },
            { key: "patientName", label: "Client / Patient", getValue: (c) => c.patientName },
            { key: "insurancePayer", label: "Insurance Payer", getValue: (c) => c.payer?.name || "" },
            { key: "policyNumber", label: "Policy #", getValue: (c) => c.insuredId || "" },
            { key: "serviceDate", label: "Service Date", getValue: (c) => c.serviceDate },
            { key: "totalAmount", label: "Total Billed", getValue: (c) => `$${(c.totalCharge || 0).toFixed(2)}` },
            { key: "status", label: "Status", getValue: (c) => c.status },
            { key: "cptCodes", label: "CPT Codes", getValue: (c) => (c.lines || []).map((x) => x.cptCode).join("; ") },
            { key: "icd10Codes", label: "ICD-10 Diagnoses", getValue: (c) => (c.diagnosisCodes || []).map((x) => x.code).join("; ") },
          ]}
        />

        {/* Claims Table View Connected with TableComponent */}
        {(() => {
          const claimColumns: TableColumn<Claim>[] = [
            {
              id: "claimNumber",
              header: "Claim ID",
              align: "left",
              render: (claim) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClaimForDetail(claim);
                    setIsDetailDrawerOpen(true);
                  }}
                  className="font-mono font-bold text-[#1456f0] hover:underline text-xs cursor-pointer text-left transition-colors"
                  title="Click to view claim details, custom fields & activity"
                >
                  {claim.claimNumber}
                </button>
              ),
            },
            {
              id: "title",
              header: "Title",
              align: "left",
              render: (claim) => {
                const clientName = claim.patientName || "Client";
                const dateStr = claim.serviceDate || (claim.createdAt ? claim.createdAt.slice(0, 10) : "2026-10-15");
                const titleStr = `${clientName}_Claim_${dateStr}`;
                return (
                  <span
                    className="font-medium text-xs text-slate-800 truncate max-w-[220px] inline-block"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title={titleStr}
                  >
                    {titleStr}
                  </span>
                );
              },
            },
            {
              id: "stage",
              header: "Stages",
              align: "center",
              render: (claim) => {
                const stages = insuranceProcess.stages;
                const stageKey = (claim.currentStageId || "").trim();
                const matchedStage = stageKey
                  ? stages.find(
                      (s) =>
                        s.id.toLowerCase() === stageKey.toLowerCase() ||
                        s.name.toLowerCase() === stageKey.toLowerCase() ||
                        (claim.statusLabel && s.name.toLowerCase() === claim.statusLabel.toLowerCase())
                    )
                  : (stages.find((s) => s.systemCategory === claim.status || s.name.toLowerCase() === (claim.status || "").toLowerCase()) || stages[0]);

                return (
                  <div className="flex items-center justify-center">
                    <ClaimProgressBar
                      status={claim.status}
                      currentStageId={claim.currentStageId || matchedStage?.id}
                      stages={insuranceProcess.stages}
                      onStatusChange={(stageId, stageName) => handleStageChange(claim.id, stageId, stageName)}
                      interactive={true}
                      claimId={claim.id}
                    />
                  </div>
                );
              },
            },
            {
              id: "patientName",
              header: "Client",
              align: "left",
              render: (claim) => (
                <button
                  type="button"
                  onClick={() => handleEditClaim(claim)}
                  className="font-semibold text-[#1456f0] hover:underline text-xs cursor-pointer text-left"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {claim.patientName}
                </button>
              ),
            },
            {
              id: "payer",
              header: "Insurance Payer",
              align: "left",
              render: (claim) => (
                <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] inline-block" title={claim.payer.name} style={{ fontFamily: "Outfit, sans-serif" }}>
                  {claim.payer.name}
                </span>
              ),
            },
            {
              id: "serviceDate",
              header: "Service Date",
              align: "left",
              render: (claim) => (
                <span className="text-slate-600 font-medium text-xs font-mono">
                  {claim.serviceDate}
                </span>
              ),
            },
            {
              id: "totalCharge",
              header: "Billed Amount",
              align: "right",
              render: (claim) => (
                <span className="font-mono font-bold text-slate-900 text-xs">
                  ${claim.totalCharge.toFixed(2)}
                </span>
              ),
            },
          ];

          const claimRowActions: TableRowAction<Claim>[] = [
            {
              label: "Edit Claim",
              icon: <Pencil className="w-3.5 h-3.5" />,
              onClick: (claim) => handleEditClaim(claim),
            },
            {
              label: "Submit / View Status",
              icon: <Send className="w-3.5 h-3.5" />,
              onClick: (claim) => {
                if (["Ready to Submit", "Draft"].includes(claim.status)) {
                  setActiveSubmissionClaim(claim);
                } else {
                  setActiveStatusClaim(claim);
                }
              },
            },
            {
              label: "View CMS-1500 Form",
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: (claim) => setActiveCMS1500Claim(claim),
            },
          ];

          return (
            <TableComponent
              data={filteredClaims}
              columns={claimColumns}
              getRowId={(claim) => claim.id}
              rowActions={claimRowActions}
              selectedIds={new Set(selectedClaimIds)}
              onSelectionChange={(ids) => setSelectedClaimIds(Array.from(ids) as string[])}
              defaultRowsPerPage={20}
              emptyMessage="No insurance claims found matching your filters."
            />
          );
        })()}

        {/* Claim Submission Modal (Electronic 837P or Manual CMS-1500) */}
        <ClaimSubmissionModal
          claim={activeSubmissionClaim}
          isOpen={!!activeSubmissionClaim}
          onClose={() => setActiveSubmissionClaim(null)}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
          onSubmissionSuccess={() => refreshClaims()}
        />

        {/* Clearinghouse Transmission Status Modal */}
        <ClaimStatusModal
          claim={activeStatusClaim}
          isOpen={!!activeStatusClaim}
          onClose={() => setActiveStatusClaim(null)}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
        />

        {/* CMS-1500 Form Modal */}
        <CMS1500Modal
          claim={activeCMS1500Claim}
          isOpen={!!activeCMS1500Claim}
          onClose={() => setActiveCMS1500Claim(null)}
        />

        {/* Claim Detail Drawer (Standard Architecture: Draggable Sections + Activity Feed + Documents) */}
        <ClaimDetailDrawer
          isOpen={isDetailDrawerOpen}
          isCreateMode={isCreateMode}
          onClose={() => {
            setIsDetailDrawerOpen(false);
            setIsCreateMode(false);
            setSelectedClaimForDetail(null);
          }}
          claim={selectedClaimForDetail}
          onClaimCreated={() => {
            refreshClaims();
          }}
          onEditClaim={(c) => {
            setSelectedClaimForDetail(c);
            setIsCreateMode(false);
            setIsDetailDrawerOpen(true);
          }}
          onOpenCMS1500={(c) => setActiveCMS1500Claim(c)}
        />
      </div>
    </div>
  );
}
