import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import { RemittanceLine } from "../../types/rcmTypes";
import PostingActionModal from "../../components/rcm/PostingActionModal";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Search,
  Check,
} from "lucide-react";

export default function PaymentPostingWorklist() {
  const { remittanceLines } = useRcm();
  const [selectedRemittance, setSelectedRemittance] = useState<RemittanceLine | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showHelp, setShowHelp] = useState(false);

  const filtered = remittanceLines.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.payerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Payment Posting & Remittance Queue"
        subtitle="Review 835 ERAs and manual EOB adjustments before committing to the practice ledger"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search remittances by ID, patient, or check #..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Remittances" },
            { id: "pending_review", label: "Pending Review" },
            { id: "confirmed", label: "Confirmed" },
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

      {/* Remittances Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Remittance ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer & Source</th>
                <th className="px-5 py-3">Check / Trace #</th>
                <th className="px-5 py-3 text-right">Billed Charge</th>
                <th className="px-5 py-3 text-right">Payer Paid</th>
                <th className="px-5 py-3 text-right">PR Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((rem) => (
                <tr key={rem.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{rem.id}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">{rem.clientName}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{rem.payerName}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      {rem.source.replace("_", " ")}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600">{rem.checkNumber || "EFT-TRACE"}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-900 tabular-nums">
                    ${rem.billedAmount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold font-mono text-emerald-700 tabular-nums">
                    ${rem.paidAmount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold font-mono text-blue-700 tabular-nums">
                    ${rem.patientResponsibilityAmount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        rem.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rem.status === "confirmed" ? "Posted" : "Pending Review"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {rem.status !== "confirmed" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRemittance(rem)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                      >
                        Post Action
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Posted ({rem.postingAction?.replace("_", " ")})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PostingActionModal
        remittance={selectedRemittance}
        isOpen={!!selectedRemittance}
        onClose={() => setSelectedRemittance(null)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Payment Posting Works"
        summary="Automated and manual electronic remittance adjudication (ERA 835 / EOB) that maps payments, adjustments, and patient responsibilities directly into the practice ledger."
        bullets={[
          "Live Balance Preview: Review exact ledger balance impacts before confirming any posting action.",
          "Contractual Write-Offs: Automatically separates approved insurance contractual adjustments (CO-45) from patient deductible or copay amounts.",
          "Patient Responsibility Routing: Shifts remaining patient dues to the Patient Balances queue, gated by active denial resolution.",
          "Anomaly Flags: Unbalanced remittances or negative balance adjustments are automatically flagged for manual review.",
        ]}
      />
    </div>
  );
}
