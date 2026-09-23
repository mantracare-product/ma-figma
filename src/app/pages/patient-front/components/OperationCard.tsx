import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Stethoscope,
} from "lucide-react";
import { Process, Stage } from "../../../../lib/useProcessStore";
import { getPatientFacingStageContent } from "../../../../lib/patientStageStore";
import { getStoredStageProgress } from "../../../../lib/patientStageProgressStore";

interface OperationCardProps {
  process: Process;
  currentStageId: string;
  currentStageName: string;
  clientId: string;
  clientName: string;
  onOpenStageDrawer: (stage: Stage) => void;
  onOpenFeedback: () => void;
}

export default function OperationCard({
  process,
  currentStageId,
  currentStageName,
  clientId,
  clientName,
  onOpenStageDrawer,
  onOpenFeedback,
}: OperationCardProps) {
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
    description: "Surgical procedure daycare",
    status: "in-progress" as const,
  };

  const stageContent =
    activeStage.patientFacingContent ||
    getPatientFacingStageContent(process.id, activeStage.id, activeStage.name);

  const progress = getStoredStageProgress(clientId, process.id, activeStage.id);
  const isCompleted = activeIndex === stages.length - 1;

  const checklistItems = stageContent?.checklist || [];
  const completedChecklist = checklistItems.filter((i) =>
    progress.completedChecklistIds.includes(i.id)
  ).length;
  const allChecklistDone = checklistItems.length > 0 && completedChecklist === checklistItems.length;
  const isConsentSigned = Boolean(stageContent?.consent && progress.consentsSigned[stageContent.consent.id]);

  return (
    <div className="bg-white/90 dark:bg-[#181e25]/90 rounded-2xl p-5 md:p-6 border border-[#e2e8f0] dark:border-slate-800 shadow-[0_4px_20px_rgba(24,30,37,0.05)] relative overflow-hidden transition-all">
      {/* Specular highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/90 dark:bg-white/10 pointer-events-none" />

      {/* Header: Exactly ONE primary status badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#e2e8f0]/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1456f0] dark:text-[#60a5fa]">
              Surgical Daycare Unit
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1d4ed8] dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold border border-blue-200/70 dark:border-blue-900">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
              Active Protocol
            </span>
          </div>
        </div>

        {/* Surgeon & Room as plain text metadata (no badge soup) */}
        <div className="flex items-center gap-2 text-xs text-[#45515e] dark:text-slate-300 font-medium">
          <Stethoscope className="w-4 h-4 text-[#1456f0]" />
          <span>{stageContent?.roomOrCounter || "OT-2 • Dr. Sarah Johnson"}</span>
        </div>
      </div>

      {/* Protocol Stages List */}
      <div className="py-4 space-y-2">
        <div className="text-[11px] font-semibold text-[#64748b] dark:text-slate-400 uppercase tracking-wider mb-2">
          Procedure Workflow
        </div>
        {stages.map((stage, idx) => {
          const isStepCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onOpenStageDrawer(stage)}
              className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left cursor-pointer ${
                isCurrent
                  ? "bg-[#eff6ff] dark:bg-blue-950/40 border-[#1456f0]/60 ring-1 ring-[#1456f0]/20"
                  : isStepCompleted
                  ? "bg-slate-50 dark:bg-slate-900/50 border-emerald-200/80 dark:border-emerald-950"
                  : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-semibold ${
                    isCurrent
                      ? "bg-[#1456f0] text-white"
                      : isStepCompleted
                      ? "bg-[#10b981] text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-[#94a3b8]"
                  }`}
                >
                  {isStepCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#222222] dark:text-white">
                    {stage.name}
                  </div>
                  <div className="text-[11px] text-[#64748b] dark:text-slate-400">
                    {stage.description}
                  </div>
                </div>
              </div>

              {isCurrent && (
                <span className="font-mono text-[10px] font-semibold text-[#1456f0] dark:text-[#60a5fa] px-2 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/50">
                  Current
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3-Point Integrated Clinical Safety Strip */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#e2e8f0]/80 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-[#222222] dark:text-white">
            <Activity className="w-4 h-4 text-[#1456f0]" />
            <span>Pre-Surgical Clearance Verification</span>
          </div>
          <span className="font-mono text-[11px] text-[#64748b]">{clientName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {allChecklistDone ? (
              <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-[#222222] dark:text-white text-[11px] truncate">Fasting Protocol</div>
              <div className="text-[10px] text-[#64748b]">{allChecklistDone ? "Confirmed" : "Action Needed"}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-[#222222] dark:text-white text-[11px] truncate">Clinical Records</div>
              <div className="text-[10px] text-[#64748b]">Verified</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-[#222222] dark:text-white text-[11px] truncate">Pre-Op Vitals</div>
              <div className="text-[10px] text-[#64748b]">Cleared by Nurse</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-[#e2e8f0]/80 dark:border-slate-800 flex items-center justify-between">
        <div className="text-xs text-[#64748b] dark:text-slate-400">
          OT Desk Helpline: <strong className="font-mono">Ext #402</strong>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#181e25] bg-amber-300 hover:bg-amber-400 transition-all cursor-pointer"
            >
              Post-Op Survey
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenStageDrawer(activeStage)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#1456f0] hover:bg-[#1d4ed8] transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>Review Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
