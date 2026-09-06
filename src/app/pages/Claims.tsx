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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Insurance &amp; Claims"
        subtitle="End-to-end RCM: Auto-link appointments, CPT codes, and AI Scribe ICD-10 notes into electronic 837P claims and CMS-1500 forms."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456f0] border border-blue-200/60">
            RCM Clearinghouse
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setEditingClaim(null);
                setIsCreateDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Claim
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        {/* Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
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
                onClick={() => setSelectedStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStatusTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedStatusTab === tab.id ? "bg-slate-700 text-slate-200" : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Payer Filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Payer:</span>
            <select
              value={selectedPayerFilter}
              onChange={(e) => setSelectedPayerFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Payers</option>
              {uniquePayers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Claim #, Patient Name, Insurance Payer, ICD-10 or CPT code..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Claims Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-[#181e25] select-none">
                {/* CLIENT Column */}
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  CLIENT
                </th>

                {/* CLAIM ID Column */}
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  CLAIM ID
                </th>

                {/* INSURANCE PAYER Column */}
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  INSURANCE PAYER
                </th>

                {/* STAGE Column (Dedicated Column) */}
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  <div className="flex items-center justify-center gap-1.5">
                    STAGE
                    <InfoTooltip text="Claim lifecycle: Draft → Ready to Submit → Submitted → Under Review → Accepted → Paid. Click to change stage." />
                  </div>
                </th>

                {/* STATUS Column */}
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  STATUS
                </th>

                {/* SERVICE DATE Column */}
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  SERVICE DATE
                </th>

                {/* BILLED AMOUNT Column */}
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  BILLED AMOUNT
                </th>

                {/* ACTIONS Column */}
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Client Name in blue link style */}
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                      {claim.claimNumber}
                    </td>

                    {/* Insurance Payer */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] block" title={claim.payer.name} style={{ fontFamily: "Outfit, sans-serif" }}>
                        {claim.payer.name}
                      </span>
                    </td>

                    {/* STAGE (Dedicated Column with Visual Progress Bar) */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
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
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {getStatusBadge(claim.status)}
                    </td>

                    {/* Service Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-600 font-medium text-xs font-mono">
                        {claim.serviceDate}
                      </span>
                    </td>

                    {/* Billed Amount */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ${claim.totalCharge.toFixed(2)}
                      </span>
                    </td>

                    {/* Actions: All 3 styled as unified icon action buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Edit Action Icon Button */}
                        <button
                          type="button"
                          onClick={() => handleEditClaim(claim)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Claim"
                          aria-label="Edit Claim"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* 2. Submit or View Transmission Status Icon Button */}
                        {["Ready to Submit", "Draft"].includes(claim.status) ? (
                          <button
                            type="button"
                            onClick={() => setActiveSubmissionClaim(claim)}
                            className="p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer border text-blue-600 hover:text-blue-700 bg-blue-50/70 hover:bg-blue-100 border-blue-200"
                            title="Submit Electronic Claim (EDI 837P)"
                            aria-label="Submit Electronic Claim"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveStatusClaim(claim)}
                            className="p-1.5 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer border text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200"
                            title="View Clearinghouse Transmission & Gateway Status"
                            aria-label="View Transmission Status"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}

                        {/* 3. View CMS-1500 Eye Icon Button */}
                        <button
                          type="button"
                          onClick={() => setActiveCMS1500Claim(claim)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50/60 border border-slate-200 hover:border-red-200 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="View CMS-1500 Form"
                          aria-label="View CMS-1500 Form"
                        >
                          <Eye className="w-4 h-4" />
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
  );
}
