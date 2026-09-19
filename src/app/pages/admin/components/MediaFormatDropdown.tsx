/**
 * MediaFormatDropdown.tsx
 * Path: src/app/pages/admin/components/MediaFormatDropdown.tsx
 *
 * Portal-based dropdown for selecting accepted media formats.
 * Allows users to type custom extensions (e.g. HEIC, SVG, DWG, FLAC)
 * which are saved forever in persistent storage (localStorage).
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Check,
  X,
  Search,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  FileCode,
} from "lucide-react";
import {
  MediaCategory,
  getAllMediaFormats,
  addCustomMediaFormat,
  removeCustomMediaFormat,
  isCustomExtension,
  cleanExtension,
  MEDIA_FORMATS_EVENT,
  DEFAULT_MEDIA_PRESETS,
} from "../../../../lib/mediaFormatsStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { toast } from "sonner";

export interface MediaFormatDropdownProps {
  category: MediaCategory;
  selectedFormats: string[];
  onChange: (formats: string[]) => void;
  disabled?: boolean;
  zIndex?: number;
}

export function MediaFormatDropdown({
  category,
  selectedFormats,
  onChange,
  disabled = false,
  zIndex = 100010,
}: MediaFormatDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allFormats, setAllFormats] = useState<string[]>(() => getAllMediaFormats(category));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  // Reload formats whenever category changes or storage event fires
  const refreshFormats = () => {
    setAllFormats(getAllMediaFormats(category));
  };

  useEffect(() => {
    refreshFormats();
  }, [category]);

  useEffect(() => {
    const handleUpdate = () => refreshFormats();
    window.addEventListener(MEDIA_FORMATS_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(MEDIA_FORMATS_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [category]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 320;
      const showAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

      setCoords({
        top: showAbove ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 320),
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
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  const cleanedQuery = cleanExtension(searchQuery);

  const filteredFormats = useMemo(() => {
    if (!cleanedQuery) return allFormats;
    return allFormats.filter((fmt) => fmt.includes(cleanedQuery));
  }, [allFormats, cleanedQuery]);

  const exactMatchExists = useMemo(() => {
    if (!cleanedQuery) return true;
    return allFormats.some((fmt) => fmt === cleanedQuery);
  }, [allFormats, cleanedQuery]);

  const handleToggle = (fmt: string) => {
    if (disabled) return;
    const clean = cleanExtension(fmt);
    const exists = selectedFormats.includes(clean);
    let next: string[];
    if (exists) {
      next = selectedFormats.filter((f) => f !== clean);
    } else {
      next = [...selectedFormats, clean];
    }
    onChange(next.length > 0 ? next : [clean]);
  };

  const handleAddNewExtension = () => {
    if (!cleanedQuery || disabled) return;
    const result = addCustomMediaFormat(category, cleanedQuery);
    if (result.success) {
      setAllFormats(result.allFormats);
      if (!selectedFormats.includes(result.formatted)) {
        onChange([...selectedFormats, result.formatted]);
      }
      toast.success(`Extension "${result.formatted}" added and saved permanently!`);
      setSearchQuery("");
    } else if (result.message) {
      toast.error(result.message);
    }
  };

  const handleDeleteCustomFormat = (e: React.MouseEvent, fmt: string) => {
    e.stopPropagation();
    if (disabled) return;
    const updated = removeCustomMediaFormat(category, fmt);
    setAllFormats(updated);
    if (selectedFormats.includes(fmt)) {
      const next = selectedFormats.filter((f) => f !== fmt);
      onChange(next.length > 0 ? next : updated.slice(0, 1));
    }
    toast.info(`Removed custom extension "${fmt}"`);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([...allFormats]);
  };

  const handleClearAll = () => {
    if (disabled) return;
    if (allFormats.length > 0) {
      onChange([allFormats[0]]);
    }
  };

  const handleResetToPresets = () => {
    if (disabled) return;
    const presets = DEFAULT_MEDIA_PRESETS[category] || DEFAULT_MEDIA_PRESETS.document;
    onChange([...presets]);
    toast.info(`Reset to default ${category} presets`);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Accepted Formats
          </label>
          <InfoTooltip
            text="Select allowed file extensions or type any custom extension (e.g. HEIC, SVG, DWG) to save it forever."
            size="sm"
          />
        </div>

        <span className="text-[11px] font-medium text-slate-400">
          {selectedFormats.length} of {allFormats.length} selected
        </span>
      </div>

      {/* Main Trigger Dropdown Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full min-h-[38px] px-3 py-1.5 border rounded-xl text-xs bg-white flex items-center justify-between gap-2 transition-all text-left shadow-2xs ${
          disabled
            ? "bg-slate-50 border-slate-200 cursor-not-allowed text-slate-400"
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xs cursor-pointer"
            : "border-slate-200 hover:border-slate-300 cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 py-0.5">
          {selectedFormats.length === 0 ? (
            <span className="text-slate-400 font-normal">Select formats...</span>
          ) : selectedFormats.length <= 4 ? (
            selectedFormats.map((fmt) => (
              <span
                key={fmt}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70"
              >
                .{fmt.toLowerCase()}
                {isCustomExtension(category, fmt) && (
                  <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded font-bold">★</span>
                )}
              </span>
            ))
          ) : (
            <>
              {selectedFormats.slice(0, 3).map((fmt) => (
                <span
                  key={fmt}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70"
                >
                  .{fmt.toLowerCase()}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                +{selectedFormats.length - 3} more
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600" : ""}`}
          />
        </div>
      </button>

      {/* Selected format chips row for quick removal */}
      {selectedFormats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selectedFormats.map((fmt) => {
            const isCustom = isCustomExtension(category, fmt);
            return (
              <span
                key={fmt}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
                  isCustom
                    ? "bg-amber-50/80 text-amber-800 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <span>.{fmt.toLowerCase()}</span>
                {isCustom && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded">
                    custom
                  </span>
                )}
                {!disabled && selectedFormats.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleToggle(fmt)}
                    className="text-slate-400 hover:text-red-500 rounded p-0.5 cursor-pointer ml-0.5"
                    title={`Remove .${fmt.toLowerCase()}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown Portal Panel */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-80 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search and Custom Extension Creation Input */}
            <div className="p-2.5 bg-slate-50/90 border-b border-slate-200/80 space-y-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!exactMatchExists && cleanedQuery) {
                        handleAddNewExtension();
                      }
                    }
                  }}
                  placeholder="Search or type extension (e.g. HEIC, SVG, DWG)..."
                  className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Add Custom Extension Button when user types something new */}
              {!exactMatchExists && cleanedQuery && (
                <button
                  type="button"
                  onClick={handleAddNewExtension}
                  className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 flex items-center justify-between transition-colors cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">
                      Add <strong className="font-mono">.{cleanedQuery.toLowerCase()}</strong> ({cleanedQuery})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 shrink-0 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Saves Forever
                  </span>
                </button>
              )}

              {/* Quick Actions Toolbar */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Reset (Single)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToPresets}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                  title="Reset to original preset formats"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Presets</span>
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
              {filteredFormats.length === 0 ? (
                <div className="py-6 px-3 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-600">No matching extension found</p>
                  <p className="text-[11px] text-slate-400">
                    Click &ldquo;Add .{cleanedQuery.toLowerCase()}&rdquo; above to save this format forever.
                  </p>
                </div>
              ) : (
                filteredFormats.map((fmt) => {
                  const isSelected = selectedFormats.includes(fmt);
                  const isCustom = isCustomExtension(category, fmt);

                  return (
                    <div
                      key={fmt}
                      onClick={() => handleToggle(fmt)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-xs transition-colors select-none group ${
                        isSelected
                          ? "bg-blue-50/80 text-blue-900 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-slate-800">
                            {fmt}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            (.{fmt.toLowerCase()})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCustom && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}

                        {isCustom && !disabled && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomFormat(e, fmt)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title={`Delete custom format "${fmt}" permanently`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Persistent storage footer notice */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <FileCode className="w-3 h-3 text-slate-400" />
                <span>Format rules stored in field configuration</span>
              </span>
              <span className="font-semibold text-slate-500">
                {category.toUpperCase()}
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
