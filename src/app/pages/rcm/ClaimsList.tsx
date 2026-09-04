import React, { useState, useMemo } from "react";
import { useRcm } from "../../context/RcmContext";
import { Claim, ClaimLifecycleStatus } from "../../types/rcmTypes";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import { getCurrentUser, getAvailableTeamMembers } from "../../../lib/currentUser";
import {
  Search,
  Filter,
  RotateCcw,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  Plus,
  UserCheck,
  User,
  Calendar,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function ClaimsList() {
  const navigate = useNavigate();
  const { claims, resubmitClaim, assignClaim, deferClaim } = useRcm();
  const currentUser = getCurrentUser();
  const teamMembers = getAvailableTeamMembers();

  const [activeTab, setActiveTab] = useState<"all" | "workable" | "my">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Bulk actions state
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [showBulkDeferModal, setShowBulkDeferModal] = useState(false);
  const [bulkDeferReason, setBulkDeferReason] = useState("Waiting for Medical Records from Provider");
  const [bulkDeferUntil, setBulkDeferUntil] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // 1. Tab filtering
      if (activeTab === "workable") {
        if (claim.status === "paid" || claim.status === "void" || !!claim.deferredUntil) {
          return false;
        }
      } else if (activeTab === "my") {
        if (claim.assignedTo !== currentUser.name) {
          return false;
        }
      }

      // 2. Search filtering
      const matchesSearch =
        claim.id.toLowerCase().includes(search.toLowerCase()) ||
        claim.clientName.toLowerCase().includes(search.toLowerCase()) ||
        claim.payerName.toLowerCase().includes(search.toLowerCase()) ||
        (claim.assignedTo && claim.assignedTo.toLowerCase().includes(search.toLowerCase()));

      // 3. Status filter
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "timely_urgent"
          ? claim.timelyDaysRemaining <= 30 && claim.status !== "paid" && claim.status !== "void"
          : claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, activeTab, search, statusFilter, currentUser.name]);

  const toggleSelectClaim = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClaimIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkResubmit = () => {
    selectedClaimIds.forEach((id) => resubmitClaim(id));
    toast.success(`Resubmitted ${selectedClaimIds.size} claims to Clearinghouse`);
    setSelectedClaimIds(new Set());
  };

  const handleBulkAssign = (assignee: string) => {
    if (!assignee) return;
    selectedClaimIds.forEach((id) => assignClaim(id, assignee));
    toast.success(`Assigned ${selectedClaimIds.size} claims to ${assignee}`);
    setSelectedClaimIds(new Set());
    setBulkAssignee("");
  };

  const handleBulkDefer = (e: React.FormEvent) => {
    e.preventDefault();
    selectedClaimIds.forEach((id) => deferClaim(id, bulkDeferReason, bulkDeferUntil));
    toast.success(`Deferred ${selectedClaimIds.size} claims until ${bulkDeferUntil}`);
    setSelectedClaimIds(new Set());
    setShowBulkDeferModal(false);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Claims Management & Adjudication"
        subtitle="Track end-to-end clearinghouse EDI 837 submissions, 277CA status, worklist queues, and timely filing deadlines"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Main View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: "all", label: "All Claims", count: claims.length },
          {
            id: "workable",
            label: "Workable Claims",
            count: claims.filter((c) => c.status !== "paid" && c.status !== "void" && !c.deferredUntil).length,
          },
          {
            id: "my",
            label: "My Claims",
            count: claims.filter((c) => c.assignedTo === currentUser.name).length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar: Search + Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Claim ID, Patient, Payer, or Assignee..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Statuses" },
            { id: "draft", label: "Draft" },
            { id: "scrubbing", label: "Scrubbing" },
            { id: "in_adjudication", label: "In Adjudication" },
            { id: "rejected", label: "Rejected" },
            { id: "denied", label: "Denied" },
            { id: "paid", label: "Paid" },
            { id: "timely_urgent", label: "Urgent (<= 30d)" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === pill.id
                  ? "bg-slate-900 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar if selected */}
      {selectedClaimIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 animate-in fade-in">
          <span className="font-semibold">
            {selectedClaimIds.size} claims selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkResubmit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Batch Resubmit
            </button>

            {/* Batch Assign */}
            <select
              value={bulkAssignee}
              onChange={(e) => handleBulkAssign(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-blue-300 text-slate-900 rounded-lg text-xs font-semibold focus:outline-none"
            >
              <option value="">Assign Selected To...</option>
              {teamMembers.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name}
                </option>
              ))}
            </select>

            {/* Batch Defer */}
            <button
              type="button"
              onClick={() => setShowBulkDeferModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-semibold"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Batch Defer
            </button>

            <button
              type="button"
              onClick={() => setSelectedClaimIds(new Set())}
              className="px-2.5 py-1.5 text-slate-600 hover:bg-blue-100 rounded-lg"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedClaimIds.size === filteredClaims.length && filteredClaims.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedClaimIds(new Set(filteredClaims.map((c) => c.id)));
                      else setSelectedClaimIds(new Set());
                    }}
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="px-4 py-3">Claim ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Payer & Policy</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Service Date</th>
                <th className="px-4 py-3 text-right">Billed Amount</th>
                <th className="px-4 py-3 text-right">Timely Filing</th>
                <th className="px-4 py-3 text-center">Lifecycle Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                    No claims match your current view or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3" onClick={(e) => toggleSelectClaim(claim.id, e)}>
                      <input
                        type="checkbox"
                        checked={selectedClaimIds.has(claim.id)}
                        onChange={() => {}}
                        className="rounded text-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-blue-600">{claim.id}</div>
                      {claim.deferredUntil && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-mono font-semibold mt-0.5"
                          title={`Reason: ${claim.deferReason}`}
                        >
                          <Clock className="w-2.5 h-2.5" /> Def: {claim.deferredUntil}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{claim.clientName}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${claim.clientId}`);
                        }}
                        className="text-[10px] font-mono text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        {claim.clientId} <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{claim.payerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{claim.memberId || "No Policy ID"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {claim.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold">
                            {claim.assignedTo.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800 text-[11px]">{claim.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{claim.serviceDate}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-slate-900 tabular-nums">
                      ${claim.billedAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          claim.timelyDaysRemaining <= 15
                            ? "text-rose-600 font-bold"
                            : claim.timelyDaysRemaining <= 45
                            ? "text-amber-600 font-semibold"
                            : "text-slate-600"
                        }`}
                      >
                        {claim.timelyDaysRemaining}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          claim.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : claim.status === "denied"
                            ? "bg-rose-100 text-rose-800"
                            : claim.status === "rejected"
                            ? "bg-red-100 text-red-900"
                            : claim.status === "in_adjudication"
                            ? "bg-indigo-100 text-indigo-800"
                            : claim.status === "scrubbing"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {claim.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail Drawer */}
      <ClaimDetailDrawer
        claim={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />

      {/* Batch Defer Modal */}
      {showBulkDeferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Batch Defer {selectedClaimIds.size} Claims
                </h3>
              </div>
            </div>

            <form onSubmit={handleBulkDefer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deferral Reason *</label>
                <select
                  value={bulkDeferReason}
                  onChange={(e) => setBulkDeferReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="Waiting for Medical Records from Provider">Waiting for Medical Records from Provider</option>
                  <option value="Waiting for Payer Phone Call / Representative">Waiting for Payer Phone Call / Representative</option>
                  <option value="Under Secondary Review">Under Secondary Review</option>
                  <option value="Payer System Outage">Payer System Outage</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resume On Date *</label>
                <input
                  type="date"
                  value={bulkDeferUntil}
                  onChange={(e) => setBulkDeferUntil(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkDeferModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                >
                  Confirm Batch Defer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* How it Works Modal */}
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Claims Management Works"
        summary="MantraAssist RCM orchestrates end-to-end clearinghouse EDI 837 claim filing, real-time 277CA status tracking, automated timely filing countdowns, and human-in-the-loop task routing."
        bullets={[
          "Workable Claims View: Filter out settled claims and deferred items to focus strictly on actionable tasks.",
          "My Claims Queue: View only claims assigned to you, with one-click specialist reassignment.",
          "Timely Filing Alerts: Color-coded countdowns alert billers at 45 days (amber) and 15 days (red) prior to payer deadlines.",
          "Pre-Submission AI Scrubbing: Rule-engine verification detects NCCI edits, missing modifiers, and mismatched ICD-10 pointers before filing.",
        ]}
      />
    </div>
  );
}
