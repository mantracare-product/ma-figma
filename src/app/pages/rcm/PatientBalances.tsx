import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  Send,
  CheckCircle2,
  Lock,
  Search,
  ExternalLink,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function PatientBalances() {
  const navigate = useNavigate();
  const { patientBalances, generatePatientStatement } = useRcm();
  const [search, setSearch] = useState("");
  const [agingFilter, setAgingFilter] = useState<string>("all");

  const filtered = patientBalances.filter((b) => {
    const matchesSearch =
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.primaryPayer.toLowerCase().includes(search.toLowerCase());
    const matchesAging = agingFilter === "all" ? true : b.agingBucket === agingFilter;
    return matchesSearch && matchesAging;
  });

  const totalInvoiceable = patientBalances.reduce((sum, b) => sum + b.invoiceableBalance, 0);
  const totalBlocked = patientBalances.reduce((sum, b) => sum + b.nonInvoiceableBalance, 0);

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Patient Balances & A/R Aging
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Post-adjudication patient responsibility balances governed by the PR sequencing rule
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Invoiceable PR Balance
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              ${totalInvoiceable.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Fully Adjudicated</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for patient statement dispatch</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Blocked from Statement (Denial Gate)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              ${totalBlocked.toFixed(2)}
            </span>
            <span className="text-xs text-amber-600 font-semibold">Sequencing Lock</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pending denial appeal or write-off resolution</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Patient A/R
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              ${(totalInvoiceable + totalBlocked).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across 7 standard aging intervals</p>
        </div>
      </div>

      {/* PR Sequencing Rule Alert Banner */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-1">
          <h4 className="font-bold">Sequencing Rule Enforced</h4>
          <p className="text-blue-900/80 leading-relaxed">
            Statements are only sent once all active insurance denials for an encounter are resolved. Patients are never billed prematurely for charges that insurance might still pay under appeal.
          </p>
        </div>
      </div>

      {/* Toolbar: Search + 7 Aging Buckets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient or primary payer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 7 Aging Buckets */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All" },
            { id: "0-30", label: "0-30d" },
            { id: "31-60", label: "31-60d" },
            { id: "61-90", label: "61-90d" },
            { id: "91-120", label: "91-120d" },
            { id: "121-180", label: "121-180d (TF Warning)" },
            { id: "181-365", label: "181-365d" },
            { id: "366+", label: "366d+" },
          ].map((bucket) => (
            <button
              key={bucket.id}
              type="button"
              onClick={() => setAgingFilter(bucket.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                agingFilter === bucket.id
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {bucket.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Primary Payer</th>
                <th className="px-5 py-3 text-right">Invoiceable PR</th>
                <th className="px-5 py-3 text-right">Non-Invoiceable</th>
                <th className="px-5 py-3 text-right">Total Balance</th>
                <th className="px-5 py-3 text-center">Aging Bucket</th>
                <th className="px-5 py-3 text-center">Statements Sent</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{b.clientName}</div>
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${b.clientId}`)}
                      className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      {b.clientId} <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{b.primaryPayer}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    ${b.invoiceableBalance.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {b.nonInvoiceableBalance > 0 ? (
                      <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" /> ${b.nonInvoiceableBalance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400">$0.00</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    ${b.totalBalance.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        b.agingBucket === "121-180" || b.agingBucket === "181-365" || b.agingBucket === "366+"
                          ? "bg-rose-100 text-rose-800"
                          : b.agingBucket === "61-90" || b.agingBucket === "91-120"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {b.agingBucket}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center font-mono text-slate-600">
                    {b.statementCount} sent
                    {b.lastStatementDate && (
                      <span className="block text-[10px] text-slate-400">{b.lastStatementDate}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {b.nonInvoiceableBalance > 0 ? (
                      <span
                        className="px-2.5 py-1 text-[11px] text-slate-400 font-medium inline-flex items-center gap-1"
                        title="Blocked by active denial appeal"
                      >
                        <Lock className="w-3 h-3" /> Gated (Denial)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => generatePatientStatement(b.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                      >
                        <Send className="w-3 h-3" /> Generate Statement
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
