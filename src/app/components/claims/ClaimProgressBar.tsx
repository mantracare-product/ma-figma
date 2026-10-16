import React, { useState, useRef, useEffect, useMemo } from "react";
import { ClaimStatus } from "../../../lib/claimsStore";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { CHEVRON_PALETTE } from "../common/ChevronStageRibbon";

export interface ClaimStageItem {
  id: string;
  name: string;
  color?: string;
  systemCategory?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  isFinalStage?: boolean;
  stagePosition?: "initial" | "intermediate" | "final" | null;
  stageCategory?: "in_progress" | "success" | "lost";
}

interface ClaimProgressBarProps {
  status?: ClaimStatus | string;
  currentStageId?: string;
  stages?: ClaimStageItem[];
  onStatusChange?: (newStageId: string, stageName?: string) => void;
  interactive?: boolean;
  claimId?: string;
}

export default function ClaimProgressBar({
  status,
  currentStageId,
  stages: propStages,
  onStatusChange,
  interactive = true,
}: ClaimProgressBarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback internal stages from store if propStages is not provided
  const [internalStages, setInternalStages] = useState<ClaimStageItem[]>(() => {
    const proc = getStoredProcesses().find((p) => p.entityType === "insurance") || DEFAULT_ENTITY_PROCESSES.insurance;
    return proc.stages;
  });

  useEffect(() => {
    if (propStages && propStages.length > 0) return;
    const handleUpdate = () => {
      const proc = getStoredProcesses().find((p) => p.entityType === "insurance") || DEFAULT_ENTITY_PROCESSES.insurance;
      setInternalStages(proc.stages);
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [propStages]);

  const effectiveStages = useMemo(() => {
    if (propStages && propStages.length > 0) return propStages;
    return internalStages;
  }, [propStages, internalStages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine active step position (1-based index) matching workflow configuration
  const activeIndex = useMemo(() => {
    if (currentStageId && currentStageId.trim() !== "") {
      const idx = effectiveStages.findIndex(
        (s) =>
          s.id.toLowerCase() === currentStageId.trim().toLowerCase() ||
          s.name.toLowerCase() === currentStageId.trim().toLowerCase()
      );
      if (idx !== -1) return idx + 1;
    }
    if (status && typeof status === "string") {
      const clean = status.trim().toLowerCase();
      const idx = effectiveStages.findIndex(
        (s) =>
          s.name.toLowerCase() === clean ||
          s.id.toLowerCase() === clean ||
          (s.systemCategory && s.systemCategory.toLowerCase() === clean)
      );
      if (idx !== -1) return idx + 1;

      // Semantic matching for standard CMS statuses
      if (clean === "paid" || clean === "accepted" || clean === "verified") {
        const wonIdx = effectiveStages.findIndex(
          (s) =>
            s.stageCategory === "success" ||
            s.systemCategory === "verified" ||
            s.systemCategory === "paid" ||
            s.name.toLowerCase().includes("verified") ||
            s.name.toLowerCase().includes("paid")
        );
        if (wonIdx !== -1) return wonIdx + 1;
        return effectiveStages.length;
      }
      if (clean === "rejected" || clean === "failed" || clean === "denied") {
        const lostIdx = effectiveStages.findIndex(
          (s) =>
            s.stageCategory === "lost" ||
            s.systemCategory === "failed" ||
            s.systemCategory === "denied" ||
            s.name.toLowerCase().includes("fail") ||
            s.name.toLowerCase().includes("denied") ||
            s.name.toLowerCase().includes("reject")
        );
        if (lostIdx !== -1) return lostIdx + 1;
        return effectiveStages.length;
      }
      if (clean === "draft") {
        return 1;
      }
      if (clean === "ready to submit" || clean === "pending") {
        const pendingIdx = effectiveStages.findIndex(
          (s) =>
            s.systemCategory === "pending" ||
            s.name.toLowerCase().includes("pending") ||
            s.name.toLowerCase().includes("ready")
        );
        if (pendingIdx !== -1) return pendingIdx + 1;
        return 1;
      }
      if (clean === "submitted" || clean === "under review") {
        return Math.max(1, Math.min(effectiveStages.length - 1, 2));
      }
    }
    return 1;
  }, [effectiveStages, currentStageId, status]);

  const currentStageObj = activeIndex > 0 ? effectiveStages[activeIndex - 1] : null;

  return (
    <div className="relative inline-flex items-center gap-2" ref={containerRef}>
      <div
        className="flex items-center justify-center -space-x-px cursor-pointer py-0.5 px-0.5 rounded hover:bg-slate-100/60 transition-colors"
        onClick={() => {
          if (interactive && onStatusChange) {
            setShowPopover(!showPopover);
          }
        }}
        title={`Current stage: ${currentStageObj?.name || status || "Pending"}. Click to change stage.`}
      >
        {/* Render dynamic workflow stages with no gaps */}
        {effectiveStages.map((stg, i) => {
          const segIdx = i + 1;
          const isStgLost =
            stg.isFinalStage ||
            stg.isFinal ||
            stg.stageCategory === "lost" ||
            stg.systemCategory === "failed" ||
            stg.systemCategory === "denied" ||
            stg.systemCategory === "rejected" ||
            stg.name.toLowerCase().includes("fail") ||
            stg.name.toLowerCase().includes("denied") ||
            stg.name.toLowerCase().includes("reject") ||
            stg.name.toLowerCase().includes("lost");

          const isCurrentLost = Boolean(
            currentStageObj &&
              (currentStageObj.isFinalStage ||
                currentStageObj.isFinal ||
                currentStageObj.stageCategory === "lost" ||
                currentStageObj.systemCategory === "failed" ||
                currentStageObj.systemCategory === "denied" ||
                currentStageObj.name.toLowerCase().includes("fail") ||
                currentStageObj.name.toLowerCase().includes("denied") ||
                currentStageObj.name.toLowerCase().includes("reject"))
          );

          const isActive = activeIndex > 0 && segIdx === activeIndex;
          const isCompleted = activeIndex > 0 && segIdx < activeIndex && !isStgLost;
          const isHovered = hoveredIdx === segIdx;
          const stgColor = stg.color || CHEVRON_PALETTE[i % CHEVRON_PALETTE.length] || "#1E88E5";

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
          } else {
            bg = "#E2E8F0";
            border = "1px solid #CBD5E1";
            opacity = 0.9;
          }

          return (
            <div
              key={stg.id || `stage-${i}`}
              className="relative"
              style={{ zIndex: isActive ? 10 : isHovered ? 20 : 1 }}
            >
              {/* Dark Tooltip on Hover */}
              {isHovered && !showPopover && (
                <div
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 pointer-events-none z-50 shadow-md"
                  style={{
                    backgroundColor: "#1A2B4A",
                    color: "#FFFFFF",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {stg.name}
                  {isActive ? " (Current)" : isCompleted ? " (Completed)" : ""}
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (interactive && onStatusChange) {
                    onStatusChange(stg.id, stg.name);
                  }
                }}
                onMouseEnter={() => setHoveredIdx(segIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  width: "18px",
                  height: "8px",
                  borderRadius: "0px",
                  backgroundColor: bg,
                  border: border,
                  opacity: opacity,
                  cursor: interactive && onStatusChange ? "pointer" : "default",
                  display: "block",
                  padding: 0,
                  flexShrink: 0,
                  transition: "background-color 0.2s ease, transform 0.15s ease",
                  transform: isHovered ? "scaleY(1.3)" : "scaleY(1)",
                }}
                aria-label={`Claim Stage: ${stg.name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Popover on click to change stage from configured workflow */}
      {showPopover && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-left">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
            <span>Change Stage</span>
            <span className="font-normal text-slate-400">({effectiveStages.length} Stages)</span>
          </div>
          {effectiveStages.map((stg, i) => {
            const isSelected = activeIndex === i + 1;
            const stageColor = stg.color || CHEVRON_PALETTE[i % CHEVRON_PALETTE.length] || "#1E88E5";
            return (
              <button
                key={stg.id || `pop-${i}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(stg.id, stg.name);
                  setShowPopover(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between font-medium cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-50 font-bold text-blue-600" : "text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stageColor }}
                  />
                  <span>{stg.name}</span>
                </div>
                {isSelected && <span className="text-blue-600 font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
