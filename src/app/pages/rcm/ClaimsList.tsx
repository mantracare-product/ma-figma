import React, { useState, useMemo } from "react";
import { useRcm } from "../../context/RcmContext";
import { Claim, ClaimLifecycleStatus } from "../../types/rcmTypes";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
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
} from "lucide-react";
import { toast } from "sonner";

export default function ClaimsList() {
  const { claims, resubmitClaim } = useRcm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch =
        claim.id.toLowerCase().includes(search.toLowerCase()) ||
        claim.clientName.toLowerCase().includes(search.toLowerCase()) ||
        claim.payerName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "timely_urgent"
          ? claim.timelyDaysRemaining <= 30 && claim.status !== "paid" && claim.status !== "void"
          : claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, search, statusFilter]);

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
    toast.success(`Resubmitted ${selectedClaimIds.size} claims to Clearinghouse batch`);
    setSelectedClaimIds(new Set());
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Claims Management
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Track end-to-end claim adjudication, timely filing windows, and pre-submission scrub status
        </p>
      </div>

      {/* Toolbar: Search + Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Claim ID, Patient, or Payer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Claims" },
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
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
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
        <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 animate-in fade-in">
          <span className="font-semibold">
            {selectedClaimIds.size} claims selected for batch action
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkResubmit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Batch Resubmit
            </button>
            <button
              type="button"
              onClick={() => setSelectedClaimIds(new Set())}
              className="px-2.5 py-1.5 text-slate-600 hover:bg-blue-100 rounded-lg"
            >
              Clear Selection
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
                <th className="px-4 py-3">Service Date</th>
                <th className="px-4 py-3 text-right">Billed Amount</th>
                <th className="px-4 py-3 text-right">Timely Filing</th>
                <th className="px-4 py-3 text-center">Lifecycle Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                    No claims match your search or filter criteria.
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
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{claim.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{claim.clientName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{claim.clientId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{claim.payerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{claim.memberId || "No Policy ID"}</div>
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

      <ClaimDetailDrawer
        claim={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
}
