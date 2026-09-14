/**
 * AdminFieldDrawer.tsx
 * Path: src/app/pages/admin/components/AdminFieldDrawer.tsx
 *
 * Slide-in right-panel for creating or editing a custom FieldDefinition.
 * Rendered by AdminCustomFields.tsx, reachable at /admin/custom-fields.
 * This is a standalone admin module — NOT part of Settings.tsx.
 *
 * Key design decisions:
 * 1. MODULE_OPTIONS values EXACTLY match normalizeModuleKey() recognised strings.
 *    Unrecognised values silently fall back to "client" with no error.
 * 2. isScribeSeed=true → full read-only mode + amber "System · Non-deletable" badge.
 *    (Option B: scribe seeds are non-deletable because ensureScribeSeeds()
 *    re-injects them on every page load regardless.)
 * 3. Machine key auto-generated in create mode, LOCKED in edit mode
 *    to preserve {{key}} variable references.
 * 4. Delete button is NOT in this drawer; it lives in AdminCustomFields row actions.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, Check, Plus, Trash2, Lock, AlertCircle, Settings2, Globe, Shield, Link2, Layers, Tag, Info, Star, Database } from "lucide-react";
import type {
  FieldDefinition, FieldInputType, FieldModule,
  FieldOption, SectionDefinition, TableColumnConfig,
  ScopingRule, FieldPermissions, CrmBindModule, SubFieldConfig,
  SubFieldInputType, ListBindConfig,
} from "../../../context/FieldRegistryContext";
import { useFieldRegistry, normalizeLegacyColumn, CURRENCY_SYMBOLS } from "../../../context/FieldRegistryContext";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { FieldInputRenderer } from "../../../components/fields/FieldInputRenderer";
import { useDynamicListOptions } from "../../../components/fields/useDynamicListOptions";

// MODULE_OPTIONS values must EXACTLY match normalizeModuleKey() recognised strings.
// Unrecognised values silently fall back to "client" — no error thrown.
export const MODULE_OPTIONS: { label: string; value: Exclude<FieldModule, "deal"> }[] = [
  { label: "Client",       value: "client" },
  { label: "Process",      value: "process" },
  { label: "Appointment",  value: "appointment" },
  { label: "Call Log",     value: "call" },
  { label: "Service",      value: "service" },
  { label: "Organization", value: "organization" },
  { label: "Team Member",  value: "teamMember" },
  { label: "AI Scribe",    value: "scribe" },
];

const FIELD_TYPE_GROUPS: { group: string; items: { label: string; value: FieldInputType }[] }[] = [
  { group: "Text", items: [
    { label: "Short Text", value: "text" },
    { label: "Long Text / Textarea", value: "textarea" },
    { label: "Rich Text", value: "richtext" },
    { label: "Email", value: "email" },
    { label: "Phone Number", value: "tel" },
    { label: "Link / URL", value: "link" },
    { label: "WhatsApp Link", value: "whatsapp_link" },
  ]},
  { group: "Numbers", items: [
    { label: "Number", value: "number" },
    { label: "Money / Currency", value: "money" },
    { label: "Rating / Score", value: "rating" },
  ]},
  { group: "Date & Time", items: [
    { label: "Date", value: "date" },
    { label: "Date & Time", value: "date_time" },
  ]},
  { group: "Options", items: [
    { label: "List", value: "list_select" },
    { label: "Yes / No", value: "yes_no" },
    { label: "Open List", value: "list_open" },
  ]},
  { group: "Advanced & Composite", items: [
    { label: "Table / Matrix", value: "table" },
    { label: "Group / Composite", value: "group" },
    { label: "CRM Bind", value: "crm_bind" },
    { label: "Digital Signature", value: "signature" },
    { label: "File / Attachment", value: "file" },
    { label: "User / Member", value: "user" },
  ]},
];

function getLabelForInputType(t: FieldInputType): string {
  for (const g of FIELD_TYPE_GROUPS) {
    const f = g.items.find(i => i.value === t);
    if (f) return f.label;
  }
  return t;
}
function needsOptions(t: FieldInputType): boolean {
  return t === "list_select" || t === "select" || t === "multiselect" || t === "list";
}

interface FieldFormState {
  label: string; key: string; module: Exclude<FieldModule, "deal">;
  inputType: FieldInputType; placeholder: string;
  required: boolean; showAlways: boolean; userVisibility: boolean; sectionId: string;
  scopingRules: ScopingRule[];
  options: FieldOption[]; tableColumns: TableColumnConfig[];
  isReusable: boolean;
  reusableModules: Exclude<FieldModule, "deal">[];
  permissions: FieldPermissions;
  crmBindModule?: CrmBindModule;
  crmBindSelectionMode?: "single" | "multiple";
  selectionMode?: "single" | "multiple";
  listEntryType?: "plain_text" | "structured";
  defaultValue?: any;
  currency?: string;
  maxRating?: number;
  listBindConfig?: ListBindConfig;
  optionSourceMode?: "manual" | "bind";
}

function defaultForm(module: Exclude<FieldModule, "deal">): FieldFormState {
  return {
    label: "", key: "", module, inputType: "text", placeholder: "",
    required: false, showAlways: true, userVisibility: true, sectionId: "",
    scopingRules: [],
    isReusable: false,
    reusableModules: [],
    permissions: {
      canHide: true,
      canEdit: true,
      canAddOptions: true,
      canDelete: true,
    },
    options: [
      { id: 1, label: "Option 1", value: "option_1" },
      { id: 2, label: "Option 2", value: "option_2" },
    ],
    tableColumns: [
      { id: "col_1", name: "Item Name", type: "Text" },
      { id: "col_2", name: "Quantity", type: "Number" },
      { id: "col_3", name: "Unit Price", type: "Money", currency: "INR" },
    ],
    crmBindModule: "teamMember",
    crmBindSelectionMode: "single",
    selectionMode: "single",
    listEntryType: "plain_text",
    defaultValue: undefined,
    currency: "INR",
    maxRating: 5,
    listBindConfig: undefined,
    optionSourceMode: "manual",
  };
}

export function initFormFromField(f: FieldDefinition): FieldFormState {
  let rules: ScopingRule[] = f.scopingRules ? [...f.scopingRules] : [];
  // Backward compat: if legacy industry/location properties exist but no scopingRules
  if (rules.length === 0 && (f.industryCategory || f.industry || (f.locations && f.locations.length > 0))) {
    rules = [
      {
        id: `rule_legacy_${Date.now()}`,
        industryCategory: f.industryCategory || "All",
        industries: f.industry && f.industry !== "All" ? [f.industry] : [],
        locations: f.locations && f.locations.length > 0 && !f.locations.includes("All") ? f.locations : [],
      },
    ];
  }

  const isGroupRepeatable = f.inputType === ("group_repeatable" as any);
  const effectiveInputType = isGroupRepeatable ? "list_open" : f.inputType;
  const effectiveListEntryType = (isGroupRepeatable || f.listEntryType === "structured" || (f as any).entryType === "structured")
    ? "structured"
    : (f.listEntryType || "plain_text");

  return {
    label: f.label, key: f.key,
    module: f.module as Exclude<FieldModule, "deal">,
    inputType: effectiveInputType, placeholder: f.placeholder ?? "",
    required: f.required ?? false, showAlways: f.showAlways !== false,
    userVisibility: f.userVisibility !== false,
    sectionId: f.sectionId ?? "",
    scopingRules: rules,
    isReusable: Boolean(f.isReusable),
    reusableModules: (f.reusableModules as Exclude<FieldModule, "deal">[]) || [],
    permissions: {
      canHide: f.permissions?.canHide !== false,
      canEdit: f.permissions?.canEdit !== false,
      canAddOptions: f.permissions?.canAddOptions !== false,
      canDelete: f.permissions?.canDelete !== false,
    },
    options: f.options ?? [
      { id: 1, label: "Option 1", value: "option_1" },
      { id: 2, label: "Option 2", value: "option_2" },
    ],
    tableColumns: f.tableColumns ?? (f.subFields ? f.subFields.map(sf => ({
      id: sf.id,
      name: sf.name,
      type: sf.inputType === "list_select" ? "Select" : sf.inputType === "money" ? "Money" : sf.inputType === "number" ? "Number" : sf.inputType === "date" ? "Date" : sf.inputType === "date_time" ? "Date & Time" : sf.inputType === "textarea" ? "Long Text" : sf.inputType === "yes_no" ? "Yes / No" : sf.inputType === "email" ? "Email" : sf.inputType === "tel" ? "Phone" : sf.inputType === "link" ? "Link" : sf.inputType === "rating" ? "Rating" : sf.inputType === "crm_bind" ? "crm_bind" : "Text",
      inputType: sf.inputType,
      options: sf.options,
      currency: sf.currency,
      selectionMode: sf.selectionMode || "single",
      crmBindConfig: sf.crmBindConfig,
      maxRating: sf.maxRating || 5,
      listBindConfig: sf.listBindConfig,
      defaultValue: sf.defaultValue,
    })) : [
      { id: "col_1", name: "Item Name", type: "Text" },
      { id: "col_2", name: "Quantity", type: "Number" },
      { id: "col_3", name: "Unit Price", type: "Money", currency: "INR" },
    ]),
    crmBindModule: f.crmBindConfig?.sourceModule || "teamMember",
    crmBindSelectionMode: f.selectionMode || f.crmBindConfig?.selectionMode || "single",
    selectionMode: f.selectionMode || f.crmBindConfig?.selectionMode || "single",
    listEntryType: effectiveListEntryType,
    defaultValue: f.defaultValue,
    currency: f.currency || "INR",
    maxRating: f.maxRating || 5,
    listBindConfig: f.listBindConfig ? {
      ...f.listBindConfig,
      sourceType: f.listBindConfig.sourceType === "group" ? "open_list" : f.listBindConfig.sourceType,
    } : undefined,
    optionSourceMode: f.listBindConfig?.sourceType ? "bind" : "manual",
  };
}
export const fieldToForm = initFormFromField;

export interface AdminFieldDrawerProps {
  field: FieldDefinition | null;
  initialModule: Exclude<FieldModule, "deal">;
  sections: SectionDefinition[];
  isScribeSeed?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onSaved?: (field: FieldDefinition) => void;
}

export function AdminFieldDrawer({
  field, initialModule, sections, isScribeSeed = false, isAdmin = true, onClose, onSaved,
}: AdminFieldDrawerProps) {
  const { addCustomField, updateCustomField, getAllFields } = useFieldRegistry();
  const isEdit = field !== null;
  const isReadOnly = isScribeSeed;

  const [form, setForm] = useState<FieldFormState>(
    isEdit ? initFormFromField(field!) : defaultForm(initialModule),
  );
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [existingFieldPickerOpen, setExistingFieldPickerOpen] = useState(false);
  const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
  const [adminControlOpen, setAdminControlOpen] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<{ label?: string; key?: string }>({});
  const typePickerRef = useRef<HTMLDivElement>(null);
  const modulePickerRef = useRef<HTMLDivElement>(null);
  const existingFieldPickerRef = useRef<HTMLDivElement>(null);

  const allFieldsInModule = useMemo(() => {
    try {
      return getAllFields(form.module);
    } catch {
      return [];
    }
  }, [getAllFields, form.module]);

  const allAvailableFields = useMemo(() => {
    return allFieldsInModule.filter(
      (f) =>
        f.key !== form.key &&
        f.inputType !== "table" &&
        f.inputType !== "group" &&
        f.inputType !== "group_repeatable" &&
        f.inputType !== "list_open"
    );
  }, [allFieldsInModule, form.key]);

  const availableTableFields = useMemo(() => {
    return allFieldsInModule.filter((f) => f.inputType === "table");
  }, [allFieldsInModule]);

  const availableOpenListFields = useMemo(() => {
    return allFieldsInModule.filter(
      (f) =>
        f.key !== form.key &&
        ((f.inputType === "list_open" && (f.listEntryType === "structured" || (f as any).entryType === "structured")) ||
          f.inputType === "group_repeatable" ||
          f.inputType === "group")
    );
  }, [allFieldsInModule, form.key]);

  const availableListFields = useMemo(() => {
    return allFieldsInModule.filter(
      (f) => f.key !== form.key && (f.inputType === "list_select" || f.inputType === "select" || f.inputType === "multiselect")
    );
  }, [allFieldsInModule, form.key]);

  const importExistingFieldToColumn = (f: FieldDefinition) => {
    let colType = "Text";
    if (f.inputType === "number") colType = "Number";
    else if (f.inputType === "money") colType = "Money";
    else if (f.inputType === "list_select" || f.inputType === "select" || f.inputType === "multiselect") colType = "Select";
    else if (f.inputType === "date") colType = "Date";
    else if (f.inputType === "date_time") colType = "Date & Time";
    else if (f.inputType === "textarea") colType = "Long Text";
    else if (f.inputType === "yes_no") colType = "Yes / No";
    else if (f.inputType === "email") colType = "Email";
    else if (f.inputType === "tel") colType = "Phone";
    else if (f.inputType === "link") colType = "Link";
    else if (f.inputType === "rating") colType = "Rating";
    else if (f.inputType === "crm_bind") colType = "crm_bind";

    const newCol: TableColumnConfig = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: f.label,
      type: colType,
      inputType: (f.inputType as SubFieldInputType) || "text",
      options: f.options ? [...f.options] : undefined,
      currency: f.currency || (f.inputType === "money" ? "INR" : undefined),
      selectionMode: f.selectionMode || "single",
      crmBindConfig: f.crmBindConfig ? { ...f.crmBindConfig } : undefined,
    };
    setForm((p) => ({
      ...p,
      tableColumns: [...p.tableColumns, newCol],
    }));
  };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) setTypePickerOpen(false);
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
      if (existingFieldPickerRef.current && !existingFieldPickerRef.current.contains(e.target as Node)) setExistingFieldPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleLabelChange = useCallback((value: string) => {
    setForm(prev => ({
      ...prev, label: value,
      key: isEdit ? prev.key : value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));
  }, [isEdit]);

  const validate = (): boolean => {
    const errs: { label?: string; key?: string } = {};
    if (!form.label.trim()) errs.label = "Field name is required.";
    if (!form.key.trim()) errs.key = "Machine key is required.";
    else if (!/^[a-z0-9_]+$/.test(form.key)) errs.key = "Key may only contain a-z, 0-9, and underscores.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (isReadOnly || !validate()) return;

    // Populate legacy single-value fields from first rule for backward compat
    const firstRule = form.scopingRules[0];
    const legacyCategory = firstRule?.industryCategory && firstRule.industryCategory !== "All"
      ? firstRule.industryCategory
      : undefined;
    const legacyIndustry = firstRule?.industries && firstRule.industries.length > 0
      ? firstRule.industries[0]
      : undefined;
    const legacyLocations = firstRule?.locations && firstRule.locations.length > 0
      ? firstRule.locations
      : undefined;

    const payload: Omit<FieldDefinition, "id" | "source" | "createdAt"> = {
      label: form.label.trim(), key: form.key.trim(), module: form.module,
      inputType: form.inputType,
      placeholder: form.placeholder.trim() || `Enter ${form.label.toLowerCase()}`,
      required: form.required, showAlways: form.showAlways,
      userVisibility: form.userVisibility,
      sectionId: form.sectionId || undefined,
      scopingRules: form.scopingRules.length > 0 ? form.scopingRules : undefined,
      isReusable: form.isReusable,
      reusableModules: form.isReusable && form.reusableModules.length > 0 ? form.reusableModules : undefined,
      permissions: form.permissions,
      industryCategory: legacyCategory,
      industry: legacyIndustry,
      locations: legacyLocations,
      options: needsOptions(form.inputType) ? form.options : undefined,
      tableColumns: form.inputType === "table" ? form.tableColumns : undefined,
      crmBindConfig: form.inputType === "crm_bind" ? {
        sourceModule: form.crmBindModule || "teamMember",
        displayField: "name",
        selectionMode: form.crmBindSelectionMode || "single",
      } : undefined,
      selectionMode: form.inputType === "crm_bind" || form.inputType === "list_select" ? form.crmBindSelectionMode : undefined,
      listEntryType: form.inputType === "list_open" ? (form.listEntryType || "plain_text") : undefined,
      subFields: (form.inputType === "group" || form.inputType === "table" || (form.inputType === "list_open" && form.listEntryType === "structured") || form.inputType === "group_repeatable") && form.tableColumns.length > 0
        ? form.tableColumns.map(normalizeLegacyColumn).filter((c): c is SubFieldConfig => c !== null)
        : undefined,
      defaultValue: form.defaultValue !== undefined && form.defaultValue !== "" ? form.defaultValue : undefined,
      currency: form.inputType === "money" ? (form.currency || "INR") : undefined,
      maxRating: form.inputType === "rating" ? (form.maxRating || 5) : undefined,
      listBindConfig: form.inputType === "list_select" && form.optionSourceMode === "bind" && form.listBindConfig ? {
        ...form.listBindConfig,
        sourceType: form.listBindConfig.sourceType === "group" ? "open_list" : form.listBindConfig.sourceType,
      } : undefined,
    };
    if (isEdit && field) {
      updateCustomField(form.module, field.id, payload);
      onSaved?.({ ...field, ...payload });
    } else {
      const created = addCustomField(form.module, payload);
      onSaved?.(created);
    }
    onClose();
  };

  const addOption = () => setForm(p => ({ ...p, options: [...p.options, { id: Date.now(), label: `Option ${p.options.length + 1}`, value: `option_${p.options.length + 1}` }] }));
  const updateOption = (idx: number, label: string) => setForm(p => ({ ...p, options: p.options.map((o, i) => i === idx ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") } : o) }));
  const removeOption = (idx: number) => setForm(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  const addColumn = () => setForm(p => ({ ...p, tableColumns: [...p.tableColumns, { id: `col_${Date.now()}`, name: "New Column", type: "Text" }] }));
  const updateColumn = (idx: number, patch: Partial<TableColumnConfig>) => setForm(p => ({ ...p, tableColumns: p.tableColumns.map((c, i) => i === idx ? { ...c, ...patch } : c) }));
  const removeColumn = (idx: number) => setForm(p => ({ ...p, tableColumns: p.tableColumns.filter((_, i) => i !== idx) }));

  const typeLabel = getLabelForInputType(form.inputType);
  const modLabel = MODULE_OPTIONS.find(m => m.value === form.module)?.label ?? form.module;
  const modSections = sections.filter(s => s.module === form.module);

  const inputCls = (err?: string) => `w-full px-3.5 py-2.5 border rounded-lg text-sm transition-all ${err ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 focus:outline-none focus:ring-2" : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`;
  const roCls = "border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed";

  return (
    <div className="fixed inset-0 z-50 flex" style={{ pointerEvents: "none" }}>
      <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div className="flex-1 bg-black/30 backdrop-blur-[1px]" style={{ pointerEvents: "auto" }} onClick={onClose} />
      <div className="flex flex-col bg-white" style={{ width: 540, maxWidth: "100%", height: "100vh", boxShadow: "-4px 0 40px rgba(0,0,0,0.14)", animation: "slideInFromRight 220ms cubic-bezier(0.16,1,0.3,1)", pointerEvents: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[#111827]">
                {isReadOnly ? "System Field" : isEdit ? "Edit Field" : "New Custom Field"}
              </h2>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                  <Lock className="w-2.5 h-2.5" />System · Non-deletable
                </span>
              )}
              {!isReadOnly && isEdit && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">Custom</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {isReadOnly ? "Scribe seed fields are managed by the system and re-injected on every load."
                : `${isEdit ? "Editing" : "Creating"} a field for the ${modLabel} module`}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scribe seed warning */}
        {isReadOnly && (
          <div className="mx-6 mt-4 flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Why can this not be deleted?</strong>{" "}
              This field is part of <code className="bg-amber-100 px-1 rounded text-[10px]">INITIAL_SCRIBE_CUSTOM_FIELDS</code>.
              Even if removed, <code className="bg-amber-100 px-1 rounded text-[10px]">ensureScribeSeeds()</code> re-adds it on the next page load.
              Deletion is disabled to prevent silent data loss.
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Module */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Module <span className="text-red-500">*</span></label>
            <div className="relative" ref={modulePickerRef}>
              <button type="button" disabled={isEdit || isReadOnly}
                onClick={() => !isEdit && !isReadOnly && setModulePickerOpen(v => !v)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white flex items-center justify-between transition-all ${isEdit || isReadOnly ? "border-gray-100 bg-gray-50 cursor-not-allowed" : "border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"}`}
              >
                <span className={`font-medium ${isEdit || isReadOnly ? "text-gray-400" : "text-[#111827]"}`}>{modLabel}</span>
                {!isEdit && !isReadOnly && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${modulePickerOpen ? "rotate-180" : ""}`} />}
              </button>
              {modulePickerOpen && !isEdit && !isReadOnly && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {MODULE_OPTIONS.map(mod => (
                    <button key={mod.value} type="button"
                      onClick={() => { setForm(p => ({ ...p, module: mod.value })); setModulePickerOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 cursor-pointer ${form.module === mod.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-[#111827]"}`}
                    >
                      <span>{mod.label}</span>
                      {form.module === mod.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isEdit && <p className="text-[11px] text-gray-400 mt-1">Module cannot be changed after creation.</p>}
          </div>

          {/* Admin Control Dropdown (Scope & Permissions) */}
          {isAdmin && (
            <div>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {/* Admin Control Main Dropdown Header */}
                <button
                  type="button"
                  onClick={() => setAdminControlOpen((v) => !v)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="w-4 h-4 text-gray-600 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider" title="Configure scope rules and permissions">
                      Admin Control
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${adminControlOpen ? "rotate-180" : ""}`} />
                </button>

                {adminControlOpen && (
                  <div className="p-3 space-y-2.5 border-t border-gray-100 bg-gray-50/30">
                    {/* 1. Scope Option Dropdown */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setScopeDropdownOpen((v) => !v)}
                        className="w-full px-3 py-2 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          <span className="text-xs font-semibold text-gray-800">
                            Scope Rules
                          </span>
                          <span onClick={(e) => e.stopPropagation()}>
                            <InfoTooltip text="Define which tenant organizations have visibility to this field." size="sm" />
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${scopeDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {scopeDropdownOpen && (
                        <div className="p-3 border-t border-gray-100 bg-white">
                          <AdminScopingRulesEditor
                            rules={form.scopingRules}
                            onChange={(rules) => setForm((p) => ({ ...p, scopingRules: rules }))}
                            isReadOnly={isReadOnly}
                          />
                        </div>
                      )}
                    </div>

                    {/* 2. Permissions Dropdown */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPermissionsDropdownOpen((v) => !v)}
                        className="w-full px-3 py-2 bg-gray-50/70 hover:bg-gray-100/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                          <span className="text-xs font-semibold text-gray-800">
                            Permissions
                          </span>
                          <span onClick={(e) => e.stopPropagation()}>
                            <InfoTooltip text="Configure what tenant users are permitted to do with this field." size="sm" />
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${permissionsDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {permissionsDropdownOpen && (
                        <div className="p-3 border-t border-gray-100 bg-white">
                          <div className="flex items-center gap-6">
                            {/* 1. Hide permission */}
                            <div className="flex items-center">
                              <label
                                className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canHide !== false}
                                  disabled={isReadOnly}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: { ...p.permissions, canHide: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Hide</span>
                              </label>
                              <InfoTooltip text="Tenant users can choose to show or hide this field in their workspace views." size="sm" />
                            </div>

                            {/* 2. Edit permission */}
                            <div className="flex items-center">
                              <label
                                className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canEdit !== false}
                                  disabled={isReadOnly}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: { ...p.permissions, canEdit: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Edit</span>
                              </label>
                              <InfoTooltip text="Tenant users can customize the label, placeholder, and configuration of this field." size="sm" />
                            </div>

                            {/* 3. Add permission */}
                            <div className="flex items-center">
                              <label
                                className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canAdd !== false && form.permissions.canAddOptions !== false}
                                  disabled={isReadOnly}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: {
                                      ...p.permissions,
                                      canAdd: e.target.checked,
                                      canAddOptions: e.target.checked,
                                    }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Add</span>
                              </label>
                              <InfoTooltip text="Tenant users can add custom options on top of admin-configured options (for lists, dropdowns, etc.)." size="sm" />
                            </div>

                            {/* 4. Delete permission */}
                            <div className="flex items-center">
                              <label
                                className={`flex items-center gap-1.5 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canDelete !== false}
                                  disabled={isReadOnly}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: {
                                      ...p.permissions,
                                      canDelete: e.target.checked,
                                    }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Delete</span>
                              </label>
                              <InfoTooltip text="Field will be deleted from the user only, not admin." size="sm" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.label} readOnly={isReadOnly}
              onChange={e => handleLabelChange(e.target.value)} placeholder="e.g. Policy Coverage"
              className={`${isReadOnly ? `${inputCls()} ${roCls}` : inputCls(errors.label)}`}
            />
            {errors.label && <p className="text-[11px] text-red-500 mt-1">{errors.label}</p>}
          </div>

          {/* Machine Key */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Machine Key <span className="text-red-500">*</span>
              <span className="ml-1.5 text-[10px] font-normal text-gray-400">(auto-generated · used in templates)</span>
            </label>
            <input type="text" value={form.key} readOnly={isReadOnly || isEdit}
              onChange={e => !isEdit && !isReadOnly && setForm(p => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
              placeholder="policy_coverage"
              className={`${isEdit || isReadOnly ? `${inputCls()} ${roCls} font-mono` : `${inputCls(errors.key)} font-mono`}`}
            />
            {errors.key && <p className="text-[11px] text-red-500 mt-1">{errors.key}</p>}
            {(isEdit || isReadOnly) && <p className="text-[11px] text-gray-400 mt-1">Locked after creation to preserve variable references.</p>}
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Field Type</label>
            <div className="relative" ref={typePickerRef}>
              <button type="button" disabled={isReadOnly}
                onClick={() => !isReadOnly && setTypePickerOpen(v => !v)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white flex items-center justify-between transition-all ${isReadOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"}`}
              >
                <span className={`font-medium ${isReadOnly ? "text-gray-400" : "text-[#111827]"}`}>{typeLabel}</span>
                {!isReadOnly && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${typePickerOpen ? "rotate-180" : ""}`} />}
              </button>
              {typePickerOpen && !isReadOnly && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-y-auto" style={{ maxHeight: 300 }}>
                  {FIELD_TYPE_GROUPS.map(grp => (
                    <div key={grp.group}>
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">{grp.group}</div>
                      {grp.items.map(item => (
                        <button key={item.value} type="button"
                          onClick={() => { setForm(p => ({ ...p, inputType: item.value })); setTypePickerOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 cursor-pointer ${form.inputType === item.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-[#111827]"}`}
                        >
                          <span>{item.label}</span>
                          {form.inputType === item.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Placeholder */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Placeholder <span className="text-[10px] font-normal text-gray-400">(optional)</span>
            </label>
            <input type="text" value={form.placeholder} readOnly={isReadOnly}
              onChange={e => setForm(p => ({ ...p, placeholder: e.target.value }))}
              placeholder="e.g. Enter policy coverage amount"
              className={isReadOnly ? `${inputCls()} ${roCls}` : inputCls()}
            />
          </div>

          {/* Currency picker for money fields */}
          {form.inputType === "money" && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Currency</label>
              <select
                value={form.currency || "INR"}
                disabled={isReadOnly}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                  <option key={code} value={code}>
                    {symbol} {code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating max stars configuration */}
          {form.inputType === "rating" && (
            <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Maximum Rating (Stars)
                  </label>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {form.maxRating || 5} Stars
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Choose the maximum rating stars users can select for this field.
              </p>
              <div className="flex items-center gap-2">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      setForm((p) => ({
                        ...p,
                        maxRating: num,
                        defaultValue: p.defaultValue && Number(p.defaultValue) > num ? num : p.defaultValue,
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      (form.maxRating || 5) === num
                        ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {num} Stars
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-slate-500 font-medium">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.maxRating || 5}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(20, Number(e.target.value) || 5));
                      setForm((p) => ({
                        ...p,
                        maxRating: val,
                        defaultValue: p.defaultValue && Number(p.defaultValue) > val ? val : p.defaultValue,
                      }));
                    }}
                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-amber-500 text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Options & List Bind Configuration */}
          {needsOptions(form.inputType) && (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              {/* Option Source Toggle: Manual vs List Bind */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Option Source</label>
                  <p className="text-[11px] text-slate-500">Configure where the list options come from</p>
                </div>
                <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setForm((p) => ({ ...p, optionSourceMode: "manual" }))}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      form.optionSourceMode !== "bind"
                        ? "bg-white text-slate-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Manual Options
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => {
                      setForm((p) => ({
                        ...p,
                        optionSourceMode: "bind",
                        listBindConfig: p.listBindConfig || {
                          sourceType: availableTableFields.length > 0 ? "table" : "crm",
                          targetFieldKey: availableTableFields[0]?.key || "",
                          targetColumnOrSubFieldId: availableTableFields[0]?.tableColumns?.[0]?.id || availableTableFields[0]?.subFields?.[0]?.id || "",
                          crmModule: "teamMember",
                        },
                      }));
                    }}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      form.optionSourceMode === "bind"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    <span>List Bind (Data Source)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic List Bind Configuration Panel */}
              {form.optionSourceMode === "bind" ? (
                <div className="space-y-3 bg-white p-3 rounded-lg border border-blue-200 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <Database className="w-3.5 h-3.5" />
                    <span>Dynamic Data Binding Source</span>
                  </div>

                  {/* 1. Source Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data Source Type
                    </label>
                    <select
                      value={form.listBindConfig?.sourceType || "open_list"}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        const newSourceType = e.target.value as "open_list" | "table" | "crm" | "field";
                        let defaultTargetKey = "";
                        let defaultColId = "";
                        if (newSourceType === "open_list" && availableOpenListFields.length > 0) {
                          defaultTargetKey = availableOpenListFields[0].key;
                          defaultColId = availableOpenListFields[0].subFields?.[0]?.id || availableOpenListFields[0].tableColumns?.[0]?.id || "";
                        } else if (newSourceType === "table" && availableTableFields.length > 0) {
                          defaultTargetKey = availableTableFields[0].key;
                          defaultColId = availableTableFields[0].tableColumns?.[0]?.id || availableTableFields[0].subFields?.[0]?.id || "";
                        } else if (newSourceType === "field" && availableListFields.length > 0) {
                          defaultTargetKey = availableListFields[0].key;
                        }

                        setForm((p) => ({
                          ...p,
                          listBindConfig: {
                            sourceType: newSourceType,
                            targetFieldKey: defaultTargetKey,
                            targetColumnOrSubFieldId: defaultColId,
                            crmModule: "teamMember",
                          },
                        }));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="open_list">Bind to Open List (extract values from structured open list)</option>
                      <option value="table">Table Field Column (extract distinct values from table)</option>
                      <option value="crm">CRM Entity (Team Members, Clients, Services, Processes, Orgs)</option>
                      <option value="field">Existing Custom List Field (mirror options)</option>
                    </select>
                  </div>

                  {/* 2. Target Field and Sub-field for Open List Source */}
                  {(form.listBindConfig?.sourceType === "open_list" || form.listBindConfig?.sourceType === ("group" as any)) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Select Structured Open List
                        </label>
                        {availableOpenListFields.length === 0 ? (
                          <div className="text-xs text-amber-600 italic bg-amber-50 p-2 rounded border border-amber-200">
                            No structured Open List fields exist in this module yet.
                          </div>
                        ) : (
                          <select
                            value={form.listBindConfig?.targetFieldKey || availableOpenListFields[0]?.key}
                            disabled={isReadOnly}
                            onChange={(e) => {
                              setForm((p) => ({
                                ...p,
                                listBindConfig: {
                                  ...p.listBindConfig!,
                                  sourceType: "open_list",
                                  targetFieldKey: e.target.value,
                                  targetColumnOrSubFieldId: undefined,
                                },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer"
                          >
                            {availableOpenListFields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label} ({f.key})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Target Field and Column for Table Source */}
                  {form.listBindConfig?.sourceType === "table" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Select Table Field
                        </label>
                        {availableTableFields.length === 0 ? (
                          <div className="text-xs text-amber-600 italic bg-amber-50 p-2 rounded border border-amber-200">
                            No Table fields exist in this module yet.
                          </div>
                        ) : (
                          <select
                            value={form.listBindConfig.targetFieldKey || availableTableFields[0]?.key}
                            disabled={isReadOnly}
                            onChange={(e) => {
                              const targetTbl = availableTableFields.find((f) => f.key === e.target.value);
                              const targetColId = targetTbl?.tableColumns?.[0]?.id || targetTbl?.subFields?.[0]?.id || "";
                              setForm((p) => ({
                                ...p,
                                listBindConfig: {
                                  ...p.listBindConfig!,
                                  targetFieldKey: e.target.value,
                                  targetColumnOrSubFieldId: targetColId,
                                },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer"
                          >
                            {availableTableFields.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label} ({t.key})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Target CRM Module */}
                  {form.listBindConfig?.sourceType === "crm" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        CRM Entity Module
                      </label>
                      <select
                        value={form.listBindConfig.crmModule || "teamMember"}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            listBindConfig: {
                              ...p.listBindConfig!,
                              crmModule: e.target.value as CrmBindModule,
                              displayField: "name",
                            },
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="teamMember">Team Members</option>
                        <option value="client">Clients</option>
                        <option value="organization">Organizations</option>
                        <option value="service">Services / Catalog</option>
                        <option value="process">Processes</option>
                      </select>
                    </div>
                  )}

                  {/* 5. Target Existing Custom Field */}
                  {form.listBindConfig?.sourceType === "field" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Mirror From Field
                      </label>
                      {availableListFields.length === 0 ? (
                        <div className="text-xs text-amber-600 italic bg-amber-50 p-2 rounded border border-amber-200">
                          No other List fields found in this module.
                        </div>
                      ) : (
                        <select
                          value={form.listBindConfig.targetFieldKey || availableListFields[0]?.key}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            setForm((p) => ({
                              ...p,
                              listBindConfig: {
                                ...p.listBindConfig!,
                                targetFieldKey: e.target.value,
                              },
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer"
                        >
                          {availableListFields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.options?.length || 0} options)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="p-2 bg-blue-50/70 border border-blue-100 rounded-lg text-[11px] text-blue-800 leading-relaxed">
                    Options for this list will be dynamically bound from the selected source at runtime on client records and forms.
                  </div>
                </div>
              ) : (
                /* Manual Options List */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-600">Manual Options:</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add option
                      </button>
                    )}
                  </div>
                  {form.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.label}
                        readOnly={isReadOnly}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-all ${
                          isReadOnly ? roCls + " border-gray-100" : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        }`}
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-1.5 text-gray-300 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Selection Mode toggle for List */}
              <div className="mt-2 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Selection Mode:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="listSelectMode"
                      disabled={isReadOnly}
                      checked={(form.selectionMode || form.crmBindSelectionMode) !== "multiple"}
                      onChange={() =>
                        setForm((p) => ({
                          ...p,
                          selectionMode: "single",
                          crmBindSelectionMode: "single",
                          defaultValue: Array.isArray(p.defaultValue) ? p.defaultValue[0] || "" : p.defaultValue || "",
                        }))
                      }
                      className="text-blue-600 cursor-pointer"
                    />
                    Single Selection
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="listSelectMode"
                      disabled={isReadOnly}
                      checked={(form.selectionMode || form.crmBindSelectionMode) === "multiple"}
                      onChange={() =>
                        setForm((p) => ({
                          ...p,
                          selectionMode: "multiple",
                          crmBindSelectionMode: "multiple",
                          defaultValue: Array.isArray(p.defaultValue) ? p.defaultValue : p.defaultValue ? [p.defaultValue] : [],
                        }))
                      }
                      className="text-blue-600 cursor-pointer"
                    />
                    Multiple (Multiselect)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* CRM Bind configuration card */}
          {form.inputType === "crm_bind" && (
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">CRM Bind Configuration</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Bind to Module</label>
                <select
                  value={form.crmBindModule || "teamMember"}
                  disabled={isReadOnly}
                  onChange={(e) => setForm((p) => ({ ...p, crmBindModule: e.target.value as CrmBindModule }))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="teamMember">Team Member (Staff / Doctors)</option>
                  <option value="client">Client (Link to Client Record)</option>
                  <option value="organization">Organization</option>
                  <option value="service">Service (Treatments / Catalog)</option>
                  <option value="process">Process (Workflows / Pipelines)</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Values will dynamically pull from the selected module with real-time sync.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Selection Mode</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="crmSelectionMode"
                      disabled={isReadOnly}
                      checked={form.crmBindSelectionMode !== "multiple"}
                      onChange={() => setForm((p) => ({ ...p, crmBindSelectionMode: "single" }))}
                      className="text-blue-600"
                    />
                    Single Record
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="crmSelectionMode"
                      disabled={isReadOnly}
                      checked={form.crmBindSelectionMode === "multiple"}
                      onChange={() => setForm((p) => ({ ...p, crmBindSelectionMode: "multiple" }))}
                      className="text-blue-600"
                    />
                    Multiple Records
                  </label>
                </div>
              </div>
              <div className="p-2.5 bg-blue-100/50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  CRM Bind fields dynamically pull records at runtime on client records. Client records and live data are not loaded in Admin.
                </p>
              </div>
            </div>
          )}

          {/* Open List Entry Format & Options */}
          {form.inputType === "list_open" && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Entry Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setForm((p) => ({ ...p, listEntryType: "plain_text" }))}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    form.listEntryType !== "structured"
                      ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white/60 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Plain Text Tags</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Users type and press Enter to add tags/chips (e.g. Symptoms, Instructions).
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setForm((p) => ({ ...p, listEntryType: "structured" }))}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    form.listEntryType === "structured"
                      ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white/60 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Structured Sub-Fields</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Repeatable mini-records with sub-fields (e.g. Prescriptions, Medicines).
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Table columns & Group subfields */}
          {(form.inputType === "table" || form.inputType === "group" || (form.inputType === "list_open" && form.listEntryType === "structured") || form.inputType === "group_repeatable") && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">
                  {form.inputType === "table"
                    ? "Table Columns"
                    : form.inputType === "group"
                    ? "Group Sub-Fields"
                    : "Repeatable Sub-Fields"}
                </label>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {/* Existing Field Picker Dropdown */}
                    <div className="relative" ref={existingFieldPickerRef}>
                      <button
                        type="button"
                        onClick={() => setExistingFieldPickerOpen((v) => !v)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        title="Import schema from an existing field"
                      >
                        <Layers className="w-3 h-3 text-slate-500" />
                        <span>Use Existing Field</span>
                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${existingFieldPickerOpen ? "rotate-180" : ""}`} />
                      </button>
                      {existingFieldPickerOpen && (
                        <div className="absolute right-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 space-y-0.5">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Choose field to import
                          </div>
                          {allAvailableFields.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic">No other fields found</div>
                          ) : (
                            allAvailableFields.map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => {
                                  importExistingFieldToColumn(f);
                                  setExistingFieldPickerOpen(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer group"
                              >
                                <span className="font-medium text-slate-700 group-hover:text-blue-700 truncate">{f.label}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 bg-slate-100 rounded">
                                  {f.inputType === "list_select" ? "List" : f.inputType}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={addColumn}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      {form.inputType === "table" ? "Add column" : "Add sub-field"}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {form.tableColumns.map((col, idx) => (
                  <div key={col.id} className="space-y-2 p-2.5 border border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={col.name}
                        readOnly={isReadOnly}
                        onChange={(e) => updateColumn(idx, { name: e.target.value })}
                        placeholder={form.inputType === "table" ? "Column name" : "Sub-field name"}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-all ${isReadOnly ? roCls + " border-gray-100" : "border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"}`}
                      />
                      <select
                        value={col.type}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const patch: Partial<TableColumnConfig> = { type: newType };
                          if (newType === "Select" && (!col.options || col.options.length === 0)) {
                            patch.options = [
                              { id: 1, label: "Option A", value: "option_a" },
                              { id: 2, label: "Option B", value: "option_b" },
                            ];
                            patch.selectionMode = col.selectionMode || "single";
                          }
                          if (newType === "Money" && !col.currency) {
                            patch.currency = "INR";
                          }
                          if (newType === "crm_bind" && !col.crmBindConfig) {
                            patch.crmBindConfig = {
                              sourceModule: "teamMember",
                              displayField: "name",
                              selectionMode: col.selectionMode || "single",
                            };
                          }
                          updateColumn(idx, patch);
                        }}
                        className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Text">Text (Single Line)</option>
                        <option value="Long Text">Long Text (Textarea)</option>
                        <option value="Select">Selection List</option>
                        <option value="Number">Number</option>
                        <option value="Money">Money</option>
                        <option value="Date">Date</option>
                        <option value="Date & Time">Date & Time</option>
                        <option value="Yes / No">Yes / No</option>
                        <option value="Email">Email</option>
                        <option value="Phone">Phone</option>
                        <option value="Link">Link / URL</option>
                        <option value="Rating">Rating (1-5)</option>
                        <option value="crm_bind">CRM Bind</option>
                      </select>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeColumn(idx)}
                          className="p-1.5 text-gray-300 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Inline options editor & selection mode when column type is Select */}
                    {col.type === "Select" && (
                      <div className="ml-2 pl-3 border-l-2 border-blue-300 py-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700">Column Options:</span>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => {
                                const curOpts = col.options && col.options.length > 0 ? col.options : [
                                  { id: 1, label: "Option A", value: "option_a" },
                                  { id: 2, label: "Option B", value: "option_b" },
                                ];
                                updateColumn(idx, {
                                  options: [
                                    ...curOpts,
                                    {
                                      id: Date.now(),
                                      label: `Option ${curOpts.length + 1}`,
                                      value: `option_${curOpts.length + 1}`,
                                    },
                                  ],
                                });
                              }}
                              className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {(col.options && col.options.length > 0 ? col.options : [
                            { id: 1, label: "Option A", value: "option_a" },
                            { id: 2, label: "Option B", value: "option_b" },
                          ]).map((opt, optIdx) => (
                            <div key={opt.id || optIdx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={opt.label}
                                readOnly={isReadOnly}
                                onChange={(e) => {
                                  const curOpts = col.options && col.options.length > 0 ? [...col.options] : [
                                    { id: 1, label: "Option A", value: "option_a" },
                                    { id: 2, label: "Option B", value: "option_b" },
                                  ];
                                  curOpts[optIdx] = {
                                    ...opt,
                                    label: e.target.value,
                                    value: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                                  };
                                  updateColumn(idx, { options: curOpts });
                                }}
                                className="flex-1 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curOpts = (col.options && col.options.length > 0 ? col.options : [
                                      { id: 1, label: "Option A", value: "option_a" },
                                      { id: 2, label: "Option B", value: "option_b" },
                                    ]).filter((_, i) => i !== optIdx);
                                    updateColumn(idx, { options: curOpts });
                                  }}
                                  className="p-1 text-gray-300 hover:text-red-500 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Selection Mode toggle for column Selection List */}
                        <div className="flex items-center gap-3 pt-1 border-t border-blue-100">
                          <span className="text-[11px] font-semibold text-slate-600">Selection:</span>
                          <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              name={`col_mode_${col.id}_${idx}`}
                              disabled={isReadOnly}
                              checked={col.selectionMode !== "multiple"}
                              onChange={() => updateColumn(idx, { selectionMode: "single" })}
                              className="text-blue-600 cursor-pointer"
                            />
                            <span>Single</span>
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              name={`col_mode_${col.id}_${idx}`}
                              disabled={isReadOnly}
                              checked={col.selectionMode === "multiple"}
                              onChange={() => updateColumn(idx, { selectionMode: "multiple" })}
                              className="text-blue-600 cursor-pointer"
                            />
                            <span>Multiple (Multiselect)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Inline max stars selector when column type is Rating */}
                    {col.type === "Rating" && (
                      <div className="ml-2 pl-3 border-l-2 border-amber-300 py-1 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-700">Max Stars:</span>
                        <select
                          value={col.maxRating || 5}
                          disabled={isReadOnly}
                          onChange={(e) => updateColumn(idx, { maxRating: Number(e.target.value) || 5 })}
                          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none cursor-pointer"
                        >
                          <option value={3}>3 Stars</option>
                          <option value={5}>5 Stars</option>
                          <option value={10}>10 Stars</option>
                        </select>
                      </div>
                    )}

                    {/* Inline currency selector when column type is Money */}
                    {col.type === "Money" && (
                      <div className="ml-2 pl-3 border-l-2 border-emerald-300 py-1 flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-700">Currency:</span>
                        <select
                          value={col.currency || "INR"}
                          disabled={isReadOnly}
                          onChange={(e) => updateColumn(idx, { currency: e.target.value })}
                          className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none cursor-pointer"
                        >
                          {Object.entries(CURRENCY_SYMBOLS).map(([cCode, cSym]) => (
                            <option key={cCode} value={cCode}>{cSym} {cCode}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Inline CRM Bind module selector when column type is CRM Bind */}
                    {col.type === "crm_bind" && (
                      <div className="ml-2 pl-3 border-l-2 border-purple-300 py-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-700">Bind Module:</span>
                          <select
                            value={col.crmBindConfig?.sourceModule || "teamMember"}
                            disabled={isReadOnly}
                            onChange={(e) => updateColumn(idx, {
                              crmBindConfig: {
                                sourceModule: e.target.value as CrmBindModule,
                                displayField: "name",
                                selectionMode: col.selectionMode || "single",
                              },
                            })}
                            className="px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none cursor-pointer"
                          >
                            <option value="teamMember">Team Member</option>
                            <option value="client">Client</option>
                            <option value="organization">Organization</option>
                            <option value="service">Service</option>
                            <option value="process">Process</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Value Configurator */}
          {!isReadOnly && form.inputType !== "signature" && form.inputType !== "file" && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Default Value (Optional)
                </label>
                {form.defaultValue !== undefined && form.defaultValue !== "" && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, defaultValue: undefined }))}
                    className="text-[11px] text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Pre-fill new client records with this default value.
              </p>
              <FieldInputRenderer
                field={{
                  inputType: form.inputType,
                  options: form.options,
                  currency: form.currency || "INR",
                  selectionMode: form.selectionMode || form.crmBindSelectionMode || "single",
                  crmBindConfig: form.inputType === "crm_bind" ? {
                    sourceModule: form.crmBindModule || "teamMember",
                    displayField: "name",
                    selectionMode: form.selectionMode || form.crmBindSelectionMode || "single",
                  } : undefined,
                  maxRating: form.maxRating || 5,
                  listEntryType: form.inputType === "list_open" ? form.listEntryType : undefined,
                  listBindConfig: form.optionSourceMode === "bind" ? form.listBindConfig : undefined,
                  subFields: form.tableColumns.map(normalizeLegacyColumn).filter((c): c is SubFieldConfig => c !== null),
                  placeholder: form.placeholder || `Default value for ${form.label || "field"}...`,
                }}
                value={form.defaultValue}
                onChange={(val) => setForm((p) => ({ ...p, defaultValue: val }))}
                mode="admin_default"
              />
            </div>
          )}


          {/* Field Settings Dropdown */}
          <div className="pt-2 border-t border-gray-100">
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setFieldSettingsOpen((v) => !v)}
                className="w-full px-4 py-3 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings2 className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Field Settings</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {form.required && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Required
                          </span>
                        )}
                        {form.showAlways && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Visible
                          </span>
                        )}
                        {form.userVisibility !== false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            User Visible
                          </span>
                        )}
                        {form.isReusable && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Reusable
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Configure required status, visibility, and cross-module reuse
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${fieldSettingsOpen ? "rotate-180" : ""}`} />
              </button>

              {fieldSettingsOpen && (
                <div className="p-4 space-y-4 border-t border-gray-100 bg-white">
                  {/* 1. Required */}
                  <label className={`flex items-start gap-3 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={form.required}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">Required field</span>
                      <p className="text-xs text-gray-500">Users must provide a value before saving records</p>
                    </div>
                  </label>

                  {/* 2. Visible */}
                  <label className={`flex items-start gap-3 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={form.showAlways}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, showAlways: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">Always visible in profile view</span>
                      <p className="text-xs text-gray-500">Ensure this field is always displayed in profile and overview cards</p>
                    </div>
                  </label>

                  {/* 3. User Visibility */}
                  <label className={`flex items-start gap-3 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={form.userVisibility !== false}
                      disabled={isReadOnly}
                      onChange={(e) => setForm((p) => ({ ...p, userVisibility: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">User Visibility</span>
                      <p className="text-xs text-gray-500">Configure whether this field is visible to end users</p>
                    </div>
                  </label>

                  {/* 3. Make reusable across other modules */}
                  <div className="pt-3 border-t border-gray-100">
                    <label className={`flex items-start gap-3 select-none ${isReadOnly ? "opacity-60" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={form.isReusable}
                        disabled={isReadOnly}
                        onChange={(e) => setForm((p) => ({ ...p, isReusable: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Make reusable across other modules</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Enables this field to be used in other modules as well (e.g. Clients, Processes, Appointments, Call Logs, Services, Organizations, AI Scribe).
                        </p>
                      </div>
                    </label>


                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            {isReadOnly ? "Close" : "Cancel"}
          </button>
          {!isReadOnly && (
            <button onClick={handleSave} disabled={!form.label.trim()}
              className="px-5 py-2 bg-[#111827] text-white text-sm font-semibold rounded-lg hover:bg-[#1f2937] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isEdit ? "Save Changes" : "Create Field"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminFieldDrawer;
