import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface ClockTimePickerProps {
  value: string; // "HH:MM" 24-hour format e.g. "09:00"
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ClockTimePicker({
  value = "09:00",
  onChange,
  disabled = false,
  className = "",
}: ClockTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);

  // Parse HH:MM
  const parts = (value || "09:00").split(":");
  const currentHour = parts[0] ? parts[0].padStart(2, "0") : "09";
  const currentMinute = parts[1] ? parts[1].padStart(2, "0") : "00";

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

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

  // Scroll selected items into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const selHourEl = hourColRef.current?.querySelector('[data-selected="true"]');
        if (selHourEl) {
          selHourEl.scrollIntoView({ block: "center", behavior: "auto" });
        }
        const selMinEl = minColRef.current?.querySelector('[data-selected="true"]');
        if (selMinEl) {
          selMinEl.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }, 20);
    }
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${currentMinute}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${currentHour}:${m}`);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Trigger: [ 09:00       🕒 ] */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-32 h-9 flex items-center justify-between px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1877f2] transition-all cursor-pointer text-xs shadow-2xs ${
          isOpen ? "ring-1 ring-[#1877f2] border-[#1877f2]" : ""
        }`}
      >
        <span
          className="font-mono text-xs font-semibold text-slate-800 tracking-wide"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {currentHour}:{currentMinute}
        </span>
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* 2-Column Dropdown matching user's attached image */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 bg-white border border-slate-300 shadow-xl flex overflow-hidden text-xs select-none rounded-lg"
          style={{
            top: "100%",
            left: 0,
            width: "116px",
            height: "210px",
          }}
        >
          {/* Hours Column */}
          <div
            ref={hourColRef}
            className="flex-1 overflow-y-auto border-r border-slate-200 py-1 scrollbar-thin"
          >
            {hours.map((h) => {
              const isSelected = h === currentHour;
              return (
                <div
                  key={h}
                  data-selected={isSelected}
                  onClick={() => handleSelectHour(h)}
                  className={`h-7 flex items-center justify-center font-mono cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? "bg-[#1877f2] text-white font-bold"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {h}
                </div>
              );
            })}
          </div>

          {/* Minutes Column */}
          <div
            ref={minColRef}
            className="flex-1 overflow-y-auto py-1 scrollbar-thin"
          >
            {minutes.map((m) => {
              const isSelected = m === currentMinute;
              return (
                <div
                  key={m}
                  data-selected={isSelected}
                  onClick={() => handleSelectMinute(m)}
                  className={`h-7 flex items-center justify-center font-mono cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? "bg-[#1877f2] text-white font-bold"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  {m}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
