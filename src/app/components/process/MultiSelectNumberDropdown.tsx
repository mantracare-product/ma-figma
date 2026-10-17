import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

export interface MultiSelectNumberDropdownProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  options: string[];
  onAddOption?: (newNumber: string) => void;
  palette?: "emerald" | "blue";
  placeholder?: string;
  badgeSuffix?: string;
  className?: string;
}

export default function MultiSelectNumberDropdown({
  selected,
  onChange,
  options,
  onAddOption,
  palette = "blue",
  placeholder = "Select phone numbers...",
  badgeSuffix,
  className = "",
}: MultiSelectNumberDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newNumberInput, setNewNumberInput] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    showAbove: boolean;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < 280 && rect.top > 280;

    const width = Math.max(rect.width, 280);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    if (showAbove) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width,
        showAbove: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        width,
        showAbove: false,
      });
    }
  }, []);

  // Recalculate position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const isEmerald = palette === "emerald";

  const chipClass = isEmerald
    ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
    : "bg-blue-50 text-blue-800 border-blue-200/90";

  const chipRemoveClass = isEmerald
    ? "hover:bg-emerald-200 text-emerald-700"
    : "hover:bg-blue-200 text-blue-700";

  const checkboxActiveClass = isEmerald
    ? "border-emerald-600 bg-emerald-600 text-white"
    : "border-blue-600 bg-blue-600 text-white";

  const activeOptionBg = isEmerald
    ? "bg-emerald-50/70 text-emerald-950 font-semibold"
    : "bg-blue-50/70 text-blue-950 font-semibold";

  const addBtnClass = isEmerald
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-blue-600 hover:bg-blue-700 text-white";

  const primaryText = isEmerald ? "#059669" : "#2563eb";

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleAdd = () => {
    const trimmed = newNumberInput.trim();
    if (!trimmed) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (onAddOption) {
      onAddOption(trimmed);
    }
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setNewNumberInput("");
    toast.success(`Number ${trimmed} added and selected`);
  };

  const removeNumber = (num: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== num));
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className={`w-full min-h-[42px] px-3 py-1.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-2xs ${
          isOpen
            ? isEmerald
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-200/90 hover:border-slate-300"
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {selected.length === 0 ? (
            <span
              className="text-xs text-slate-400 font-medium select-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {placeholder}
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {selected.map((num) => (
                <span
                  key={num}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${chipClass}`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span className="font-mono text-[11px]">{num}</span>
                  <button
                    type="button"
                    onClick={(e) => removeNumber(num, e)}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${chipRemoveClass}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {selected.length > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isEmerald ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown Menu - rendered via React Portal into document.body with fixed page-level z-index */}
      {isOpen &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: coords.showAbove ? "auto" : `${coords.top}px`,
              bottom: coords.showAbove ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white border border-slate-200/95 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          >
            {/* Header Controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-b border-slate-100 text-[11px]">
              <span
                className="font-bold text-slate-600"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Available Numbers ({options.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange(Array.from(new Set([...options])))}
                  className="font-bold hover:underline cursor-pointer"
                  style={{ color: primaryText, fontFamily: "DM Sans, sans-serif" }}
                >
                  Select All
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
              {options.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No phone numbers found. Add one below.
                </div>
              ) : (
                options.map((opt) => {
                  const isChecked = selected.includes(opt);
                  return (
                    <div
                      key={opt}
                      onClick={() => toggleOption(opt)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked ? activeOptionBg : "hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                            isChecked ? checkboxActiveClass : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                        <span
                          className="font-semibold text-slate-900 font-mono text-[12px] truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {opt}
                        </span>
                      </div>
                      {badgeSuffix && (
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                          {badgeSuffix}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Number Inside Dropdown */}
            <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 space-y-1">
              <span
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Add Phone Number
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newNumberInput}
                  onChange={(e) => setNewNumberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="+1 (555) 000-0000"
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-900 placeholder:text-slate-400"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 ${addBtnClass}`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
