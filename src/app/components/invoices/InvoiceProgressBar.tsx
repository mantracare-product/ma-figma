import React, { useState, useRef, useEffect, useMemo } from "react";
import { InvoiceStatus } from "../../types/invoiceTypes";
import { DEFAULT_ENTITY_PROCESSES, getStoredProcesses, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";

export interface InvoiceStageItem {
  id: string;
  name: string;
  color?: string;
  systemCategory?: string;
}

interface InvoiceProgressBarProps {
  status: InvoiceStatus;
  currentStageId?: string;
  stages?: InvoiceStageItem[];
  onStatusChange?: (newStatusOrStageId: InvoiceStatus | string) => void;
  interactive?: boolean;
  logId?: string;
  size?: "sm" | "md" | "lg";
}

export default function InvoiceProgressBar({
  status,
  currentStageId,
  stages: propStages,
  onStatusChange,
  interactive = true,
  logId = "inv",
}: InvoiceProgressBarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback internal stages from store if propStages is not provided
  const [internalStages, setInternalStages] = useState<InvoiceStageItem[]>(() => {
    const proc = getStoredProcesses().find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
    return proc.stages;
  });

  useEffect(() => {
    if (propStages) return;
    const handleUpdate = () => {
      const proc = getStoredProcesses().find((p) => p.entityType === "invoice") || DEFAULT_ENTITY_PROCESSES.invoice;
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

  // Determine active step position (1-based index)
  const activeIndex = useMemo(() => {
    if (currentStageId) {
      const idx = effectiveStages.findIndex((s) => s.id === currentStageId);
      if (idx !== -1) return idx + 1;
    }
    const idx = effectiveStages.findIndex(
      (s) => s.id === status || s.systemCategory === status
    );
    return idx !== -1 ? idx + 1 : 1;
  }, [effectiveStages, currentStageId, status]);

  const isOverdue = status === "overdue";
  const isVoid = status === "void";

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div
        className="flex items-center gap-[3px] justify-center cursor-pointer p-1 rounded hover:bg-slate-100/50 transition-colors"
        onClick={() => {
          if (interactive && onStatusChange) {
            setShowPopover(!showPopover);
          }
        }}
      >
        {/* Render dynamic Visual Block Segments */}
        {effectiveStages.map((stg, i) => {
          const segIdx = i + 1;
          const isCompleted = segIdx < activeIndex;
          const isActive = segIdx === activeIndex;
          const isFilled = isCompleted || isActive;
          const isHovered = hoveredIdx === segIdx;

          let bg = "transparent";
          let border = "1px solid #E8ECF0";

          if (isVoid) {
            bg = "#CBD5E1"; // Muted grey for void
            border = "none";
          } else if (isOverdue && (isActive || isCompleted)) {
            bg = stg.systemCategory === "overdue" || isActive ? "#EF4444" : (stg.color || "#1E88E5");
            border = "none";
          } else if (isFilled) {
            bg = stg.color || "#1E88E5";
            border = "none";
          }

          return (
            <div key={stg.id} className="relative">
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
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (interactive && onStatusChange) {
                    onStatusChange(stg.id);
                  }
                }}
                onMouseEnter={() => setHoveredIdx(segIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  width: "18px",
                  height: "8px",
                  borderRadius: "2px",
                  backgroundColor: bg,
                  border: border,
                  cursor: interactive && onStatusChange ? "pointer" : "default",
                  display: "block",
                  padding: 0,
                  flexShrink: 0,
                  transition: "background-color 0.2s ease, transform 0.15s ease",
                  transform: isHovered ? "scaleY(1.3)" : "scaleY(1)",
                }}
                aria-label={`Stage: ${stg.name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Popover on click to choose stage */}
      {showPopover && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-left">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Set Stage Status ({effectiveStages.length} Stages)
          </div>
          {effectiveStages.map((stg, i) => {
            const isSelected = (currentStageId && currentStageId === stg.id) || (!currentStageId && (status === stg.id || status === stg.systemCategory));
            return (
              <button
                key={stg.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onStatusChange) onStatusChange(stg.id);
                  setShowPopover(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between font-medium ${
                  isSelected ? "bg-slate-100 font-bold text-blue-600" : "text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stg.color || "#3B82F6" }}
                  />
                  <span>
                    {i + 1}. {stg.name}
                  </span>
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
