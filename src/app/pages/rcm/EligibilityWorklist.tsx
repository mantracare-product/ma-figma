import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  RefreshCw,
  Search,
  ExternalLink,
  Calendar,
  AlertTriangle,
  User,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function EligibilityWorklist() {
  const navigate = useNavigate();
  const { eligibilityChecks, recheckEligibility } = useRcm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = eligibilityChecks.filter((c) => {
    const matchesSearch =
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.payerName.toLowerCase().includes(search.toLowerCase()) ||
      (c.memberId && c.memberId.toLowerCase().includes(search.toLowerCase()));

    const matchesFilter = filter === "all" ? true : c.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Pre-Visit Eligibility & Benefits Verification
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Verify payer coverage, copay requirements, and deductibles before appointment check-in
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-emerald-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "active").length}
            </span>
            <p className="text-xs text-emerald-800 font-medium">Verified Active Coverage</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-amber-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "inconclusive").length}
            </span>
            <p className="text-xs text-amber-800 font-medium">Inconclusive (Data Mismatch)</p>
          </div>
        </div>

        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-rose-950 font-display font-mono">
              {eligibilityChecks.filter((c) => c.status === "inactive" || c.status === "not_covered").length}
            </span>
            <p className="text-xs text-rose-800 font-medium">Inactive or Not Covered</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient, Payer, or Member ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Checks" },
            { id: "active", label: "Active" },
            { id: "inconclusive", label: "Inconclusive" },
            { id: "inactive", label: "Inactive" },
            { id: "self_pay", label: "Self-Pay" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === pill.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {pill.label}
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
                <th className="px-5 py-3">Payer & Policy</th>
                <th className="px-5 py-3">Appt Date</th>
                <th className="px-5 py-3">Copay / Deductible</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3">Notes / Action Reason</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-900">{c.clientName}</div>
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${c.clientId}`)}
                      className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      View Profile <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{c.payerName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{c.memberId || "Self-Pay Record"}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-slate-600">{c.appointmentDate}</td>
                  <td className="px-5 py-3 font-mono text-slate-800 tabular-nums">
                    {c.copayAmount !== undefined ? (
                      <div>
                        <span className="text-slate-400">Copay:</span> ${c.copayAmount.toFixed(2)}
                      </div>
                    ) : (
                      "-"
                    )}
                    {c.deductibleRemaining !== undefined && (
                      <div className="text-[10px] text-slate-400">
                        Ded: ${c.deductibleRemaining.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.status === "inconclusive"
                          ? "bg-amber-100 text-amber-800"
                          : c.status === "inactive" || c.status === "not_covered"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-[11px] max-w-xs">
                    {c.inconclusiveReason || (c.status === "active" ? "EDI 271 Verified" : "-")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => recheckEligibility(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Re-run EDI 270/271 Check"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-run
                    </button>
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
