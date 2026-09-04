import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function PayerPerformance() {
  const { payerPerformance } = useRcm();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Payer Performance & Adjudication Analytics"
        subtitle="Benchmark payer approval rates, average adjudication velocity, clean claim rates, and root-cause denial drivers"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

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

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Payer Performance Analytics Work"
        summary="Automated analytics evaluate EDI 835 remittance histories and 277CA transactions across commercial payers and CMS contractors."
        bullets={[
          "Adjudication Velocity: Measures elapsed days between 837 claim submission and 835 ERA check or EFT deposit.",
          "Clean Claim Rate: Tracks the percentage of claims paid on first submission without rejections or denial appeals.",
          "Contractual Benchmark: Compares reimbursement rates across health plans to support annual fee schedule negotiations.",
        ]}
      />
    </div>
  );
}
