import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYmd(y: number, mZeroBased: number, d: number): string {
  return `${y}-${pad2(mZeroBased + 1)}-${pad2(d)}`;
}

function parseYmd(dateStr: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseHm(timeStr: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr || "");
  if (!match) return { hour: 12, minute: 0 };
  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  };
}

export function formatUnifiedDateTimeLabel(dateStr: string, timeStr: string): string {
  const parsed = parseYmd(dateStr);
  if (!parsed) return "Select date & time";
  const d = new Date(parsed.year, parsed.month, parsed.day);
  const datePart = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });
  return timeStr ? `${datePart}, ${timeStr}` : datePart;
}

export interface DateTimePopoverPickerProps {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  onChange: (date: string, time: string) => void;
  className?: string;
}

export default function DateTimePopoverPicker({
  date,
  time,
  onChange,
  className = "",
}: DateTimePopoverPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const today = new Date();
  const todayYmd = toYmd(today.getFullYear(), today.getMonth(), today.getDate());

  const [draftDate, setDraftDate] = useState<string>(date || todayYmd);
  const [draftHour, setDraftHour] = useState<number>(() => parseHm(time).hour);
  const [draftMinute, setDraftMinute] = useState<number>(() => parseHm(time).minute);
  const [viewYear, setViewYear] = useState<number>(() => parseYmd(date)?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => parseYmd(date)?.month ?? today.getMonth());

  const syncPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popoverHeight = 350;
    const popoverWidth = 272;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= popoverHeight || spaceBelow >= rect.top
        ? rect.bottom + 6
        : Math.max(8, rect.top - popoverHeight - 6);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - popoverWidth - 12));
    setCoords({ top, left });
  };

  const handleOpen = () => {
    const activeDate = date || todayYmd;
    const pDate = parseYmd(activeDate);
    const pTime = parseHm(time);
    setDraftDate(activeDate);
    setDraftHour(pTime.hour);
    setDraftMinute(pTime.minute);
    setViewYear(pDate?.year ?? today.getFullYear());
    setViewMonth(pDate?.month ?? today.getMonth());
    syncPosition();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    const handleReposition = () => syncPosition();

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  // Build 42-cell (6 rows x 7 cols) calendar matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: Array<{ ymd: string; day: number; inCurrentMonth: boolean; dayOfWeek: number }> = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({
      ymd: toYmd(prevY, prevM, dayNum),
      day: dayNum,
      inCurrentMonth: false,
      dayOfWeek: cells.length % 7,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      ymd: toYmd(viewYear, viewMonth, d),
      day: d,
      inCurrentMonth: true,
      dayOfWeek: cells.length % 7,
    });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({
      ymd: toYmd(nextY, nextM, nextDay),
      day: nextDay,
      inCurrentMonth: false,
      dayOfWeek: cells.length % 7,
    });
    nextDay++;
  }

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const stepHour = (delta: number) => setDraftHour((h) => (h + delta + 24) % 24);
  const stepMinute = (delta: number) => setDraftMinute((m) => (m + delta + 60) % 60);

  const handleSelect = () => {
    const finalDate = draftDate || todayYmd;
    const finalTime = `${pad2(draftHour)}:${pad2(draftMinute)}`;
    onChange(finalDate, finalTime);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("", "");
    setIsOpen(false);
  };

  const yearOptions = Array.from({ length: 11 }, (_, idx) => today.getFullYear() - 2 + idx);
  if (!yearOptions.includes(viewYear)) yearOptions.unshift(viewYear);

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-white transition-all cursor-pointer ${
          isOpen
            ? "border-[#1F2937] ring-1 ring-[#1F2937]/15 text-gray-900"
            : "border-gray-200 hover:border-gray-300 text-gray-700"
        }`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <span className={date && time ? "text-gray-800 font-medium" : "text-gray-400"}>
          {formatUnifiedDateTimeLabel(date, time)}
        </span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed w-[272px] bg-white rounded-xl border border-gray-200 shadow-2xl p-3 z-[9999] select-none"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              boxShadow: "0 16px 38px rgba(15, 23, 42, 0.16)",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {/* Month / Year Header */}
            <div className="flex items-center justify-between gap-1 mb-2.5">
              <button
                type="button"
                onClick={goPrevMonth}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="text-xs font-semibold text-gray-800 bg-transparent hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="text-xs font-semibold text-gray-800 bg-transparent hover:bg-gray-100 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={goNextMonth}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 bg-gray-100/80 rounded-md py-1 mb-1 text-center">
              {DAY_HEADERS.map((d) => (
                <span key={d} className="text-[10px] font-semibold text-gray-500">
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar days grid */}
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {cells.map((cell) => {
                const isSelected = draftDate === cell.ymd;
                const isToday = todayYmd === cell.ymd;
                const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6;

                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    onClick={() => {
                      setDraftDate(cell.ymd);
                      const p = parseYmd(cell.ymd);
                      if (p) {
                        setViewYear(p.year);
                        setViewMonth(p.month);
                      }
                    }}
                    className={`h-7 w-full rounded-md text-xs flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#1F2937] text-white font-semibold"
                        : isToday
                        ? "bg-slate-200/80 text-gray-900 font-semibold"
                        : !cell.inCurrentMonth
                        ? isWeekend
                          ? "text-rose-300 hover:bg-gray-50"
                          : "text-gray-300 hover:bg-gray-50"
                        : isWeekend
                        ? "text-rose-500 hover:bg-rose-50/70"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Time picker row inside the same popover */}
            <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-gray-500">Time</span>

              <div className="flex items-center gap-1">
                {/* Hour */}
                <div className="flex items-center gap-0.5">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => stepHour(1)}
                      className="text-gray-400 hover:text-gray-700 leading-none cursor-pointer"
                      aria-label="Increase hour"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepHour(-1)}
                      className="text-gray-400 hover:text-gray-700 leading-none cursor-pointer"
                      aria-label="Decrease hour"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={pad2(draftHour)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val === "") {
                        setDraftHour(0);
                        return;
                      }
                      setDraftHour(Math.min(23, Number(val)));
                    }}
                    className="w-8 h-7 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded-md focus:outline-none focus:border-[#1F2937]"
                  />
                </div>

                <span className="text-xs font-bold text-gray-500">:</span>

                {/* Minute */}
                <div className="flex items-center gap-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={pad2(draftMinute)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val === "") {
                        setDraftMinute(0);
                        return;
                      }
                      setDraftMinute(Math.min(59, Number(val)));
                    }}
                    className="w-8 h-7 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded-md focus:outline-none focus:border-[#1F2937]"
                  />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => stepMinute(5)}
                      className="text-gray-400 hover:text-gray-700 leading-none cursor-pointer"
                      aria-label="Increase minute"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepMinute(-5)}
                      className="text-gray-400 hover:text-gray-700 leading-none cursor-pointer"
                      aria-label="Decrease minute"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                title="Clear date and time"
                aria-label="Clear date and time"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Select / Close actions */}
            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleSelect}
                className="px-3.5 py-1 bg-[#1F2937] hover:bg-gray-800 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Select
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
