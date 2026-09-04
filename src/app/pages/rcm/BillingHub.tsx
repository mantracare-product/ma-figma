import React, { useState } from "react";
import { useInvoices } from "../../context/InvoiceContext";
import { useClaims } from "../../context/RcmContext";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import {
  CreditCard,
  FileText,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function BillingHub() {
  const navigate = useNavigate();
  const { invoices } = useInvoices();
  const { claims } = useClaims();
  const [search, setSearch] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Invoices originating from insurance claims
  const insuranceInvoices = invoices.filter(
    (inv) =>
      inv.claimId ||
      inv.paymentType === "insurance" ||
      inv.lineItems.some((li) => li.description.toLowerCase().includes("insurance") || li.description.toLowerCase().includes("patient responsibility"))
  );

  const filtered = insuranceInvoices.filter(
    (inv) =>
      inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      (inv.claimId && inv.claimId.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedClaim = claims.find((c) => c.id === selectedClaimId) || null;

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Invoicing & Insurance Billing Hub"
        subtitle="Adjudicated patient statements linked to electronic claims and fee schedules"
        action={
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs"
          >
            <span>All Practice Invoices</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        }
      />

      {/* Cross-Module Integration Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              Unified Financial Ledger
            </h4>
            <p className="text-xs text-blue-900/80">
              Insurance-originated invoices share the same payment links, SMS/WhatsApp delivery, and receipt generation as self-pay invoices, but maintain a link back to their originating claim.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/invoices")}
          className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 flex-shrink-0"
        >
          View All Invoices ({invoices.length}) <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search insurance statements by invoice ID, client, or claim #..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Statement / Invoice ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Linked Claim</th>
                <th className="px-5 py-3">Created / Due</th>
                <th className="px-5 py-3 text-right">Patient Due</th>
                <th className="px-5 py-3 text-right">Insurance Paid</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No insurance statements generated yet. Adjudicate claims and post remittances to dispatch statements.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{inv.id}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{inv.clientName}</td>
                    <td className="px-5 py-3 font-mono">
                      {inv.claimId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedClaimId(inv.claimId!)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {inv.claimId}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unlinked</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-mono text-[11px]">
                      <div>{inv.createdAt.split("T")[0]}</div>
                      <div className="text-slate-400">Due: {inv.dueDate}</div>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${inv.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      ${(inv.insurancePaidAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : inv.status === "sent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.claimId && (
                        <button
                          type="button"
                          onClick={() => setSelectedClaimId(inv.claimId!)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          View Claim
                        </button>
                      )}
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
        onClose={() => setSelectedClaimId(null)}
      />
    </div>
  );
}
