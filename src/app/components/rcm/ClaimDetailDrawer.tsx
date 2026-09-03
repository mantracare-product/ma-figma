import React, { useState } from "react";
import DrawerShell from "../ui/DrawerShell";
import { Claim, ClaimScrubIssue } from "../../types/rcmTypes";
import { useClaims } from "../../context/RcmContext";
import {
  FileText,
  AlertTriangle,
  Clock,
  Send,
  RotateCcw,
  Ban,
  CheckCircle2,
  X,
  Sparkles,
  User,
  Shield,
  CreditCard,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ClaimDetailDrawerProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimDetailDrawer({ claim, isOpen, onClose }: ClaimDetailDrawerProps) {
  const { submitClaim, resubmitClaim, voidClaim, acceptScrubIssue, rejectScrubIssue } = useClaims();
  const [rejectingIssueId, setRejectingIssueId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!claim) return null;

  const handleAcceptScrub = (issueId: string) => {
    acceptScrubIssue(claim.id, issueId);
  };

  const handleDismissScrub = (issueId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a one-line reason for dismissing the AI scrub recommendation.");
      return;
    }
    rejectScrubIssue(claim.id, issueId, rejectReason.trim());
    setRejectingIssueId(null);
    setRejectReason("");
  };

  const getStatusBadge = () => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
      scrubbing: { bg: "bg-amber-100", text: "text-amber-800", label: "Scrubbing (Needs Review)" },
      awaiting_acknowledgement: { bg: "bg-blue-100", text: "text-blue-800", label: "Awaiting Ack (EDI 277)" },
      in_adjudication: { bg: "bg-indigo-100", text: "text-indigo-800", label: "In Adjudication" },
      rejected: { bg: "bg-rose-100", text: "text-rose-800", label: "Rejected (Pre-Adjudication)" },
      denied: { bg: "bg-red-100", text: "text-red-900", label: "Denied (Adjudicated)" },
      paid: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Paid / Settled" },
      void: { bg: "bg-gray-200", text: "text-gray-600", label: "Void" },
    };
    const s = statusMap[claim.status] || { bg: "bg-slate-100", text: "text-slate-700", label: claim.status };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} font-mono`}>
        {s.label}
      </span>
    );
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Claim ${claim.id}`}
      subtitle={`Encounter: ${claim.encounterId} • DOS: ${claim.serviceDate}`}
      icon={<FileText className="w-5 h-5 text-blue-600" />}
      width="max-w-[850px]"
      headerRight={
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {claim.status === "draft" && (
            <button
              onClick={() => {
                submitClaim(claim.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Submit Claim
            </button>
          )}
          {(claim.status === "rejected" || claim.status === "denied") && (
            <button
              onClick={() => {
                resubmitClaim(claim.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Resubmit Claim
            </button>
          )}
          {claim.status !== "void" && claim.status !== "paid" && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to void this claim?")) {
                  voidClaim(claim.id);
                  onClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Void Claim"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      }
    >
      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 h-full overflow-y-auto">
        {/* Left Column: Clinical & Scrub Details (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          {/* Timely Filing Urgency Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              claim.timelyDaysRemaining <= 15
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : claim.timelyDaysRemaining <= 45
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-inherit" />
              <div>
                <p className="text-xs font-bold">Timely Filing Window</p>
                <p className="text-[11px] font-mono opacity-80">
                  Deadline: {claim.timelyFilingDeadline}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black font-mono tabular-nums">
                {claim.timelyDaysRemaining}d
              </span>
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Remaining</p>
            </div>
          </div>

          {/* Fault Attribution if Rejected/Denied */}
          {claim.faultAttribution && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Fault Attribution</p>
                <p className="text-[11px] text-slate-500">Accountability assignment for timely resolution</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
                  claim.faultAttribution === "platform_responsibility"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : claim.faultAttribution === "site_action_required"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {claim.faultAttribution === "platform_responsibility"
                  ? "Platform Responsibility (MantraAssist Ops)"
                  : "Site Action Required (Clinic Staff)"}
              </span>
            </div>
          )}

          {/* Patient & Coverage Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-600" /> Patient & Policy Info
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Patient Name</span>
                <span className="font-bold text-slate-900">{claim.clientName}</span>
                <span className="text-[11px] font-mono text-slate-400 block">{claim.clientId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Rendering Provider</span>
                <span className="font-bold text-slate-900">{claim.providerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Payer Name</span>
                <span className="font-bold text-slate-900">{claim.payerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Member Policy ID</span>
                <span className="font-bold font-mono text-slate-900">{claim.memberId || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Procedure & Diagnosis Codes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> CPT & ICD-10 Coding
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">CPT Procedure Codes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {claim.cptCodes.map((code) => (
                    <span key={code} className="px-2.5 py-1 bg-blue-50 text-blue-800 font-mono font-bold rounded-lg border border-blue-200 text-xs">
                      CPT {code}
                    </span>
                  ))}
                </div>
              </div>
              {claim.diagnosisCodes && claim.diagnosisCodes.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-400 block text-[11px] mb-1">ICD-10 Diagnosis Pointers:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {claim.diagnosisCodes.map((dx) => (
                      <span key={dx} className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-semibold rounded-lg border border-slate-200 text-xs">
                        {dx}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rejection / Denial Details if any */}
          {claim.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4" /> Technical Rejection Reason (Clearinghouse)
              </div>
              <p className="font-mono text-[11px] leading-relaxed pt-1">{claim.rejectionReason}</p>
            </div>
          )}

          {claim.denialCarc && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-950 space-y-2">
              <div className="flex items-center justify-between font-bold text-red-900">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Payer Denial Code: {claim.denialCarc}
                </span>
                <span className="font-mono text-[10px] bg-red-100 px-2 py-0.5 rounded">CARC</span>
              </div>
              <p className="text-slate-700 leading-relaxed">{claim.denialCarcDescription}</p>
              {claim.denialRarcs && claim.denialRarcs.length > 0 && (
                <div className="pt-2 border-t border-red-100">
                  <span className="text-[11px] font-bold text-red-800 block mb-1">Remittance RARCs:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {claim.denialRarcs.map((rarc, i) => (
                      <span key={rarc} className="px-2 py-0.5 bg-white border border-red-200 rounded font-mono text-[11px] text-red-900" title={claim.denialRarcDescriptions?.[i]}>
                        {rarc}: {claim.denialRarcDescriptions?.[i] || ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Scrub Results (Governance per §4: AI proposes, human confirms) */}
          {claim.scrubIssues && claim.scrubIssues.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> AI Pre-Submission Scrub Results
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Human-Confirmation Gate Required</span>
              </div>

              <div className="space-y-2.5">
                {claim.scrubIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border text-xs transition-all ${
                      issue.accepted === true
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : issue.accepted === false
                        ? "bg-slate-100 border-slate-300 text-slate-500 opacity-60"
                        : "bg-white border-amber-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-mono ${
                              issue.severity === "critical"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {issue.severity}
                          </span>
                          <span>{issue.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{issue.description}</p>
                        <div className="mt-2 p-2 bg-blue-50/70 border border-blue-100 rounded text-[11px] text-blue-900 font-medium">
                          <strong>Suggested action:</strong> {issue.suggestedAction}
                        </div>
                      </div>

                      {issue.accepted === undefined && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAcceptScrub(issue.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingIssueId(issue.id)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {issue.accepted === true && (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
                        </span>
                      )}

                      {issue.accepted === false && (
                        <span className="text-[11px] font-bold text-slate-500">Dismissed</span>
                      )}
                    </div>

                    {rejectingIssueId === issue.id && (
                      <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for dismissal (audit log)..."
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleDismissScrub(issue.id)}
                          className="px-2.5 py-1 bg-slate-800 text-white rounded text-xs font-semibold"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingIssueId(null);
                            setRejectReason("");
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Financial Summary & Activity Thread (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Adjudication Ledger
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Billed Charges:</span>
                <span className="font-bold text-slate-900 tabular-nums">${claim.billedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Payer Allowed:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {claim.allowedAmount !== undefined ? `$${claim.allowedAmount.toFixed(2)}` : "Pending"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-sans">Insurance Paid:</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {claim.paidAmount !== undefined ? `$${claim.paidAmount.toFixed(2)}` : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between py-1 pt-2 font-bold text-slate-900">
                <span className="font-sans">Patient Responsibility:</span>
                <span className="text-blue-700 tabular-nums">
                  {claim.patientResponsibility !== undefined
                    ? `$${claim.patientResponsibility.toFixed(2)}`
                    : "Not Finalized"}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Notes Thread */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Claim Audit Trail
            </h3>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {claim.notes.map((note) => (
                <div key={note.id} className="text-xs p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="font-bold text-slate-700">{note.author}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
