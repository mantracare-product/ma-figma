import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ChevronDown, Check } from "lucide-react";
import { InfoTooltip } from "../help/InfoTooltip";

export interface AdminSelectOption {
  value: string;
  label: string;
  tooltip?: string;
  subtitle?: string; // backwards compatibility, displayed as tooltip
  badge?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "default";
  className?: string;
  triggerClassName?: string;
  dropdownWidth?: string | number;
  emptyText?: string;
  allowSearch?: boolean;
}

export function AdminSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  size = "default",
  className = "",
  triggerClassName = "",
  dropdownWidth,
  emptyText = "No options available",
  allowSearch = false,
}: AdminSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const sizeClasses = size === "sm"
    ? "px-2.5 py-1.5 text-xs rounded-lg min-h-[32px]"
    : "px-3.5 py-2 text-xs font-medium rounded-lg min-h-[38px]";

  const hasWidth = /\bw-\S+/.test(className);

  const showSearch = allowSearch || options.length > 7;

  const filteredOptions = searchQuery.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.value).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.badge && o.badge.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div className={`relative ${hasWidth ? "" : "w-full"} ${className}`.trim()}>
      <Popover open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchQuery("");
      }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full bg-white border border-slate-200 text-slate-800 outline-none flex items-center justify-between transition-all select-none ${sizeClasses} ${
              disabled
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                : "hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            } ${triggerClassName}`}
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              {selectedOption?.icon && (
                <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
              )}
              <span className={`truncate text-left ${selectedOption ? "text-slate-800 font-medium" : "text-slate-400 font-normal"}`}>
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              {selectedOption?.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          style={dropdownWidth ? { width: dropdownWidth } : undefined}
          className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[460px] p-1 z-[100005] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        >
          {showSearch && (
            <div className="p-1.5 border-b border-slate-100 mb-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search options..."
                className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 italic">
                {searchQuery ? "No matching options" : emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const tooltipText = opt.tooltip || opt.subtitle;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer select-none group ${
                      isSelected
                        ? "bg-blue-50/90 text-blue-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      {opt.icon && <span className="shrink-0 text-slate-500">{opt.icon}</span>}
                      <span className="truncate leading-normal">{opt.label}</span>
                      {tooltipText && (
                        <span
                          className="inline-flex shrink-0 ml-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <InfoTooltip text={tooltipText} size="sm" placement="right" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
