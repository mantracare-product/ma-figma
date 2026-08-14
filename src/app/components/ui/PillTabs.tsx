import React from "react";
import { motion } from "motion/react";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

interface PillTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  layoutId?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  layoutId = "pillTabIndicator",
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-full shadow-2xs ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative rounded-full font-medium transition-colors z-10 flex items-center gap-2 ${
              sizeClasses[size]
            } ${
              isActive
                ? "text-white font-semibold"
                : "text-[#45515e] hover:text-[#222222]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-gradient-to-r from-[#181e25] to-[#2c3e50] rounded-full -z-10 shadow-sm"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PillTabs;
