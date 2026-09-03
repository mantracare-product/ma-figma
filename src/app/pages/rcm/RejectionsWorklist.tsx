import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import { Claim } from "../../types/rcmTypes";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import PageHeader from "../../components/layout/PageHeader";
import {
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Search,
  ShieldAlert,
  Server,
  Building,
} from "lucide-react";

export default function RejectionsWorklist() {
  const { claims, resubmitClaim } = useRcm();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [search, setSearch] = useState("");

  const rejections = claims.filter(
    (c) =>
      c.status === "rejected" &&
      (c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.payerName.toLowerCase().includes(search.toLowerCase()))
  );

  const platformRejections = rejections.filter((c) => c.faultAttribution === "platform_responsibility");
  const siteRejections = rejections.filter((c) => c.faultAttribution !== "platform_responsibility");

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Technical Rejections Worklist
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Pre-adjudication clearinghouse drops separated by Platform Responsibility vs Clinic Action
        </p>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-rose-950 space-y-1">
          <h4 className="font-bold">Rejections Never Reached Payer Adjudication</h4>
          <p className="text-rose-900/80 leading-relaxed">
            Unlike denials, rejected claims are completely invisible to insurance. Timely filing clocks are actively ticking without any payer receipt protection.
          </p>
        </div>
      </div>

      {/* Platform vs Site Groups */}
      <div className="space-y-6">
        {/* Section 1: Site Action Required (Clinic Staff) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-amber-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Site Action Required ({siteRejections.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Clinic Data / NPI / Enrollment Fix</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50">
                  <th className="px-5 py-3">Claim ID</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Payer</th>
                  <th className="px-5 py-3">Rejection Reason</th>
                  <th className="px-5 py-3 text-right">Timely Days</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {siteRejections.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{c.id}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{c.clientName}</td>
                    <td className="px-5 py-3 text-slate-700">{c.payerName}</td>
                    <td className="px-5 py-3 text-rose-800 text-[11px] max-w-md font-mono">
                      {c.rejectionReason}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                      {c.timelyDaysRemaining}d
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => resubmitClaim(c.id)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Resubmit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Platform Responsibility (Internal Engineering / Clearinghouse Syntax) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-purple-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Platform Responsibility ({platformRejections.length})
              </h3>
            </div>
            <span className="text-[11px] text-purple-700 font-mono font-semibold">
              Internal Ops / EDI Clearinghouse Ticket Open
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] bg-slate-50/50">
                  <th className="px-5 py-3">Claim ID</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Payer</th>
                  <th className="px-5 py-3">Platform Error Detail</th>
                  <th className="px-5 py-3 text-right">Timely Days</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {platformRejections.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-purple-700">{c.id}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{c.clientName}</td>
                    <td className="px-5 py-3 text-slate-700">{c.payerName}</td>
                    <td className="px-5 py-3 text-purple-900 text-[11px] max-w-md font-mono">
                      {c.rejectionReason}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                      {c.timelyDaysRemaining}d
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 font-mono">
                        SLA Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
