import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { setClientProcessStage } from "../../../../lib/clientProcessState";
import { Process, Stage } from "../../../../lib/useProcessStore";

interface PatientStageDevBarProps {
  clientId: string;
  process: Process;
  currentStageId: string;
  onStageChanged?: (stageId: string) => void;
}

export default function PatientStageDevBar({
  clientId,
  process,
  currentStageId,
  onStageChanged,
}: PatientStageDevBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stages = process.stages || [];

  const handleSelectStageId = (stageId: string, stageName: string) => {
    setClientProcessStage(clientId, {
      processId: process.id,
      processName: process.name,
      stageId: stageId,
      stageName: stageName,
      channel: "sms",
    });

    if (onStageChanged) {
      onStageChanged(stageId);
    }
    // Silently switch stage and auto-collapse for minimal obstruction
    setIsExpanded(false);
  };

  const isPreCheckin = currentStageId === "pre-checkin";
  const isQuiet = currentStageId === "quiet";
  const currentStageIndex = stages.findIndex((s) => s.id === currentStageId);

  const currentLabel = isPreCheckin
    ? "Morning (Pre-Checkin)"
    : isQuiet
    ? "Days Later (Quiet)"
    : stages[currentStageIndex]?.name || "Active Visit";

  return (
    <div className="fixed bottom-3 right-3 z-40 select-none animate-in fade-in duration-200">
      {/* Expanded Stage Selector Menu */}
      {isExpanded && (
        <div className="mb-2 w-64 bg-[#181e25]/95 dark:bg-[#14181d]/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-white/10 text-white p-1.5 space-y-0.5 animate-in zoom-in-95 duration-150">
          <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider px-2 py-1 flex justify-between items-center">
            <span>Switch Stage</span>
            <span className="text-[9px] text-[#7fa8ff]">Instant</span>
          </div>

          {/* State 0: Morning Before Checkin */}
          <button
            type="button"
            onClick={() => handleSelectStageId("pre-checkin", "Morning (Pre-Checkin)")}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
              isPreCheckin
                ? "bg-amber-500/20 text-amber-300 font-semibold"
                : "hover:bg-white/10 text-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Sun className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">1. Morning (Pre-Checkin)</span>
            </div>
            {isPreCheckin && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </button>

          {/* Stages 1 to 5 */}
          {stages.map((stg, idx) => {
            const isCurrent = stg.id === currentStageId;
            const isAttendantStage = stg.id === "cat-4";

            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => handleSelectStageId(stg.id, stg.name)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isCurrent
                    ? isAttendantStage
                      ? "bg-purple-600 text-white font-semibold"
                      : "bg-[#1456f0] text-white font-semibold"
                    : "hover:bg-white/10 text-[#cbd5e1]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      isCurrent
                        ? "bg-white text-[#181e25]"
                        : "bg-white/10 text-[#93a1ad]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate">{stg.name}</span>
                </div>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
              </button>
            );
          })}

          {/* State 6: Post-Discharge / Days Later */}
          <button
            type="button"
            onClick={() => handleSelectStageId("quiet", "Days Later (Quiet State)")}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
              isQuiet
                ? "bg-emerald-600 text-white font-semibold"
                : "hover:bg-white/10 text-[#cbd5e1]"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Moon className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">6. Days Later (Quiet)</span>
            </div>
            {isQuiet && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
          </button>
        </div>
      )}

      {/* Small, Compact Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#181e25]/90 hover:bg-[#181e25] text-white border border-white/15 shadow-md backdrop-blur-md text-[11px] transition-all active:scale-95"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isQuiet
              ? "bg-slate-400"
              : isPreCheckin
              ? "bg-amber-400 animate-pulse"
              : currentStageId === "cat-4"
              ? "bg-purple-400 animate-pulse"
              : "bg-emerald-400 animate-pulse"
          }`}
        />
        <span className="text-[#93a1ad]">Stage:</span>
        <span className="font-semibold text-white truncate max-w-[130px]">{currentLabel}</span>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-[#93a1ad]" />
        ) : (
          <ChevronUp className="w-3 h-3 text-[#93a1ad]" />
        )}
      </button>
    </div>
  );
}
