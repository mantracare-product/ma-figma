import React, { useState, useRef, useEffect } from "react";
import { InvoiceStatus } from "../../types/invoiceTypes";

interface InvoiceProgressBarProps {
  status: InvoiceStatus;
  onStatusChange?: (newStatus: InvoiceStatus) => void;
  interactive?: boolean;
  logId?: string;
  size?: "sm" | "md" | "lg";
}

const STAGE_BLOCKS: { id: InvoiceStatus; name: string; step: number }[] = [
  { id: "draft", name: "Draft", step: 1 },
  { id: "sent", name: "Sent", step: 2 },
  { id: "viewed", name: "Viewed", step: 3 },
  { id: "partial", name: "Partial", step: 4 },
  { id: "paid", name: "Paid", step: 5 },
  { id: "overdue", name: "Overdue", step: 6 },
  { id: "void", name: "Void", step: 7 },
];

export default function InvoiceProgressBar({
  status,
  onStatusChange,
  interactive = true,
  logId = "inv",
}: InvoiceProgressBarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine active step position (1-7)
  let activeIndex = 1;
  if (status === "draft") activeIndex = 1;
  else if (status === "sent") activeIndex = 2;
  else if (status === "viewed") activeIndex = 3;
  else if (status === "partial") activeIndex = 4;
  else if (status === "paid") activeIndex = 5;
  else if (status === "overdue") activeIndex = 6;
  else if (status === "void") activeIndex = 7;

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
        {/* Render 6 Visual Block Segments */}
        {STAGE_BLOCKS.map((stg, i) => {
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
            bg = segIdx === 6 ? "#EF4444" : "#1E88E5"; // Red block for overdue at step 6
            border = "none";
          } else if (stg.id === "partial" && isActive) {
            bg = "#F59E0B"; // Amber for partial status
            border = "none";
          } else if (isFilled) {
            bg = "#1E88E5"; // Blue for active/completed stages
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

      {/* Popover on click to choose ALL 6 stages explicitly */}
      {showPopover && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-left">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Set Stage Status (6 Stages)
          </div>
          {STAGE_BLOCKS.map((stg) => (
            <button
              key={stg.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusChange) onStatusChange(stg.id);
                setShowPopover(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between font-medium ${
                status === stg.id ? "bg-slate-100 font-bold text-blue-600" : "text-slate-700"
              }`}
            >
              <span>
                {stg.step}. {stg.name}
              </span>
              {status === stg.id && <span className="text-blue-600 font-bold">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
