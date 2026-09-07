import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Pill } from "./Pill";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
  compact = false,
  className = "",
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center rounded-2xl
        border border-dashed border-slate-200/80 bg-white/20 backdrop-blur-xs
        ${compact ? "p-6" : "p-8 sm:p-12"}
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100/70 border border-white flex items-center justify-center text-slate-400 mb-3 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h4 className="font-display font-semibold text-sm sm:text-base text-[#222222] mb-1">
        {title}
      </h4>

      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {actionText && onAction && (
        <div className="mt-4">
          <Pill variant="glass" size="sm" onClick={onAction}>
            {actionText}
          </Pill>
        </div>
      )}
    </div>
  );
};
