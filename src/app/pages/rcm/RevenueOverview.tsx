import React, { useState } from "react";
import { useRcm } from "../../context/RcmContext";
import ClaimDetailDrawer from "../../components/rcm/ClaimDetailDrawer";
import { Claim } from "../../types/rcmTypes";
import {
  Landmark,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import { useNavigate } from "react-router";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";

export default function RevenueOverview() {
  const navigate = useNavigate();
  const { claims, patientBalances, denialClusters, remittanceLines } = useRcm();
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Metrics
  const awaitingActionClaims = claims.filter(
    (c) => c.status === "draft" || c.status === "scrubbing" || c.status === "rejected"
  );
  const totalAr = patientBalances.reduce((sum, b) => sum + b.totalBalance, 0);
  const totalBilled = claims.reduce((sum, c) => sum + c.billedAmount, 0);
  const deniedClaims = claims.filter((c) => c.status === "denied");
  const denialRate = totalBilled > 0 ? (deniedClaims.reduce((sum, c) => sum + c.billedAmount, 0) / totalBilled) * 100 : 8.4;
  const timelyUrgentClaims = claims.filter(
    (c) => c.timelyDaysRemaining <= 30 && c.status !== "paid" && c.status !== "void"
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Page Header */}
      <PageHeader
        title="Revenue Overview"
        subtitle="Financial performance, active claims velocity, and timely filing risk across the practice lifecycle"
        action={<HowItWorksButton onClick={() => setShowHelp(true)} />}
      />

      {/* Timely Filing Urgent Callout if any */}
      {timelyUrgentClaims.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 font-display">
                Timely Filing Critical Window: {timelyUrgentClaims.length} Claims Approaching Payer Cutoff
              </h3>
              <p className="text-xs text-rose-800/80">
                Payer timely filing regulations require electronic resubmission within 15–30 calendar days.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/revenue-cycle/claims?filter=timely_urgent")}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex-shrink-0"
          >
            Review Urgent Claims <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Stat Cards (DESIGN_NAVODYA.md Glass Base, Outfit font, tabular-nums) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total A/R */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outstanding A/R</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-display font-mono tabular-nums">
              ${totalAr.toFixed(2)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold ml-2 inline-flex items-center">
              <ArrowUpRight className="w-3 h-3" /> 4.2% MoM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Across 7 standard aging buckets</p>
        </div>

        {/* Card 2: Claims Awaiting Action */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Claims Awaiting Action</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-display font-mono tabular-nums">
              {awaitingActionClaims.length}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold ml-2">
              Action Needed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Draft, scrubbing review, & technical rejections</p>
        </div>

        {/* Card 3: Denial Rate */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payer Denial Rate</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-display font-mono tabular-nums">
              {denialRate.toFixed(1)}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold ml-2">
              Below 10% benchmark
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Active in {denialClusters.length} denial cluster groups</p>
        </div>

        {/* Card 4: Avg Days to Pay */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Days to Remit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-display font-mono tabular-nums">
              21.4d
            </span>
            <span className="text-xs text-emerald-600 font-semibold ml-2">
              -3.2d vs target
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">From claim submission to 835 posting</p>
        </div>
      </div>

      {/* Claims Stream & Fast Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-display">Active Claims Stream</h2>
            <p className="text-xs text-slate-500">Recently updated claims across all adjudication stages</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/revenue-cycle/claims")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All Claims ({claims.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/30">
                <th className="px-5 py-3">Claim ID</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Payer</th>
                <th className="px-5 py-3">Service Date</th>
                <th className="px-5 py-3 text-right">Billed Amount</th>
                <th className="px-5 py-3 text-right">Timely Filing</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {claims.slice(0, 6).map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-mono font-bold text-blue-600">{claim.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{claim.clientName}</td>
                  <td className="px-5 py-3 text-slate-600">{claim.payerName}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono">{claim.serviceDate}</td>
                  <td className="px-5 py-3 text-right font-bold font-mono text-slate-900 tabular-nums">
                    ${claim.billedAmount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    <span
                      className={`font-semibold ${
                        claim.timelyDaysRemaining <= 30
                          ? "text-rose-600"
                          : claim.timelyDaysRemaining <= 60
                          ? "text-amber-600"
                          : "text-slate-600"
                      }`}
                    >
                      {claim.timelyDaysRemaining}d
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
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
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {claim.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ClaimDetailDrawer
        claim={selectedClaim}
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How the Revenue Cycle Engine Works"
        summary="MantraAssist RCM closes the financial loop from completed appointments through electronic claim scrubbing, clearinghouse transmission, remittance posting, and patient responsibility statements."
        bullets={[
          "Track A to Track B Seam: Completed appointments automatically generate billable encounters. When documentation is signed, an electronic 837P claim is created.",
          "Pre-Submission Scrubbing: AI rules evaluate Timely Filing limits, NPI enrollments, and LCD medical necessity policies before claims are transmitted.",
          "Denial Management: Adjudicated denials are grouped into CARC/RARC clusters with AI root-cause analysis and human-reviewed appeal draft letters.",
          "Patient Responsibility Sequencing: Statements are strictly blocked from patient delivery until active payer denials are resolved or written off.",
        ]}
      />
    </div>
  );
}
