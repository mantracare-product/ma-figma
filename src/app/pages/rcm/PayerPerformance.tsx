import React from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function PayerPerformance() {
  const { payerPerformance } = useRcm();

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-bold text-[#1e293b] tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Payer Performance & Adjudication Analytics
        </h2>
        <p className="text-sm text-slate-500 font-normal">
          Benchmark payer approval rates, average adjudication velocity, and root-cause denial drivers
        </p>
      </div>

      {/* Grid of Payer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {payerPerformance.map((payer) => (
          <div
            key={payer.payerName}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">{payer.payerName}</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {payer.patientMixPercent}% of patient volume
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  payer.approvalRate30d >= 90
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {payer.approvalRate30d}% 30d
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Billed</span>
                <span className="font-bold text-slate-900">${payer.totalBilled.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Collected</span>
                <span className="font-bold text-emerald-700">${payer.totalCollected.toLocaleString()}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block text-[10px]">Avg Days to Pay</span>
                <span className="font-bold text-slate-900">{payer.avgDaysToPay} days</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block text-[10px]">Denial Rate</span>
                <span className="font-bold text-rose-700">{payer.denialRate}%</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Denial Cause:</span>
              <p className="line-clamp-2 mt-0.5">{payer.primaryDenialReason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
