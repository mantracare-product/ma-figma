import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  infoText?: string;
  rightControl?: React.ReactNode;
  expandable?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconBg = "bg-blue-50",
  title,
  infoText,
  rightControl,
  expandable = true,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 ${
          expandable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
        } transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
          >
            {title}
          </span>
          {infoText && (
            <Tooltip text={infoText}>
              <span className="text-gray-300 text-xs cursor-help select-none">ⓘ</span>
            </Tooltip>
          )}
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {rightControl}
          {expandable && (
            <ChevronDown
              onClick={() => setOpen((o) => !o)}
              className={`w-4 h-4 text-gray-400 transition-transform cursor-pointer ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>
      {expandable && open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/30">
          {children}
        </div>
      )}
    </div>
  );
};
