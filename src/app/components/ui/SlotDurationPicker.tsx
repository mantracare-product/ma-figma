import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SlotDurationPickerProps {
  value: number; // Duration in minutes e.g. 15, 30, 45, 60, etc.
  onChange: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

const PRESETS = [15, 30, 45, 60];

export default function SlotDurationPicker({
  value = 30,
  onChange,
  disabled = false,
  className = "",
}: SlotDurationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(String(value || 30));

  useEffect(() => {
    setInputValue(String(value || 30));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger: [ 30m   ▾ ] */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1877f2] transition-all cursor-pointer text-xs shadow-2xs ${
          isOpen ? "ring-1 ring-[#1877f2] border-[#1877f2]" : ""
        }`}
      >
        <span
          className="font-mono text-xs font-semibold text-slate-800"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {value}m
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {/* Simple Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 w-44 bg-white border border-slate-300 shadow-xl rounded-xl p-2 space-y-1 text-xs select-none"
          style={{ top: "100%", left: 0 }}
        >
          {/* Preset options */}
          <div className="space-y-0.5">
            {PRESETS.map((m) => {
              const isSelected = value === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(m);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 text-[#1877f2] font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{m} min</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1877f2]" />}
                </button>
              );
            })}
          </div>

          {/* Simple custom number minute input */}
          <div className="pt-1.5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Custom:</span>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={inputValue}
                  onChange={handleCustomChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsOpen(false);
                    }
                  }}
                  className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-[#1877f2]"
                />
                <span className="text-[11px] text-slate-500">min</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
