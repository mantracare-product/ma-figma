import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  X,
  ChevronDown,
  Calendar,
  DollarSign,
  Link2,
  Mail,
  Phone,
  Layers,
  Check,
  Star,
  Clock,
  Paperclip,
  Lock,
  AlertCircle,
  Edit3,
} from "lucide-react";
import type {
  FieldDefinition,
  SubFieldConfig,
  SubFieldInputType,
  FieldOption,
  CrmBindConfig,
  FieldInputType,
  NewListConfig,
  OptionListColumnConfig,
} from "../../context/FieldRegistryContext";
import {
  resolveColumnsOrSubFields,
  CURRENCY_SYMBOLS,
  getSuggestedPlaceholderForType,
  useFieldRegistry,
} from "../../context/FieldRegistryContext";
import { useCrmBindOptions } from "./useCrmBindOptions";
import { useDynamicListOptions } from "./useDynamicListOptions";
import { RichTextEditor } from "./RichTextEditor";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { AdminSelect } from "../ui/AdminSelect";

export type FieldRendererMode = "runtime" | "admin_default";

export interface FieldInputRendererProps {
  // Pass either a full FieldDefinition OR a SubFieldConfig (for table columns / group items)
  field?: Partial<FieldDefinition>;
  subField?: SubFieldConfig;
  value: any;
  onChange: (val: any) => void;
  mode?: FieldRendererMode;
  disabled?: boolean;
  isSubField?: boolean; // Caps recursion at 1 level
  recordData?: Record<string, any>; // Active in-memory record data for dynamic binding
}

// ─────────────────────────────────────────────────────────────
// Country Code Options & Phone Formatting Mask
// ─────────────────────────────────────────────────────────────
export interface CountryCodeOption {
  code: string;
  iso: string;
  name: string;
  flag: string;
}

