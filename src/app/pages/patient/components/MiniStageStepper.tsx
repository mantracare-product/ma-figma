import React from "react";
import { Check } from "lucide-react";
import { StageStep } from "./StageTrack";

interface MiniStageStepperProps {
  steps: StageStep[];
  currentStageIndex: number;
  selectedStageIndex: number;
  onStageClick: (index: number) => void;
  className?: string;
}

/**
 * MiniStageStepper:
 * A sleek, contiguous-block pipeline stepper designed for the top-right
 * of the patient care journey card as specified in the clinical reference sketch.
 * - Single tap: Previews stage in main card
 * - Second tap on active/selected: Triggers stage details drawer
 */
export default function MiniStageStepper({
  steps,
  currentStageIndex,
  selectedStageIndex,
  onStageClick,
  className = "",
}: MiniStageStepperProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={`inline-flex flex-col items-end select-none shrink-0 ${className}`}>
      {/* Contiguous Connected Rectangular Step Blocks */}
      <div className="inline-flex items-center rounded-lg border border-slate-300/80 bg-white shadow-2xs overflow-hidden divide-x divide-slate-200">
        {steps.map((step, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isSelected = idx === selectedStageIndex;

          let bgClass = "bg-white hover:bg-slate-50 text-slate-500";
          if (isCurrent) {
            bgClass = "bg-emerald-100/90 hover:bg-emerald-200 text-emerald-900 font-bold";
          } else if (isDone) {
            bgClass = "bg-emerald-50/70 hover:bg-emerald-100/60 text-emerald-700";
          }

          return (
            <button
              key={step.id || idx}
              type="button"
              onClick={() => onStageClick(idx)}
              className={`relative h-6.5 sm:h-7 px-2 sm:px-2.5 flex items-center justify-center transition-all cursor-pointer min-w-[24px] sm:min-w-[30px] ${bgClass} ${
                isSelected ? "ring-2 ring-blue-600 ring-inset z-10" : ""
              }`}
              title={`Step ${idx + 1}: ${step.label} (${
                isCurrent ? "Active" : isDone ? "Completed" : "Upcoming"
              })${isSelected ? " — Tap again to open details" : " — Tap to preview"}`}
              aria-label={`Step ${idx + 1}: ${step.label}`}
            >
              {isDone ? (
                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              ) : isCurrent ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  {idx + 1}
                </span>
              )}

              {/* Indicator underline on the currently previewed block */}
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sleek Step Indicator Beneath Blocks */}
      <div className="w-full mt-1 flex items-center justify-end gap-1.5 text-[10px] text-slate-400 font-medium leading-none">
        <span>
          Step {selectedStageIndex + 1}/{steps.length}
        </span>
        {selectedStageIndex === currentStageIndex ? (
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 rounded">
            Active
          </span>
        ) : selectedStageIndex < currentStageIndex ? (
          <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
            Done
          </span>
        ) : (
          <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
            Upcoming
          </span>
        )}
      </div>
    </div>
  );
}
