import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import {
  INITIAL_CATEGORIES,
  type IndustryCategory,
} from "../../../../data/industryReferenceData";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

export interface AdminCategoryDropdownProps {
  value: string;
  onChange: (categoryName: string) => void;
  disabled?: boolean;
  categories?: IndustryCategory[];
  label?: string;
  tooltipText?: string;
}

export function AdminCategoryDropdown({
  value,
  onChange,
  disabled = false,
  categories = INITIAL_CATEGORIES,
  label = "1. Industry Category",
  tooltipText = "Select the industry category for this scoping rule.",
}: AdminCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 240;
      const showAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setCoords({
        top: showAbove
          ? Math.max(8, rect.top - estimatedHeight - 4)
          : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
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

  const handleSelect = (categoryName: string) => {
    if (disabled) return;
    onChange(categoryName);
    setIsOpen(false);
  };

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

      {/* Trigger Button */}
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
        <span className="font-medium text-gray-800 text-xs truncate">
          {value || "Select Category"}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Floating Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="fixed z-[999999] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[260px]"
          >
            <div className="overflow-y-auto p-1 space-y-0.5">
              {categories.map((cat) => {
                const isSelected = cat.name === value;

                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => handleSelect(cat.name)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
