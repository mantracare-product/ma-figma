import React, { useState, useRef, useEffect } from "react";
import { ClaimStatus } from "../../../lib/claimsStore";

interface ClaimProgressBarProps {
  status: ClaimStatus;
  onStatusChange?: (newStatus: ClaimStatus) => void;
  interactive?: boolean;
  claimId?: string;
}

export const CLAIM_STAGE_BLOCKS: { id: ClaimStatus; name: string; step: number; color?: string }[] = [
  { id: "Draft", name: "Draft", step: 1 },
  { id: "Ready to Submit", name: "Ready to Submit", step: 2 },
  { id: "Submitted", name: "Submitted", step: 3 },
  { id: "Under Review", name: "Under Review", step: 4 },
  { id: "Accepted", name: "Accepted", step: 5 },
  { id: "Paid", name: "Paid", step: 6, color: "#10B981" },
];

export default function ClaimProgressBar({
  status,
  onStatusChange,
  interactive = true,
}: ClaimProgressBarProps) {
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

  // Determine active step position (1-6)
  let activeIndex = 1;
  if (status === "Draft") activeIndex = 1;
  else if (status === "Ready to Submit") activeIndex = 2;
  else if (status === "Submitted") activeIndex = 3;
  else if (status === "Under Review") activeIndex = 4;
  else if (status === "Accepted") activeIndex = 5;
  else if (status === "Paid") activeIndex = 6;
  else if (status === "Rejected") activeIndex = 3; // marked at submission/review point

  const isRejected = status === "Rejected";
  const isPaid = status === "Paid";

  return (
    <div className="relative inline-flex items-center gap-2" ref={containerRef}>
      <div
        className="flex items-center gap-[3px] cursor-pointer py-1 px-1 rounded hover:bg-slate-100/60 transition-colors"
        onClick={() => {
          if (interactive && onStatusChange) {
            setShowPopover(!showPopover);
          }
        }}
        title={`Current stage: ${status}. Click to change stage.`}
      >
        {/* Render 6 Visual Block Segments */}
        {CLAIM_STAGE_BLOCKS.map((stg, i) => {
          const segIdx = i + 1;
          const isCompleted = segIdx < activeIndex;
          const isActive = segIdx === activeIndex;
          const isFilled = isCompleted || isActive;
          const isHovered = hoveredIdx === segIdx;

          let bg = "transparent";
          let border = "1px solid #E2E8F0";

          if (isRejected) {
            if (isActive || isCompleted) {
              bg = "#EF4444";
              border = "none";
            }
          } else if (isPaid) {
            bg = "#10B981"; // Emerald green across completed pipeline for Paid
            border = "none";
          } else if (status === "Under Review" && isActive) {
            bg = "#8B5CF6"; // Purple for review
            border = "none";
          } else if (status === "Accepted" && (isActive || isCompleted)) {
            bg = "#3B82F6"; // Blue for accepted
            border = "none";
          } else if (isFilled) {
            bg = "#1E88E5"; // Vibrant blue
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
                aria-label={`Claim Stage: ${stg.name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Popover on click to change stage */}
      {showPopover && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-left">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            Change Claim Stage
          </div>
          {CLAIM_STAGE_BLOCKS.map((stg) => (
            <button
              key={stg.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusChange) onStatusChange(stg.id);
                setShowPopover(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between font-medium cursor-pointer ${
                status === stg.id ? "bg-blue-50 font-bold text-blue-600" : "text-slate-700"
              }`}
            >
              <span>
                {stg.step}. {stg.name}
              </span>
              {status === stg.id && <span className="text-blue-600 font-bold">✓</span>}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onStatusChange) onStatusChange("Rejected");
                setShowPopover(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center justify-between font-medium text-red-600 cursor-pointer ${
                status === "Rejected" ? "bg-red-50 font-bold" : ""
              }`}
            >
              <span>Mark as Rejected</span>
              {status === "Rejected" && <span className="font-bold">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
