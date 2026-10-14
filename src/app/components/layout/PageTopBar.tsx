import React, { useState, useRef, useEffect, ReactNode } from "react";
import {
  Search,
  X,
  Plus,
  Upload,
  Download,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Check,
  RotateCcw,
} from "lucide-react";
import { InfoTooltip } from "../help/InfoTooltip";
import { Tooltip } from "../ui/Tooltip";

export interface FilterTag {
  field: string;
  label: string;
  values: string[];
}

export interface FilterPreset {
  id: string;
  label: string;
  count?: number | string;
  isActive?: boolean;
  onClick: () => void;
}

export interface FilterFieldOption {
  label: string;
  value: string;
}

export interface FilterFieldConfig {
  id: string;
  label: string;
  type?: "text" | "select" | "multiselect" | "date" | "tags";
  placeholder?: string;
  tooltip?: string;
  options?: Array<string | FilterFieldOption>;
  value?: any;
  onChange?: (value: any) => void;
  render?: () => ReactNode;
}

export interface TopBarMode {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

export interface TopBarViewToggle {
  id: string;
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  onClick: () => void;
}

export interface PrimaryActionConfig {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export interface PageTopBarProps {
  // Left Dynamics: Modes, Sections, Fields or custom left elements
  leftElement?: ReactNode;
  modes?: TopBarMode[];
  activeMode?: string;
  onModeChange?: (modeId: string) => void;

  // Middle Search Bar & Filter State
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  activeFilters?: FilterTag[];
  onRemoveFilter?: (index: number) => void;
  onClearAllFilters?: () => void;
  resultsCount?: number;

  // Search Filter Modal Popup
  showSearchModal?: boolean;
  onSearchModalToggle?: (open: boolean) => void;
  filterPresets?: FilterPreset[];
  presetsTitle?: string;
  filterFields?: FilterFieldConfig[];
  availableFilterFieldsToAdd?: string[];
  activeFilterFieldNames?: string[];
  onAddFilterField?: (fieldName: string) => void;
  onRestoreDefaultFields?: () => void;
  onSaveFilter?: () => void;
  customFilterModalContent?: ReactNode;

  // Right Dynamics: Views, Secondary Buttons, Primary Action
  viewToggles?: TopBarViewToggle[];
  showFilterToggle?: boolean;
  isFilterOpen?: boolean;
  onToggleFilter?: () => void;
  onImport?: () => void;
  isImporting?: boolean;
  onExport?: () => void;
  isExporting?: boolean;
  secondaryActions?: ReactNode;
  primaryAction?: PrimaryActionConfig | ReactNode;
  afterPrimaryAction?: ReactNode;
  children?: ReactNode;

  // Visual Customization
  className?: string;
  isBottomPanelAttached?: boolean;
}

export function PageTopBar({
  leftElement,
  modes,
  activeMode,
  onModeChange,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  resultsCount,
  showSearchModal: controlledShowModal,
  onSearchModalToggle,
  filterPresets,
  presetsTitle = "Presets",
  filterFields,
  availableFilterFieldsToAdd,
  activeFilterFieldNames,
  onAddFilterField,
  onRestoreDefaultFields,
  onSaveFilter,
  customFilterModalContent,
  viewToggles,
  showFilterToggle,
  isFilterOpen,
  onToggleFilter,
  onImport,
  isImporting = false,
  onExport,
  isExporting = false,
  secondaryActions,
  primaryAction,
  afterPrimaryAction,
  children,
  className = "",
  isBottomPanelAttached = false,
}: PageTopBarProps) {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [showAddFieldDropdown, setShowAddFieldDropdown] = useState(false);
  const [openDropdownFieldId, setOpenDropdownFieldId] = useState<string | null>(null);

  const isModalOpen = controlledShowModal !== undefined ? controlledShowModal : internalShowModal;
  const setModalOpen = (open: boolean) => {
    if (onSearchModalToggle) {
      onSearchModalToggle(open);
    } else {
      setInternalShowModal(open);
    }
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const addFieldDropdownRef = useRef<HTMLDivElement>(null);

  // Close add field dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addFieldDropdownRef.current &&
        !addFieldDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAddFieldDropdown(false);
      }
    };
    if (showAddFieldDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddFieldDropdown]);

