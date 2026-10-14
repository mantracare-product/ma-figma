import React from "react";

interface QuietListProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function QuietList({ title, children, className = "" }: QuietListProps) {
  return (
    <div className={`w-full ${className}`}>
      {title && (
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
          {title}
        </div>
      )}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

interface QuietRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  isRightMuted?: boolean;
  onClick?: () => void;
  className?: string;
}

export function QuietRow({
  icon,
  iconBg = "#eff6ff",
  iconColor = "#2563eb",
  title,
  subtitle,
  right,
  isRightMuted = false,
  onClick,
  className = "",
}: QuietRowProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3.5 px-4 sm:px-5 py-3.5 transition-colors ${
        isClickable ? "cursor-pointer hover:bg-slate-50/80 active:bg-slate-100/60" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm shadow-2xs"
            style={{
              backgroundColor: iconBg,
              color: iconColor,
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {right && (
        <div
          className={`shrink-0 text-xs font-semibold ${
            isRightMuted ? "text-slate-400 font-medium" : "text-blue-600"
          }`}
        >
          {right}
        </div>
      )}
    </div>
  );
}

export default QuietList;
