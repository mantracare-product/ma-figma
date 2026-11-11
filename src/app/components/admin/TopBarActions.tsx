/**
 * TopBarActions.tsx
 * Path: src/app/components/admin/TopBarActions.tsx
 *
 * Standardized Top Bar action buttons for all Admin pages:
 * - TopBarExportButton: Icon-only button with Download icon, Tooltip "Export CSV", aria-label (G2).
 * - TopBarPrimaryButton: Compact dark primary button (h-8, bg-[#1E293B]) with icon & label,
 *   collapsing to icon-only on small screens (G1).
 */

import React from "react";
import { Download, Plus } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

export interface TopBarExportButtonProps {
  onExport?: () => void;
  onClick?: () => void;
  disabled?: boolean;
}

export function TopBarExportButton({ onExport, onClick, disabled }: TopBarExportButtonProps) {
  const handleClick = onExport || onClick;
  return (
    <Tooltip text="Export CSV" placement="bottom">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Export CSV"
        className="h-8 w-8 rounded-xl border border-gray-200/90 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </Tooltip>
  );
}

export interface TopBarPrimaryButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export function TopBarPrimaryButton({
  label,
  icon = <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
  onClick,
  disabled,
}: TopBarPrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-8 px-3 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
