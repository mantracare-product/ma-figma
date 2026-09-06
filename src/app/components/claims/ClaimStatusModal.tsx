import React from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Building2,
  Calendar,
  User,
  Hash,
  ArrowUpRight,
} from "lucide-react";
import { Claim } from "../../../lib/claimsStore";
import Button from "../ui/Button";

interface ClaimStatusModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCMS1500: (claim: Claim) => void;
}

export default function ClaimStatusModal({
  claim,
  isOpen,
  onClose,
  onOpenCMS1500,
}: ClaimStatusModalProps) {
  if (!isOpen || !claim) return null;

  const isPaid = claim.status === "Paid";
  const isAccepted = claim.status === "Accepted";
  const isUnderReview = claim.status === "Under Review";
  const isRejected = claim.status === "Rejected";

  const trackingNumber =
    claim.clearinghouseTrackingId ||
    `MTR-837P-${claim.id.replace(/[^0-9]/g, "").slice(0, 6) || "992811"}-OK`;
  const batchId = claim.clearinghouseBatchId || "BATCH-20260824-02";
  const ediControl = claim.ediControlNumber || "000049219";

  const getStatusColor = () => {
    if (isPaid) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (isAccepted) return "bg-blue-50 text-blue-700 border-blue-200";
    if (isUnderReview) return "bg-purple-50 text-purple-700 border-purple-200";
    if (isRejected) return "bg-red-50 text-red-700 border-red-200";
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isPaid
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : isRejected
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-200"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Clearinghouse Status &bull; {claim.claimNumber}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusColor()}`}>
                  {claim.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{claim.patientName}</span> &bull; Payer:{" "}
                <span className="font-semibold text-slate-700">{claim.payer.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Hero Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isPaid
              ? "bg-emerald-50/70 border-emerald-200"
              : isRejected
              ? "bg-red-50/70 border-red-200"
              : isAccepted
              ? "bg-blue-50/70 border-blue-200"
              : "bg-indigo-50/70 border-indigo-200"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isPaid
                ? "bg-emerald-100 text-emerald-600"
                : isRejected
                ? "bg-red-100 text-red-600"
                : isAccepted
                ? "bg-blue-100 text-blue-600"
                : "bg-indigo-100 text-indigo-600"
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {isPaid
                  ? `Claim Settled & Paid in Full ($${(claim.amountPaid || claim.totalCharge).toFixed(2)})`
                  : isAccepted
                  ? "Electronic Claim Accepted by Payer"
                  : isUnderReview
                  ? "Claim In Adjudication / Under Review"
                  : isRejected
                  ? "Claim Rejected by Clearinghouse Gateway"
                  : "Electronic Claim Successfully Transmitted"}
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                {isPaid
                  ? `Payment remitted via ERA 835 transaction to MantraCare Health Center LLC.`
                  : isRejected
                  ? (claim.rejectionReason || "Validation check failed: Missing active policy subscriber group alignment.")
                  : `Transmitted via ANSI ASC X12 EDI 837P to ${claim.payer.name} (Payer ID: ${claim.payer.payerId}).`}
              </p>
            </div>
          </div>

          {/* Clearinghouse Transmission Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Clearinghouse Gateway Details
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tracking #</span>
                <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                  {trackingNumber}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Batch Identifier</span>
                <p className="font-mono font-semibold text-slate-800 text-xs mt-0.5">
                  {batchId}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">EDI Control #</span>
                <p className="font-mono font-semibold text-slate-800 text-xs mt-0.5">
                  {ediControl}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gateway Ack</span>
                <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 999 Ack Accepted
                </p>
              </div>
            </div>
          </div>

          {/* Financial & Service Summary */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Service Date</span>
              <span className="text-xs font-mono font-semibold text-slate-700 mt-0.5 block">{claim.serviceDate}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Billed</span>
              <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">${claim.totalCharge.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
              <span className={`text-xs font-mono font-bold mt-0.5 block ${isPaid ? "text-emerald-600" : "text-slate-500"}`}>
                ${(claim.amountPaid || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onOpenCMS1500(claim);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-red-600 hover:border-red-200 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            View CMS-1500 Form
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
          >
            Close Status
          </Button>
        </div>
      </div>
    </div>
  );
}
