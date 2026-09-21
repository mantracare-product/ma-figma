import React from "react";
import {
  BedDouble,
  Clock,
  HeartPulse,
  CheckCircle2,
  Phone,
  ChevronRight,
} from "lucide-react";
import { Process, Stage } from "../../../../lib/useProcessStore";
import { getPatientFacingStageContent } from "../../../../lib/patientStageStore";

interface IPDTimelineCardProps {
  process: Process;
  currentStageId: string;
  currentStageName: string;
  clientId: string;
  clientName: string;
  onOpenStageDrawer: (stage: Stage) => void;
  onOpenFeedback: () => void;
}

export default function IPDTimelineCard({
  process,
  currentStageId,
  currentStageName,
  clientId,
  clientName,
  onOpenStageDrawer,
  onOpenFeedback,
}: IPDTimelineCardProps) {
  const stages = process.stages || [];
  const currentStageIndex = stages.findIndex(
    (s) =>
      s.id === currentStageId ||
      s.name.toLowerCase() === currentStageName.toLowerCase() ||
      s.id === currentStageName
  );
  const activeIndex = currentStageIndex !== -1 ? currentStageIndex : 0;
  const activeStage = stages[activeIndex] || {
    id: currentStageId,
    name: currentStageName,
    description: "Inpatient stay in progress",
    status: "in-progress" as const,
  };

  const stageContent =
    activeStage.patientFacingContent ||
    getPatientFacingStageContent(process.id, activeStage.id, activeStage.name);

  const isDischargeReady = activeIndex === stages.length - 1;

  return (
    <div className="bg-white/90 dark:bg-[#181e25]/90 rounded-2xl p-5 md:p-6 border border-[#e2e8f0] dark:border-slate-800 shadow-[0_4px_20px_rgba(24,30,37,0.05)] relative overflow-hidden transition-all">
      {/* Specular highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/90 dark:bg-white/10 pointer-events-none" />

      {/* Header: Exactly ONE primary status badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#e2e8f0]/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#45515e] dark:text-slate-400">
              Inpatient Care (IPD)
            </span>
            <span className="text-[#94a3b8]">•</span>
            <span className="text-xs font-medium text-[#64748b] dark:text-slate-400">
              {process.name}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <h3 className="font-display text-lg md:text-xl font-bold text-[#222222] dark:text-white tracking-tight">
              {activeStage.name}
            </h3>
            {/* Single Primary Status Signal */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#222222] dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold">
              Day {activeIndex + 1} of {stages.length}
            </span>
          </div>
        </div>

        {/* Location as plain text (no badge soup) */}
        <div className="flex items-center gap-2 text-xs text-[#45515e] dark:text-slate-300 font-medium">
          <BedDouble className="w-4 h-4 text-[#1456f0]" />
          <span>{stageContent?.roomOrCounter || "Ward 3B • Bed #14"}</span>
        </div>
      </div>

      {/* Day-by-Day Milestone Progression Grid */}
      <div className="py-4">
        <div className="text-[11px] font-semibold text-[#64748b] dark:text-slate-400 uppercase tracking-wider mb-3">
          Admission Progression
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stages.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onOpenStageDrawer(stage)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#eff6ff] dark:bg-blue-950/40 border-[#1456f0]/60 ring-1 ring-[#1456f0]/20"
                    : isCompleted
                    ? "bg-slate-50 dark:bg-slate-900/50 border-emerald-200/80 dark:border-emerald-950"
                    : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-semibold text-[#64748b] dark:text-slate-400">
                    Day {idx + 1}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  )}
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
                  )}
                </div>
                <div className="font-medium text-xs text-[#222222] dark:text-white truncate">
                  {stage.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Care Guidance */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#e2e8f0]/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-[#222222] dark:text-white">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <span>Care Plan: {activeStage.name}</span>
          </div>
          <span className="text-[11px] text-[#64748b] dark:text-slate-400">Nurse Station 3</span>
        </div>
        <p className="text-xs text-[#45515e] dark:text-slate-300 leading-relaxed">
          {stageContent?.infoText || activeStage.description || "Inpatient observations ongoing."}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-[#e2e8f0]/80 dark:border-slate-800 flex items-center justify-between">
        <a
          href="tel:+15550199"
          className="inline-flex items-center gap-1.5 text-xs text-[#45515e] dark:text-slate-400 hover:text-[#1456f0] transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-[#64748b]" />
          <span>Nursing Station Line</span>
        </a>

        <div className="flex items-center gap-2">
          {isDischargeReady && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#181e25] bg-amber-300 hover:bg-amber-400 transition-all cursor-pointer"
            >
              Discharge Survey
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenStageDrawer(activeStage)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#1456f0] hover:bg-[#1d4ed8] transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>Stay Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
