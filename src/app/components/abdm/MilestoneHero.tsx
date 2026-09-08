import React from "react";

export interface MilestoneHeroProps {
  badge: string;
  networkTag: string;
  title: string;
  description: string;
  className?: string;
}

export const MilestoneHero: React.FC<MilestoneHeroProps> = ({
  badge,
  networkTag,
  title,
  description,
  className = "",
}) => {
  return (
    <div
      className={`bg-[#0b1b33] rounded-3xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden border border-slate-800 ${className}`}
    >
      <div className="relative z-10 max-w-3xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#60a5fa] bg-[#1e3a8a]/40 border border-[#3b82f6]/40 px-3 py-0.5 rounded-full">
            {badge}
          </span>
          <span className="text-xs text-slate-300 font-medium">{networkTag}</span>
        </div>

        <h2
          className="text-2xl md:text-3xl font-bold tracking-tight text-white"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h2>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
          {description}
        </p>
      </div>
    </div>
  );
};