  const hasFilterTags = activeFilters.length > 0;
  const hasModalContent = Boolean(
    customFilterModalContent ||
    (filterPresets && filterPresets.length > 0) ||
    (filterFields && filterFields.length > 0) ||
    (availableFilterFieldsToAdd && availableFilterFieldsToAdd.length > 0)
  );

  return (
    <div
      className={`bg-card p-2.5 px-3 border border-border shadow-xs transition-all ${
        isBottomPanelAttached ? "rounded-t-xl rounded-b-none border-b-0" : "rounded-xl"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
        {/* ── Left Dynamics (Modes / Sections / Fields Segment) ── */}
        {(leftElement || (modes && modes.length > 0)) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {modes && modes.length > 0 && (
              <div className="inline-flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-xl gap-0.5">
                {modes.map((mode) => {
                  const isActive = activeMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onModeChange?.(mode.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-gray-900 shadow-2xs font-bold"
                          : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {mode.icon}
                      <span>{mode.label}</span>
                      {mode.badge !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-gray-200/80 text-gray-600"
                          }`}
                        >
                          {mode.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {leftElement}
          </div>
        )}

        {/* ── Middle Search Bar & Advanced Filter Modal Popup ── */}
        <div className="flex-1 min-w-[240px] relative" ref={searchContainerRef}>
          <div className="relative search-bar-container">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />

