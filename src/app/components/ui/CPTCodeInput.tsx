import React, { useState, useRef, useEffect } from "react";
import { Tag, Search, X, Check, Sparkles } from "lucide-react";
import { searchCPTCodes, CPTCodeOption, COMMON_CPT_CODES } from "../../../lib/cptCodes";

interface CPTCodeInputProps {
  value: string;
  onChange: (code: string, selectedOption?: CPTCodeOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CPTCodeInput({
  value,
  onChange,
  placeholder = "e.g. 90834, 99213, or HCPCS code",
  className = "",
  disabled = false,
}: CPTCodeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on typed input or dropdown search
  const effectiveQuery = searchQuery || value || "";
  const suggestions = searchCPTCodes(effectiveQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value.toUpperCase();
    setSearchQuery(nextVal);
    onChange(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (option: CPTCodeOption) => {
    onChange(option.code, option);
    setSearchQuery("");
    setIsOpen(false);
    // Refocus input after selection
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Tag className="absolute left-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm font-mono tracking-wide bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${className}`}
          style={{ fontFamily: "DM Sans, monospace" }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            title="Clear CPT code"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Sparkles className="w-3 h-3 text-blue-600" />
              Standard CPT / HCPCS Suggestions
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              {suggestions.length} available
            </span>
          </div>

          {/* List of Suggestions */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {suggestions.length > 0 ? (
              suggestions.map((item) => {
                const isSelected = value.trim().toUpperCase() === item.code.toUpperCase();
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-start gap-3 group ${
                      isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    {/* Code Chip */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-cyan-50 text-cyan-800 border border-cyan-200/80 group-hover:bg-cyan-100"
                      }`}
                    >
                      {item.code}
                    </span>

                    {/* Code details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {item.description}
                        </p>
                        {item.typicalDuration && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium font-sans">
                            {item.typicalDuration}m
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {item.category}
                      </p>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-slate-600 font-medium">
                  Custom Code: <span className="font-mono font-bold text-blue-600">{value}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No standard code match found, but this custom code will be saved.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
