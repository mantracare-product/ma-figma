import React from "react";
import { FileEdit, ArrowRight } from "lucide-react";

interface ActionCardProps {
  label: string;
  description: string;
  actionText: string;
  onAction: () => void;
  visible?: boolean;
  className?: string;
}

export default function ActionCard({
  label,
  description,
  actionText,
  onAction,
  visible = true,
  className = "",
}: ActionCardProps) {
  // Strictly zero empty state / zero DOM footprint when clear
  if (!visible) return null;

  return (
    <div
      className={`flex items-center justify-between gap-4 flex-wrap transition-all select-none rounded-2xl p-4 sm:p-5 mb-6 shadow-xs border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-blue-600 text-white shadow-xs">
          <FileEdit className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-0.5">
            {label}
          </div>
          <div className="text-slate-900 dark:text-slate-100 font-medium text-xs sm:text-sm leading-relaxed">
            {description}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAction}
        className="cursor-pointer transition-all active:scale-95 shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
      >
        <span>{actionText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
