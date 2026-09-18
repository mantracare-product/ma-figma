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
} from "lucide-react";
import type {
  FieldDefinition,
  SubFieldConfig,
  FieldOption,
  CrmBindConfig,
  FieldInputType,
} from "../../context/FieldRegistryContext";
import { resolveColumnsOrSubFields, CURRENCY_SYMBOLS, getSuggestedPlaceholderForType } from "../../context/FieldRegistryContext";
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
    const newRow: Record<string, any> = { id: `row_${Date.now()}` };
    const templateRow = defaultTemplateRows.length > 0 ? defaultTemplateRows[0] : undefined;
    cols.forEach((col) => {
      newRow[col.id] = col.defaultValue ?? (templateRow ? templateRow[col.id] : undefined) ?? "";
    });
    onChange([...rows, newRow]);
  };

  const handleRemoveRow = (rIdx: number) => {
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
                onClick={handleAddRow}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer bg-transparent p-0"
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
                          onClick={() => handleRemoveRow(rIdx)}
                          className="p-1 text-slate-300 hover:text-red-600 rounded cursor-pointer"
                          title="Delete row"
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
            <div className="flex justify-end p-2 bg-slate-50/50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer bg-transparent p-0"
              >
                <Plus className="w-3 h-3" />
                <span>Add Row</span>
              </button>
            </div>
          )}
        </div>
      )}
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
    const isStructured =
      effectiveType === "group_repeatable" ||
      field?.listEntryType === "structured" ||
      (field as any)?.entryType === "structured" ||
      (childFields.length > 0 && field?.listEntryType !== "plain_text");

    if (!isStructured) {
      // Plain text tags/items mode
      const entries: string[] = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 min-h-[34px] p-2 bg-slate-50/70 border border-slate-200 rounded-lg">
            {entries.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                {isAdminDefault
                  ? "No default entries pre-seeded. Add entries below if you want new records to start with them."
                  : `No ${label.toLowerCase()} added yet.`}
              </span>
            ) : (
              entries.map((item: string, idx: number) => (
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

    return (
      <div className="space-y-3">
        {instances.length === 0 ? (
          <div className="py-3 px-3.5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
            <p className="text-xs text-slate-400 font-medium">
              {isAdminDefault
                ? "No default instances pre-seeded. New records will start empty."
                : `No ${label.toLowerCase()} added yet. Click "+ Add Another ${label}" below to add one.`}
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
                    onClick={() => onChange(instances.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer transition-colors"
                    title={`Remove ${label} #${idx + 1}`}
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
          <button
            type="button"
            onClick={() => {
              const newInstance: Record<string, any> = {
                id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              };
              childFields.forEach((c) => {
                newInstance[c.id] = c.defaultValue ?? "";
              });
              onChange([...instances, newInstance]);
            }}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another {label}
          </button>
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
    return (
      <input
        type="number"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={effectivePlaceholder}
        className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
      />
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
    const isTimeOnly = effectiveType === "time" || field?.dateConfig?.capture === "time" || (field as any)?.dateTimeCapture === "time";
    const isDateOnly = effectiveType === "date" || field?.dateConfig?.capture === "date" || (field as any)?.dateTimeCapture === "date";
    const inputHtmlType = isTimeOnly ? "time" : isDateOnly ? "date" : "datetime-local";

    return (
      <div className="relative flex items-center">
        <input
          type={inputHtmlType}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder}
          className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
        />
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
    return (
      <div className="relative flex items-center">
        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="tel"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={effectivePlaceholder || "+1 (555) 000-0000"}
          className={`w-full pl-7 pr-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 ${borderClass}`}
        />
      </div>
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
