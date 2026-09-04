import React, { useState } from "react";
import DrawerShell from "../ui/DrawerShell";
import { Claim, ClaimScrubIssue } from "../../types/rcmTypes";
import { useClaims, useRcm } from "../../context/RcmContext";
import { getAvailableTeamMembers, getCurrentUser } from "../../../lib/currentUser";
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
  ExternalLink,
  Calendar,
  ChevronDown,
  Printer,
  FileCheck,
  UserCheck,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface ClaimDetailDrawerProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimDetailDrawer({ claim, isOpen, onClose }: ClaimDetailDrawerProps) {
  const navigate = useNavigate();
  const {
    submitClaim,
    resubmitClaim,
    voidClaim,
    assignClaim,
    deferClaim,
    cancelDeferClaim,
    acceptScrubIssue,
    rejectScrubIssue,
  } = useClaims();

  const [rejectingIssueId, setRejectingIssueId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showDeferModal, setShowDeferModal] = useState(false);
  const [showCms1500, setShowCms1500] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Defer form state
  const [deferReasonInput, setDeferReasonInput] = useState("Waiting for Medical Records from Provider");
  const [deferUntilInput, setDeferUntilInput] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );

  if (!claim) return null;

  const teamMembers = getAvailableTeamMembers();
  const currentUser = getCurrentUser();

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

  const handleDeferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deferUntilInput) {
      toast.error("Please select a deferral date");
      return;
    }
    deferClaim(claim.id, deferReasonInput, deferUntilInput);
    toast.success(`Claim deferred until ${deferUntilInput}`);
    setShowDeferModal(false);
  };

  const handleApplyDeferPreset = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    setDeferUntilInput(d.toISOString().split("T")[0]);
  };

  const handleAssigneeChange = (assignedToName: string) => {
    assignClaim(claim.id, assignedToName);
    toast.success(`Claim assigned to ${assignedToName || "Unassigned"}`);
  };

  const handlePushToPr = () => {
    toast.success(`Patient responsibility of $${(claim.patientResponsibility || 0).toFixed(2)} routed to patient balances`);
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
      width="max-w-[900px]"
      headerRight={
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {claim.status === "draft" && (
            <button
              onClick={() => {
                submitClaim(claim.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
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
      <div className="p-6 space-y-6 h-full overflow-y-auto">
        {/* Deferral Alert Banner if Active */}
        {claim.deferredUntil && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <strong>Claim Deferred Until {claim.deferredUntil}:</strong> {claim.deferReason || "Under review"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                cancelDeferClaim(claim.id);
                toast.info("Claim deferral cancelled. Moved to active worklist.");
              }}
              className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold transition-colors"
            >
              Resume Work
            </button>
          </div>
        )}

        {/* AREA 1: Action Controls Bar & Assignment */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          {/* Assignment Dropdown */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Assigned Specialist
              </span>
              <select
                value={claim.assignedTo || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((tm) => (
                  <option key={tm.id} value={tm.name}>
                    {tm.name} ({tm.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Defer, Push to PR, CMS-1500 */}
          <div className="flex items-center gap-2">
            {!claim.deferredUntil ? (
              <button
                type="button"
                onClick={() => setShowDeferModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Defer Claim
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeferModal(true)}
                className="px-3 py-1.5 bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Adjust Deferral
              </button>
            )}

            {(claim.patientResponsibility || 0) > 0 && (
              <button
                type="button"
                onClick={handlePushToPr}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Push to PR ($
                {(claim.patientResponsibility || 0).toFixed(2)})
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCms1500(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" /> CMS-1500 Preview
            </button>
          </div>
        </div>

        {/* AREA 2: Grid Layout with Details, Coding, and Adjudication */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Patient, Coding, Scrubber */}
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

            {/* Patient & Coverage Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Patient & Policy Info
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/clients/${claim.clientId}`);
                    onClose();
                  }}
                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  View Client Profile <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Patient Name</span>
                  <span className="font-bold text-slate-900">{claim.clientName}</span>
                  <span className="text-[11px] font-mono text-slate-400 block">{claim.clientId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Rendering Provider</span>
                  <span className="font-bold text-slate-900">{claim.providerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payer Name</span>
                  <span className="font-bold text-slate-900">{claim.payerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Member Policy ID</span>
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
                      <span
                        key={code}
                        className="px-2.5 py-1 bg-blue-50 text-blue-800 font-mono font-bold rounded-lg border border-blue-200 text-xs"
                      >
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
                        <span
                          key={dx}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-semibold rounded-lg border border-slate-200 text-xs"
                        >
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
                  <AlertCircle className="w-4 h-4" /> Technical Rejection Reason (Clearinghouse EDI 277CA)
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
                        <span
                          key={rarc}
                          className="px-2 py-0.5 bg-white border border-red-200 rounded font-mono text-[11px] text-red-900"
                          title={claim.denialRarcDescriptions?.[i]}
                        >
                          {rarc}: {claim.denialRarcDescriptions?.[i] || ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Pre-Submission Scrub Results */}
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

          {/* Right Column (5 cols): Adjudication Ledger & Audit Trail */}
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

            {/* Submissions & Electronic Transmissions history */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-600" /> EDI 837 Transmission History
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>Batch #B-9812</span>
                    <span>{claim.serviceDate}</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-[11px]">
                    EDI 837P Professional Claim Dispatched
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Notes Thread */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Claim Audit Trail
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
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

              {/* Add Note Input */}
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add internal audit note..."
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newNoteText.trim()) {
                      claim.notes.push({
                        id: `note-${Date.now()}`,
                        author: currentUser.name,
                        content: newNoteText.trim(),
                        createdAt: new Date().toISOString(),
                      });
                      setNewNoteText("");
                      toast.success("Note added to claim audit trail");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newNoteText.trim()) return;
                    claim.notes.push({
                      id: `note-${Date.now()}`,
                      author: currentUser.name,
                      content: newNoteText.trim(),
                      createdAt: new Date().toISOString(),
                    });
                    setNewNoteText("");
                    toast.success("Note added to claim audit trail");
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Defer Modal */}
      {showDeferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Defer Claim Work</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeferModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deferring removes this claim from the <strong>Workable Claims</strong> view until the specified date.
            </p>

            <form onSubmit={handleDeferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deferral Reason *</label>
                <select
                  value={deferReasonInput}
                  onChange={(e) => setDeferReasonInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                >
                  <option value="Waiting for Medical Records from Provider">Waiting for Medical Records from Provider</option>
                  <option value="Waiting for Payer Phone Call / Representative">Waiting for Payer Phone Call / Representative</option>
                  <option value="Under Secondary Review">Under Secondary Review</option>
                  <option value="Payer System Outage">Payer System Outage</option>
                  <option value="Awaiting Coordination of Benefits Resolution">Awaiting Coordination of Benefits Resolution</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quick Presets</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyDeferPreset(7)}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700 text-xs"
                  >
                    1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDeferPreset(14)}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700 text-xs"
                  >
                    2 Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDeferPreset(30)}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700 text-xs"
                  >
                    1 Month
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resume On Date *</label>
                <input
                  type="date"
                  value={deferUntilInput}
                  onChange={(e) => setDeferUntilInput(e.target.value)}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeferModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
                >
                  Save Deferral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CMS-1500 Form Preview Modal */}
      {showCms1500 && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">CMS-1500 Health Insurance Claim Form</h3>
                  <p className="text-[11px] text-slate-500">Official Standard Paper / Electronic Format Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowCms1500(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-800 space-y-4 bg-amber-50/20">
              {/* CMS-1500 Boxes simulation */}
              <div className="border-2 border-red-700 p-4 rounded-xl bg-white space-y-3">
                <div className="text-center font-bold text-red-800 text-sm border-b pb-2 border-red-200">
                  HEALTH INSURANCE CLAIM FORM (APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE)
                </div>

                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  <div className="col-span-8 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">1. MEDICARE / MEDICAID / OTHER</span>
                    <span className="font-bold">{claim.payerName.toUpperCase()}</span>
                  </div>
                  <div className="col-span-4 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">1a. INSURED'S I.D. NUMBER</span>
                    <span className="font-bold">{claim.memberId || "MEMBER-ID-REQUIRED"}</span>
                  </div>

                  <div className="col-span-6 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">2. PATIENT'S NAME (Last, First)</span>
                    <span className="font-bold">{claim.clientName}</span>
                  </div>
                  <div className="col-span-6 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">4. INSURED'S NAME</span>
                    <span className="font-bold">{claim.clientName}</span>
                  </div>

                  <div className="col-span-12 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">21. DIAGNOSIS OR NATURE OF ILLNESS</span>
                    <div className="flex gap-4 font-bold pt-1">
                      {claim.diagnosisCodes?.map((d, idx) => (
                        <span key={d}>
                          {String.fromCharCode(65 + idx)}. {d}
                        </span>
                      )) || <span>A. F43.23 (Receptive Adjustment Disorder)</span>}
                    </div>
                  </div>

                  <div className="col-span-12 border border-red-300 rounded overflow-hidden">
                    <div className="bg-red-50 p-1.5 font-bold text-[9px] text-red-800 border-b border-red-200 flex justify-between">
                      <span>24. A. DATE OF SERVICE</span>
                      <span>D. PROCEDURES (CPT)</span>
                      <span>E. DIAGNOSIS POINTER</span>
                      <span>F. $ CHARGES</span>
                      <span>G. DAYS/UNITS</span>
                    </div>
                    {claim.cptCodes.map((cpt) => (
                      <div key={cpt} className="p-2 flex justify-between border-b border-slate-100 last:border-b-0 text-[11px]">
                        <span>{claim.serviceDate}</span>
                        <span className="font-bold">{cpt}</span>
                        <span>A</span>
                        <span className="font-bold">${claim.billedAmount.toFixed(2)}</span>
                        <span>1</span>
                      </div>
                    ))}
                  </div>

                  <div className="col-span-4 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">28. TOTAL CHARGE</span>
                    <span className="font-bold text-sm">${claim.billedAmount.toFixed(2)}</span>
                  </div>
                  <div className="col-span-4 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">29. AMOUNT PAID</span>
                    <span className="font-bold text-sm">${(claim.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="col-span-4 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">30. BALANCE DUE</span>
                    <span className="font-bold text-sm">
                      ${(claim.billedAmount - (claim.paidAmount || 0)).toFixed(2)}
                    </span>
                  </div>

                  <div className="col-span-6 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">31. SIGNATURE OF PHYSICIAN / SUPPLIER</span>
                    <span>{claim.providerName}, MD • SIGNATURE ON FILE</span>
                  </div>
                  <div className="col-span-6 p-2 border border-red-300 rounded">
                    <span className="text-[9px] text-red-700 font-bold block">33. BILLING PROVIDER INFO & PH #</span>
                    <span>MantraCare Healthcare Services LLC • NPI: 1982736450</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
