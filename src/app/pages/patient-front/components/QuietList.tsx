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
        <div
          style={{
            fontSize: "11.5px",
            fontWeight: 600,
            color: "#64748b",
            margin: "30px 0 12px 0",
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.68)",
          border: "1px solid rgba(24, 30, 37, 0.07)",
          borderRadius: "18px",
          overflow: "hidden",
          backdropFilter: "blur(16px)",
        }}
        className="divide-y divide-[rgba(24,30,37,0.07)] dark:bg-[#181e25]/75 dark:border-slate-800 dark:divide-slate-800"
      >
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
  iconColor = "#1456f0",
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
      className={`flex items-center justify-between gap-3.5 transition-colors ${
        isClickable ? "cursor-pointer hover:bg-[rgba(24,30,37,0.02)] dark:hover:bg-slate-800/40" : ""
      } ${className}`}
      style={{
        padding: "15px 18px",
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              backgroundColor: iconBg,
              color: iconColor,
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#222222",
            }}
            className="dark:text-[#f4f6f8] truncate"
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: "11.5px",
                color: "#64748b",
                marginTop: "1px",
              }}
              className="dark:text-[#93a1ad] truncate"
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {right && (
        <div
          className="shrink-0 whitespace-nowrap"
          style={{
            fontSize: "12px",
            color: isRightMuted ? "#64748b" : "#1456f0",
            fontWeight: isRightMuted ? 500 : 600,
          }}
        >
          {right}
        </div>
      )}
    </div>
  );
}

export default QuietList;
