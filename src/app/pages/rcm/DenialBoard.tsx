import React, { useState, useRef } from "react";
import { useRcm } from "../../context/RcmContext";
import { DenialClusterGroup } from "../../types/rcmTypes";
import DenialClusterDrawer from "../../components/rcm/DenialClusterDrawer";
import PageHeader from "../../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../../components/help/HowItWorksModal";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  DollarSign,
  Send,
} from "lucide-react";

interface ColumnDef {
  id: "denied" | "under_review" | "resubmitted" | "reconciled";
  title: string;
  color: string;
  badgeBg: string;
}

const KANBAN_COLUMNS: ColumnDef[] = [
  { id: "denied", title: "Denied (Triage Required)", color: "#E11D48", badgeBg: "bg-rose-100 text-rose-800" },
  { id: "under_review", title: "Under Review / Fix in Progress", color: "#D97706", badgeBg: "bg-amber-100 text-amber-800" },
  { id: "resubmitted", title: "Resubmitted / Appealed", color: "#2563EB", badgeBg: "bg-blue-100 text-blue-800" },
  { id: "reconciled", title: "Reconciled & Settled", color: "#059669", badgeBg: "bg-emerald-100 text-emerald-800" },
];

export default function DenialBoard() {
  const { denialClusters, updateDenialClusterStatus } = useRcm();
  const [selectedCluster, setSelectedCluster] = useState<DenialClusterGroup | null>(null);
  const [draggedClusterId, setDraggedClusterId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedClusterId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: "denied" | "under_review" | "resubmitted" | "reconciled") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedClusterId;
    if (id) {
      updateDenialClusterStatus(id, targetStatus);
    }
    setDraggedClusterId(null);
  };

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
  };

  const totalAtRisk = denialClusters
    .filter((c) => c.status !== "reconciled")
    .reduce((sum, c) => sum + c.totalAmountAtRisk, 0);

  return (
    <div className="space-y-6 flex flex-col h-full" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2
            className="text-2xl font-bold text-[#1e293b] tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Denial Management Board
          </h2>
          <p className="text-sm text-slate-500 font-normal">
            CARC/RARC clustered worklist with AI root-cause analysis and human-governed appeal packages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Total Active at Risk: <strong className="text-rose-700 font-bold">${totalAtRisk.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {/* Kanban Board with Scroll Navigation (Reusing Invoices.tsx pattern lines 718-760) */}
      <div className="relative group/kanban flex-1 min-h-0">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-16 bg-white/95 hover:bg-white shadow-lg border border-slate-200 rounded-r-full flex items-center justify-center text-slate-700 transition-all opacity-80 hover:opacity-100"
          title="Scroll Left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-16 bg-white/95 hover:bg-white shadow-lg border border-slate-200 rounded-l-full flex items-center justify-center text-slate-700 transition-all opacity-80 hover:opacity-100"
          title="Scroll Right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Columns Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto h-full pb-4 pt-1 px-1 select-none"
          style={{
            scrollBehavior: "smooth",
            scrollbarWidth: "thin",
            scrollbarColor: "#94A3B8 #F1F5F9",
          }}
        >
          {KANBAN_COLUMNS.map((col) => {
            const columnClusters = denialClusters.filter((c) => c.status === col.id);
            const colTotal = columnClusters.reduce((sum, c) => sum + c.totalAmountAtRisk, 0);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-80 flex-shrink-0 flex flex-col bg-slate-100/70 border border-slate-200 rounded-2xl p-3 shadow-2xs overflow-hidden"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold text-slate-900 tracking-tight">{col.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${col.badgeBg}`}>
                    {columnClusters.length}
                  </span>
                </div>

                {/* Column Amount Total */}
                <div className="text-[11px] font-mono text-slate-500 mb-2 px-1 flex justify-between">
                  <span>At Risk:</span>
                  <span className="font-bold text-slate-800 tabular-nums">${colTotal.toFixed(2)}</span>
                </div>

                {/* Cards List */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {columnClusters.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      Drop clusters here
                    </div>
                  ) : (
                    columnClusters.map((cluster) => (
                      <div
                        key={cluster.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, cluster.id)}
                        onClick={() => setSelectedCluster(cluster)}
                        className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all space-y-2.5"
                      >
                        {/* Card Header: Payer + Priority */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">
                              {cluster.payerName}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-rose-700">
                              {cluster.carc.code}
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                              cluster.priority === "critical"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {cluster.priority}
                          </span>
                        </div>

                        {/* CARC Summary */}
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {cluster.carc.description}
                        </p>

                        {/* AI Fix Summary */}
                        <div className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-[10px] text-blue-900 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-tight">
                            <strong>AI Fix:</strong> {cluster.suggestedFixSummary}
                          </span>
                        </div>

                        {/* Footer: Claims count + Amount */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Layers className="w-3.5 h-3.5" /> {cluster.claimCount} claims
                          </div>
                          <span className="font-bold font-mono text-slate-900 tabular-nums">
                            ${cluster.totalAmountAtRisk.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DenialClusterDrawer
        cluster={selectedCluster}
        isOpen={!!selectedCluster}
        onClose={() => setSelectedCluster(null)}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How the Denial Board Works"
        summary="Transform chaotic 835 claim denials into actionable clusters grouped by payer, Claim Adjustment Reason Codes (CARC), and Remittance Advice Remark Codes (RARC)."
        bullets={[
          "CARC/RARC Clustering: Rather than working hundreds of one-off denials, claims are aggregated into root-cause clusters with shared failure modes.",
          "AI Resolution & Appeal Drafts: AI examines the clinical note and payer policy, proposing the exact fix and generating a draft appeal letter for human review.",
          "Kanban Progression: Drag-and-drop clusters through Denied, Under Review, Resubmitted, and Reconciled states.",
          "Prioritized Triage: High dollar amounts at risk and expiring timely-filing deadlines are automatically elevated to the top.",
        ]}
      />
    </div>
  );
}
