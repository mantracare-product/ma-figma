import React, { useState, useRef, useEffect, useMemo } from "react";
import { GripVertical, Check, Plus, ChevronDown, X, Trophy, XCircle, Sparkles } from "lucide-react";

export const CHEVRON_PALETTE = [
  "#3B82F6", // Royal Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald Green
  "#EF4444", // Coral Red
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#2563EB", // Cobalt Blue
];

export interface ChevronStage {
  id: string | number;
  name: string;
  color?: string;
  isFinalStage?: boolean;
  isFinal?: boolean;
  systemCategory?: string;
  stageCategory?: "in_progress" | "success" | "lost";
  stagePosition?: "initial" | "intermediate" | "final";
  status?: string;
}

interface ChevronStageRibbonProps {
  stages: ChevronStage[];
  activeStageId?: string | number;
  activeStageName?: string;
  onStageClick?: (stage: ChevronStage, index: number) => void;
  onAddStage?: () => void;
  showAddButton?: boolean;
  extraContent?: React.ReactNode;
  className?: string;
}

/**
 * Categorize a stage into in_progress, won, or lost
 */
export function categorizeChevronStage(
  stage: ChevronStage,
  index: number,
  total: number
): "in_progress" | "won" | "lost" {
  // 1. Explicit stageCategory
  if (stage.stageCategory === "success") return "won";
  if (stage.stageCategory === "lost") return "lost";
  if (stage.stageCategory === "in_progress") return "in_progress";

  // 2. Explicit systemCategory
  const sys = (stage.systemCategory || "").toLowerCase().trim();
  if (["completed", "paid", "closed_won", "won", "settled", "success"].includes(sys)) {
    return "won";
  }
  if (
    [
      "cancelled",
      "canceled",
      "void",
      "overdue",
      "denied",
      "failed",
      "rescheduled",
      "reschedule",
      "no_show",
      "noshow",
      "no show",
      "closed_lost",
      "lost",
      "abandoned",
    ].includes(sys)
  ) {
    return "lost";
  }

  // 3. Name heuristics
  const nameLower = (stage.name || "").toLowerCase().trim();
  if (
    nameLower.includes("closed lost") ||
    nameLower.includes("lost") ||
    nameLower.includes("denied") ||
    nameLower.includes("void") ||
    nameLower.includes("cancel") ||
    nameLower.includes("abandon") ||
    nameLower.includes("no show") ||
    nameLower.includes("no-show") ||
    nameLower.includes("not interested") ||
    nameLower.includes("not_interested") ||
    nameLower.includes("reschedule")
  ) {
    return "lost";
  }

  if (
    nameLower.includes("closed won") ||
    nameLower === "won" ||
    nameLower === "completed" ||
    nameLower === "paid" ||
    nameLower.includes("paid & settled") ||
    nameLower.includes("qualified") ||
    nameLower === "interested"
  ) {
    return "won";
  }

  // 4. Final flags
  if (stage.isFinalStage || stage.isFinal || stage.stagePosition === "final") {
    if (stage.color && ["#ef4444", "#f43f5e", "#e11d48", "#dc2626"].includes(stage.color.toLowerCase())) {
      return "lost";
    }
    if (stage.color && ["#10b981", "#059669", "#16a34a", "#22c55e"].includes(stage.color.toLowerCase())) {
      return "won";
    }
    return index === total - 1 ? "won" : "lost";
  }

  return "in_progress";
}

