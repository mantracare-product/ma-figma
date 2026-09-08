import React from "react";

export interface MilestoneCardProps {
  milestoneLabel: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestoneLabel,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="space-y-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block font-display">
          {milestoneLabel}
        </span>
        <h3 className="text-base font-bold text-slate-900 font-display">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
      {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
};
