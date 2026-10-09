import React, { useState } from "react";
import { GripVertical, Check, Plus } from "lucide-react";

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
  const [hoveredTooltip, setHoveredTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Determine active index
  const activeIndex = React.useMemo(() => {
    if (activeStageId !== undefined && String(activeStageId).trim() !== "") {
      const idx = stages.findIndex((s) => String(s.id).toLowerCase() === String(activeStageId).toLowerCase());
      if (idx !== -1) return idx;
    }
    if (activeStageName && activeStageName.trim() !== "") {
      const idx = stages.findIndex(
        (s) => s.name.trim().toLowerCase() === activeStageName.trim().toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return -1;
  }, [stages, activeStageId, activeStageName]);

  // Split sequential vs final stage options (matching Process.tsx exactly)
  const { sequentialStages, finalStageOptions } = React.useMemo(() => {
    const hasAnyOutcomeFlag = stages.some((s) => s.isFinalStage !== undefined || s.isFinal !== undefined);
    const seq = hasAnyOutcomeFlag
      ? stages.filter((s) => !s.isFinalStage && !s.isFinal)
      : stages.length > 1
      ? stages.slice(0, -1)
      : stages;
    const finalOpts = hasAnyOutcomeFlag
      ? stages.filter((s) => s.isFinalStage || s.isFinal)
      : stages.length > 1
      ? stages.slice(-1)
      : [];
    return { sequentialStages: seq, finalStageOptions: finalOpts };
  }, [stages]);

  const renderChevronItem = (
    stage: ChevronStage,
    groupIndex: number,
    groupTotal: number,
    originalIndex: number,
    isFinalGroup: boolean
  ) => {
    const isFirst = groupIndex === 0;
    const isLast = groupIndex === groupTotal - 1;
    const isActive = activeIndex >= 0 && originalIndex === activeIndex;
    const isCompleted = activeIndex >= 0 && activeIndex > originalIndex;

    const chevronClip = isFirst
      ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
      : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";

    const baseColor =
      stage.color ||
      (isFinalGroup
        ? CHEVRON_PALETTE[(sequentialStages.length + groupIndex) % CHEVRON_PALETTE.length] || "#EC4899"
        : CHEVRON_PALETTE[groupIndex % CHEVRON_PALETTE.length]);

    const displayColor = isActive ? baseColor : isCompleted ? baseColor : "#E2E8F0";

    return (
      <div
        key={String(stage.id || originalIndex)}
        className={`relative group flex items-center ${
          !isFinalGroup ? "flex-1 min-w-0" : "flex-shrink-0"
        } ${isFirst ? "" : "-ml-3.5"}`}
        onMouseEnter={(e) => {
          if (isFinalGroup) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoveredTooltip({ name: stage.name, x: rect.left + rect.width / 2, y: rect.top });
          }
        }}
        onMouseLeave={() => {
          if (isFinalGroup) {
            setHoveredTooltip(null);
          }
        }}
      >
        <button
          type="button"
          onClick={() => onStageClick?.(stage, originalIndex)}
          className={`relative flex items-center h-10 select-none cursor-pointer transition-all ${
            !isFinalGroup ? "w-full min-w-0" : "flex-shrink-0"
          } ${isFirst ? "rounded-l-md" : ""} ${
            isActive
              ? "brightness-105 shadow-md ring-2 ring-blue-500/80 z-20 scale-[1.01]"
              : isCompleted
              ? "opacity-90 hover:opacity-100 hover:z-10"
              : "hover:bg-slate-300/80 hover:text-slate-900 hover:z-10"
          }`}
          style={{
            backgroundColor: displayColor,
            clipPath: chevronClip,
            ...(isFinalGroup
              ? { width: "38px", minWidth: "38px", paddingLeft: isFirst ? "8px" : "14px", paddingRight: "6px" }
              : { minWidth: "0px", width: "100%", paddingLeft: isFirst ? "14px" : "24px", paddingRight: "24px" }),
          }}
          title={`Stage: ${stage.name}${isActive ? " (Active)" : isCompleted ? " (Completed)" : ""}`}
        >
          {!isLast && (
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
          )}

          {!isFinalGroup && (
            <>
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
            </>
          )}
        </button>
      </div>
    );
  };

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

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full flex items-center py-0.5 px-0.5">
        {/* Sequential Stages (Won area) - Full Width dynamically */}
        <div className="flex-1 min-w-0 flex items-center">
          {sequentialStages.map((stg, sIdx) => {
            const originalIndex = stages.findIndex((s) => String(s.id) === String(stg.id));
            return renderChevronItem(
              stg,
              sIdx,
              sequentialStages.length,
              originalIndex >= 0 ? originalIndex : sIdx,
              false
            );
          })}
        </div>

        {/* Lost Stages - Smaller Width (compact chevron ribbons) */}
        {finalStageOptions.length > 0 && (
          <div className="flex items-center flex-shrink-0 ml-1.5">
            {finalStageOptions.map((fStg, fIdx) => {
              const originalIndex = stages.findIndex((s) => String(s.id) === String(fStg.id));
              return renderChevronItem(
                fStg,
                fIdx,
                finalStageOptions.length,
                originalIndex >= 0 ? originalIndex : sequentialStages.length + fIdx,
                true
              );
            })}
          </div>
        )}

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

      {/* Page-relative Stage Hover Tooltip */}
      {hoveredTooltip && (
        <div
          className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 px-2.5 py-1 text-xs font-semibold text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap"
          style={{
            left: `${hoveredTooltip.x}px`,
            top: `${hoveredTooltip.y - 8}px`,
          }}
        >
          {hoveredTooltip.name}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

export default ChevronStageRibbon;
