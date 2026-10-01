import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  children,
  actions,
  // badge is intentionally omitted to remove "Directory" and category capsules from the UI
}: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (typeof document === "undefined" || !mounted) {
    return null;
  }

  const container = document.getElementById("topbar-page-header");
  if (!container) {
    return null;
  }

  const content = (
    <div className="flex items-center justify-between w-full gap-3 min-w-0">
      {/* Page Heading & Subtext */}
      <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
        <h1
          className="text-sm sm:text-[15px] font-bold text-gray-900 tracking-tight shrink-0 whitespace-nowrap"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[11px] sm:text-xs text-gray-500 font-normal truncate hidden md:inline max-w-xl"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Page Actions & How It Works Button */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        {children}
      </div>
    </div>
  );

  return createPortal(content, container);
}
