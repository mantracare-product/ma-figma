import React from "react";
import type { Stage } from "../../../lib/useProcessStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Check, ChevronDown, CheckCircle2, XCircle } from "lucide-react";

export interface CompactPhaseBarProps {
  stages: Stage[];
  currentStage: Stage;
  visitedStageNames: Set<string>;
  onSelectStage: (stage: Stage) => void;
  claimStatus?: string;
}

interface PhaseConfig {
  key: string;
  label: string;
  filter: (s: Stage) => boolean;
}

const PHASES: PhaseConfig[] = [
  {
    key: "eligibility",
    label: "Eligibility",
    filter: (s) => (s.phase || "").toLowerCase() === "eligibility",
  },
  {
    key: "prior_auth",
    label: "Prior auth",
    filter: (s) => (s.phase || "").toLowerCase() === "prior_auth",
  },
  {
    key: "charge_capture",
    label: "Charge capture",
    filter: (s) => (s.phase || "").toLowerCase() === "charge_capture",
  },
  {
    key: "claim",
    label: "Claim",
    filter: (s) => {
      const p = (s.phase || "").toLowerCase();
      const isLost = s.stageCategory === "lost" || (s.phase || "") === "none";
      const isWon = s.stageCategory === "success" || s.name.toLowerCase() === "accepted by payer";
      return (p === "claim" || !p) && !isLost && !isWon;
    },
  },
];

export const CompactPhaseBar: React.FC<CompactPhaseBarProps> = ({
  stages,
  currentStage,
  visitedStageNames,
  onSelectStage,
  claimStatus = "",
}) => {
  const wonStages = stages.filter(
    (s) => s.stageCategory === "success" || s.name.toLowerCase() === "accepted by payer"
  );

  const lostStages = stages.filter(
    (s) =>
      s.stageCategory === "lost" ||
      s.phase === "none" ||
      ["inactive coverage", "self-pay", "visit cancelled", "closed - not billable"].includes(
        s.name.toLowerCase()
      )
  );

  const currentStageNameLower = (currentStage?.name || "").toLowerCase();
  const currentPhaseLower = (currentStage?.phase || "").toLowerCase();

  const isWon =
    currentStage?.stageCategory === "success" ||
    currentStageNameLower === "accepted by payer" ||
    claimStatus.toLowerCase() === "paid";

  const isLost =
    currentStage?.stageCategory === "lost" ||
    lostStages.some((ls) => ls.id === currentStage?.id || ls.name.toLowerCase() === currentStageNameLower) ||
    claimStatus.toLowerCase() === "denied";

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {/* 4 Compact Phase Segments */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[280px]">
        {PHASES.map((p, idx) => {
          const phaseStages = stages.filter(p.filter);
          const isCurrentPhase =
            !isWon &&
            !isLost &&
            (currentPhaseLower === p.key ||
              phaseStages.some(
                (s) => s.id === currentStage?.id || s.name.toLowerCase() === currentStageNameLower
              ));

          const stageCount = phaseStages.length;
          const visitedCount = phaseStages.filter(
            (s) =>
              visitedStageNames.has(s.id) ||
              visitedStageNames.has(s.name) ||
              visitedStageNames.has(s.name.toLowerCase())
          ).length;

          return (
            <DropdownMenu key={p.key}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isCurrentPhase
                      ? "bg-blue-50/90 border-blue-500 shadow-2xs ring-1 ring-blue-500/30"
                      : "bg-white border-slate-200 hover:bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-bold tracking-wider uppercase truncate ${
                        isCurrentPhase ? "text-blue-700" : "text-slate-500"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {idx + 1}. {p.label}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform shrink-0 ${
                        isCurrentPhase ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                  </div>
                  <div className="mt-1 truncate text-xs">
                    {isCurrentPhase ? (
                      <span className="font-semibold text-blue-900 truncate block">
                        {currentStage?.name || p.label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 truncate block">
                        {visitedCount > 0
                          ? `${visitedCount}/${stageCount} visited`
                          : `${stageCount} stages`}
                      </span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-[99999]"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-100">
                  {p.label} Phase ({stageCount} stages)
                </div>
                {phaseStages.map((stg) => {
                  const isCurrent =
                    stg.id === currentStage?.id ||
                    stg.name.toLowerCase() === currentStageNameLower;
                  const isVisited =
                    visitedStageNames.has(stg.id) ||
                    visitedStageNames.has(stg.name) ||
                    visitedStageNames.has(stg.name.toLowerCase());

                  return (
                    <DropdownMenuItem
                      key={stg.id}
                      onClick={() => onSelectStage(stg)}
                      className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                        isCurrent
                          ? "bg-blue-50 font-bold text-blue-700"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: stg.color || "#3B82F6" }}
                        />
                        <span className="truncate">{stg.name}</span>
                      </div>
                      {isVisited && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>

      {/* Closed Outcomes Chip (Won / Lost / Paid / Denied) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`h-[48px] px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
              isWon
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/20"
                : isLost
                ? "bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-400/20"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
            }`}
          >
            {isWon ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="text-[9px] uppercase font-bold text-emerald-700">Outcome</div>
                  <div className="text-xs font-bold text-emerald-900 truncate">
                    Won: {currentStage?.name}
                  </div>
                </div>
              </>
            ) : isLost ? (
              <>
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="text-[9px] uppercase font-bold text-rose-700">Outcome</div>
                  <div className="text-xs font-bold text-rose-900 truncate">
                    Lost: {currentStage?.name}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-left min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400">Outcome</div>
                  <div className="text-xs text-slate-600 font-medium">Won / Lost</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl py-1 z-[99999]"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-600 uppercase border-b border-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" /> Won
          </div>
          {wonStages.map((stg) => {
            const isCurrent =
              stg.id === currentStage?.id ||
              stg.name.toLowerCase() === currentStageNameLower;
            const isVisited =
              visitedStageNames.has(stg.id) ||
              visitedStageNames.has(stg.name) ||
              visitedStageNames.has(stg.name.toLowerCase());

            return (
              <DropdownMenuItem
                key={stg.id}
                onClick={() => onSelectStage(stg)}
                className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                  isCurrent
                    ? "bg-emerald-50 font-bold text-emerald-800"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: stg.color || "#10B981" }}
                  />
                  <span className="truncate">{stg.name}</span>
                </div>
                {isVisited && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </DropdownMenuItem>
            );
          })}

          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-rose-600 uppercase border-y border-slate-100 mt-1 flex items-center gap-1.5">
            <XCircle className="w-3 h-3" /> Lost / Terminal
          </div>
          {lostStages.map((stg) => {
            const isCurrent =
              stg.id === currentStage?.id ||
              stg.name.toLowerCase() === currentStageNameLower;
            const isVisited =
              visitedStageNames.has(stg.id) ||
              visitedStageNames.has(stg.name) ||
              visitedStageNames.has(stg.name.toLowerCase());

            return (
              <DropdownMenuItem
                key={stg.id}
                onClick={() => onSelectStage(stg)}
                className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer ${
                  isCurrent
                    ? "bg-rose-50 font-bold text-rose-800"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: stg.color || "#94A3B8" }}
                  />
                  <span className="truncate">{stg.name}</span>
                </div>
                {isVisited && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
