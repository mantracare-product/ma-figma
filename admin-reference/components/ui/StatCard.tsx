import React from "react";
import { GlassCard } from "./GlassCard";
import { Pill } from "./Pill";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: {
    text: string;
    variant: "success" | "warning" | "danger" | "neutral" | "brand" | "navy";
  };
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-blue-50/80",
  iconColor = "text-[#1456f0]",
  badge,
  subtitle,
  trend,
  className = "",
}) => {
  return (
    <GlassCard
      variant="default"
      rounded="3xl"
      padding="md"
      hoverable
      className={`flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-white/80 shadow-xs ${iconBgColor} ${iconColor}`}
          >
            <Icon className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[12px] font-semibold tracking-wider text-slate-400 uppercase">
            {title}
          </span>
        </div>

        {badge && (
          <Pill as="span" variant={badge.variant} size="xs" className="font-semibold">
            {badge.text}
          </Pill>
        )}
      </div>

      <div className="mt-1">
        <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#222222]">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            {trend && (
              <span
                className={`font-semibold flex items-center ${
                  trend.isPositive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}
              </span>
            )}
            {trend?.label && <span>{trend.label}</span>}
            {subtitle && !trend && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
