import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  Printer,
  Sparkles,
} from "lucide-react";
import { Claim, submitClaimElectronically, saveClaim } from "../../../lib/claimsStore";
import Button from "../ui/Button";

interface ClaimSubmissionModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCMS1500: (claim: Claim) => void;
  onSubmissionSuccess?: (updatedClaim: Claim) => void;
}

export default function ClaimSubmissionModal({
  claim,
  isOpen,
  onClose,
  onOpenCMS1500,
  onSubmissionSuccess,
}: ClaimSubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessClaim, setSubmitSuccessClaim] = useState<Claim | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSubmitSuccessClaim(null);
    setErrorMsg(null);
  }, [claim?.id, isOpen]);

  if (!isOpen || !claim) return null;

  const handleElectronicSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await submitClaimElectronically(claim.id);
      setSubmitSuccessClaim(updated);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(updated);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit electronic claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualCMS1500Submit = (markAsSubmitted: boolean = true) => {
    let updatedClaim = claim;
    if (markAsSubmitted) {
      updatedClaim = {
        ...claim,
        status: "Submitted",
        submissionMethod: "manual_cms1500",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveClaim(updatedClaim);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(updatedClaim);
      }
    }
    onClose();
    onOpenCMS1500(updatedClaim);
  };

  const handleResetAndClose = () => {
    setSubmitSuccessClaim(null);
    setErrorMsg(null);
    onClose();
  };

  const isAlreadySubmitted =
    !submitSuccessClaim &&
    (["Submitted", "Under Review", "Accepted", "Paid"].includes(claim.status) || Boolean(claim.clearinghouseTrackingId));
  const activeDetailClaim = submitSuccessClaim || (isAlreadySubmitted ? claim : null);

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              activeDetailClaim ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-blue-50 text-blue-600 border border-blue-200"
            }`}>
              {activeDetailClaim ? <ShieldCheck className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {activeDetailClaim ? `Clearinghouse Status: ${claim.claimNumber}` : `Submit Claim ${claim.claimNumber}`}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  claim.status === "Paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : claim.status === "Accepted"
                    ? "bg-blue-100 text-blue-800"
                    : claim.status === "Submitted"
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-slate-200 text-slate-700"
                }`}>
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
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {activeDetailClaim ? (
            /* Transmission Status Screen for Submitted / Paid claims */
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {claim.status === "Paid"
                    ? `Claim Settled & Reimbursed ($${(claim.amountPaid || claim.totalCharge).toFixed(2)})`
                    : claim.status === "Accepted"
                    ? "Electronic Claim Accepted by Payer"
                    : claim.status === "Under Review"
                    ? "Claim Under Clearinghouse Adjudication"
                    : "Electronic Claim Transmitted Successfully"}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  EDI 837P transaction package was transmitted via Mantra Clearinghouse Gateway to{" "}
                  <span className="font-semibold text-slate-700">{claim.payer.name}</span>.
                </p>
              </div>

              {/* Transmission Metadata Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-lg mx-auto grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tracking Number</span>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                    {activeDetailClaim.clearinghouseTrackingId || "MTR-837P-992811-PD"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Batch ID</span>
                  <p className="font-mono font-semibold text-slate-800 text-xs mt-0.5">
                    {activeDetailClaim.clearinghouseBatchId || "BATCH-20260824-02"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">EDI Control #</span>
                  <p className="font-mono font-semibold text-slate-800 text-xs mt-0.5">
                    {activeDetailClaim.ediControlNumber || "000049219"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gateway Status</span>
                  <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> 999 Ack Accepted
                  </p>
                </div>
              </div>

              <div className="flex justify-center items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenCMS1500(activeDetailClaim);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  View CMS-1500 Copy
                </Button>
                <Button variant="primary" size="sm" onClick={handleResetAndClose} className="text-xs">
                  Close Status
                </Button>
              </div>
            </div>
          ) : (
            /* Option Selection Screen (Only for fresh unsubmitted Drafts / Ready to Submit) */
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Pre-Flight Checklist */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-950" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Pre-Flight Submission Checklist
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Active Member ID ({claim.insuredId})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Payer ID Configured ({claim.payer.payerId})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{claim.diagnosisCodes.length} ICD-10 Diagnosis Mapped</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{claim.lines.length} CPT Procedure Line(s)</span>
                  </div>
                </div>
              </div>

              {/* Two Option Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Electronic Clearinghouse */}
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-gradient-to-b from-blue-50/40 to-white flex flex-col justify-between relative hover:shadow-md transition-shadow">
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Recommended
                    </span>
                  </div>
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5">
                      <Send className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Mantra Clearinghouse
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Direct electronic ANSI ASC X12 EDI 837P transmission to <span className="font-semibold text-slate-700">{claim.payer.name}</span> with instant 999 acknowledgment.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Real-time claims adjudication
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Automated 277CA status tracking
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" /> Average turnaround: 3-5 days
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-100">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleElectronicSubmit}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transmitting EDI 837P...
                        </>
                      ) : (
                        <>
                          Transmit Electronic Claim <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Option 2: Manual CMS-1500 Form */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between hover:border-red-300 hover:shadow-md transition-all">
                  <div>
                    <button
                      type="button"
                      onClick={() => handleManualCMS1500Submit(true)}
                      className="w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center mb-2.5 border border-red-200 cursor-pointer transition-colors group"
                      title="Submit & Print CMS-1500 Form"
                    >
                      <FileText className="w-5 h-5 group-hover:scale-105 transition-transform" />
                    </button>
                    <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Manual CMS-1500 Form
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Render authentic red-form CMS-1500 (02/12) for physical printing, mail-in submission, or direct portal upload.
                    </p>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> NUCC compliant Box 1-33 format
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Print to PDF or direct paper
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5 text-slate-400" /> Suitable for non-EDI payers
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleManualCMS1500Submit(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Submit &amp; Print CMS-1500
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleManualCMS1500Submit(false)}
                      className="w-full text-center text-[11px] text-slate-500 hover:text-slate-700 hover:underline py-1 cursor-pointer"
                    >
                      Preview CMS-1500 only (Don&apos;t mark submitted)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
