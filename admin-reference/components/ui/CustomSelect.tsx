"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  options: (string | CustomSelectOption)[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "-- Choose --",
  label,
  disabled = false,
  searchable = false,
  className = "w-full",
  triggerClassName = "",
  popoverClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to object format
  const normalizedOptions: CustomSelectOption[] = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filter options if searchable
  const filteredOptions = searchable && search.trim()
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.badge && opt.badge.toLowerCase().includes(search.toLowerCase()))
      )
    : normalizedOptions;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium
          bg-white/85 hover:bg-white active:bg-white text-[#222222] text-left
          backdrop-blur-md border border-slate-200/90 hover:border-slate-300
          rounded-xl shadow-2xs transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen ? "ring-2 ring-[#1456f0]/40 border-[#1456f0]/60 bg-white shadow-sm" : ""}
          ${triggerClassName}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption ? "text-[#222222] font-medium" : "text-slate-400 font-normal"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1456f0] border border-blue-100/80">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-[#1456f0]" : ""
          }`}
        />
      </button>

      {/* Floating Popover Options Menu */}
      {isOpen && (
        <div
          className={`
            absolute left-0 right-0 z-50 mt-1.5 min-w-[200px]
            bg-white/95 backdrop-blur-2xl border border-slate-200/90
            rounded-2xl shadow-[0_16px_36px_-6px_rgba(0,0,0,0.12),0_4px_16px_-2px_rgba(0,0,0,0.06)]
            p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150
            ${popoverClassName}
          `}
        >
          {label && (
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100/80 mb-1">
              {label}
            </div>
          )}

          {searchable && (
            <div className="p-1 mb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search options..."
                  autoFocus
                  className="
                    w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200/80
                    rounded-lg text-[#222222] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1456f0]
                  "
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-400">
                No options available
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-xl text-left
                      transition-all duration-150
                      ${
                        isSelected
                          ? "bg-[#1456f0]/10 text-[#1456f0] font-semibold border border-[#1456f0]/20"
                          : "text-[#45515e] hover:bg-slate-100/80 hover:text-[#222222]"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#1456f0]">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
