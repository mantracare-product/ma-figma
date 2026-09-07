"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { FilterOption } from "@/lib/types";

export interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  placeholder,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(selectedValue || options[0]?.value || "");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = options.find((opt) => opt.value === selected);
  const displayLabel = currentOption ? currentOption.label : placeholder || label;

  useEffect(() => {
    if (selectedValue !== undefined) {
      setSelected(selectedValue);
    }
  }, [selectedValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    setSelected(val);
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group inline-flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs sm:text-sm font-medium
          bg-white/60 hover:bg-white/80 active:bg-white/90
          text-[#45515e] hover:text-[#222222]
          backdrop-blur-md border border-white/60 hover:border-white/80
          rounded-xl shadow-xs transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60
          ${isOpen ? "ring-2 ring-[#1456f0]/40 border-[#1456f0]/60 bg-white/90 shadow-sm" : ""}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-slate-400 font-normal text-xs">{label}:</span>
        <span className="font-medium text-[#222222] truncate max-w-[130px] sm:max-w-[160px]">
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-[#1456f0]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 z-50 mt-1.5 min-w-[200px] origin-top-right
            bg-white/90 backdrop-blur-xl border border-white/80
            rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04)]
            p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150
          "
          role="listbox"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100/80 mb-1">
            {label}
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === selected;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-left
                    transition-colors duration-150
                    ${
                      isSelected
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-semibold"
                        : "text-[#45515e] hover:bg-slate-100/70 hover:text-[#222222]"
                    }
                  `}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
