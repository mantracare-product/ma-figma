import React from "react";
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
  showAddButton = true,
  extraContent,
  className = "",
}) => {
  // Determine active index
  const activeIndex = React.useMemo(() => {
    if (activeStageId !== undefined) {
      const idx = stages.findIndex((s) => String(s.id) === String(activeStageId));
      if (idx !== -1) return idx;
    }
    if (activeStageName) {
      const idx = stages.findIndex(
        (s) => s.name.trim().toLowerCase() === activeStageName.trim().toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    return 0;
  }, [stages, activeStageId, activeStageName]);

  // Split sequential vs final stage options (matching Process.tsx exactly)
  const { sequentialStages, finalStageOptions } = React.useMemo(() => {
    const hasExplicitFinal = stages.some((s) => s.isFinalStage || s.isFinal);
    const seq = hasExplicitFinal
      ? stages.filter((s) => !s.isFinalStage && !s.isFinal)
      : stages.length > 1
      ? stages.slice(0, -1)
      : stages;
    const finalOpts = hasExplicitFinal
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
    const isActive = originalIndex === activeIndex;
    const isCompleted = activeIndex > originalIndex;

    const chevronClip = isFirst
      ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
      : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";

    const baseColor =
      stage.color ||
      (isFinalGroup
        ? CHEVRON_PALETTE[(sequentialStages.length + groupIndex) % CHEVRON_PALETTE.length] || "#EC4899"
        : CHEVRON_PALETTE[groupIndex % CHEVRON_PALETTE.length]);

    return (
      <button
        key={String(stage.id)}
        type="button"
        onClick={() => onStageClick?.(stage, originalIndex)}
        className={`relative group flex items-center h-10 select-none cursor-pointer transition-all flex-shrink-0 ${
          isFirst ? "rounded-l-md" : "-ml-3.5"
        } ${isActive ? "brightness-110 shadow-md ring-2 ring-blue-500/80 z-20 scale-[1.02]" : "hover:brightness-105 hover:z-10"}`}
        style={{
          backgroundColor: baseColor,
          clipPath: chevronClip,
          minWidth: "140px",
          paddingLeft: isFirst ? "14px" : "24px",
          paddingRight: "24px",
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

        <div className="p-0.5 -ml-1 mr-1 text-white/80 shrink-0">
          {isCompleted ? (
            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          ) : (
            <GripVertical className="w-3.5 h-3.5" />
          )}
        </div>

        <span
          className="text-xs font-semibold text-white tracking-wide truncate flex-1 text-center pr-1 flex items-center justify-center gap-1"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {isFinalGroup && <span className="text-[10px] opacity-90">🏁</span>}
          <span className="truncate">{stage.name}</span>
        </span>
      </button>
    );
  };

  return (
    <div className={`flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-gray-200 ${className}`}>
      {/* Sequential Stages Group */}
      <div className="flex items-center flex-shrink-0">
        {sequentialStages.map((stg, sIdx) => {
          const originalIndex = stages.findIndex((s) => String(s.id) === String(stg.id));
          return renderChevronItem(stg, sIdx, sequentialStages.length, originalIndex >= 0 ? originalIndex : sIdx, false);
        })}
      </div>

      {/* Optional + Divider Button */}
      {showAddButton && (
        <button
          type="button"
          onClick={() => onAddStage?.()}
          className="flex items-center justify-center w-8 h-10 rounded-md bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-xs flex-shrink-0 cursor-pointer"
          title="Add stage"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Final Stage Options Group */}
      {finalStageOptions.length > 0 && (
        <div className="flex items-center flex-shrink-0">
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

      {/* Extra Content (e.g. Partition, transitions) */}
      {extraContent}
    </div>
  );
};

export default ChevronStageRibbon;
