import React from "react";
import { Modal } from "../ui/Modal";
import { StageMove, undoStageMove } from "../../../lib/useAutomationStore";
import { appointmentService } from "../../../lib/appointmentService";
import { invoiceService } from "../../../lib/invoiceService";
import { History, Undo2, ArrowRight, Zap, User, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface StageMovementTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "appointment" | "invoice";
  moves: StageMove[];
  title?: string;
}

export default function StageMovementTimelineModal({
  isOpen,
  onClose,
  entityType,
  moves,
  title,
}: StageMovementTimelineModalProps) {
  const entityMoves = moves.filter((m) => m.recordType === entityType);

  const handleUndo = (move: StageMove) => {
    const success = undoStageMove(move.id);
    if (!success) {
      toast.error("Could not undo this move");
      return;
    }

    // Rollback record stage if fromStageId is available
    if (move.fromStageId) {
      try {
        if (entityType === "appointment") {
          appointmentService.moveToStage(move.recordId, move.fromStageId, {
            type: "manual",
            ruleName: `Undo stage move to ${move.toStageName}`,
          });
        } else if (entityType === "invoice") {
          invoiceService.moveToStage(move.recordId, move.fromStageId, {
            type: "manual",
            ruleName: `Undo stage move to ${move.toStageName}`,
          });
        }
      } catch (err) {
        console.warn("Rollback stage adjustment error:", err);
      }
    }

    toast.success(`Stage move undone successfully!`);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <span style={{ fontFamily: "DM Sans, sans-serif" }}>
            {title || `${entityType === "appointment" ? "Appointment" : "Invoice"} Stage History`}
          </span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
          Audit trail showing stage transitions, automation rules that triggered them, and 1-click Undo.
        </p>

        {entityMoves.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            No stage movements recorded for {entityType}s yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {entityMoves.map((m) => {
              const causeText = m.cause?.ruleName || m.cause?.eventName || m.cause?.type || "Rule";
              const isRule = m.cause?.type === "rule";
              const isManual = m.cause?.type === "manual";

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    m.reverted
                      ? "bg-gray-50/70 border-gray-200 opacity-60"
                      : "bg-white border-gray-200 hover:border-blue-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        m.reverted
                          ? "bg-gray-100 text-gray-400"
                          : isRule
                          ? "bg-purple-50 text-purple-600 border border-purple-200/60"
                          : "bg-blue-50 text-blue-600 border border-blue-200/60"
                      }`}
                    >
                      {isRule ? <Zap className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          Record #{m.recordId}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                          {m.toStageName || m.toStageId}
                        </span>
                        {m.reverted && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700">
                            Undone
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Moved to <strong className="text-gray-900">{m.toStageName || m.toStageId}</strong> because{" "}
                        <span className="text-blue-700 font-medium">{causeText}</span>
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(m.at)}</span>
                      </div>
                    </div>
                  </div>

                  {!m.reverted && (
                    <button
                      type="button"
                      onClick={() => handleUndo(m)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="Undo stage move and rollback record"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-gray-500" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
