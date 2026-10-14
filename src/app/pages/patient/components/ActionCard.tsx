import React from "react";
import { ArrowRight, AlertCircle, FileEdit, CheckCircle2 } from "lucide-react";

interface ActionCardProps {
  label: string;
  description: string;
  actionText: string;
  onAction: () => void;
  visible?: boolean;
  className?: string;
  icon?: "edit" | "alert" | "check";
  variant?: "blue" | "amber" | "emerald";
}

export default function ActionCard({
  label,
  description,
  actionText,
  onAction,
  visible = true,
  className = "",
  icon = "edit",
  variant = "blue",
}: ActionCardProps) {
  // Strictly zero DOM footprint when not visible
  if (!visible) return null;

  const bgStyles =
    variant === "amber"
      ? "bg-amber-50/80 border-amber-200/90"
      : variant === "emerald"
      ? "bg-emerald-50/80 border-emerald-200/90"
      : "bg-blue-50/80 border-blue-200/90";

  const iconBg =
    variant === "amber"
      ? "bg-amber-600 text-white"
      : variant === "emerald"
      ? "bg-emerald-600 text-white"
      : "bg-blue-600 text-white";

  const labelColor =
    variant === "amber"
      ? "text-amber-800"
      : variant === "emerald"
      ? "text-emerald-800"
      : "text-blue-700";

  const btnBg =
    variant === "amber"
      ? "bg-amber-600 hover:bg-amber-700"
      : variant === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <div
      className={`flex items-center justify-between gap-4 flex-wrap transition-all select-none rounded-2xl p-4 sm:p-5 shadow-xs border ${bgStyles} ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${iconBg}`}
        >
          {icon === "alert" ? (
            <AlertCircle className="w-4 h-4" />
          ) : icon === "check" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <FileEdit className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${labelColor}`}>
            {label}
          </div>
          <div className="text-slate-900 font-medium text-xs sm:text-sm leading-relaxed">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAction}
        className={`cursor-pointer transition-all active:scale-95 shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs ${btnBg}`}
      >
        <span>{actionText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
