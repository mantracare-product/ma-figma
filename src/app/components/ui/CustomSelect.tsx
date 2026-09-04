import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  id?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  searchable = false,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value && opt.value !== "");

  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < 240 && rect.top > 240;

    if (placeAbove) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: Math.max(8, rect.left),
        width: rect.width,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left),
        width: rect.width,
      });
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!isOpen) return;

    // Focus search if present
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 flex items-center justify-between shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left select-none ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-50"
            : "cursor-pointer"
        } ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : ""} ${className}`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <div className="flex items-center gap-1.5 truncate pr-2">
          {selectedOption ? (
            <>
              <span className="font-semibold text-slate-800 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span
                  className="text-slate-400 font-normal truncate shrink-0"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  ({selectedOption.sublabel})
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? coords.top : undefined,
              bottom: coords.bottom !== undefined ? coords.bottom : undefined,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl p-1.5 flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Optional search box */}
            {searchable && (
              <div className="p-1 pb-1.5 border-b border-slate-100 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options list */}
            <div className="overflow-y-auto overscroll-contain py-1 space-y-0.5 max-h-60 pr-0.5">
              {filteredOptions.length === 0 ? (
                <div
                  className="py-4 text-center text-xs text-slate-400 font-medium"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  const isPlaceholder = opt.value === "";

                  return (
                    <button
                      key={opt.value || "__empty__"}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs text-left flex items-center justify-between transition-all select-none cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/90 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs"
                          : isPlaceholder
                          ? "text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-normal italic"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span
                          className={`truncate ${
                            isSelected
                              ? "text-blue-700 font-semibold"
                              : isPlaceholder
                              ? "text-slate-400 italic"
                              : "text-slate-800"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span
                            className="text-[11px] text-slate-400 font-normal truncate mt-0.5"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-100/70 flex items-center justify-center shrink-0 ml-1.5">
                          <Check className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
