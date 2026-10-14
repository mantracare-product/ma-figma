import React from "react";
import { Check } from "lucide-react";

export interface StageStep {
  id: string;
  label: string;
  status: "done" | "current" | "upcoming";
}

interface StageTrackProps {
  steps: StageStep[];
  className?: string;
  onSelectStep?: (stepId: string) => void;
}

export default function StageTrack({
  steps,
  className = "",
  onSelectStep,
}: StageTrackProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Top Segmented Progress Bar */}
      <div className="flex items-center gap-1.5 w-full mb-3">
        {steps.map((step, index) => {
          const isDone = step.status === "done";
          const isCurrent = step.status === "current";

          return (
            <div
              key={`bar-${step.id || index}`}
              className="h-1.5 flex-1 rounded-full transition-all duration-300 overflow-hidden"
              style={{
                backgroundColor: isDone
                  ? "#10B981"
                  : isCurrent
                  ? "#2563EB"
                  : "rgba(148, 163, 184, 0.25)",
              }}
            >
              {isCurrent && (
                <div className="h-full w-full bg-blue-400/50 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Indicators Grid */}
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(steps.length, 6)}, minmax(0, 1fr))`,
        }}
      >
        {steps.map((step, index) => {
          const isDone = step.status === "done";
          const isCurrent = step.status === "current";
          const isClickable = Boolean(onSelectStep);

          return (
            <button
              type="button"
              key={step.id || index}
              onClick={() => onSelectStep && onSelectStep(step.id)}
              disabled={!isClickable}
              className={`flex flex-col items-center text-center rounded-xl p-1.5 transition-all ${
                isClickable
                  ? "cursor-pointer hover:bg-slate-100/70 active:scale-95"
                  : "cursor-default"
              } ${
                isCurrent
                  ? "bg-blue-50/80 ring-1 ring-blue-200/90"
                  : ""
              }`}
            >
              {/* Indicator Circle */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all mb-1 ${
                  isDone
                    ? "bg-emerald-500 text-white shadow-xs"
                    : isCurrent
                    ? "bg-blue-600 text-white shadow-sm ring-3 ring-blue-500/20"
                    : "bg-slate-100 text-slate-400 border border-slate-200/80"
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step Label */}
              <span
                className={`text-[10px] sm:text-xs leading-tight transition-colors text-center line-clamp-2 ${
                  isCurrent
                    ? "font-semibold text-slate-900"
                    : isDone
                    ? "font-medium text-slate-700"
                    : "font-normal text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
