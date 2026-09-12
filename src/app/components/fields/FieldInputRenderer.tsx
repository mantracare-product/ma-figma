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
} from "lucide-react";
import type {
  FieldDefinition,
  SubFieldConfig,
  FieldOption,
  CrmBindConfig,
  FieldInputType,
} from "../../context/FieldRegistryContext";
import { resolveColumnsOrSubFields, CURRENCY_SYMBOLS } from "../../context/FieldRegistryContext";
import { useCrmBindOptions } from "./useCrmBindOptions";
import { RichTextEditor } from "./RichTextEditor";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";

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
}

function MultiSelectDropdown({
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  isAdminDefault = false,
  borderClass = "",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 z-[9999] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      >
        {options.length > 3 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
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
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">
              No options configured
            </div>
          ) : (
            options.map((opt) => {
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

export function FieldInputRenderer({
  field,
  subField,
  value,
  onChange,
  mode = "runtime",
  disabled = false,
  isSubField = false,
}: FieldInputRendererProps) {
  // Resolve effective metadata
  const effectiveType: FieldInputType = (subField?.inputType || field?.inputType || "text") as FieldInputType;
  const effectiveOptions: FieldOption[] = subField?.options || field?.options || [];
  const effectiveCrmConfig: CrmBindConfig | undefined = subField?.crmBindConfig || field?.crmBindConfig;
  const effectivePlaceholder: string =
    subField?.placeholder ||
    field?.placeholder ||
    (mode === "admin_default" ? "Set default value..." : "Enter value...");
  const label: string = subField?.name || field?.label || "Field";

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
  if (effectiveType === "list_select" || effectiveType === "select" || effectiveType === "multiselect") {
    const isMultiple = subField?.selectionMode === "multiple" || field?.selectionMode === "multiple" || effectiveType === "multiselect";

    if (isMultiple) {
      return (
        <MultiSelectDropdown
          options={effectiveOptions}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={effectivePlaceholder}
          isAdminDefault={isAdminDefault}
          borderClass={borderClass}
        />
      );
    }

    // Single select mode
    return (
      <select
        value={typeof value === "string" ? value : Array.isArray(value) && value.length > 0 ? value[0] : ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${borderClass} ${
          disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""
        }`}
      >
        <option value="">{isAdminDefault ? "— No Default (Empty) —" : "Select an option..."}</option>
        {effectiveOptions.map((opt) => (
          <option key={opt.id} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. OPEN LIST (User adds dynamic entries)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "list_open" && !isSubField) {
    const childFields = resolveColumnsOrSubFields(field);
    const isStructured = field?.listEntryType === "structured" && childFields.length > 0;
    const entries: any[] = Array.isArray(value) ? value : [];

    if (!isStructured) {
      // Plain text tags/items mode
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

    // Structured open list mode (cards with sub-fields)
    return (
      <div className="space-y-2.5">
        {entries.map((row: any, rIdx: number) => (
          <div
            key={row.id || rIdx}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 relative group"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                {label} #{rIdx + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = entries.filter((_, i) => i !== rIdx);
                    onChange(updated);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                  title="Remove entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {childFields.map((child) => (
                <div key={child.id} className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    {child.name} {child.required && <span className="text-red-500">*</span>}
                  </label>
                  <FieldInputRenderer
                    subField={child}
                    value={row[child.id] ?? (isAdminDefault ? child.defaultValue : undefined)}
                    onChange={(childVal) => {
                      const updated = [...entries];
                      updated[rIdx] = { ...updated[rIdx], [child.id]: childVal };
                      onChange(updated);
                    }}
                    mode={mode}
                    disabled={disabled}
                    isSubField={true}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={() => {
              const newRow: Record<string, any> = { id: `item_${Date.now()}` };
              childFields.forEach((c) => {
                newRow[c.id] = c.defaultValue ?? "";
              });
              onChange([...entries, newRow]);
            }}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add {label} Entry
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
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. GROUP REPEATABLE (Multiple Instances)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "group_repeatable" && !isSubField) {
    const childFields: SubFieldConfig[] = resolveColumnsOrSubFields(field);
    const instances: Record<string, any>[] = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-3">
        {instances.map((instance, idx) => (
          <div key={instance.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">
                {label} Instance {idx + 1}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(instances.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                  title="Remove instance"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {childFields.map((child) => (
                <div key={child.id} className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                    {child.name}
                  </label>
                  <FieldInputRenderer
                    subField={child}
                    value={instance[child.id]}
                    onChange={(childVal) => {
                      const updated = [...instances];
                      updated[idx] = { ...updated[idx], [child.id]: childVal };
                      onChange(updated);
                    }}
                    mode={mode}
                    disabled={disabled}
                    isSubField={true}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={() => {
              const newInstance: Record<string, any> = { id: `inst_${Date.now()}` };
              childFields.forEach((c) => {
                newInstance[c.id] = c.defaultValue ?? "";
              });
              onChange([...instances, newInstance]);
            }}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another {label}
          </button>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 6. TABLE (Matrix / Grid with Typed Columns)
  // ─────────────────────────────────────────────────────────────
  if (effectiveType === "table" && !isSubField) {
    const cols = resolveColumnsOrSubFields(field);
    const rows: Record<string, any>[] = Array.isArray(value) ? value : [];

    const handleCellChange = (rIdx: number, colId: string, cellVal: any) => {
      const updated = [...rows];
      updated[rIdx] = { ...updated[rIdx], [colId]: cellVal };
      onChange(updated);
    };

    const handleAddRow = () => {
      const newRow: Record<string, any> = { id: `row_${Date.now()}` };
      cols.forEach((col) => {
        newRow[col.id] = col.defaultValue ?? "";
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

  if (effectiveType === "date" || effectiveType === "date_time") {
    return (
      <div className="relative flex items-center">
        <input
          type={effectiveType === "date_time" ? "datetime-local" : "date"}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
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
  const matchExists = !currentVal || options.some((o) => o.value === currentVal);

  return (
    <select
      value={currentVal}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
    >
      <option value="">{isAdminDefault ? "— No Default (Select on Record) —" : placeholder || "Select bound record..."}</option>
      {!matchExists && (
        <option value={currentVal} disabled>
          [Unknown / Deleted Record] ({currentVal})
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label} {opt.subtitle ? `(${opt.subtitle})` : ""}
        </option>
      ))}
    </select>
  );
}
