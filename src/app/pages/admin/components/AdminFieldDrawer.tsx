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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronDown, Check, Plus, Trash2, Lock, AlertCircle, Settings2, Globe, Shield } from "lucide-react";
import type {
  FieldDefinition, FieldInputType, FieldModule,
  FieldOption, SectionDefinition, TableColumnConfig,
  ScopingRule, FieldPermissions,
} from "../../../context/FieldRegistryContext";
import { useFieldRegistry } from "../../../context/FieldRegistryContext";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

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
    { label: "Dropdown (Select)", value: "select" },
    { label: "Multi-Select", value: "multiselect" },
    { label: "Yes / No", value: "yes_no" },
  ]},
  { group: "Advanced", items: [
    { label: "Table / Matrix", value: "table" },
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
  return t === "select" || t === "multiselect" || t === "list";
}

interface FieldFormState {
  label: string; key: string; module: Exclude<FieldModule, "deal">;
  inputType: FieldInputType; placeholder: string;
  required: boolean; showAlways: boolean; sectionId: string;
  scopingRules: ScopingRule[];
  options: FieldOption[]; tableColumns: TableColumnConfig[];
  isReusable: boolean;
  reusableModules: Exclude<FieldModule, "deal">[];
  permissions: FieldPermissions;
}

function defaultForm(module: Exclude<FieldModule, "deal">): FieldFormState {
  return {
    label: "", key: "", module, inputType: "text", placeholder: "",
    required: false, showAlways: true, sectionId: "",
    scopingRules: [],
    isReusable: false,
    reusableModules: [],
    permissions: {
      canHide: true,
      canEdit: true,
      canAddOptions: true,
    },
    options: [
      { id: 1, label: "Option 1", value: "option_1" },
      { id: 2, label: "Option 2", value: "option_2" },
    ],
    tableColumns: [
      { id: "col_1", name: "Item Name", type: "Text" },
      { id: "col_2", name: "Quantity", type: "Number" },
      { id: "col_3", name: "Unit Price", type: "Money" },
    ],
  };
}

function fieldToForm(f: FieldDefinition): FieldFormState {
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

  return {
    label: f.label, key: f.key,
    module: f.module as Exclude<FieldModule, "deal">,
    inputType: f.inputType, placeholder: f.placeholder ?? "",
    required: f.required ?? false, showAlways: f.showAlways !== false,
    sectionId: f.sectionId ?? "",
    scopingRules: rules,
    isReusable: Boolean(f.isReusable),
    reusableModules: (f.reusableModules as Exclude<FieldModule, "deal">[]) || [],
    permissions: {
      canHide: f.permissions?.canHide !== false,
      canEdit: f.permissions?.canEdit !== false,
      canAddOptions: f.permissions?.canAddOptions !== false,
    },
    options: f.options ?? [
      { id: 1, label: "Option 1", value: "option_1" },
      { id: 2, label: "Option 2", value: "option_2" },
    ],
    tableColumns: f.tableColumns ?? [
      { id: "col_1", name: "Item Name", type: "Text" },
      { id: "col_2", name: "Quantity", type: "Number" },
      { id: "col_3", name: "Unit Price", type: "Money" },
    ],
  };
}

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
  const { addCustomField, updateCustomField } = useFieldRegistry();
  const isEdit = field !== null;
  const isReadOnly = isScribeSeed;

  const [form, setForm] = useState<FieldFormState>(
    isEdit ? fieldToForm(field!) : defaultForm(initialModule),
  );
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [fieldSettingsOpen, setFieldSettingsOpen] = useState(false);
  const [adminControlOpen, setAdminControlOpen] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<{ label?: string; key?: string }>({});
  const typePickerRef = useRef<HTMLDivElement>(null);
  const modulePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) setTypePickerOpen(false);
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
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

          {/* Options */}
          {needsOptions(form.inputType) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Options</label>
                {!isReadOnly && <button type="button" onClick={addOption} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"><Plus className="w-3 h-3" />Add option</button>}
              </div>
              <div className="space-y-2">
                {form.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input type="text" value={opt.label} readOnly={isReadOnly} onChange={e => updateOption(idx, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-all ${isReadOnly ? roCls + " border-gray-100" : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"}`}
                    />
                    {!isReadOnly && <button type="button" onClick={() => removeOption(idx)} className="p-1.5 text-gray-300 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table columns */}
          {form.inputType === "table" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Table Columns</label>
                {!isReadOnly && <button type="button" onClick={addColumn} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"><Plus className="w-3 h-3" />Add column</button>}
              </div>
              <div className="space-y-2">
                {form.tableColumns.map((col, idx) => (
                  <div key={col.id} className="flex items-center gap-2">
                    <input type="text" value={col.name} readOnly={isReadOnly} onChange={e => updateColumn(idx, { name: e.target.value })} placeholder="Column name"
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-all ${isReadOnly ? roCls + " border-gray-100" : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"}`}
                    />
                    <select value={col.type} disabled={isReadOnly} onChange={e => updateColumn(idx, { type: e.target.value })} className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                      <option>Text</option><option>Number</option><option>Money</option><option>Date</option><option>Select</option>
                    </select>
                    {!isReadOnly && <button type="button" onClick={() => removeColumn(idx)} className="p-1.5 text-gray-300 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </div>
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
