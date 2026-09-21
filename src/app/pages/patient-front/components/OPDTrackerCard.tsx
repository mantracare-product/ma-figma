import React from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  ListTodo,
  FileSignature,
  ChevronRight,
  Info,
} from "lucide-react";
import { Process, Stage } from "../../../../lib/useProcessStore";
import { getPatientFacingStageContent } from "../../../../lib/patientStageStore";
import { getStoredStageProgress } from "../../../../lib/patientStageProgressStore";

interface OPDTrackerCardProps {
  process: Process;
  currentStageId: string;
  currentStageName: string;
  clientId: string;
  clientName: string;
  onOpenStageDrawer: (stage: Stage) => void;
  onOpenFeedback: () => void;
}

export default function OPDTrackerCard({
  process,
  currentStageId,
  currentStageName,
  clientId,
  clientName,
  onOpenStageDrawer,
  onOpenFeedback,
}: OPDTrackerCardProps) {
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
    description: "Ongoing OPD visit",
    status: "in-progress" as const,
  };

  const stageContent =
    activeStage.patientFacingContent ||
    getPatientFacingStageContent(process.id, activeStage.id, activeStage.name);

  const progress = getStoredStageProgress(clientId, process.id, activeStage.id);
  const isFinalStage = activeIndex === stages.length - 1;

  const checklistCount = stageContent?.checklist?.length || 0;
  const completedChecklist = stageContent?.checklist?.filter((i) =>
    progress.completedChecklistIds.includes(i.id)
  ).length || 0;
  const hasConsent = Boolean(stageContent?.consent);
  const isConsentSigned = Boolean(stageContent?.consent && progress.consentsSigned[stageContent.consent.id]);

  // Derive stable token number for this client visit
  const tokenNumber = `A-${((clientId.charCodeAt(clientId.length - 1) * 7) % 30) + 10}`;

  return (
    <div className="bg-white/90 dark:bg-[#181e25]/90 rounded-2xl p-5 md:p-6 border border-[#e2e8f0] dark:border-slate-800 shadow-[0_4px_20px_rgba(24,30,37,0.05)] relative overflow-hidden transition-all">
      {/* Specular top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/90 dark:bg-white/10 pointer-events-none" />

      {/* Header: Exactly ONE primary status badge (Active Stage Pill) */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#e2e8f0]/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1456f0] dark:text-[#60a5fa]">
              Outpatient Department
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
            {/* Primary Status Signal */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eff6ff] text-[#1d4ed8] dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold border border-blue-200/70 dark:border-blue-900">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1456f0]" />
              In Progress
            </span>
          </div>
        </div>

        {/* Quiet contextual metadata (plain text & mono tabular nums, NO competing badge containers) */}
        <div className="flex items-center gap-4 text-xs text-[#64748b] dark:text-slate-400">
          {stageContent?.roomOrCounter && (
            <div className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#1456f0]" />
              <span>{stageContent.roomOrCounter}</span>
            </div>
          )}
          <div className="font-mono tabular-nums font-semibold text-[#222222] dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
            Token #{tokenNumber}
          </div>
        </div>
      </div>

      {/* Visual Sequence Progression Track */}
      <div className="py-5">
        <div className="flex items-center justify-between relative">
          {/* Background track line */}
          <div className="absolute top-4 left-4 right-4 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
          {/* Active progress fill */}
          <div
            className="absolute top-4 left-4 h-1 bg-[#1456f0] rounded-full z-0 transition-all duration-500"
            style={{
              width: stages.length > 1 ? `${(activeIndex / (stages.length - 1)) * 100}%` : "0%",
            }}
          />

          {stages.map((stage, idx) => {
            const isCompleted = idx < activeIndex;
            const isCurrent = idx === activeIndex;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onOpenStageDrawer(stage)}
                className="relative z-10 flex flex-col items-center group cursor-pointer text-left"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-all ${
                    isCurrent
                      ? "bg-[#1456f0] text-white ring-4 ring-[#1456f0]/20 shadow-sm scale-110"
                      : isCompleted
                      ? "bg-[#10b981] text-white"
                      : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[#94a3b8]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`hidden sm:block text-[11px] font-medium mt-2 text-center max-w-[90px] truncate ${
                    isCurrent
                      ? "text-[#1456f0] dark:text-[#60a5fa] font-semibold"
                      : isCompleted
                      ? "text-[#45515e] dark:text-slate-300"
                      : "text-[#94a3b8] dark:text-slate-500"
                  }`}
                >
                  {stage.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clinical Guidance Section */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#e2e8f0]/80 dark:border-slate-800 space-y-2">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#1456f0] shrink-0 mt-0.5" />
          <p className="text-xs text-[#45515e] dark:text-slate-300 leading-relaxed">
            {stageContent?.infoText || activeStage.description || "Our medical staff will attend to you shortly."}
          </p>
        </div>

        {stageContent?.estimatedWaitTime && (
          <div className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-slate-400 pl-6.5 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#64748b]" />
            <span>Estimated wait: <strong>{stageContent.estimatedWaitTime}</strong></span>
          </div>
        )}
      </div>

      {/* Bottom Task Triggers & Details CTA */}
      <div className="mt-4 pt-3 border-t border-[#e2e8f0]/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {checklistCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenStageDrawer(activeStage)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                completedChecklist === checklistCount
                  ? "bg-[#ecfdf5] text-[#047857] border border-emerald-200"
                  : "bg-slate-100 dark:bg-slate-800 text-[#45515e] dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Checklist ({completedChecklist}/{checklistCount})
            </button>
          )}

          {hasConsent && (
            <button
              type="button"
              onClick={() => onOpenStageDrawer(activeStage)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isConsentSigned
                  ? "bg-[#ecfdf5] text-[#047857] border border-emerald-200"
                  : "bg-blue-50 text-[#1456f0] border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              {isConsentSigned ? "Consent Signed" : "Review Consent"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFinalStage && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#181e25] bg-amber-300 hover:bg-amber-400 transition-all cursor-pointer"
            >
              Rate Visit Experience
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenStageDrawer(activeStage)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#1456f0] hover:bg-[#1d4ed8] transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>Stage Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
