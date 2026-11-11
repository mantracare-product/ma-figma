/**
 * MetricCapsuleRow.tsx
 * Path: src/app/components/ui/MetricCapsuleRow.tsx
 *
 * Thin, concise, single-row metric capsules (G4):
 * Pill-shaped strip (~40-44px height), small icon, uppercase label, value on the same line,
 * and a tiny muted sub-label at the right.
 * Arranged 4 in one row on desktop, wrapping to 2x2 and then 1 column on smaller screens.
 */

import React from "react";

export interface MetricCapsuleItem {
  id?: string;
  label: string; // Uppercase metric label, e.g. "TOTAL ORDERS"
  value: string | number; // e.g. "128" or "$14,250.00"
  subLabel?: string; // e.g. "all time", "7d total", "All healthy"
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  valueColor?: string; // Optional custom text color
  subLabelColor?: string;
}

export interface MetricCapsuleRowProps {
  items: MetricCapsuleItem[];
  className?: string;
}

export function MetricCapsule({
  label,
  value,
  subLabel,
  icon,
  onClick,
  isActive = false,
  valueColor,
  subLabelColor,
}: MetricCapsuleItem) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`bg-white border shadow-xs rounded-xl px-3 py-2 flex items-center gap-2 h-[42px] transition-all select-none ${
        isActive
          ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20"
          : "border-gray-200/90 hover:border-slate-300"
      } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Icon + Label */}
      <div className="flex items-center gap-1.5 shrink-0">
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <span
          className="text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap text-slate-400"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <span
        className="text-xs sm:text-sm font-bold flex-1 text-center font-mono tabular-nums truncate px-1"
        style={{
          fontFamily: "DM Sans, sans-serif",
          color: valueColor || "#0F172A",
        }}
      >
        {value}
      </span>

      {/* Sub-label */}
      {subLabel && (
        <span
          className="text-[10px] shrink-0 whitespace-nowrap font-medium text-slate-400"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: subLabelColor || "#94A3B8",
          }}
        >
          {subLabel}
        </span>
      )}
    </div>
  );
}

export default function MetricCapsuleRow({ items, className = "" }: MetricCapsuleRowProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {items.map((item, idx) => (
        <MetricCapsule key={item.id || idx} {...item} />
      ))}
    </div>
  );
}

