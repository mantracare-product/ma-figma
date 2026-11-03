import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, X, Trophy, XCircle } from "lucide-react";
import { CHEVRON_PALETTE, categorizeChevronStage, ChevronStage } from "./ChevronStageRibbon";

export interface SegmentedStageBarProps {
  stages: Array<{
    id: string | number;
    name: string;
    color?: string;
    isFinalStage?: boolean;
    isFinal?: boolean;
    systemCategory?: string;
    stageCategory?: "in_progress" | "success" | "lost";
    stagePosition?: "initial" | "intermediate" | "final" | null;
    intentTrigger?: string;
  }>;
  currentStageName?: string;
  currentStageId?: string | number;
  onStageSelect?: (stage: any) => void;
  interactive?: boolean;
  className?: string;
}

export const SegmentedStageBar: React.FC<SegmentedStageBarProps> = ({
  stages,
  currentStageName,
  currentStageId,
  onStageSelect,
  interactive = true,
  className = "",
}) => {
  const [hoveredSegIdx, setHoveredSegIdx] = useState<number | null>(null);
  const [isOutcomePopupOpen, setIsOutcomePopupOpen] = useState(false);
  const outcomeRef = useRef<HTMLDivElement>(null);

  // Categorize into in-progress, won, and lost
  const { inProgressStages, wonStages, lostStages, hasOutcomes } = useMemo(() => {
    const inProg: any[] = [];
    const won: any[] = [];
    const lost: any[] = [];

    stages.forEach((stg, idx) => {
      const cat = categorizeChevronStage(stg as ChevronStage, idx, stages.length);
      if (cat === "won") won.push(stg);
      else if (cat === "lost") lost.push(stg);
      else inProg.push(stg);
    });

    return {
      inProgressStages: inProg,
      wonStages: won,
      lostStages: lost,
      hasOutcomes: won.length > 0 || lost.length > 0,
    };
  }, [stages]);

  // Clean current stage string
  const cleanCurrent = (currentStageName || "").includes(":")
    ? currentStageName!.split(":")[1].trim().toLowerCase()
    : (currentStageName || "").trim().toLowerCase();

  const isCurrentStage = (s: any) => {
    if (currentStageId && String(s.id).toLowerCase() === String(currentStageId).toLowerCase()) return true;
    if (cleanCurrent && s.name.trim().toLowerCase() === cleanCurrent) return true;
    return false;
  };

  const activeWonStage = wonStages.find(isCurrentStage);
  const activeLostStage = lostStages.find(isCurrentStage);
  const activeOutcomeStage = activeWonStage || activeLostStage;
  const isOutcomeActive = Boolean(activeOutcomeStage);
  const isCurrentWon = Boolean(activeWonStage);

  const activeInProgressIdx = inProgressStages.findIndex(isCurrentStage);

  // Close outcome popup on click outside or Escape
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

  if (!stages || stages.length === 0) {
    return null;
  }

  // If there are no outcome stages, render all stages as sequential segments
  if (!hasOutcomes) {
    return (
      <div className={`flex items-center justify-center -space-x-px ${className}`} onClick={(e) => e.stopPropagation()}>
        {stages.map((stg, i) => {
          const isActive = isCurrentStage(stg);
          const isCompleted = activeInProgressIdx >= 0 && i < activeInProgressIdx;
          const stgColor = stg.color || CHEVRON_PALETTE[i % CHEVRON_PALETTE.length];
          const isHovered = hoveredSegIdx === i;

          let bg = "#E2E8F0";
          let border = "1px solid #CBD5E1";
          let opacity = 0.9;

          if (isActive) {
            bg = stgColor;
            border = "1.5px solid #0F172A";
            opacity = 1;
          } else if (isCompleted) {
            bg = stgColor;
            border = `1px solid ${stgColor}`;
            opacity = 0.9;
          }

          return (
            <div key={stg.id || `seg-${i}`} className="relative" style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}>
              {isHovered && (
                <div
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 pointer-events-none rounded shadow-md z-[200] flex items-center gap-1.5"
                  style={{ backgroundColor: "#1A2B4A", color: "#fff", fontSize: "12px", fontFamily: "Outfit, sans-serif" }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stgColor }} />
                  <span>{stg.name}</span>
                  {isActive ? (
                    <span className="text-[10px] text-blue-300 font-semibold">(Current)</span>
                  ) : isCompleted ? (
                    <span className="text-[10px] text-emerald-300 font-semibold">(Completed)</span>
                  ) : null}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (interactive && onStageSelect) onStageSelect(stg);
                }}
                onMouseEnter={() => setHoveredSegIdx(i)}
                onMouseLeave={() => setHoveredSegIdx(null)}
                style={{
                  width: "18px",
                  height: "8px",
                  borderRadius: "0px",
                  backgroundColor: bg,
                  border: border,
                  opacity: opacity,
                  cursor: interactive ? "pointer" : "default",
                  display: "block",
                  padding: 0,
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
                title={stg.name}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Last outcome segment color and properties
  const outcomeColor = activeOutcomeStage
    ? activeOutcomeStage.color || (isCurrentWon ? "#10B981" : "#EF4444")
    : "#E2E8F0";

  const outcomeDisplayName = activeOutcomeStage ? activeOutcomeStage.name : "Won / Lost";
  const isOutcomeHovered = hoveredSegIdx === inProgressStages.length;

  return (
    <div className={`flex items-center justify-center -space-x-px relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* 1. Sequential In-Progress Segments */}
      {inProgressStages.map((stg, i) => {
        const isActive = activeInProgressIdx === i;
        const isCompleted = isOutcomeActive
          ? isCurrentWon // When Won, all in-progress stages completed
          : activeInProgressIdx >= 0 && i < activeInProgressIdx;

        const stgColor = stg.color || CHEVRON_PALETTE[i % CHEVRON_PALETTE.length];
        const isHovered = hoveredSegIdx === i;

        let bg = "#E2E8F0";
        let border = "1px solid #CBD5E1";
        let opacity = 0.9;

        if (isActive) {
          bg = stgColor;
          border = "1.5px solid #0F172A";
          opacity = 1;
        } else if (isCompleted) {
          bg = stgColor;
          border = `1px solid ${stgColor}`;
          opacity = 0.9;
        }

        return (
          <div key={stg.id || `stg-${i}`} className="relative" style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}>
            {isHovered && (
              <div
                className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 pointer-events-none rounded shadow-md z-[200] flex items-center gap-1.5"
                style={{ backgroundColor: "#1A2B4A", color: "#fff", fontSize: "12px", fontFamily: "Outfit, sans-serif" }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stgColor }} />
                <span>{stg.name}</span>
                {isActive ? (
                  <span className="text-[10px] text-blue-300 font-semibold">(Current)</span>
                ) : isCompleted ? (
                  <span className="text-[10px] text-emerald-300 font-semibold">(Completed)</span>
                ) : null}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (interactive && onStageSelect) onStageSelect(stg);
              }}
              onMouseEnter={() => setHoveredSegIdx(i)}
              onMouseLeave={() => setHoveredSegIdx(null)}
              style={{
                width: "18px",
                height: "8px",
                borderRadius: "0px",
                backgroundColor: bg,
                border: border,
                opacity: opacity,
                cursor: interactive ? "pointer" : "default",
                display: "block",
                padding: 0,
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              title={stg.name}
            />
          </div>
        );
      })}

      {/* 2. Unified Final Outcome Segment (Won or Lost) */}
      <div
        ref={outcomeRef}
        className="relative"
        style={{ zIndex: isOutcomeActive ? 10 : isOutcomeHovered || isOutcomePopupOpen ? 30 : 1 }}
      >
        {isOutcomeHovered && !isOutcomePopupOpen && (
          <div
            className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 pointer-events-none rounded shadow-md z-[200] flex items-center gap-1.5"
            style={{ backgroundColor: "#1A2B4A", color: "#fff", fontSize: "12px", fontFamily: "Outfit, sans-serif" }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isOutcomeActive ? outcomeColor : "#94A3B8" }}
            />
            <span>{outcomeDisplayName}</span>
            {isOutcomeActive ? (
              <span className={`text-[10px] font-semibold ${isCurrentWon ? "text-emerald-300" : "text-rose-300"}`}>
                ({isCurrentWon ? "Won" : "Lost"})
              </span>
            ) : (
              <span className="text-[10px] text-slate-300 font-medium">(Click to set outcome)</span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (interactive) {
              setIsOutcomePopupOpen((prev) => !prev);
            }
          }}
          onMouseEnter={() => setHoveredSegIdx(inProgressStages.length)}
          onMouseLeave={() => setHoveredSegIdx(null)}
          style={{
            width: "18px",
            height: "8px",
            borderRadius: "0px",
            backgroundColor: isOutcomeActive ? outcomeColor : "#E2E8F0",
            border: isOutcomeActive ? "1.5px solid #0F172A" : "1px solid #CBD5E1",
            opacity: 0.95,
            cursor: interactive ? "pointer" : "default",
            display: "block",
            padding: 0,
            flexShrink: 0,
            transition: "all 0.2s ease",
          }}
          title={isOutcomeActive ? `${outcomeDisplayName} (${isCurrentWon ? "Won" : "Lost"})` : "Won / Lost"}
        />

        {/* ── Table Row Outcome Selection Dropdown ── */}
        {isOutcomePopupOpen && (
          <div
            className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2.5 px-2 z-[300] text-left animate-in fade-in slide-in-from-bottom-1 duration-150"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-2 mb-1.5 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Select Final Outcome</p>
                <p className="text-[10px] text-slate-500">Choose Won or Lost stage</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutcomePopupOpen(false)}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stages Scroll Container */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
              {/* Won Stages Section */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50/80 rounded mb-1">
                  <Trophy className="w-3 h-3 text-emerald-600" />
                  <span>Won Stages ({wonStages.length})</span>
                </div>
                <div className="space-y-0.5">
                  {wonStages.length > 0 ? (
                    wonStages.map((stg) => {
                      const isSelected = isCurrentStage(stg);
                      const stgColor = stg.color || "#10B981";

                      return (
                        <button
                          key={String(stg.id)}
                          type="button"
                          onClick={() => {
                            if (onStageSelect) onStageSelect(stg);
                            setIsOutcomePopupOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-400"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-2xs"
                            style={{ backgroundColor: stgColor }}
                          />
                          <span className="text-xs truncate flex-1 font-medium">{stg.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-slate-400 px-2 py-0.5 italic">No won stages</p>
                  )}
                </div>
              </div>

              {/* Lost Stages Section */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-rose-700 bg-rose-50/80 rounded mb-1">
                  <XCircle className="w-3 h-3 text-rose-600" />
                  <span>Lost Stages ({lostStages.length})</span>
                </div>
                <div className="space-y-0.5">
                  {lostStages.length > 0 ? (
                    lostStages.map((stg) => {
                      const isSelected = isCurrentStage(stg);
                      const stgColor = stg.color || "#EF4444";

                      return (
                        <button
                          key={String(stg.id)}
                          type="button"
                          onClick={() => {
                            if (onStageSelect) onStageSelect(stg);
                            setIsOutcomePopupOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-rose-50/90 text-rose-950 font-semibold ring-1 ring-rose-400"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-2xs"
                            style={{ backgroundColor: stgColor }}
                          />
                          <span className="text-xs truncate flex-1 font-medium">{stg.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[2.5]" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-slate-400 px-2 py-0.5 italic">No lost stages</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentedStageBar;

