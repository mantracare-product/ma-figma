import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X, Search, Plus } from "lucide-react";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

interface AdminMultiSelectDropdownProps {
  label?: string;
  tooltipText?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustomInput?: boolean;
  customInputPlaceholder?: string;
}

export function AdminMultiSelectDropdown({
  label,
  tooltipText,
  options,
  selected,
  onChange,
  placeholder = "All included (Universal)",
  disabled = false,
  allowCustomInput = false,
  customInputPlaceholder = "Add custom...",
}: AdminMultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customInputValue, setCustomInputValue] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 280;
      const showAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setCoords({
        top: showAbove ? Math.max(8, rect.top - estimatedHeight - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Close on click outside & update position on scroll/resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      updateCoords();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  // Filter out any "All", "All Industry", "All Industries", "All Categories", "All Locations" pseudo-options
  const isAllPseudoOption = (opt: string) =>
    /^(all|all\s+industr(y|ies)|all\s+categories|all\s+locations|all\s+countries)$/i.test(opt.trim());

  // Combined options (standard options + any custom selected items not in standard options)
  const allAvailableOptions = useMemo(() => {
    const list = options.filter((opt) => !isAllPseudoOption(opt));
    for (const item of selected) {
      if (!isAllPseudoOption(item) && !list.includes(item)) {
        list.push(item);
      }
    }
    return list;
  }, [options, selected]);

  // Filtered options by search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allAvailableOptions;
    return allAvailableOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [allAvailableOptions, searchQuery]);

  const handleToggle = (item: string) => {
    if (disabled || isAllPseudoOption(item)) return;
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item && !isAllPseudoOption(i)));
    } else {
      onChange([...selected.filter((i) => !isAllPseudoOption(i)), item]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([...allAvailableOptions]);
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const handleAddCustom = () => {
    const val = customInputValue.trim();
    if (!val || disabled || isAllPseudoOption(val)) return;
    if (!selected.includes(val)) {
      onChange([...selected.filter((i) => !isAllPseudoOption(i)), val]);
    }
    setCustomInputValue("");
  };

  const visibleSelected = selected.slice(0, 2);
  const remainingCount = selected.length - 2;

  return (
    <div className="relative w-full">
      {label && (
        <div className="flex items-center mb-1">
          <label className="block text-[11px] font-medium text-gray-700">
            {label}
          </label>
          {tooltipText && <InfoTooltip text={tooltipText} size="sm" />}
        </div>
      )}

      {/* Trigger Bar */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[38px] px-3 py-1.5 border rounded-lg text-xs bg-white flex items-center justify-between gap-2 transition-all text-left ${
          disabled
            ? "bg-gray-50 border-gray-200 cursor-not-allowed text-gray-400"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xs cursor-pointer"
            : "border-gray-200 hover:border-gray-300 cursor-pointer"
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-gray-400 font-normal italic">{placeholder}</span>
          ) : (
            <>
              {visibleSelected.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200/60 max-w-[170px]"
                >
                  <span className="truncate">{item}</span>
                  {!disabled && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(item);
                      }}
                      className="hover:text-blue-900 cursor-pointer p-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[10px] border border-gray-200">
                  +{remainingCount} more
                </span>
              )}
            </>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Panel (Portaled to document.body so it is relative to page, not card) */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[99999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: 280,
          }}
        >
          {/* Search bar & Actions Header */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/80 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-gray-500 font-medium">
                {selected.length} of {allAvailableOptions.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Options List */}
          <div className="flex-1 overflow-y-auto p-1 max-h-48 divide-y divide-gray-50">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 italic">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? "bg-blue-50/70 text-blue-900 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(opt)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="truncate flex-1">{opt}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Custom item input */}
          {allowCustomInput && (
            <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex items-center gap-1.5">
              <input
                type="text"
                value={customInputValue}
                onChange={(e) => setCustomInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustom();
                  }
                }}
                placeholder={customInputPlaceholder}
                className="flex-1 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customInputValue.trim()}
                className="p-1 text-xs font-semibold bg-[#111827] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="Add custom option"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