            <div
              className="w-full h-[36px] bg-input-background border border-input rounded-lg flex items-center cursor-text overflow-hidden hover:border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all"
              onClick={() => {
                if (hasModalContent) setModalOpen(true);
              }}
            >
              {/* Scrollable Filter Chips / Tags */}
              <div
                className="flex items-center gap-1.5 pl-9 pr-2 flex-1 overflow-x-auto overflow-y-hidden h-full scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {activeFilters.map((filter, index) => (
                  <span
                    key={`${filter.field}-${index}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      backgroundColor: "#E8F0FE",
                      borderColor: "#4F8EF7",
                      color: "#4F8EF7",
                      fontFamily: "Outfit, sans-serif",
                      fontSize: "12.5px",
                    }}
                  >
                    <span>
                      {filter.label}: {filter.values.join(", ")}
                    </span>
                    {onRemoveFilter && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFilter(index);
                        }}
                        className="hover:opacity-70 p-0.5 rounded-full cursor-pointer"
                        title="Remove filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}

                {/* Main Search Input */}
                <input
                  type="text"
                  placeholder={hasFilterTags ? "" : searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onFocus={() => {
                    if (hasModalContent) setModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setModalOpen(false);
                      setOpenDropdownFieldId(null);
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none min-w-[120px] h-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Clear All Button */}
              {(hasFilterTags || searchQuery) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearAllFilters?.();
                    onSearchChange?.("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 shrink-0 cursor-pointer font-medium"
                  style={{ fontFamily: "Outfit, sans-serif", fontSize: "12px" }}
                >
                  ✕ Clear all
                </button>
              )}
            </div>

            {/* ── Advanced Search Modal Dropdown Panel (Identical to Client Search Bar) ── */}
            {isModalOpen && hasModalContent && (
              <>
                {/* Clickaway Backdrop */}
                <div
                  className="fixed inset-0 z-40 bg-black/5"
                  onClick={() => {
                    setModalOpen(false);
                    setOpenDropdownFieldId(null);
                  }}
                />

                {/* 720px Modal Panel Container */}
                <div
                  className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={(e) => e.stopPropagation()}
                  style={{ minWidth: "720px", width: "720px" }}
                >
                  {customFilterModalContent ? (
                    customFilterModalContent
                  ) : (
                    <div className="flex" style={{ maxHeight: "580px" }}>
                      {/* Left Sidebar - Preset Filters */}
                      {filterPresets && filterPresets.length > 0 && (
                        <div className="w-56 border-r border-border p-4 overflow-y-auto bg-muted/20 shrink-0">
                          <p
                            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-3"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {presetsTitle}
                          </p>
                          <div className="space-y-1">
                            {filterPresets.map((preset) => {
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    preset.onClick();
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 text-xs rounded-lg transition-colors font-medium flex items-center justify-between cursor-pointer ${
                                    preset.isActive
                                      ? "bg-primary/10 text-primary font-bold shadow-2xs"
                                      : "hover:bg-muted text-gray-700"
                                  }`}
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <span className="truncate">{preset.label}</span>
                                  {preset.count !== undefined && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        preset.isActive
                                          ? "bg-primary/20 text-primary"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                    >
                                      {preset.count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Right Side - Dynamic 2-Column Filter Fields */}
                      <div className="flex-1 p-5 overflow-y-auto min-w-0">
                        {filterFields && filterFields.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3.5">
                            {filterFields.map((field) => {
                              if (field.render) {
                                return (
                                  <div key={field.id} className="col-span-1">
                                    {field.render()}
                                  </div>
                                );
                              }

                              const isDropdownOpen = openDropdownFieldId === field.id;

                              return (
                                <div key={field.id} className="relative">
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <label
                                      className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                                      style={{ fontFamily: "Outfit, sans-serif" }}
                                    >
                                      {field.label}
                                    </label>
                                    {field.tooltip && <InfoTooltip text={field.tooltip} size="sm" />}
                                  </div>

                                  {field.type === "select" ? (
                                    <select
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange?.(e.target.value)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                      style={{ fontFamily: "Outfit, sans-serif", height: "38px" }}
                                    >
                                      {field.options?.map((opt) => {
                                        const val = typeof opt === "string" ? opt : opt.value;
                                        const lbl = typeof opt === "string" ? opt : opt.label;
                                        return (
                                          <option key={val} value={val}>
                                            {lbl}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  ) : field.type === "multiselect" ? (
                                    <div>
                                      <div
                                        onClick={() =>
                                          setOpenDropdownFieldId(isDropdownOpen ? null : field.id)
                                        }
                                        className="w-full px-3 py-2 border border-border rounded-lg text-xs cursor-pointer bg-white min-h-[38px] flex items-center justify-between gap-1.5"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      >
                                        <span className="truncate text-gray-700">
                                          {Array.isArray(field.value) && field.value.length > 0
                                            ? field.value.join(", ")
                                            : field.placeholder || `Select ${field.label.toLowerCase()}...`}
                                        </span>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                      </div>

                                      {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                          {field.options?.map((opt) => {
                                            const val = typeof opt === "string" ? opt : opt.value;
                                            const lbl = typeof opt === "string" ? opt : opt.label;
                                            const isSelected =
                                              Array.isArray(field.value) && field.value.includes(val);

                                            return (
                                              <label
                                                key={val}
                                                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/70 rounded-md cursor-pointer text-xs font-medium text-gray-700"
                                                style={{ fontFamily: "Outfit, sans-serif" }}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={(e) => {
                                                    const current = Array.isArray(field.value)
                                                      ? field.value
                                                      : [];
                                                    const next = e.target.checked
                                                      ? [...current, val]
                                                      : current.filter((x: string) => x !== val);
                                                    field.onChange?.(next);
                                                  }}
                                                  className="w-3.5 h-3.5 rounded text-primary focus:ring-0"
                                                />
                                                <span className="truncate">{lbl}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange?.(e.target.value)}
                                      className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                      style={{ fontFamily: "Outfit, sans-serif", height: "38px" }}
                                    />
                                  )}
                                </div>
                              );
                            })}

                            {/* + Add field Button / Popup */}
                            {availableFilterFieldsToAdd && availableFilterFieldsToAdd.length > 0 && (
                              <div className="relative" ref={addFieldDropdownRef}>
                                <div className="invisible h-5 mb-1.5" />
                                <button
                                  type="button"
                                  onClick={() => setShowAddFieldDropdown((v) => !v)}
                                  className="w-full h-[38px] border-2 border-dashed border-[#4F8EF7]/50 hover:border-[#4F8EF7] text-[#4F8EF7] bg-blue-50/30 hover:bg-blue-50/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add field</span>
                                </button>

                                {showAddFieldDropdown && (
                                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                                      Available Fields
                                    </p>
                                    {availableFilterFieldsToAdd.map((name) => {
                                      const isAdded = activeFilterFieldNames?.includes(name);
                                      return (
                                        <button
                                          key={name}
                                          type="button"
                                          disabled={isAdded}
                                          onClick={() => {
                                            onAddFilterField?.(name);
                                            setShowAddFieldDropdown(false);
                                          }}
                                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                            isAdded
                                              ? "opacity-50 text-gray-400 cursor-not-allowed"
                                              : "text-gray-700 hover:bg-muted font-medium cursor-pointer"
                                          }`}
                                          style={{ fontFamily: "Outfit, sans-serif" }}
                                        >
                                          <span>{name}</span>
                                          {isAdded && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Modal Footer Controls */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                          {onRestoreDefaultFields ? (
                            <button
                              type="button"
                              onClick={onRestoreDefaultFields}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore default fields</span>
                            </button>
                          ) : (
                            <div />
                          )}

                          {onSaveFilter && (
                            <button
                              type="button"
                              onClick={onSaveFilter}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save filter</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Results count label */}
          {resultsCount !== undefined && hasFilterTags && (
            <p
              className="text-[11px] text-muted-foreground mt-1 ml-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {resultsCount} results found
            </p>
          )}
        </div>

        {/* ── Right Dynamics (Views, Secondary Buttons, Primary Action) ── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Toggles (e.g. Table / Kanban / Calendar) */}
          {viewToggles && viewToggles.length > 0 && (
            <div className="inline-flex items-center p-0.5 bg-muted/60 border border-border/80 rounded-full gap-0.5">
              {viewToggles.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={view.onClick}
                  className={`p-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    view.isActive
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title={view.label}
                >
                  {view.icon}
                </button>
              ))}
            </div>
          )}

          {/* Filter Panel Toggle */}
          {showFilterToggle && (
            <button
              type="button"
              onClick={onToggleFilter}
              className={`h-[36px] px-3.5 border rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 ${
                isFilterOpen
                  ? "bg-blue-50 text-[#1456f0] border-blue-200"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-border"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          )}

          {/* Import Action */}
          {onImport && (
            <Tooltip text={isImporting ? "Importing..." : "Import"}>
              <button
                type="button"
                onClick={onImport}
                disabled={isImporting}
                className="w-[36px] h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-border rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-60"
                aria-label="Import"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </Tooltip>
          )}

          {/* Export Action */}
          {onExport && (
            <Tooltip text={isExporting ? "Exporting..." : "Export"}>
              <button
                type="button"
                onClick={onExport}
                disabled={isExporting}
                className="w-[36px] h-[36px] bg-white hover:bg-slate-50 text-slate-700 border border-border rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-60"
                aria-label="Export"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </Tooltip>
          )}

          {/* Additional Secondary Actions or Custom Content */}
          {secondaryActions}
          {children}

          {/* Primary Action Button (e.g. + Add Client, + New Process) */}
          {primaryAction && (
            <>
              {React.isValidElement(primaryAction) ? (
                primaryAction
              ) : (
                <button
                  type="button"
                  onClick={(primaryAction as PrimaryActionConfig).onClick}
                  disabled={(primaryAction as PrimaryActionConfig).disabled}
                  className={`h-[36px] px-4 bg-[#1E293B] hover:bg-black text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-60 ${(primaryAction as PrimaryActionConfig).className || ""}`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {(primaryAction as PrimaryActionConfig).icon || <Plus className="w-3.5 h-3.5" />}
                  <span>{(primaryAction as PrimaryActionConfig).label}</span>
                </button>
              )}
            </>
          )}

          {/* After Primary Action (e.g. Gear settings button) */}
          {afterPrimaryAction}
        </div>
      </div>
    </div>
  );
}

export default PageTopBar;