export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸" },
  { code: "+1", iso: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+81", iso: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+55", iso: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+86", iso: "CN", name: "China", flag: "🇨🇳" },
  { code: "+34", iso: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+52", iso: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+31", iso: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿" },
];

export function formatPhoneNumberByMask(rawInput: string, maskPattern: string): string {
  const digits = rawInput.replace(/\D/g, "");
  if (!digits) return "";

  // Parentheses mask e.g. (XXX) XXX-XXXX or (555) 123-4567
  if (maskPattern.includes("(") && maskPattern.includes(")")) {
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Hyphenated mask e.g. XXX-XXX-XXXX or 555-123-4567
  if (maskPattern.includes("-")) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // 5-5 Spaced mask e.g. XXXXX XXXXX or +91 98765 43210
  if (maskPattern === "XXXXX XXXXX" || maskPattern.includes("98765")) {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }

  // 3-3-4 Spaced mask e.g. XXX XXX XXXX
  if (maskPattern === "XXX XXX XXXX") {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3, 6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }

  if (maskPattern === "XXXXXXXXXX") {
    return digits.slice(0, 15);
  }

  // Default standard formatting
  if (digits.length <= 3) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

interface PhoneInputRendererProps {
  config?: {
    showCountryCode?: boolean;
    countryCodeDisplay?: "name" | "code";
    showFlags?: boolean;
    numberFormat?: string;
  };
  value: any;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isAdminDefault?: boolean;
  borderClass?: string;
}

function PhoneInputRenderer({
  config,
  value,
  onChange,
  disabled = false,
  placeholder,
  isAdminDefault = false,
  borderClass = "border-slate-200 bg-white focus:border-blue-500",
}: PhoneInputRendererProps) {
  const showCountryCode = config?.showCountryCode !== false;
  const showFlags = config?.showFlags ?? true;
  const activeFormat = config?.numberFormat || "(XXX) XXX-XXXX";

  const { initialCountryCode, initialNational } = useMemo(() => {
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith("+")) {
        const found = COUNTRY_CODE_OPTIONS.find((c) => trimmed.startsWith(c.code));
        if (found) {
          const rest = trimmed.slice(found.code.length).trim();
          return { initialCountryCode: found.code, initialNational: rest };
        }
      }
      return { initialCountryCode: "+1", initialNational: trimmed };
    }
    return { initialCountryCode: "+1", initialNational: "" };
  }, [value]);

  const [countryCode, setCountryCode] = useState<string>(initialCountryCode);

  useEffect(() => {
    if (initialCountryCode) setCountryCode(initialCountryCode);
  }, [initialCountryCode]);

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    if (initialNational) {
      const formatted = formatPhoneNumberByMask(initialNational, activeFormat);
      onChange(`${newCode} ${formatted}`);
    } else {
      onChange(newCode);
    }
  };

  const handleNumberChange = (rawInput: string) => {
    const digitsOnly = rawInput.replace(/\D/g, "");
    if (!digitsOnly) {
      onChange("");
      return;
    }
    const formatted = formatPhoneNumberByMask(digitsOnly, activeFormat);
    onChange(showCountryCode ? `${countryCode} ${formatted}` : formatted);
  };

  return (
    <div className={`flex items-center rounded-lg border overflow-hidden transition-all ${borderClass}`}>
      {/* Country Code Selector formatted like US +1 */}
      {showCountryCode && (
        <div className="relative flex items-center bg-slate-50 border-r border-slate-200 shrink-0 max-w-[130px]">
          <select
            value={countryCode}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer truncate"
          >
            {COUNTRY_CODE_OPTIONS.map((c, idx) => (
              <option key={`${c.code}_${c.iso}_${idx}`} value={c.code}>
                {showFlags ? `${c.flag} ` : ""}{c.iso} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
        </div>
      )}

      {/* Phone Number Input with Auto-Formatting */}
      <input
        type="tel"
        value={initialNational}
        disabled={disabled}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder || (activeFormat.includes("X") ? activeFormat.replace(/X/g, "5") : activeFormat)}
        className="w-full px-3 py-1.5 bg-transparent text-xs font-medium text-slate-800 outline-none font-mono"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Interactive Star Rating Component
// ─────────────────────────────────────────────────────────────
interface RatingInputProps {
  maxRating?: number;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
  isAdminDefault?: boolean;
  size?: "sm" | "md";
}

function RatingInput({
  maxRating = 5,
  value,
  onChange,
  disabled = false,
  isAdminDefault = false,
  size = "md",
}: RatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const currentScore = Number(value) || 0;
  const count = Math.max(1, Math.min(20, maxRating));
  const starArray = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <div className="flex items-center gap-1.5 py-0.5 select-none flex-wrap">
      <div className="flex items-center gap-0.5">
        {starArray.map((star) => {
          const isFilled = hoverRating !== null ? star <= hoverRating : star <= currentScore;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange(currentScore === star ? (isAdminDefault ? undefined : 0) : star);
              }}
              onMouseEnter={() => !disabled && setHoverRating(star)}
              onMouseLeave={() => !disabled && setHoverRating(null)}
              className={`p-0.5 transition-transform cursor-pointer ${
                disabled ? "cursor-not-allowed opacity-60" : "hover:scale-115 active:scale-95"
              }`}
              title={`Rate ${star} of ${count}`}
            >
              <Star
                className={`${starSize} transition-colors ${
                  isFilled
                    ? "text-blue-500 fill-blue-500 drop-shadow-xs"
                    : "text-slate-200 fill-slate-50 hover:text-blue-300"
                }`}
              />
            </button>
          );
        })}
      </div>

      <span className={`font-semibold text-slate-600 ml-1 select-none ${size === "sm" ? "text-[11px]" : "text-xs min-w-[45px]"}`}>
        {currentScore > 0
          ? `${currentScore} / ${count}`
          : (isAdminDefault ? "— No Default —" : "Not rated")}
      </span>

      {!disabled && currentScore > 0 && (
        <button
          type="button"
          onClick={() => onChange(isAdminDefault ? undefined : "")}
          className="text-[10px] text-slate-400 hover:text-red-500 hover:underline cursor-pointer ml-1"
          title="Clear rating"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Multi-Select Dropdown Component
// ─────────────────────────────────────────────────────────────
interface MultiSelectDropdownProps {
  options: FieldOption[];
  value: any;
  onChange: (val: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isAdminDefault?: boolean;
  borderClass?: string;
  allowSearch?: boolean;
}

function MultiSelectDropdown({
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  isAdminDefault = false,
  borderClass = "",
  allowSearch = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selected: string[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value
    ? [value]
    : [];

  const toggleOption = (val: string) => {
    if (disabled) return;
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const displayText =
    selectedLabels.length === 0
      ? (isAdminDefault ? "— No Default (Empty) —" : (placeholder || "Select options..."))
      : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.slice(0, 2).join(", ")} (+${selectedLabels.length - 2} more)`;

  const showSearch = allowSearch || options.length > 7;

  const filteredOptions = searchQuery.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setSearchQuery("");
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center justify-between transition-all select-none cursor-pointer ${
            borderClass || "border-slate-200 bg-white"
          } ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "hover:border-slate-300"}`}
        >
          <span
            className={`truncate pr-2 ${
              selected.length > 0 ? "text-slate-800 font-medium" : "text-slate-400"
            }`}
          >
            {displayText}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 z-[100005] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      >
        {showSearch && (
          <div className="p-1.5 border-b border-slate-100 bg-slate-50/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search options..."
              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        )}

        {filteredOptions.length > 3 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={() => onChange(filteredOptions.map((o) => o.value))}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Select All
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-slate-400 hover:text-red-600 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">
              {searchQuery ? "No matching options" : "No options configured"}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <label
                  key={opt.id || opt.value}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? "bg-blue-50 text-blue-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOption(opt.value)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TableInputRendererProps {
  field?: Partial<FieldDefinition>;
  value: any;
  onChange: (val: any) => void;
  mode: FieldRendererMode;
  disabled: boolean;
  recordData?: Record<string, any>;
  isAdminDefault: boolean;
}

function TableInputRenderer({
  field,
  value,
  onChange,
  mode,
  disabled,
  recordData,
  isAdminDefault,
}: TableInputRendererProps) {
  const cols = resolveColumnsOrSubFields(field);
  const defaultTemplateRows: Record<string, any>[] =
    Array.isArray(field?.defaultValue) && field.defaultValue.length > 0
      ? field.defaultValue
      : [];

  const effectiveRows: Record<string, any>[] =
    Array.isArray(value) && value.length > 0
      ? value
      : (mode === "runtime" && defaultTemplateRows.length > 0)
      ? defaultTemplateRows.map((r, i) => ({ ...r, id: r.id || `row_default_${i}_${Date.now()}` }))
      : Array.isArray(value)
      ? value
      : [];

  const rows = effectiveRows;

  const minEntries = typeof field?.minEntries === "number" ? field.minEntries : undefined;
  const maxEntries = typeof field?.maxEntries === "number" ? field.maxEntries : undefined;
  const isMaxReached = maxEntries !== undefined && rows.length >= maxEntries;
  const isMinReached = minEntries !== undefined && rows.length <= minEntries;

  // Sync initial default rows to parent state if client record is empty
  useEffect(() => {
    if (mode === "runtime" && (!value || (Array.isArray(value) && value.length === 0)) && defaultTemplateRows.length > 0) {
      onChange(defaultTemplateRows.map((r, i) => ({ ...r, id: r.id || `row_init_${Date.now()}_${i}` })));
    }
  }, [mode]);

  const handleCellChange = (rIdx: number, colId: string, cellVal: any) => {
    const updated = [...rows];
    updated[rIdx] = { ...updated[rIdx], [colId]: cellVal };
    onChange(updated);
  };

  const handleAddRow = () => {
    if (isMaxReached) return;
    const newRow: Record<string, any> = { id: `row_${Date.now()}` };
    const templateRow = defaultTemplateRows.length > 0 ? defaultTemplateRows[0] : undefined;
    cols.forEach((col) => {
      newRow[col.id] = col.defaultValue ?? (templateRow ? templateRow[col.id] : undefined) ?? "";
    });
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (rIdx: number) => {
    if (isMinReached) return;
    onChange(rows.filter((_, i) => i !== rIdx));
  };

  return (
    <div className="space-y-1.5">
      {rows.length === 0 ? (
        <div className="p-4 text-center border border-slate-200 rounded-xl bg-white shadow-2xs">
          <p className="text-xs text-slate-400">
            {isAdminDefault ? "Table starts empty by default." : "No entries added yet."}
          </p>
          {!disabled && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isMaxReached}
                onClick={handleAddRow}
                className={`text-xs font-semibold flex items-center gap-1 cursor-pointer bg-transparent p-0 ${
                  isMaxReached ? "text-slate-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:underline"
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>{isAdminDefault ? "Pre-seed a Default Row" : "Add Row"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="w-8 px-2.5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    #
                  </th>
                  {cols.map((col) => (
                    <th
                      key={col.id}
                      className="px-3 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider min-w-[120px]"
                    >
                      {col.name}
                    </th>
                  ))}
                  <th className="w-8 px-2 py-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rIdx) => (
                  <tr key={row.id || rIdx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2.5 py-2 text-center text-[10px] font-bold text-slate-400 bg-slate-50/30">
                      {rIdx + 1}
                    </td>
                    {cols.map((col) => (
                      <td key={col.id} className="px-2 py-1.5">
                        <FieldInputRenderer
                          subField={col}
                          value={row[col.id]}
                          onChange={(val) => handleCellChange(rIdx, col.id, val)}
                          mode={mode}
                          disabled={disabled}
                          isSubField={true}
                          recordData={recordData}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      {!disabled && (
                        <button
                          type="button"
                          disabled={isMinReached}
                          onClick={() => handleRemoveRow(rIdx)}
                          className={`p-1 rounded transition-colors ${
                            isMinReached ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-red-600 cursor-pointer"
                          }`}
                          title={isMinReached ? `Minimum ${minEntries} entries required` : "Delete row"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!disabled && (
            <div className="flex items-center justify-between p-2 bg-slate-50/50 border-t border-slate-100">
              <div className="text-[10px] text-slate-400 font-medium">
                {minEntries !== undefined || maxEntries !== undefined ? (
                  <span>
                    Entries: {rows.length} {maxEntries !== undefined ? `/ ${maxEntries}` : ""} {minEntries !== undefined ? `(Min: ${minEntries})` : ""}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={isMaxReached}
                onClick={handleAddRow}
                className={`text-xs font-semibold flex items-center gap-1 bg-transparent p-0 ${
                  isMaxReached ? "text-slate-400 cursor-not-allowed" : "text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                }`}
                title={isMaxReached ? `Maximum ${maxEntries} entries reached` : "Add row"}
              >
                <Plus className="w-3 h-3" />
                <span>{isAdminDefault ? "Pre-seed a Default Row" : isMaxReached ? `Max Reached (${maxEntries})` : "Add Row"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW LIST COMPONENT (Mode 1: Manual List, Mode 2: Option List with Local Overrides)
// ─────────────────────────────────────────────────────────────
interface NewListSelectionItem {
  selectedRowId: string | number;
  primaryValue?: string;
  overrides?: Record<string, any>;
}

interface NewListInputRendererProps {
  field?: Partial<FieldDefinition>;
  subField?: SubFieldConfig;
  value: any;
  onChange: (val: any) => void;
  mode?: FieldRendererMode;
  disabled?: boolean;
  recordData?: Record<string, any>;
  isAdminDefault?: boolean;
  borderClass?: string;
}

function NewListInputRenderer({
  field,
  subField,
  value,
  onChange,
  mode = "runtime",
  disabled = false,
  recordData,
  isAdminDefault = false,
  borderClass = "border-slate-200 bg-white focus:border-blue-500",
}: NewListInputRendererProps) {
  const { getAllFields } = useFieldRegistry();
  const config = field?.newListConfig;
  const sourceMode = config?.sourceMode || "manual";
  const label = subField?.name || field?.label || "List";

  // ─────────────────────────────────────────────────────────────
  // 1. MODE 1 — MANUAL LIST (Exact reuse of List manual options)
  // ─────────────────────────────────────────────────────────────
  if (sourceMode === "manual") {
    const manualType = config?.manualType || (field?.selectionMode === "multiple" ? "multiple" : "single");
    const options: FieldOption[] = field?.options || subField?.options || [];

    if (manualType === "open_list" || field?.listEntryType === "plain_text") {
      const entries: string[] = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] p-2 bg-slate-50/70 border border-slate-200 rounded-lg">
            {entries.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                {isAdminDefault ? "No default entries pre-seeded." : `No ${label.toLowerCase()} added yet.`}
              </span>
            ) : (
              entries.map((item, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-lg shadow-2xs"
                >
                  <span>{String(item)}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => onChange(entries.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          {!disabled && (
            <input
              type="text"
              placeholder={`+ Type ${label.toLowerCase()} and press Enter...`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (!entries.includes(val)) {
                    onChange([...entries, val]);
                  }
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          )}
        </div>
      );
    }

    if (manualType === "multiple" || field?.selectionMode === "multiple" || config?.selectionMode === "multiple") {
      return (
        <MultiSelectDropdown
          options={options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={field?.placeholder || "Select options..."}
          isAdminDefault={isAdminDefault}
          borderClass={borderClass}
          allowSearch={config?.allowSearch}
        />
      );
    }

    // Single Select
    const currentVal = typeof value === "string" ? value : Array.isArray(value) && value.length > 0 ? value[0] : "";
    return (
      <AdminSelect
        value={currentVal}
        disabled={disabled}
        onChange={onChange}
        placeholder={isAdminDefault ? "— No Default (Empty) —" : (field?.placeholder || "Select an option...")}
        options={options.map((opt) => ({
          value: String(opt.value),
          label: opt.label || String(opt.value),
        }))}
        size="sm"
        triggerClassName={borderClass}
        allowSearch={config?.allowSearch}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MODE 2 — OPTION LIST (Linked to Existing Composite Field)
  // ─────────────────────────────────────────────────────────────
  const optionListConfig = config?.optionList;
  const sourceCompositeKey = optionListConfig?.sourceCompositeFieldKey;

  // Retrieve source composite field definition
  const allFields = useMemo(() => {
    try {
      return [
        ...getAllFields(field?.module || "client"),
        ...getAllFields("process"),
        ...getAllFields("service"),
        ...getAllFields("appointment"),
        ...getAllFields("organization"),
      ];
    } catch {
      return [];
    }
  }, [getAllFields, field?.module]);

  const sourceCompositeDef = useMemo(() => {
    if (!sourceCompositeKey) return undefined;
    return allFields.find((f) => f.key === sourceCompositeKey);
  }, [allFields, sourceCompositeKey]);

  const compositeColumns: SubFieldConfig[] = useMemo(() => {
    if (!sourceCompositeDef) return [];
    const baseCols = resolveColumnsOrSubFields(sourceCompositeDef);
    return baseCols.map((col) => {
      const matchedField = allFields.find((f) => 
        f.key === col.id || 
        col.id.startsWith(`col_${f.key}_`) || 
        col.id.startsWith(`col_${f.key}__`) || 
        f.label.toLowerCase() === col.name.toLowerCase()
      );
      if (matchedField) {
        const isMulti = matchedField.inputType === "multiselect" || matchedField.selectionMode === "multiple";
        return {
          ...col,
          inputType: isMulti ? "multiselect" : (col.inputType || (matchedField.inputType as SubFieldInputType)),
          options: (col.options && col.options.length > 0) ? col.options : matchedField.options,
          selectionMode: isMulti ? "multiple" : (matchedField.selectionMode || col.selectionMode),
          currency: col.currency || matchedField.currency,
          crmBindConfig: col.crmBindConfig || matchedField.crmBindConfig,
          listBindConfig: col.listBindConfig || matchedField.listBindConfig,
        };
      }
      return col;
    });
  }, [sourceCompositeDef, allFields]);

  const columnConfigs: OptionListColumnConfig[] = optionListConfig?.columns || [];
  const primaryColConfig =
    columnConfigs.find((c) => c.isPrimary) ||
    columnConfigs[0] ||
    (compositeColumns[0] ? { columnId: compositeColumns[0].id, isPrimary: true } : undefined);
  const primaryColId = primaryColConfig?.columnId || compositeColumns[0]?.id;
  const primaryColName =
    primaryColConfig?.columnName ||
    compositeColumns.find((c) => c.id === primaryColId)?.name ||
    "Primary Option";

  // Retrieve all rows from the source composite or field-defined options
  const sourceRows: Record<string, any>[] = useMemo(() => {
    let rows: Record<string, any>[] = [];

    // 0. Primary source: Options directly configured on this Option List field
    if (field?.options && Array.isArray(field.options) && field.options.length > 0) {
      rows = field.options.map((opt, idx) => {
        if (typeof opt.value === "object" && opt.value !== null) {
          return {
            id: String(opt.id || `opt_${idx + 1}`),
            [primaryColId]: opt.label || opt.value[primaryColId] || "",
            ...opt.value,
          };
        }
        return {
          id: String(opt.id || `opt_${idx + 1}`),
          [primaryColId]: opt.label || String(opt.value || ""),
        };
      });
      if (rows.length > 0) return rows;
    }

    // 1. In-memory record data
    if (recordData && sourceCompositeKey && Array.isArray(recordData[sourceCompositeKey]) && recordData[sourceCompositeKey].length > 0) {
      rows = recordData[sourceCompositeKey];
    }
    // 2. Default template rows configured in field definition
    else if (sourceCompositeDef?.defaultValue) {
      if (Array.isArray(sourceCompositeDef.defaultValue)) {
        rows = sourceCompositeDef.defaultValue.filter((item): item is Record<string, any> => typeof item === "object" && item !== null);
      } else if (typeof sourceCompositeDef.defaultValue === "object" && sourceCompositeDef.defaultValue !== null) {
        rows = [sourceCompositeDef.defaultValue as Record<string, any>];
      }
    }

    // 3. Fallback: Check sessionStorage if available
    if (rows.length === 0 && sourceCompositeKey) {
      const storageKeys = ["clients", "processes", "services", "organizations", "team_members"];
      for (const sKey of storageKeys) {
        try {
          const raw = sessionStorage.getItem(sKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const rec of parsed) {
                if (rec && Array.isArray(rec[sourceCompositeKey]) && rec[sourceCompositeKey].length > 0) {
                  rows = rec[sourceCompositeKey];
                  break;
                }
              }
            }
          }
          if (rows.length > 0) break;
        } catch {}
      }
    }

    // 4. Default seed rows for known medical/general scenarios if empty
    if (rows.length === 0 && compositeColumns.length > 0) {
      const medCol = compositeColumns.find((c) => c.name.toLowerCase().includes("med") || c.id.toLowerCase().includes("med"))?.id || primaryColId || "col_1";
      const saltCol = compositeColumns.find((c) => c.name.toLowerCase().includes("salt") || c.id.toLowerCase().includes("salt"))?.id || "col_2";
      const dosageCol = compositeColumns.find((c) => c.name.toLowerCase().includes("dose") || c.name.toLowerCase().includes("dosage") || c.id.toLowerCase().includes("dose"))?.id || "col_3";
      rows = [
        { id: "med_1", [medCol]: "Amoxicillin 500mg", [saltCol]: "Amoxicillin Trihydrate", [dosageCol]: "1 tablet 3x daily after meals" },
        { id: "med_2", [medCol]: "Paracetamol 650mg", [saltCol]: "Acetaminophen", [dosageCol]: "1 tablet every 6 hours SOS" },
        { id: "med_3", [medCol]: "Metformin 500mg", [saltCol]: "Metformin Hydrochloride", [dosageCol]: "1 tablet twice daily with food" },
        { id: "med_4", [medCol]: "Atorvastatin 20mg", [saltCol]: "Atorvastatin Calcium", [dosageCol]: "1 tablet at bedtime" },
        { id: "med_5", [medCol]: "Pantoprazole 40mg", [saltCol]: "Pantoprazole Sodium", [dosageCol]: "1 tablet once daily before breakfast" },
      ];
    }

    return rows;
  }, [field?.options, recordData, sourceCompositeKey, sourceCompositeDef, compositeColumns, primaryColId]);

  // Dropdown options built from Primary column
  const options = useMemo(() => {
    let list = sourceRows.map((r, i) => {
      const rowId = String(r.id || r.key || `row_${i + 1}`);
      const primaryVal = String(r[primaryColId] || r.name || r.title || r.label || `Option #${i + 1}`);

      // Preview from other non-primary columns
      const secondaryParts: string[] = [];
      for (const col of compositeColumns) {
        if (col.id !== primaryColId && r[col.id] !== undefined && r[col.id] !== "") {
          secondaryParts.push(`${col.name}: ${r[col.id]}`);
        }
      }

      return {
        value: rowId,
        label: primaryVal,
        subtitle: secondaryParts.slice(0, 2).join(" • "),
        row: r,
      };
    });

    const sortOrder = config?.sortOrder;
    if (sortOrder === "alphabetical_asc") {
      list.sort((a, b) => a.label.localeCompare(b.label));
    } else if (sortOrder === "alphabetical_desc") {
      list.sort((a, b) => b.label.localeCompare(a.label));
    } else if (sortOrder === "recent") {
      list.reverse();
    }
    return list;
  }, [sourceRows, primaryColId, compositeColumns, config?.sortOrder]);

  const isMultiple = config?.selectionMode === "multiple" || field?.selectionMode === "multiple";

  // Normalize single/multiple values
  // Shape: Array<{ selectedRowId, primaryValue, overrides: Record<string, any> }>
  const normalizedSelection: NewListSelectionItem[] = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            selectedRowId: item.selectedRowId ?? item.id ?? item.value ?? "",
            primaryValue: item.primaryValue ?? item.label ?? "",
            overrides: item.overrides || {},
          };
        }
        return { selectedRowId: String(item), overrides: {} };
      }).filter((item) => item.selectedRowId !== "");
    }
    if (typeof value === "object" && value !== null) {
      if (value.selectedRowId !== undefined) {
        return [{
          selectedRowId: value.selectedRowId,
          primaryValue: value.primaryValue,
          overrides: value.overrides || {},
        }];
      }
      return [];
    }
    if (typeof value === "string" || typeof value === "number") {
      return [{ selectedRowId: String(value), overrides: {} }];
    }
    return [];
  }, [value]);

  // Handle single-select selection
  const handleSingleSelectChange = (selectedId: string) => {
    if (!selectedId) {
      onChange(isAdminDefault ? undefined : null);
      return;
    }
    const foundOpt = options.find((o) => o.value === selectedId);
    const item: NewListSelectionItem = {
      selectedRowId: selectedId,
      primaryValue: foundOpt?.label || "",
      overrides: {},
    };
    onChange(item);
  };

  // Handle multi-select add row
  const handleMultiAddRow = (selectedId: string) => {
    if (!selectedId) return;
    const exists = normalizedSelection.some((item) => String(item.selectedRowId) === String(selectedId));
    if (exists) return;

    const foundOpt = options.find((o) => o.value === selectedId);
    const newItem: NewListSelectionItem = {
      selectedRowId: selectedId,
      primaryValue: foundOpt?.label || "",
      overrides: {},
    };
    onChange([...normalizedSelection, newItem]);
  };

  // Handle removing a row in multi-select or single
  const handleRemoveRow = (idxToRemove: number) => {
    if (isMultiple) {
      onChange(normalizedSelection.filter((_, i) => i !== idxToRemove));
    } else {
      onChange(isAdminDefault ? undefined : null);
    }
  };

  // Handle column override change on selected item
  // LOCAL OVERRIDE ONLY: does not mutate sourceRows or shared composite
  const handleColumnOverrideChange = (itemIdx: number, columnId: string, newVal: any) => {
    if (isMultiple) {
      const updatedList = [...normalizedSelection];
      const target = updatedList[itemIdx];
      if (!target) return;
      updatedList[itemIdx] = {
        ...target,
        overrides: {
          ...(target.overrides || {}),
          [columnId]: newVal,
        },
      };
      onChange(updatedList);
    } else {
      const current = normalizedSelection[0] || { selectedRowId: "", overrides: {} };
      const updated: NewListSelectionItem = {
        ...current,
        overrides: {
          ...(current.overrides || {}),
          [columnId]: newVal,
        },
      };
      onChange(updated);
    }
  };

  // Helper to render an individual selected Record / Medicine Block
  const renderRecordBlock = (item: NewListSelectionItem, itemIdx: number) => {
    const sourceRow = sourceRows.find((r) => String(r.id || r.key) === String(item.selectedRowId));
    const isDeletedFromSource = !sourceRow;

    const displayPrimaryVal =
      item.primaryValue ||
      (sourceRow ? String(sourceRow[primaryColId] || sourceRow.name || sourceRow.label || item.selectedRowId) : String(item.selectedRowId));

    return (
      <div
        key={`${item.selectedRowId}_${itemIdx}`}
        className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
      >
        {/* Block Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate block">
                {displayPrimaryVal}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {primaryColName} • ID: {String(item.selectedRowId)}
              </span>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={() => handleRemoveRow(itemIdx)}
              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-colors shrink-0"
              title="Remove selection"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Graceful Deleted Fallback Banner */}
        {isDeletedFromSource && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold">Source row no longer exists in composite.</span>
              <span className="text-amber-700 block text-[10px]">
                Preserving local saved record overrides.
              </span>
            </div>
          </div>
        )}

        {/* Associated Columns Render */}
        <div className="grid grid-cols-2 gap-2.5">
          {compositeColumns.map((col) => {
            const colCfg = columnConfigs.find((c) => c.columnId === col.id) || {
              columnId: col.id,
              isPrimary: col.id === primaryColId,
              isDisable: false,
              isEditable: col.id !== primaryColId,
            };

            const isPrimary = Boolean(colCfg.isPrimary);
            const isColDisabled = Boolean(colCfg.isDisable);
            const isColEditable = Boolean(colCfg.isEditable);

            // Value resolution: local override layered on top of source row
            const baseRowVal = sourceRow ? sourceRow[col.id] : "";
            const overrideVal = item.overrides?.[col.id];
            const hasOverride = overrideVal !== undefined && overrideVal !== baseRowVal;
            const currentVal = overrideVal !== undefined ? overrideVal : (baseRowVal ?? "");

            return (
              <div key={col.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 truncate">
                    <span className="truncate">{col.name}</span>
                    {isPrimary && (
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded font-normal lowercase shrink-0">
                        primary
                      </span>
                    )}
                  </label>
                  {isColDisabled && (
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5 shrink-0" title="Locked by admin">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                  {hasOverride && isColEditable && (
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 shrink-0" title="Custom override for this record">
                      <Edit3 className="w-2.5 h-2.5" /> Overridden
                    </span>
                  )}
                </div>

                {isColDisabled || disabled ? (
                  // Locked / Greyed-Out Read-Only Field
                  <div className="px-2.5 py-1.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium select-none truncate">
                    {currentVal !== undefined && currentVal !== "" 
                      ? (Array.isArray(currentVal) ? currentVal.join(", ") : String(currentVal)) 
                      : <span className="text-slate-400 italic">—</span>}
                  </div>
                ) : (
                  // Editable Field (Stored as local override)
                  <FieldInputRenderer
                    subField={col}
                    value={currentVal}
                    disabled={disabled}
                    onChange={(val) => handleColumnOverrideChange(itemIdx, col.id, val)}
                    isSubField={true}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // If no source composite is configured
  if (!sourceCompositeKey) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
        {isAdminDefault ? "No composite field linked yet." : "Please configure a source composite field in admin."}
      </div>
    );
  }

  // ── MULTI-SELECT OPTION LIST ──
  if (isMultiple) {
    return (
      <div className="space-y-3">
        {/* Dropdown to Pick and Add Row Blocks */}
        {!disabled && (
          <div>
            <AdminSelect
              value=""
              disabled={disabled}
              onChange={(val) => {
                if (val) handleMultiAddRow(val);
              }}
              placeholder={`+ Select ${label} (${primaryColName}) to add...`}
              options={[
                { value: "", label: `— Choose ${label} (${primaryColName}) —` },
                ...options
                  .filter((opt) => !normalizedSelection.some((item) => String(item.selectedRowId) === String(opt.value)))
                  .map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                    subtitle: opt.subtitle,
                  })),
              ]}
              size="sm"
              triggerClassName={borderClass}
              allowSearch={config?.allowSearch}
            />
          </div>
        )}

        {/* Selected Record Blocks List */}
        {normalizedSelection.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
            <p className="text-xs text-slate-400 font-medium">
              {isAdminDefault
                ? "No default items selected."
                : `No ${label.toLowerCase()} selected. Pick an option above to populate associated columns.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {normalizedSelection.map((item, idx) => renderRecordBlock(item, idx))}
          </div>
        )}
      </div>
    );
  }

  // ── SINGLE-SELECT OPTION LIST ──
  const singleSelected = normalizedSelection[0];

  return (
    <div className="space-y-3">
      {/* Dropdown Selector */}
      <AdminSelect
        value={singleSelected ? String(singleSelected.selectedRowId) : ""}
        disabled={disabled}
        onChange={(val) => handleSingleSelectChange(val)}
        placeholder={isAdminDefault ? "— No Default (Empty) —" : `Select ${label} (${primaryColName})...`}
        options={[
          { value: "", label: "— Clear Selection —" },
          ...options.map((opt) => ({
            value: opt.value,
            label: opt.label,
            subtitle: opt.subtitle,
          })),
        ]}
        size="sm"
        triggerClassName={borderClass}
        allowSearch={config?.allowSearch}
      />

      {/* Populated Associated Column Block */}
      {singleSelected && singleSelected.selectedRowId && renderRecordBlock(singleSelected, 0)}
    </div>
  );
}

export function FieldInputRenderer({
  field,
  subField,
  value,
  onChange,
  mode = "runtime",
  disabled = false,
  isSubField = false,
  recordData,
}: FieldInputRendererProps) {
  // Resolve effective metadata
  const rawType = subField?.inputType || field?.inputType || "text";
  const effectiveType: FieldInputType = (rawType === "group_repeatable" ? "list_open" : rawType) as FieldInputType;
  const effectiveOptions: FieldOption[] = subField?.options || field?.options || [];
  const effectiveListBindConfig = subField?.listBindConfig || field?.listBindConfig;
  const effectiveListConfig = field?.listConfig;
  const { options: dynamicOptions } = useDynamicListOptions(effectiveListBindConfig, effectiveOptions, recordData, effectiveListConfig);
  const effectiveCrmConfig: CrmBindConfig | undefined = subField?.crmBindConfig || field?.crmBindConfig;
  const label: string = subField?.name || field?.label || "Field";
  const effectivePlaceholder: string =
    subField?.placeholder ||
    field?.placeholder ||
    (mode === "admin_default" ? "Set default value..." : getSuggestedPlaceholderForType(effectiveType, label));

  // Mode-based styling tokens
  const isAdminDefault = mode === "admin_default";
  const borderClass = isAdminDefault
    ? "border-blue-300/80 bg-blue-50/20 focus:border-blue-500"
    : "border-slate-200 bg-white focus:border-blue-500";

  // ─────────────────────────────────────────────────────────────
  // 1. CRM BIND
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "crm_bind") {
    return (
      <CrmBindInput
        config={effectiveCrmConfig}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={effectivePlaceholder}
        isAdminDefault={isAdminDefault}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1.5. NEW LIST (Manual List OR Option List with local overrides)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "new_list") {
    return (
      <NewListInputRenderer
        field={field}
        subField={subField}
        value={value}
        onChange={onChange}
        mode={mode}
        disabled={disabled}
        recordData={recordData}
        isAdminDefault={isAdminDefault}
        borderClass={borderClass}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LIST SELECT (Single or Multiple)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "list_select" || effectiveType === "select" || effectiveType === "multiselect" || effectiveType === "list") {
    const isMultiple = subField?.selectionMode === "multiple" || field?.selectionMode === "multiple" || effectiveType === "multiselect";

    if (isMultiple) {
      return (
        <MultiSelectDropdown
          options={dynamicOptions}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={effectivePlaceholder}
          isAdminDefault={isAdminDefault}
          borderClass={borderClass}
          allowSearch={effectiveListConfig?.allowSearch}
        />
      );
    }

    // Single select mode
    const currentSingleVal = typeof value === "string" ? value : Array.isArray(value) && value.length > 0 ? value[0] : "";
    return (
      <AdminSelect
        value={currentSingleVal}
        disabled={disabled}
        onChange={(val) => onChange(val)}
        placeholder={isAdminDefault ? "— No Default (Empty) —" : (effectivePlaceholder || "Select an option...")}
        options={dynamicOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
          subtitle: (opt as any).subtitle,
        }))}
        size="sm"
        triggerClassName={borderClass}
        allowSearch={effectiveListConfig?.allowSearch}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. OPEN LIST (Plain Text Tags OR Structured Sub-Fields)
  // ─────────────────────────────────────────────────────────────
  if ((effectiveType === "list_open" || effectiveType === "group_repeatable") && !isSubField) {
    const childFields: SubFieldConfig[] = resolveColumnsOrSubFields(field);
    const minEntries = typeof field?.minEntries === "number" ? field.minEntries : undefined;
    const maxEntries = typeof field?.maxEntries === "number" ? field.maxEntries : undefined;

    // Structured open list mode (cards with sub-fields - verified repeatable UI)
    let instances: Record<string, any>[] = [];
    if (Array.isArray(value)) {
      instances = value;
    } else if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) instances = parsed;
      } catch {
        instances = [];
      }
    }

    const isMaxReached = maxEntries !== undefined && instances.length >= maxEntries;
    const isMinReached = minEntries !== undefined && instances.length <= minEntries;

    return (
      <div className="space-y-3">
        {instances.length === 0 ? (
          <div className="py-3 px-3.5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
            <p className="text-xs text-slate-400 font-medium">
              {isAdminDefault
                ? "No default instances pre-seeded. New records will start empty."
                : `No ${label.toLowerCase()} added yet. Click "Add Entry" below to add one.`}
            </p>
          </div>
        ) : (
          instances.map((instance, idx) => (
            <div
              key={instance.id || `inst_${idx}`}
              className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-bold text-slate-800">
                    {label} #{idx + 1}
                  </span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    disabled={isMinReached}
                    onClick={() => {
                      if (!isMinReached) {
                        onChange(instances.filter((_, i) => i !== idx));
                      }
                    }}
                    className={`p-1 rounded transition-colors ${
                      isMinReached ? "text-slate-200 cursor-not-allowed" : "text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    }`}
                    title={isMinReached ? `Minimum ${minEntries} entries required` : `Remove ${label} #${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {childFields.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No sub-fields configured for this open list.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {childFields.map((child) => (
                    <div key={child.id} className="space-y-1">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {child.name} {child.required && <span className="text-red-500">*</span>}
                      </label>
                      <FieldInputRenderer
                        subField={child}
                        value={instance[child.id] ?? (isAdminDefault ? child.defaultValue : undefined)}
                        onChange={(childVal) => {
                          const updated = [...instances];
                          updated[idx] = { ...updated[idx], [child.id]: childVal };
                          onChange(updated);
                        }}
                        mode={mode}
                        disabled={disabled}
                        isSubField={true}
                        recordData={recordData}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {!disabled && (
          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-slate-400 font-medium">
              {minEntries !== undefined || maxEntries !== undefined ? (
                <span>
                  Entries: {instances.length} {maxEntries !== undefined ? `/ ${maxEntries}` : ""} {minEntries !== undefined ? `(Min: ${minEntries})` : ""}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isMaxReached}
              onClick={() => {
                if (isMaxReached) return;
                const newInstance: Record<string, any> = {
                  id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                };
                childFields.forEach((c) => {
                  newInstance[c.id] = c.defaultValue ?? "";
                });
                onChange([...instances, newInstance]);
              }}
              className={`py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                isMaxReached ? "text-slate-400 cursor-not-allowed opacity-50" : "text-slate-700 cursor-pointer"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdminDefault && instances.length === 0 ? "Pre-seed a Default Entry" : isMaxReached ? `Max Reached (${maxEntries})` : "Add Entry"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 4. GROUP (Single Instance)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "group" && !isSubField) {
    const childFields: SubFieldConfig[] = resolveColumnsOrSubFields(field);
    const groupData: Record<string, any> = (value && typeof value === "object" && !Array.isArray(value)) ? value : {};

    return (
      <div className={`p-3.5 rounded-xl border space-y-3 ${isAdminDefault ? "bg-blue-50/20 border-blue-200" : "bg-white border-slate-200 shadow-2xs"}`}>
        {isAdminDefault && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 pb-1 border-b border-blue-100">
            <Layers className="w-3.5 h-3.5" />
            <span>Group Sub-Field Default Values</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {childFields.map((child) => (
            <div key={child.id} className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                {child.name} {child.required && <span className="text-red-500">*</span>}
              </label>
              <FieldInputRenderer
                subField={child}
                value={groupData[child.id] ?? (isAdminDefault ? child.defaultValue : undefined)}
                onChange={(childVal) => {
                  onChange({ ...groupData, [child.id]: childVal });
                }}
                mode={mode}
                disabled={disabled}
                isSubField={true}
                recordData={recordData}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 6. TABLE (Matrix / Grid with Typed Columns)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "table" && !isSubField) {
    return (
      <TableInputRenderer
        field={field}
        value={value}
        onChange={onChange}
        mode={mode}
        disabled={disabled}
        recordData={recordData}
        isAdminDefault={isAdminDefault}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 7. PRIMITIVES (Text, Number, Money, Date, Yes/No, etc.)
  // ─────────────────────────────────────────────────────────────
  // Rich text — full toolbar editor
  if (effectiveType === "richtext") {
    return (
      <RichTextEditor
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        placeholder={effectivePlaceholder}
        disabled={disabled}
        isAdminDefault={isAdminDefault}
        minRows={isAdminDefault ? 2 : 4}
      />
    );
  }

  // Plain textarea (long text / multi-line)
  if (effectiveType === "textarea") {
    return (
      <textarea
        rows={isAdminDefault ? 2 : 3}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={effectivePlaceholder}
        className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 transition-all ${borderClass}`}
      />
    );
  }

  if (effectiveType === "yes_no") {
    const isYes = value === true || value === "yes" || value === "true";
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isYes ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            value !== undefined && !isYes ? "bg-slate-700 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          No
        </button>
      </div>
    );
  }

  if (effectiveType === "number") {
    const numConfig = subField?.numberConfig || field?.numberConfig;
    const min = numConfig?.min;
    const max = numConfig?.max;

    const numVal = typeof value === "number" ? value : (value !== "" && value !== undefined && value !== null && !isNaN(Number(value)) ? Number(value) : undefined);
    const isOutOfRange = numVal !== undefined && ((min !== undefined && numVal < min) || (max !== undefined && numVal > max));

    const handleNumberChange = (raw: string) => {
      if (raw === "") {
        onChange("");
        return;
      }
      const parsed = Number(raw);
      if (isNaN(parsed)) {
        onChange(raw);
        return;
      }
      // If max is set and user entered value exceeding max, clamp it directly
      if (max !== undefined && parsed > max) {
        onChange(max);
        return;
      }
      onChange(parsed);
    };

    const handleNumberBlur = () => {
      if (numVal !== undefined) {
        if (min !== undefined && numVal < min) {
          onChange(min);
        } else if (max !== undefined && numVal > max) {
          onChange(max);
        }
      }
    };

    return (
      <div className="space-y-1">
        <input
          type="number"
          value={typeof value === "number" ? value : value ?? ""}
          disabled={disabled}
          min={min}
          max={max}
          onChange={(e) => handleNumberChange(e.target.value)}
          onBlur={handleNumberBlur}
          placeholder={effectivePlaceholder || (min !== undefined && max !== undefined ? `${min} - ${max}` : "Enter number")}
          className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 transition-all ${
            isOutOfRange
              ? "border-red-500 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
              : `focus:ring-blue-500 ${borderClass}`
          }`}
        />
        {(min !== undefined || max !== undefined) && (
          <p className={`text-[10px] ${isOutOfRange ? "text-red-500 font-semibold" : "text-slate-400"}`}>
            {isOutOfRange
              ? `⚠️ Value must be between ${min ?? "–"} and ${max ?? "–"} (Current: ${numVal})`
              : `Allowed range: ${min ?? "–"} to ${max ?? "–"}`}
          </p>
        )}
      </div>
    );
  }

  if (effectiveType === "money") {
    const currencyCode = subField?.currency || field?.currency || "INR";
    const currencySym = CURRENCY_SYMBOLS[currencyCode] || currencyCode || "₹";
    return (
      <div className="relative flex items-center">
        <span className="text-xs font-semibold text-slate-500 absolute left-2.5 pointer-events-none select-none">
          {currencySym}
        </span>
        <input
          type="number"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={effectivePlaceholder}
          className={`w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
        />
      </div>
    );
  }

  if (effectiveType === "date" || effectiveType === "date_time" || effectiveType === "time") {
    const isTimeOnly = effectiveType === "time" || field?.dateConfig?.capture === "time" || subField?.dateConfig?.capture === "time" || (field as any)?.dateTimeCapture === "time";
    const isDateOnly = effectiveType === "date" || field?.dateConfig?.capture === "date" || subField?.dateConfig?.capture === "date" || (field as any)?.dateTimeCapture === "date";
    const minDate = field?.dateConfig?.minDate || subField?.dateConfig?.minDate;
    const maxDate = field?.dateConfig?.maxDate || subField?.dateConfig?.maxDate;
    const inputHtmlType = isTimeOnly ? "time" : isDateOnly ? "date" : "datetime-local";

    return (
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          {isTimeOnly ? (
            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          )}
          <input
            type={inputHtmlType}
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            min={minDate}
            max={maxDate}
            onChange={(e) => onChange(e.target.value)}
            placeholder={effectivePlaceholder}
            className={`w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
          />
        </div>
        {(minDate || maxDate) && (
          <p className="text-[10px] text-slate-400">
            Allowed bounds: {minDate ?? "–"} to {maxDate ?? "–"}
          </p>
        )}
      </div>
    );
  }

  if (effectiveType === "link" || effectiveType === "whatsapp_link") {
    return (
      <div className="relative flex items-center">
        <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="url"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder || "https://..."}
          className={`w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
        />
      </div>
    );
  }

  if (effectiveType === "email") {
    return (
      <div className="relative flex items-center">
        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="email"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder || "email@example.com"}
          className={`w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
        />
      </div>
    );
  }

  if (effectiveType === "tel") {
    const effectivePhoneConfig = subField?.phoneConfig || field?.phoneConfig;
    return (
      <PhoneInputRenderer
        config={effectivePhoneConfig}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={effectivePlaceholder}
        isAdminDefault={isAdminDefault}
        borderClass={borderClass}
      />
    );
  }

  if (effectiveType === "rating") {
    const maxRating = Number(subField?.maxRating || field?.maxRating) || 5;
    return (
      <RatingInput
        maxRating={maxRating}
        value={value}
        onChange={onChange}
        disabled={disabled}
        isAdminDefault={isAdminDefault}
        size={isSubField ? "sm" : "md"}
      />
    );
  }

  if (effectiveType === "file") {
    const mediaConfig = subField?.mediaConfig || field?.mediaConfig;
    const formats = mediaConfig?.acceptedFormats && mediaConfig.acceptedFormats.length > 0
      ? mediaConfig.acceptedFormats.join(", ")
      : "PDF, DOCX, JPG, PNG";
    const maxMB = mediaConfig?.maxFileSizeMB || 10;
    const isMultiple = mediaConfig?.allowMultiple;

    return (
      <div className={`p-2.5 border-2 border-dashed rounded-xl text-center transition-all ${borderClass}`}>
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          <span>{value ? String(value) : (isAdminDefault ? "— Default Attachment Upload —" : (effectivePlaceholder || "Upload file or attachment"))}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {formats} (Max {maxMB}MB{isMultiple ? ", Multiple files" : ""})
        </p>
      </div>
    );
  }

  // Fallback: standard Text input
  return (
    <input
      type="text"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={effectivePlaceholder}
      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 transition-all ${borderClass}`}
    />
  );
}

// ─── CRM Bind Dedicated Input Helper ──────────────────────────────────────────
function CrmBindInput({
  config,
  value,
  onChange,
  disabled,
  placeholder,
  isAdminDefault,
}: {
  config?: CrmBindConfig;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
  placeholder?: string;
  isAdminDefault?: boolean;
}) {
  const { options, loading } = useCrmBindOptions(config);
  const isMultiple = config?.selectionMode === "multiple";

  if (loading) {
    return (
      <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 italic">
        Loading live CRM records...
      </div>
    );
  }

  if (isMultiple) {
    const selectedIds: string[] = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];

    const handleToggle = (id: string) => {
      if (disabled) return;
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((i) => i !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    };

    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 min-h-[34px] p-1.5 bg-slate-50/70 border border-slate-200 rounded-lg">
          {options.length === 0 ? (
            <span className="text-xs text-slate-400 italic px-1">No live records found in this module</span>
          ) : (
            options.map((opt) => {
              const isSelected = selectedIds.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggle(opt.value)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <span>{opt.label}</span>
                  {opt.subtitle && <span className="opacity-75 text-[10px]">({opt.subtitle})</span>}
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Single mode
  const currentVal = typeof value === "string" ? value : "";

  return (
    <AdminSelect
      value={currentVal}
      disabled={disabled}
      onChange={(val) => onChange(val)}
      placeholder={isAdminDefault ? "— No Default (Select on Record) —" : (placeholder || "Select bound record...")}
      options={options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        subtitle: opt.subtitle,
      }))}
      size="sm"
    />
  );
}
