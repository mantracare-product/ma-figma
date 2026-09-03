import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { RemittanceLine, PostingAction } from "../../types/rcmTypes";
import { usePosting } from "../../context/RcmContext";
import {
  DollarSign,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  CreditCard,
  Ban,
  Shield,
  HelpCircle,
} from "lucide-react";

interface PostingActionModalProps {
  remittance: RemittanceLine | null;
  isOpen: boolean;
  onClose: () => void;
}

const POSTING_ACTION_OPTIONS: { id: PostingAction; label: string; desc: string }[] = [
  {
    id: "push_to_pr",
    label: "Push to Patient Responsibility",
    desc: "Shift adjudicated copay/coinsurance/deductible to patient balance. Subject to PR sequencing rule.",
  },
  {
    id: "write_off_pr",
    label: "Write-off Patient Responsibility",
    desc: "Waive patient copay/deductible (e.g. clinic courtesy, financial hardship, small balance write-off).",
  },
  {
    id: "write_off",
    label: "Contractual Write-Off (Adjustment)",
    desc: "Apply standard fee schedule discount / in-network contractual allowance write-off.",
  },
  {
    id: "custom_adjustment",
    label: "Custom Adjustment",
    desc: "Apply an explicit adjustment amount with a documented audit note.",
  },
  {
    id: "negate",
    label: "Negate / Void Remittance",
    desc: "Reversal action: mark remittance line invalid or voided without posting to ledger.",
  },
];

export default function PostingActionModal({
  remittance,
  isOpen,
  onClose,
}: PostingActionModalProps) {
  const { executePostingAction } = usePosting();
  const [selectedAction, setSelectedAction] = useState<PostingAction>("push_to_pr");
  const [customNote, setCustomNote] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);

  if (!remittance) return null;

  const handleConfirm = () => {
    executePostingAction(remittance.id, selectedAction, {
      customNote: customNote.trim() || undefined,
      adjustmentAmount: selectedAction === "custom_adjustment" ? adjustmentAmount : undefined,
    });
    onClose();
  };

  // Preview Calculations
  const billed = remittance.billedAmount;
  const paid = remittance.paidAmount;
  const prAmount = remittance.patientResponsibilityAmount;
  const contractAdj = billed - paid - prAmount;

  const resultingPr =
    selectedAction === "push_to_pr"
      ? prAmount
      : selectedAction === "write_off_pr"
      ? 0
      : selectedAction === "custom_adjustment"
      ? Math.max(0, prAmount - adjustmentAmount)
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Confirm Payment Posting — Remittance #${remittance.id}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 pt-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Remittance Header Overview */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Patient</span>
            <span className="font-bold text-slate-900">{remittance.clientName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Payer</span>
            <span className="font-bold text-slate-900">{remittance.payerName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Billed / Paid</span>
            <span className="font-bold font-mono text-slate-900 tabular-nums">
              ${billed.toFixed(2)} / ${paid.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Remittance Source</span>
            <span className="font-bold font-mono text-blue-700 uppercase">
              {remittance.source.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Hold Alert if present */}
        {remittance.holdReason && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Manual Review Flag:</strong> {remittance.holdReason}
            </span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Select Posting Action
          </label>
          <div className="space-y-2">
            {POSTING_ACTION_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedAction === opt.id
                    ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="posting_action"
                  checked={selectedAction === opt.id}
                  onChange={() => setSelectedAction(opt.id)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom fields if applicable */}
        {selectedAction === "custom_adjustment" && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Adjustment Amount ($):</label>
            <input
              type="number"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Preview-Before-Confirm Ledger Box */}
        <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 font-sans border-b border-slate-800 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Live Balance-Change Preview
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
              Audit Verified
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>Billed Charge:</span>
              <span className="tabular-nums">${billed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Insurance Paid:</span>
              <span className="text-emerald-400 tabular-nums">-${paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Contractual Adjustment (CO-45):</span>
              <span className="text-slate-400 tabular-nums">-${Math.max(0, contractAdj).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-sm">
              <span className="font-sans text-white">Net Patient Due:</span>
              <span className="text-blue-400 tabular-nums">${resultingPr.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Posting
          </button>
        </div>
      </div>
    </Modal>
  );
}
