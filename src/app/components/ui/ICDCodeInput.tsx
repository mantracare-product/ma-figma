import React, { useState, useRef, useEffect } from "react";
import { Activity, X, Sparkles } from "lucide-react";
import { searchICDCodes, ICDCodeItem } from "../../../lib/icdCodes";

interface ICDCodeInputProps {
  value: string;
  onChange: (code: string, selectedOption?: ICDCodeItem) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function ICDCodeInput({
  value,
  onChange,
  placeholder = "e.g. F41.1, H25.11, J20.9",
  className = "",
  disabled = false,
}: ICDCodeInputProps) {
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

  const effectiveQuery = searchQuery || value || "";
  const suggestions = searchICDCodes(effectiveQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value.toUpperCase();
    setSearchQuery(nextVal);
    onChange(nextVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (option: ICDCodeItem) => {
    onChange(option.code, option);
    setSearchQuery("");
    setIsOpen(false);
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
        <Activity className="absolute left-3 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
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
          className={`w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs font-mono tracking-wide bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all ${className}`}
          style={{ fontFamily: "DM Sans, monospace" }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            title="Clear ICD code"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Standard ICD-10 Diagnosis Codes
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              {suggestions.length} matched
            </span>
          </div>

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
                      isSelected ? "bg-emerald-50 text-emerald-900" : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 group-hover:bg-emerald-100"
                      }`}
                    >
                      {item.code}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                          {item.shortDescription}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">
                          {item.category.split(" ")[0]}
                        </span>
                      </div>
                      {item.longDescription && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.longDescription}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching ICD-10 codes found for &ldquo;{effectiveQuery}&rdquo;. You can still type and submit any custom ICD-10 code.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
