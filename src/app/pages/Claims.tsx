import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Plus,
  Search,
  Send,
  FileCheck,
  Pencil,
  Eye,
} from "lucide-react";
import Button from "../components/ui/Button";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import { TableComponent, TableColumn, TableRowAction } from "../components/ui/TableComponent";
import {
  Claim,
  ClaimStatus,
  getStoredClaims,
  CLAIMS_CHANGED_EVENT,
  saveClaim,
} from "../../lib/claimsStore";
import CreateClaimDrawer from "../components/claims/CreateClaimDrawer";
import ClaimSubmissionModal from "../components/claims/ClaimSubmissionModal";
import ClaimStatusModal from "../components/claims/ClaimStatusModal";
import CMS1500Modal from "../components/claims/CMS1500Modal";
import ClaimProgressBar from "../components/claims/ClaimProgressBar";
import { InfoTooltip } from "../components/help/InfoTooltip";

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");
  const [selectedPayerFilter, setSelectedPayerFilter] = useState<string>("all");
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  // Modals state
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [activeSubmissionClaim, setActiveSubmissionClaim] = useState<Claim | null>(null);
  const [activeStatusClaim, setActiveStatusClaim] = useState<Claim | null>(null);
  const [activeCMS1500Claim, setActiveCMS1500Claim] = useState<Claim | null>(null);

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
    setEditingClaim(claim);
    setIsCreateDrawerOpen(true);
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
            </div>
          }
          primaryAction={{
            label: "Create Claim",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => {
              setEditingClaim(null);
              setIsCreateDrawerOpen(true);
            },
          }}
        />

        {/* Claims Table View Connected with TableComponent */}
        {(() => {
          const claimColumns: TableColumn<Claim>[] = [
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
              id: "claimNumber",
              header: "Claim ID",
              align: "left",
              render: (claim) => (
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {claim.claimNumber}
                </span>
              ),
            },
            {
              id: "payer",
              header: "Insurance Payer",
              align: "center",
              render: (claim) => (
                <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] inline-block" title={claim.payer.name} style={{ fontFamily: "Outfit, sans-serif" }}>
                  {claim.payer.name}
                </span>
              ),
            },
            {
              id: "stage",
              header: "Stage",
              align: "center",
              render: (claim) => (
                <div className="flex items-center justify-center">
                  <ClaimProgressBar
                    status={claim.status}
                    onStatusChange={(newSt) => handleStatusChange(claim.id, newSt)}
                    interactive={true}
                    claimId={claim.id}
                  />
                </div>
              ),
            },
            {
              id: "status",
              header: "Status",
              align: "center",
              render: (claim) => getStatusBadge(claim.status),
            },
            {
              id: "serviceDate",
              header: "Service Date",
              align: "center",
              render: (claim) => (
                <span className="text-slate-600 font-medium text-xs font-mono">
                  {claim.serviceDate}
                </span>
              ),
            },
            {
              id: "totalCharge",
              header: "Billed Amount",
              align: "center",
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

      {/* Create / Edit Claim Drawer */}
      <CreateClaimDrawer
        isOpen={isCreateDrawerOpen}
        claimToEdit={editingClaim}
        onClose={() => {
          setIsCreateDrawerOpen(false);
          setEditingClaim(null);
        }}
        onClaimCreated={(createdClaim, autoOpenSubmit) => {
          refreshClaims();
          if (autoOpenSubmit) {
            setActiveSubmissionClaim(createdClaim);
          }
        }}
      />

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
      </div>
    </div>
  );
}