export const ChevronStageRibbon: React.FC<ChevronStageRibbonProps> = ({
  stages,
  activeStageId,
  activeStageName,
  onStageClick,
  onAddStage,
  showAddButton = false,
  extraContent,
  className = "",
}) => {
  const [isOutcomePopupOpen, setIsOutcomePopupOpen] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  // Group stages into In-Progress, Won, and Lost
  const { inProgressStages, wonStages, lostStages, hasOutcomes } = useMemo(() => {
    const inProg: ChevronStage[] = [];
    const won: ChevronStage[] = [];
    const lost: ChevronStage[] = [];

    stages.forEach((stg, idx) => {
      const cat = categorizeChevronStage(stg, idx, stages.length);
      if (cat === "won") won.push(stg);
      else if (cat === "lost") lost.push(stg);
      else inProg.push(stg);
    });

    const hasOutcomes = won.length > 0 || lost.length > 0;
    return { inProgressStages: inProg, wonStages: won, lostStages: lost, hasOutcomes };
  }, [stages]);

  // Active target matching
  const activeTargetId = activeStageId !== undefined ? String(activeStageId).trim().toLowerCase() : "";
  const activeTargetName = activeStageName !== undefined ? activeStageName.trim().toLowerCase() : "";

  const isStageActive = (stg: ChevronStage) => {
    if (activeTargetId && String(stg.id).trim().toLowerCase() === activeTargetId) return true;
    if (activeTargetName && stg.name.trim().toLowerCase() === activeTargetName) return true;
    return false;
  };

  // Determine which in-progress stage is active (if any)
  const activeInProgressIndex = inProgressStages.findIndex(isStageActive);

  // Determine which outcome stage is active (if any)
  const activeWonStage = wonStages.find(isStageActive);
  const activeLostStage = lostStages.find(isStageActive);
  const activeOutcomeStage = activeWonStage || activeLostStage;
  const isOutcomeActive = Boolean(activeOutcomeStage);

  // Selected outcome stage local state for instant feedback
  const [selectedOutcomeStage, setSelectedOutcomeStage] = useState<ChevronStage | null>(null);

  useEffect(() => {
    if (activeOutcomeStage) {
      setSelectedOutcomeStage(activeOutcomeStage);
    } else if (activeInProgressIndex >= 0) {
      setSelectedOutcomeStage(null);
    }
  }, [activeOutcomeStage, activeInProgressIndex]);

  // Close popup on outside click or Escape key
  useEffect(() => {
    if (!isOutcomePopupOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (outcomeRef.current && !outcomeRef.current.contains(e.target as Node)) {
        setIsOutcomePopupOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOutcomePopupOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOutcomePopupOpen]);

  // Current effective outcome stage to show in the last block
  const currentOutcome = selectedOutcomeStage || activeOutcomeStage;
  const isCurrentOutcomeWon = currentOutcome
    ? wonStages.some((w) => String(w.id) === String(currentOutcome.id) || w.name.toLowerCase() === currentOutcome.name.toLowerCase()) ||
      currentOutcome.stageCategory === "success"
    : false;
  const isCurrentOutcomeLost = currentOutcome
    ? lostStages.some((l) => String(l.id) === String(currentOutcome.id) || l.name.toLowerCase() === currentOutcome.name.toLowerCase()) ||
      currentOutcome.stageCategory === "lost"
    : false;

  if (!stages || stages.length === 0) {
    return (
      <div className={`w-full flex items-center justify-between py-2.5 px-3.5 border border-dashed border-gray-200 rounded-xl bg-gray-50/60 text-xs text-gray-400 ${className}`}>
        <span>No stages defined for this process</span>
        {showAddButton && onAddStage && (
          <button
            type="button"
            onClick={() => onAddStage()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-blue-600 border border-gray-200 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stage</span>
          </button>
        )}
      </div>
    );
  }

  // Render sequential chevron item
  const renderInProgressChevron = (
    stage: ChevronStage,
    groupIndex: number,
    groupTotal: number
  ) => {
    const isFirst = groupIndex === 0;
    const originalIndex = stages.findIndex((s) => String(s.id) === String(stage.id));
    const origIdx = originalIndex >= 0 ? originalIndex : groupIndex;

    const isActive = activeInProgressIndex === groupIndex;
    const isCompleted = isOutcomeActive
      ? isCurrentOutcomeWon // When won, all in-progress stages completed
      : activeInProgressIndex >= 0 && activeInProgressIndex > groupIndex;

    const chevronClip = isFirst
      ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
      : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";

    const baseColor = stage.color || CHEVRON_PALETTE[groupIndex % CHEVRON_PALETTE.length];
    const displayColor = isActive ? baseColor : isCompleted ? baseColor : "#E2E8F0";

    return (
      <div
        key={String(stage.id || groupIndex)}
        className={`relative group flex items-center flex-1 min-w-0 ${isFirst ? "" : "-ml-3.5"}`}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedOutcomeStage(null);
            onStageClick?.(stage, origIdx);
          }}
          className={`relative flex items-center h-10 select-none cursor-pointer transition-all w-full min-w-0 ${
            isFirst ? "rounded-l-md" : ""
          } ${
            isActive
              ? "brightness-105 shadow-md ring-2 ring-blue-500/80 z-20 scale-[1.01]"
              : isCompleted
              ? "opacity-90 hover:opacity-100 hover:z-10"
              : "hover:bg-slate-300/80 hover:text-slate-900 hover:z-10"
          }`}
          style={{
            backgroundColor: displayColor,
            clipPath: chevronClip,
            minWidth: "0px",
            width: "100%",
            paddingLeft: isFirst ? "14px" : "24px",
            paddingRight: "24px",
          }}
          title={`Stage: ${stage.name}${isActive ? " (Active)" : isCompleted ? " (Completed)" : ""}`}
        >
          {/* Always show white dividing arrow for in-progress chevrons */}
          <svg
            className="absolute right-0 top-0 h-full w-[15px] pointer-events-none z-10"
            viewBox="0 0 15 40"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M 1 0 L 14 20 L 1 40"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div
            className={`p-0.5 -ml-1 mr-1 shrink-0 ${
              isActive || isCompleted ? "text-white/90" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {isCompleted && !isActive ? (
              <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            ) : (
              <GripVertical className="w-3.5 h-3.5 opacity-60" />
            )}
          </div>

          <span
            className={`text-xs font-semibold tracking-wide truncate flex-1 text-center pr-1 flex items-center justify-center gap-1 ${
              isActive || isCompleted ? "text-white" : "text-slate-600 group-hover:text-slate-900"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className="truncate">{stage.name}</span>
          </span>
        </button>
      </div>
    );
  };

  // Render the Last Stage Block (Won or Lost Outcome)
  const renderLastStageBlock = () => {
    if (!hasOutcomes) return null;

    const hasOutcomeSelected = Boolean(currentOutcome);
    const isFirst = inProgressStages.length === 0;

    const outcomeColor = currentOutcome
      ? currentOutcome.color || (isCurrentOutcomeWon ? "#10B981" : "#EF4444")
      : "#E2E8F0";

    const outcomeClip = isFirst
      ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
      : "polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)";

    const displayName = currentOutcome ? currentOutcome.name : "Won / Lost";

    return (
      <div
        ref={outcomeRef}
        className={`relative group flex items-center flex-1 min-w-[130px] ${
          isFirst ? "" : "-ml-3.5"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOutcomePopupOpen((prev) => !prev)}
          className={`relative flex items-center justify-between h-10 select-none cursor-pointer transition-all w-full min-w-0 rounded-r-md ${
            isFirst ? "rounded-l-md" : ""
          } ${
            hasOutcomeSelected
              ? "brightness-105 shadow-md ring-2 ring-blue-500/80 z-20 scale-[1.01]"
              : "hover:bg-slate-300/80 hover:text-slate-900 hover:z-10"
          }`}
          style={{
            backgroundColor: outcomeColor,
            clipPath: outcomeClip,
            minWidth: "0px",
            width: "100%",
            paddingLeft: isFirst ? "14px" : "24px",
            paddingRight: "14px",
          }}
          title={
            hasOutcomeSelected
              ? `Outcome: ${displayName} (${isCurrentOutcomeWon ? "Won" : "Lost"}) — Click to change`
              : "Click to select Won or Lost outcome"
          }
        >
          {/* Left Icon */}
          <div
            className={`p-0.5 -ml-1 mr-1 shrink-0 ${
              hasOutcomeSelected ? "text-white" : "text-slate-400 group-hover:text-slate-600"
            }`}
          >
            {hasOutcomeSelected ? (
              isCurrentOutcomeWon ? (
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              ) : (
                <X className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              )
            ) : (
              <Sparkles className="w-3.5 h-3.5 opacity-60" />
            )}
          </div>

          {/* Label */}
          <span
            className={`text-xs font-semibold tracking-wide truncate flex-1 text-center px-1 flex items-center justify-center gap-1 ${
              hasOutcomeSelected ? "text-white" : "text-slate-600 group-hover:text-slate-900"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className="truncate">{displayName}</span>
          </span>

          {/* Right Dropdown Arrow */}
          <div className="shrink-0 pl-1">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOutcomePopupOpen ? "rotate-180" : ""
              } ${hasOutcomeSelected ? "text-white/90" : "text-slate-500 group-hover:text-slate-700"}`}
            />
          </div>
        </button>

        {/* ── Outcome Selection Popup ── */}
        {isOutcomePopupOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2.5 px-2 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 pb-2 mb-1.5 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Select Final Outcome</p>
                <p className="text-[11px] text-slate-500">Choose Won or Lost stage</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutcomePopupOpen(false)}
                className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Close popup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stages List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-0.5">
              {/* Won Stages Section */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50/80 rounded-md mb-1">
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Won Stages ({wonStages.length})</span>
                </div>
                <div className="space-y-0.5">
                  {wonStages.length > 0 ? (
                    wonStages.map((stg) => {
                      const origIdx = stages.findIndex((s) => String(s.id) === String(stg.id));
                      const isSelected =
                        currentOutcome &&
                        (String(currentOutcome.id) === String(stg.id) ||
                          currentOutcome.name.toLowerCase() === stg.name.toLowerCase());
                      const stgColor = stg.color || "#10B981";

                      return (
                        <button
                          key={String(stg.id)}
                          type="button"
                          onClick={() => {
                            setSelectedOutcomeStage(stg);
                            onStageClick?.(stg, origIdx >= 0 ? origIdx : 0);
                            setIsOutcomePopupOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-400"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white shadow-xs"
                            style={{ backgroundColor: stgColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate font-medium">{stg.name}</p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 px-2.5 py-1 italic">No won stages defined</p>
                  )}
                </div>
              </div>

              {/* Lost Stages Section */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-rose-700 bg-rose-50/80 rounded-md mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Lost Stages ({lostStages.length})</span>
                </div>
                <div className="space-y-0.5">
                  {lostStages.length > 0 ? (
                    lostStages.map((stg) => {
                      const origIdx = stages.findIndex((s) => String(s.id) === String(stg.id));
                      const isSelected =
                        currentOutcome &&
                        (String(currentOutcome.id) === String(stg.id) ||
                          currentOutcome.name.toLowerCase() === stg.name.toLowerCase());
                      const stgColor = stg.color || "#EF4444";

                      return (
                        <button
                          key={String(stg.id)}
                          type="button"
                          onClick={() => {
                            setSelectedOutcomeStage(stg);
                            onStageClick?.(stg, origIdx >= 0 ? origIdx : 0);
                            setIsOutcomePopupOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-rose-50/90 text-rose-950 font-semibold ring-1 ring-rose-400"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white shadow-xs"
                            style={{ backgroundColor: stgColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate font-medium">{stg.name}</p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-slate-400 px-2.5 py-1 italic">No lost stages defined</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full flex items-center py-0.5 px-0.5">
        {/* Main Pipeline Chevrons */}
        <div className="flex-1 min-w-0 flex items-center">
          {/* Sequential In-Progress Stages */}
          {inProgressStages.map((stg, sIdx) =>
            renderInProgressChevron(stg, sIdx, inProgressStages.length)
          )}

          {/* Unified Last Stage Block (Won or Lost Outcome) */}
          {renderLastStageBlock()}
        </div>

        {/* Optional Add Stage Button */}
        {showAddButton && onAddStage && (
          <button
            type="button"
            onClick={() => onAddStage()}
            className="flex items-center justify-center w-8 h-10 rounded-md bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs flex-shrink-0 cursor-pointer ml-1.5"
            title="Add stage"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {extraContent}
      </div>
    </div>
  );
};

export default ChevronStageRibbon;
