import { ReactNode } from "react";
import OrganizationSwitcher from "./OrganizationSwitcher";

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
  badge,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#45515e] font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {actions}
        {children}
        <OrganizationSwitcher />
      </div>
    </div>
  );
}
