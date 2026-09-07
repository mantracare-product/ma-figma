import React from "react";
import { ChevronRight } from "lucide-react";
import { Pill } from "./Pill";

export interface ProgressRowProps {
  label: string;
  count: number | string;
  percentage: number;
  barColor?: string;
  badgeVariant?: "brand" | "navy" | "success" | "warning" | "danger" | "neutral";
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const ProgressRow: React.FC<ProgressRowProps> = ({
  label,
  count,
  percentage,
  barColor,
  badgeVariant,
  subtitle,
  onClick,
  className = "",
}) => {
  // Determine badge variant if not explicitly provided
  const resolvedBadgeVariant: "brand" | "navy" | "success" | "warning" | "danger" | "neutral" =
    badgeVariant || (percentage >= 90 ? "success" : percentage >= 70 ? "brand" : "warning");

  // Determine progress bar fill gradient
  const resolvedBarColor =
    barColor ||
    (percentage >= 90
      ? "bg-gradient-to-r from-[#1456f0] to-[#3b82f6]"
      : percentage >= 70
      ? "bg-gradient-to-r from-[#2563eb] to-[#60a5fa]"
      : "bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]");

  return (
    <div
      onClick={onClick}
      className={`
        group p-3.5 sm:p-4 rounded-2xl bg-white/40 hover:bg-white/70 backdrop-blur-sm
        border border-white/50 hover:border-white/80 transition-all duration-200
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs sm:text-sm text-[#222222] truncate group-hover:text-[#1456f0] transition-colors">
            {label}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1456f0] group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-display text-sm sm:text-base font-bold text-[#222222]">
            {typeof count === "number" ? count.toLocaleString("en-US") : count}
          </span>
          <Pill as="span" variant={resolvedBadgeVariant} size="xs" className="font-semibold">
            {percentage}%
          </Pill>
        </div>
      </div>

      {subtitle && <p className="text-[11px] text-slate-400 mb-2">{subtitle}</p>}

      {/* Progress Track */}
      <div className="w-full h-2 rounded-full bg-slate-100/90 overflow-hidden p-0.5 border border-slate-200/40">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${resolvedBarColor}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
};
