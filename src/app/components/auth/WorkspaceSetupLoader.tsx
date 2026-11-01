import React, { useState, useEffect } from "react";
import { Building2, Layers, FileCheck2, Calendar, Headphones } from "lucide-react";

export const PRACTICE_BUILD_STATUSES = [
  "your organization",
  "Workspace",
  "Knowledge",
  "Schedule",
  "AI Reception",
];

export function WorkspaceTypewriterStatus({
  onWordChange,
}: {
  onWordChange?: (wordIndex: number) => void;
}) {
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    onWordChange?.(wordIdx);
  }, [wordIdx, onWordChange]);

  useEffect(() => {
    const currentWord = PRACTICE_BUILD_STATUSES[wordIdx];
    const isLastWord = wordIdx === PRACTICE_BUILD_STATUSES.length - 1;

    let timeout: any;

    if (!isDeleting) {
      if (text.length < currentWord.length) {
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length + 1));
        }, 36);
      } else if (!isLastWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 550);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length - 1));
        }, 20);
      } else {
        setIsDeleting(false);
        setWordIdx((prev) => Math.min(prev + 1, PRACTICE_BUILD_STATUSES.length - 1));
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIdx]);

  return (
    <div className="flex items-center justify-center text-sm sm:text-base font-medium text-slate-600 mt-9 tracking-tight select-none">
      <span>Setting up&nbsp;</span>
      <span className="font-semibold text-slate-900 inline-flex items-center">
        {text}
        <span className="inline-block w-[2px] h-4.5 bg-slate-900 ml-1 animate-pulse" />
      </span>
    </div>
  );
}

interface WorkspaceSetupLoaderProps {
  onComplete?: () => void;
  durationMs?: number;
  orgName?: string;
}

export function WorkspaceSetupLoader({
  onComplete,
  durationMs = 4500,
  orgName,
}: WorkspaceSetupLoaderProps) {
  const [activeBuildStage, setActiveBuildStage] = useState(0);

  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  return (
    <div className="select-none animate-in fade-in duration-300 flex flex-col items-center justify-center my-auto py-8">
      {/* The Loader: Scaled-up, crisp, minimal, light-mode executive SaaS styling */}
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] flex items-center justify-center select-none">
        {/* Dynamic SVG Connection Beams */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Center to Top (Workspace) */}
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="15%"
            stroke={activeBuildStage >= 1 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeBuildStage >= 1 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
          {/* Center to Left (Knowledge) */}
          <line
            x1="50%"
            y1="50%"
            x2="14%"
            y2="50%"
            stroke={activeBuildStage >= 2 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeBuildStage >= 2 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
          {/* Center to Right (Schedule) */}
          <line
            x1="50%"
            y1="50%"
            x2="86%"
            y2="50%"
            stroke={activeBuildStage >= 3 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeBuildStage >= 3 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
          {/* Center to Bottom (AI Reception) */}
          <line
            x1="50%"
            y1="50%"
            x2="50%"
            y2="85%"
            stroke={activeBuildStage >= 4 ? "#64748B" : "#E2E8F0"}
            strokeWidth={activeBuildStage >= 4 ? "1.5" : "1"}
            strokeDasharray="3 3"
            className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
        </svg>

        {/* Concentric Rotating Precision Rings (Light mode, scaled up) */}
        <div className="relative w-56 h-56 sm:w-68 sm:h-68 md:w-76 md:h-76 flex items-center justify-center">
          {/* Outer rotating dashed ring */}
          <div className="absolute inset-0 border border-dashed border-slate-300 rounded-full animate-[spin_24s_linear_infinite]" />
          {/* Middle counter-rotating dashed ring */}
          <div className="absolute inset-6 border border-dashed border-slate-200 rounded-full animate-[spin_32s_linear_infinite_reverse]" />
          {/* Inner subtle guideline circle */}
          <div className="absolute inset-13 border border-slate-200/60 rounded-full" />

          {/* Center core icon: clean, crisp, executive slate */}
          <div
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-[#182230] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(24,34,48,0.16)] animate-bounce"
            style={{ animationDuration: "2.6s" }}
          >
            <Building2 className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[1.8]" />
          </div>

          {/* 4 Orbiting Satellite Nodes */}
          {/* Top: Workspace */}
          <div
            className={`absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
              activeBuildStage >= 1
                ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                : "bg-white/70 border-slate-200/80 text-slate-400"
            }`}
          >
            <Layers
              className={`w-4 h-4 transition-colors duration-500 ${
                activeBuildStage >= 1 ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span>Workspace</span>
          </div>

          {/* Left: Knowledge */}
          <div
            className={`absolute -left-16 sm:-left-20 md:-left-22 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
              activeBuildStage >= 2
                ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                : "bg-white/70 border-slate-200/80 text-slate-400"
            }`}
          >
            <FileCheck2
              className={`w-4 h-4 transition-colors duration-500 ${
                activeBuildStage >= 2 ? "text-emerald-600" : "text-slate-400"
              }`}
            />
            <span>Knowledge</span>
          </div>

          {/* Right: Schedule */}
          <div
            className={`absolute -right-14 sm:-right-18 md:-right-20 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
              activeBuildStage >= 3
                ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                : "bg-white/70 border-slate-200/80 text-slate-400"
            }`}
          >
            <Calendar
              className={`w-4 h-4 transition-colors duration-500 ${
                activeBuildStage >= 3 ? "text-indigo-600" : "text-slate-400"
              }`}
            />
            <span>Schedule</span>
          </div>

          {/* Bottom: AI Reception */}
          <div
            className={`absolute -bottom-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
              activeBuildStage >= 4
                ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                : "bg-white/70 border-slate-200/80 text-slate-400"
            }`}
          >
            <Headphones
              className={`w-4 h-4 transition-colors duration-500 ${
                activeBuildStage >= 4 ? "text-sky-600" : "text-slate-400"
              }`}
            />
            <span>AI Reception</span>
          </div>
        </div>
      </div>

      {/* Status line with "Setting up " fixed + typewriter animation */}
      <WorkspaceTypewriterStatus onWordChange={(idx) => setActiveBuildStage(idx)} />
    </div>
  );
}
