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

        {/* Filter and Search Bar — Unified Top Toolbar */}
        <div className="bg-card rounded-t-xl p-2.5 px-3 border border-border shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Tabs row in search bar */}
            <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-border shrink-0">
              {[
                { id: "all", label: "All Claims", count: claims.length },
                { id: "ready", label: "Ready to Submit", count: stats.readyCount },
                { id: "submitted", label: "Submitted & Review", count: stats.submittedCount },
                { id: "paid", label: "Paid", count: stats.paidCount },
                { id: "draft", label: "Drafts", count: stats.draftCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatusTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStatusTab === tab.id
                      ? "bg-[#1E293B] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedStatusTab === tab.id ? "bg-slate-700 text-slate-200" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Claim #, Patient Name, Insurance Payer, ICD-10 or CPT code..."
                className="w-full h-[36px] pl-9 pr-3 bg-input-background border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Payer Filter dropdown */}
            <select
              value={selectedPayerFilter}
              onChange={(e) => {
                setSelectedPayerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[36px] text-xs px-2.5 border border-input rounded-lg bg-input-background text-foreground focus:outline-none cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option value="all">All Payers</option>
              {uniquePayers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Action button */}
            <button
              type="button"
              onClick={() => {
                setEditingClaim(null);
                setIsCreateDrawerOpen(true);
              }}
              className="h-[36px] px-3.5 bg-[#1E293B] hover:bg-black text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Claim</span>
            </button>
          </div>
        </div>

        {/* Claims Table Card with Dark Thead */}
        <div className="bg-white rounded-b-xl border border-t-0 border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#1E293B] text-white">
                <tr className="h-[34px] select-none">
                  {/* CLIENT Column */}
                  <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    CLIENT
                  </th>

                  {/* CLAIM ID Column */}
                  <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    CLAIM ID
                  </th>

                  {/* INSURANCE PAYER Column */}
                  <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    INSURANCE PAYER
                  </th>

                  {/* STAGE Column */}
                  <th className="px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    <div className="flex items-center justify-center gap-1">
                      STAGE
                      <InfoTooltip text="Claim lifecycle: Draft → Ready to Submit → Submitted → Under Review → Accepted → Paid. Click to change stage." />
                    </div>
                  </th>

                  {/* STATUS Column */}
                  <th className="px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    STATUS
                  </th>

                  {/* SERVICE DATE Column */}
                  <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    SERVICE DATE
                  </th>

                  {/* BILLED AMOUNT Column */}
                  <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    BILLED AMOUNT
                  </th>

                  {/* ACTIONS Column */}
                  <th className="px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClaims.length > 0 ? (
                  paginatedClaims.map((claim) => (
                    <tr key={claim.id} className="h-[32px] hover:bg-slate-50/60 transition-colors">
                      {/* Client Name in blue link style */}
                      <td className="px-3 py-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleEditClaim(claim)}
                          className="font-semibold text-[#1456f0] hover:underline text-xs cursor-pointer text-left"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {claim.patientName}
                        </button>
                      </td>

                      {/* Claim ID */}
                      <td className="px-3 py-1 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                        {claim.claimNumber}
                      </td>

                      {/* Insurance Payer */}
                      <td className="px-3 py-1 whitespace-nowrap">
                        <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] block" title={claim.payer.name} style={{ fontFamily: "Outfit, sans-serif" }}>
                          {claim.payer.name}
                        </span>
                      </td>

                      {/* STAGE (Dedicated Column with Visual Progress Bar) */}
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <ClaimProgressBar
                            status={claim.status}
                            onStatusChange={(newSt) => handleStatusChange(claim.id, newSt)}
                            interactive={true}
                            claimId={claim.id}
                          />
                        </div>
                      </td>

                      {/* STATUS Column */}
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        {getStatusBadge(claim.status)}
                      </td>

                      {/* Service Date */}
                      <td className="px-3 py-1 whitespace-nowrap">
                        <span className="text-slate-600 font-medium text-xs font-mono">
                          {claim.serviceDate}
                        </span>
                      </td>

                      {/* Billed Amount */}
                      <td className="px-3 py-1 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          ${claim.totalCharge.toFixed(2)}
                        </span>
                      </td>

                      {/* Actions: All 3 styled as unified icon action buttons */}
                      <td className="px-3 py-1 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Edit Action Icon Button */}
                          <button
                            type="button"
                            onClick={() => handleEditClaim(claim)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit Claim"
                            aria-label="Edit Claim"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Submit or View Transmission Status Icon Button */}
                          {["Ready to Submit", "Draft"].includes(claim.status) ? (
                            <button
                              type="button"
                              onClick={() => setActiveSubmissionClaim(claim)}
                              className="p-1 rounded inline-flex items-center justify-center transition-colors cursor-pointer border text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 border-blue-200"
                              title="Submit Electronic Claim (EDI 837P)"
                              aria-label="Submit Electronic Claim"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveStatusClaim(claim)}
                              className="p-1 rounded inline-flex items-center justify-center transition-colors cursor-pointer border text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200"
                              title="View Clearinghouse Transmission & Gateway Status"
                              aria-label="View Transmission Status"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3. View CMS-1500 Eye Icon Button */}
                          <button
                            type="button"
                            onClick={() => setActiveCMS1500Claim(claim)}
                            className="p-1 text-slate-600 hover:text-red-600 hover:bg-red-50/60 border border-slate-200 hover:border-red-200 rounded inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View CMS-1500 Form"
                            aria-label="View CMS-1500 Form"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600">No insurance claims found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {searchQuery
                          ? `No claims match "${searchQuery}". Try clearing search filters.`
                          : "Create your first claim linking booked appointments, service CPT codes, and AI Scribe diagnosis."}
                      </p>
                      <div className="mt-4">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setEditingClaim(null);
                            setIsCreateDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Claim
                        </Button>
                      </div>
                    </td>
                  </tr>
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
                Showing {filteredClaims.length === 0 ? 0 : startIndex + 1}–{endIndex} of {filteredClaims.length}
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
