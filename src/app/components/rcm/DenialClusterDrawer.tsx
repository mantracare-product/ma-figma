import React, { useState } from "react";
import DrawerShell from "../ui/DrawerShell";
import { DenialClusterGroup } from "../../types/rcmTypes";
import { useDenials } from "../../context/RcmContext";
import {
  AlertTriangle,
  Sparkles,
  Send,
  FileText,
  DollarSign,
  Clock,
  RotateCcw,
  CheckCircle2,
  Edit3,
  Calendar,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface DenialClusterDrawerProps {
  cluster: DenialClusterGroup | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DenialClusterDrawer({
  cluster,
  isOpen,
  onClose,
}: DenialClusterDrawerProps) {
  const { updateDenialClusterStatus, saveAppealDraft } = useDenials();
  const [appealText, setAppealText] = useState(cluster?.appealDraftTemplate || "");
  const [isEditingAppeal, setIsEditingAppeal] = useState(false);
  const [deferDate, setDeferDate] = useState("");

  if (!cluster) return null;

  const handleSaveAppeal = () => {
    saveAppealDraft(cluster.id, appealText);
    setIsEditingAppeal(false);
  };

  const handleResubmitCluster = () => {
    updateDenialClusterStatus(cluster.id, "resubmitted");
    toast.success(`Cluster ${cluster.id} resubmitted with updated appeal package`);
    onClose();
  };

  const handleReconcileCluster = () => {
    updateDenialClusterStatus(cluster.id, "reconciled");
    toast.success(`Cluster ${cluster.id} marked as fully reconciled`);
    onClose();
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={`${cluster.carc.code} — ${cluster.payerName}`}
      subtitle={`Denial Cluster ${cluster.id} • ${cluster.claimCount} Claims at Risk`}
      icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
      width="max-w-[900px]"
      headerRight={
        <div className="flex items-center gap-2">
          {cluster.status !== "resubmitted" && cluster.status !== "reconciled" && (
            <button
              type="button"
              onClick={handleResubmitCluster}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Submit Batch Appeal
            </button>
          )}
          {cluster.status === "resubmitted" && (
            <button
              type="button"
              onClick={handleReconcileCluster}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Reconciled
            </button>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Payer
            </span>
            <span className="text-sm font-bold text-slate-900">{cluster.payerName}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              CARC Denial Code
            </span>
            <span className="text-sm font-bold font-mono text-rose-700">{cluster.carc.code}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Amount at Risk
            </span>
            <span className="text-sm font-bold font-mono text-slate-900 tabular-nums">
              ${cluster.totalAmountAtRisk.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Priority
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase font-mono ${
                cluster.priority === "critical"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {cluster.priority}
            </span>
          </div>
        </div>

        {/* CARC & RARC Description */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-2xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Adjudication Denial Reason
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            <strong>{cluster.carc.code}:</strong> {cluster.carc.description}
          </p>
          {cluster.rarcs.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Associated Remittance RARCs:</span>
              <div className="space-y-1 text-xs">
                {cluster.rarcs.map((r) => (
                  <div key={r.code} className="flex items-start gap-1.5 text-slate-600">
                    <span className="px-1.5 py-0.5 bg-slate-100 font-mono font-bold text-slate-800 rounded text-[11px]">
                      {r.code}
                    </span>
                    <span>{r.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Proposed Root Cause & Suggested Fix (Governance: Human Confirmation Gate) */}
        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" /> AI Root Cause Analysis & Proposed Resolution
            </h4>
            <span className="text-[10px] font-mono text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded">
              Verified Recommendation
            </span>
          </div>
          <p className="text-xs text-blue-950 leading-relaxed font-medium">
            {cluster.suggestedFixSummary}
          </p>
        </div>

        {/* Appeal Letter Draft Template (AI Generated, Editable by Human) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Payer Appeal Letter Draft
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Human Review Required</span>
              {!isEditingAppeal ? (
                <button
                  type="button"
                  onClick={() => setIsEditingAppeal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Edit3 className="w-3 h-3" /> Edit Draft
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveAppeal}
                  className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded transition-colors"
                >
                  Save Edits
                </button>
              )}
            </div>
          </div>

          {isEditingAppeal ? (
            <textarea
              rows={6}
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              className="w-full p-3 border border-blue-300 rounded-lg text-xs font-mono text-slate-800 bg-blue-50/20 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {cluster.appealDraftTemplate}
            </div>
          )}
        </div>

        {/* Individual Claims in Cluster */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Constituent Claims ({cluster.claims.length})
            </h4>
            <span className="text-[11px] font-mono text-slate-500">Sorted by Priority & Timely Filing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2 font-bold">Claim ID</th>
                  <th className="py-2 font-bold">Patient</th>
                  <th className="py-2 font-bold">Service Date</th>
                  <th className="py-2 font-bold text-right">Billed Amount</th>
                  <th className="py-2 font-bold text-right">Timely Filing</th>
                  <th className="py-2 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cluster.claims.map((cl) => (
                  <tr key={cl.claimId} className="hover:bg-slate-50/80">
                    <td className="py-2 font-mono font-bold text-blue-700">{cl.claimId}</td>
                    <td className="py-2 font-medium text-slate-900">
                      <a
                        href={`/clients/${cl.clientId}`}
                        className="hover:text-blue-600 hover:underline font-semibold"
                      >
                        {cl.clientName}
                      </a>
                    </td>
                    <td className="py-2 text-slate-600 font-mono">{cl.serviceDate}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${cl.amount.toFixed(2)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          cl.timelyDaysRemaining <= 30 ? "text-rose-600" : "text-slate-600"
                        }`}
                      >
                        {cl.timelyDaysRemaining}d
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase font-mono bg-rose-50 text-rose-700 border border-rose-200">
                        {cl.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
