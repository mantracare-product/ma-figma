/**
 * AdminSectionDrawer.tsx
 * Path: src/app/pages/admin/components/AdminSectionDrawer.tsx
 *
 * Slide-in right-panel for creating or editing a custom SectionDefinition.
 * Rendered by AdminCustomFields.tsx at /admin/custom-fields (Sections tab).
 *
 * Sections group fields in the client profile view (DraggableOverviewSections).
 * The canonical section shape uses fieldKeys (machine keys), not field IDs.
 * This is intentional: machine keys remain stable across exports and migrations,
 * while numeric IDs can collide between environments.
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { X, ChevronDown, Check, Plus, Trash2, Layers, Settings2, GripVertical, Globe, Lock, Shield, GitBranch, Sparkles, CheckCircle2 } from "lucide-react";
import type {
  FieldDefinition, FieldModule, SectionDefinition, ScopingRule, SectionPermissions,
} from "../../../context/FieldRegistryContext";
import { useFieldRegistry } from "../../../context/FieldRegistryContext";
import { MODULE_OPTIONS } from "./AdminFieldDrawer";
import { AdminScopingRulesEditor } from "./AdminScopingRulesEditor";
import { ProcessMultiSelect } from "./ProcessMultiSelect";
import { StageMultiSelect } from "./StageMultiSelect";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../../lib/useProcessStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";

/**
 * Checks whether a field definition matches the section's scoping rules.
 * Global fields (no scoping rules or universal "All") match all sections.
 * Global sections (no scoping rules) accept all fields in the module.
 */
export function doesFieldMatchSectionScope(
  field: FieldDefinition,
  sectionRules: ScopingRule[]
): boolean {
  // If section has no scoping rules, it is global -> accepts all fields
  if (!sectionRules || sectionRules.length === 0) return true;

  // Determine field's scoping rules (either multi-rule or legacy properties)
  let fieldRules: ScopingRule[] = field.scopingRules ? [...field.scopingRules] : [];
  if (
    fieldRules.length === 0 &&
    (field.industryCategory || field.industry || (field.locations && field.locations.length > 0))
  ) {
    fieldRules = [
      {
        industryCategory: field.industryCategory || "All",
        industries: field.industry && field.industry !== "All" ? [field.industry] : [],
        locations:
          field.locations && field.locations.length > 0 && !field.locations.includes("All")
            ? field.locations
            : [],
      },
    ];
  }

  // If field has no scoping rules, it is global -> matches all sections
  if (fieldRules.length === 0) return true;

  const isFieldUniversal = fieldRules.every(
    (r) =>
      (!r.industryCategory || r.industryCategory === "All") &&
      (!r.industries || r.industries.length === 0) &&
      (!r.locations || r.locations.length === 0)
  );
  if (isFieldUniversal) return true;

  // Check if any section rule overlaps with any field rule
  return sectionRules.some((sRule) => {
    const sCat = sRule.industryCategory?.trim() || "All";
    const sInds = (sRule.industries || []).filter((i) => i && i !== "All");
    const sLocs = (sRule.locations || []).filter((l) => l && l !== "All");

    if (sCat === "All" && sInds.length === 0 && sLocs.length === 0) return true;

    return fieldRules.some((fRule) => {
      const fCat = fRule.industryCategory?.trim() || "All";
      const fInds = (fRule.industries || []).filter((i) => i && i !== "All");
      const fLocs = (fRule.locations || []).filter((l) => l && l !== "All");

      // Category check
      if (sCat !== "All" && fCat !== "All" && sCat.toLowerCase() !== fCat.toLowerCase()) {
        return false;
      }

      // Industries check
      if (sInds.length > 0 && fInds.length > 0) {
        const sharedInd = sInds.some((si) =>
          fInds.some((fi) => fi.toLowerCase() === si.toLowerCase())
        );
        if (!sharedInd) return false;
      }

      // Locations check
      if (sLocs.length > 0 && fLocs.length > 0) {
        const sharedLoc = sLocs.some((sl) =>
          fLocs.some((fl) => fl.toLowerCase() === sl.toLowerCase())
        );
        if (!sharedLoc) return false;
      }

      return true;
    });
  });
}

interface SectionFormState {
  title: string;
  description: string;
  iconName: SectionDefinition["iconName"];
  module: Exclude<FieldModule, "deal">;
  fieldKeys: string[];
  required: boolean;
  requiredStages: string[];
  userVisibility: boolean;
  scopingRules: ScopingRule[];
  processIds: string[];
  isReusable: boolean;
  reusableModules: Exclude<FieldModule, "deal">[];
  permissions: SectionPermissions;
}

function defaultSectionForm(module: Exclude<FieldModule, "deal">): SectionFormState {
  return {
    title: "",
    description: "",
    iconName: "layers",
    module,
    fieldKeys: [],
    required: false,
    requiredStages: [],
    userVisibility: true,
    scopingRules: [],
    processIds: [],
    isReusable: false,
    reusableModules: [],
    permissions: {
      canHide: true,
      canEdit: true,
      canAddFields: true,
      canDelete: true,
    },
  };
}

function sectionToForm(s: SectionDefinition): SectionFormState {
  let rules: ScopingRule[] = s.scopingRules ? [...s.scopingRules] : [];
  if (rules.length === 0 && (s.industryCategory || s.industry || (s.locations && s.locations.length > 0))) {
    rules = [
      {
        id: `rule_legacy_${Date.now()}`,
        industryCategory: s.industryCategory || "All",
        industries: s.industry && s.industry !== "All" ? [s.industry] : [],
        locations: s.locations && s.locations.length > 0 && !s.locations.includes("All") ? s.locations : [],
      },
    ];
  }

  return {
    title: s.title, description: s.description ?? "",
    iconName: s.iconName ?? "layers",
    module: s.module as Exclude<FieldModule, "deal">,
    fieldKeys: s.fieldKeys ?? [],
    required: Boolean(s.required),
    requiredStages: s.requiredStages ? [...s.requiredStages] : [],
    userVisibility: s.userVisibility !== false,
    scopingRules: rules,
    processIds: s.processIds ? [...s.processIds] : [],
    isReusable: Boolean(s.isReusable),
    reusableModules: (s.reusableModules as Exclude<FieldModule, "deal">[]) || [],
    permissions: {
      canHide: s.permissions?.canHide !== false,
      canEdit: s.permissions?.canEdit !== false,
      canAddFields: s.permissions?.canAddFields !== false,
      canDelete: s.permissions?.canDelete !== false,
    },
  };
}

export interface AdminSectionDrawerProps {
  section: SectionDefinition | null;
  initialModule: Exclude<FieldModule, "deal">;
  isAdmin?: boolean;
  onClose: () => void;
  onSaved?: (section: SectionDefinition) => void;
}

export function AdminSectionDrawer({ section, initialModule, isAdmin = true, onClose, onSaved }: AdminSectionDrawerProps) {
  const { addCustomSection, updateCustomSection, getAllFields } = useFieldRegistry();
  const isEdit = section !== null;

  const [form, setForm] = useState<SectionFormState>(
    isEdit ? sectionToForm(section!) : defaultSectionForm(initialModule),
  );
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [sectionSettingsOpen, setSectionSettingsOpen] = useState(false);
  const [adminControlOpen, setAdminControlOpen] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);
  const [errors, setErrors] = useState<{ title?: string }>({});
  const modulePickerRef = useRef<HTMLDivElement>(null);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setAllProcesses(getStoredProcesses());
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const availableProcesses = useMemo(() => {
    if (!form.scopingRules || form.scopingRules.length === 0) {
      return allProcesses;
    }
    return allProcesses.filter((proc) => {
      return form.scopingRules.some((rule) => {
        const rCat = rule.industryCategory?.trim();
        const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
        const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");
        const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
        const hasInd = rInds.length > 0;
        const hasLoc = rLocs.length > 0;
        if (!hasCat && !hasInd && !hasLoc) return true;
        if (hasCat && proc.industryCategory && proc.industryCategory !== "All") {
          if (proc.industryCategory.toLowerCase() !== rCat!.toLowerCase()) return false;
        }
        if (hasInd && proc.industry && proc.industry !== "All") {
          if (!rInds.some((ind) => ind.toLowerCase() === proc.industry!.toLowerCase())) return false;
        }
        if (hasLoc && proc.locations && proc.locations.length > 0 && !proc.locations.includes("All")) {
          const hasLocationOverlap = proc.locations.some((pl) =>
            rLocs.some((rl) => rl.toLowerCase() === pl.toLowerCase())
          );
          if (!hasLocationOverlap) return false;
        }
        return true;
      });
    });
  }, [allProcesses, form.scopingRules]);

  const availableStagesForProcess = useMemo(() => {
    if (form.module !== "process") return [];
    const targetProcesses = form.processIds.length > 0
      ? availableProcesses.filter((p) => form.processIds.includes(p.id) || form.processIds.includes(p.name))
      : availableProcesses;

    const stageMap = new Map<string, string>();
    targetProcesses.forEach((p) => {
      (p.stages || []).forEach((st) => {
        if (st.name && !stageMap.has(st.name)) {
          stageMap.set(st.name, st.name);
        }
      });
    });
    return Array.from(stageMap.keys()).map((name) => ({ id: name, name }));
  }, [form.module, form.processIds, availableProcesses]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) setFieldPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const moduleFields: FieldDefinition[] = getAllFields(form.module);
  const modLabel = MODULE_OPTIONS.find(m => m.value === form.module)?.label ?? form.module;

  const eligibleFields = useMemo(() => {
    return moduleFields.filter((f) => doesFieldMatchSectionScope(f, form.scopingRules));
  }, [moduleFields, form.scopingRules]);

  const toggleFieldKey = (key: string) => {
    setForm(p => ({
      ...p,
      fieldKeys: p.fieldKeys.includes(key)
        ? p.fieldKeys.filter(k => k !== key)
        : [...p.fieldKeys, key],
    }));
  };

  // Drag & drop field reordering
  const [draggedKeyIdx, setDraggedKeyIdx] = useState<number | null>(null);
  const [dragOverKeyIdx, setDragOverKeyIdx] = useState<number | null>(null);
  const draggedKeyIdxRef = useRef<number | null>(null);

  const handleFieldDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    draggedKeyIdxRef.current = index;
    setDraggedKeyIdx(index);
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFieldDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKeyIdx !== index) {
      setDragOverKeyIdx(index);
    }
  };

  const handleFieldDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverKeyIdx !== index) {
      setDragOverKeyIdx(index);
    }
  };

  const handleFieldDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    let sourceIdx = draggedKeyIdxRef.current;
    if (sourceIdx === null || isNaN(sourceIdx)) {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (dataStr) {
        const parsed = parseInt(dataStr, 10);
        if (!isNaN(parsed)) sourceIdx = parsed;
      }
    }
    if ((sourceIdx === null || isNaN(sourceIdx)) && draggedKeyIdx !== null) {
      sourceIdx = draggedKeyIdx;
    }

    if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== dropIndex) {
      setForm(p => {
        const keys = [...p.fieldKeys];
        if (sourceIdx! < 0 || sourceIdx! >= keys.length || dropIndex < 0 || dropIndex >= keys.length) {
          return p;
        }
        const [moved] = keys.splice(sourceIdx!, 1);
        keys.splice(dropIndex, 0, moved);
        return { ...p, fieldKeys: keys };
      });
    }

    draggedKeyIdxRef.current = null;
    setDraggedKeyIdx(null);
    setDragOverKeyIdx(null);
  };

  const handleFieldDragEnd = (e?: React.DragEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    draggedKeyIdxRef.current = null;
    setDraggedKeyIdx(null);
    setDragOverKeyIdx(null);
  };

  const validate = (): boolean => {
    const errs: { title?: string } = {};
    if (!form.title.trim()) errs.title = "Section name is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

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

    const targetSource: "template" | "custom" = isAdmin ? "template" : "custom";
    const targetCreatedIn: "admin" | "client" = isAdmin ? "admin" : "client";

    const payload: Omit<SectionDefinition, "id" | "createdAt"> & { source: "system" | "custom" | "template"; createdIn?: "admin" | "client" } = {
      title: form.title.trim(),
      description: form.description.trim(),
      iconName: form.iconName || "layers",
      module: form.module,
      source: isEdit && section ? section.source : targetSource,
      createdIn: isEdit && section ? section.createdIn : targetCreatedIn,
      fieldKeys: form.fieldKeys,
      required: form.required,
      requiredStages: form.module === "process" && form.required && form.requiredStages.length > 0 ? form.requiredStages : undefined,
      userVisibility: form.userVisibility,
      scopingRules: form.scopingRules.length > 0 ? form.scopingRules : undefined,
      processIds: form.module === "process" && form.processIds.length > 0 ? form.processIds : undefined,
      isReusable: form.isReusable,
      reusableModules: form.isReusable && form.reusableModules.length > 0 ? form.reusableModules : undefined,
      permissions: form.permissions,
      industryCategory: legacyCategory,
      industry: legacyIndustry,
      locations: legacyLocations,
    };
    if (isEdit && section) {
      updateCustomSection(form.module, section.id, payload);
      onSaved?.({ ...section, ...payload });
    } else {
      const created = addCustomSection(form.module, payload);
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ pointerEvents: "none" }}>
      <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div className="flex-1 bg-black/30 backdrop-blur-[1px]" style={{ pointerEvents: "auto" }} onClick={onClose} />
      <div className="flex flex-col bg-white" style={{ width: 540, maxWidth: "100%", height: "100vh", boxShadow: "-4px 0 40px rgba(0,0,0,0.14)", animation: "slideInFromRight 220ms cubic-bezier(0.16,1,0.3,1)", pointerEvents: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{isEdit ? "Edit Section" : "New Custom Section"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sections group fields in the {modLabel} profile view</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Module */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Module <span className="text-red-500">*</span></label>
            <div className="relative" ref={modulePickerRef}>
              <button type="button" disabled={isEdit}
                onClick={() => !isEdit && setModulePickerOpen(v => !v)}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white flex items-center justify-between transition-all ${isEdit ? "border-gray-100 bg-gray-50 cursor-not-allowed" : "border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"}`}
              >
                <span className={`font-medium ${isEdit ? "text-gray-400" : "text-[#111827]"}`}>{modLabel}</span>
                {!isEdit && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${modulePickerOpen ? "rotate-180" : ""}`} />}
              </button>
              {modulePickerOpen && !isEdit && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {MODULE_OPTIONS.map(mod => (
                    <button key={mod.value} type="button"
                      onClick={() => { setForm(p => ({ ...p, module: mod.value, fieldKeys: [] })); setModulePickerOpen(false); }}
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
                            <InfoTooltip text="Define which tenant organizations have visibility to this section." size="sm" />
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${scopeDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {scopeDropdownOpen && (
                        <div className="p-3 border-t border-gray-100 bg-white">
                          <AdminScopingRulesEditor
                            rules={form.scopingRules}
                            onChange={(rules) => setForm((p) => ({ ...p, scopingRules: rules }))}
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
                            <InfoTooltip text="Configure what tenant users are permitted to do with this section." size="sm" />
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
                                className="flex items-center gap-1.5 select-none cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canHide !== false}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: { ...p.permissions, canHide: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Hide</span>
                              </label>
                              <InfoTooltip text="Tenant users can choose to hide or collapse this section in record overviews." size="sm" />
                            </div>

                            {/* 2. Edit permission */}
                            <div className="flex items-center">
                              <label
                                className="flex items-center gap-1.5 select-none cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canEdit !== false}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: { ...p.permissions, canEdit: e.target.checked }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Edit</span>
                              </label>
                              <InfoTooltip text="Tenant users can rename the section title and edit its description." size="sm" />
                            </div>

                            {/* 3. Add permission */}
                            <div className="flex items-center">
                              <label
                                className="flex items-center gap-1.5 select-none cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canAdd !== false && form.permissions.canAddFields !== false}
                                  onChange={(e) => setForm((p) => ({
                                    ...p,
                                    permissions: {
                                      ...p.permissions,
                                      canAdd: e.target.checked,
                                      canAddFields: e.target.checked,
                                    }
                                  }))}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-xs font-medium text-gray-800">Add</span>
                              </label>
                              <InfoTooltip text="Tenant users can add more custom fields to this section in client and record profiles." size="sm" />
                            </div>

                            {/* 4. Delete permission */}
                            <div className="flex items-center">
                              <label
                                className="flex items-center gap-1.5 select-none cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.permissions.canDelete !== false}
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
                              <InfoTooltip text="Section will be deleted from the user only, not admin." size="sm" />
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

          {/* Processes Selection (Applicable when Module is Process - rendered as simple multi-select dropdown below Admin Control) */}
          {form.module === "process" && (
            <ProcessMultiSelect
              selectedProcessIds={form.processIds}
              onChange={(processIds) => setForm((p) => ({ ...p, processIds }))}
              availableProcesses={availableProcesses}
              hasScopeRules={Boolean(isAdmin && form.scopingRules && form.scopingRules.length > 0)}
            />
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Section Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Insurance Details"
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm transition-all ${errors.title ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 focus:outline-none focus:ring-2" : "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
            />
            {errors.title && <p className="text-[11px] text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Description <span className="text-[10px] font-normal text-gray-400">(optional)</span>
            </label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Briefly describe what this section contains"
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Section Settings Dropdown (Global Rule) */}
          <div className="pt-2 border-t border-gray-100">
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setSectionSettingsOpen((v) => !v)}
                className="w-full px-4 py-3 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings2 className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Section Settings</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {form.required && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Required
                          </span>
                        )}
                        {form.userVisibility !== false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            User Visible
                          </span>
                        )}
                        {form.isReusable && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Reusable Global
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Configure global section rules and cross-module availability
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${sectionSettingsOpen ? "rotate-180" : ""}`} />
              </button>

              {sectionSettingsOpen && (
                <div className="p-4 space-y-4 border-t border-gray-100 bg-white">
                  {/* 1. Required Section */}
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.required}
                        onChange={(e) => setForm((p) => ({ ...p, required: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Required section</span>
                        <p className="text-xs text-gray-500 mt-0.5">Users must complete all required fields within this section</p>
                      </div>
                    </label>

                    {form.required && form.module === "process" && (
                      <div className="ml-7 pt-1">
                        <StageMultiSelect
                          selectedStages={form.requiredStages}
                          onChange={(requiredStages) => setForm((p) => ({ ...p, requiredStages }))}
                          availableStages={availableStagesForProcess}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. User Visibility */}
                  <label className="flex items-start gap-3 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.userVisibility !== false}
                      onChange={(e) => setForm((p) => ({ ...p, userVisibility: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">User Visibility</span>
                      <p className="text-xs text-gray-500 mt-0.5">Configure whether this section is visible to end users</p>
                    </div>
                  </label>

                  {/* 3. Make reusable across other modules */}
                  <div className="pt-3 border-t border-gray-100">
                    <label className="flex items-start gap-3 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isReusable}
                        onChange={(e) => setForm((p) => ({ ...p, isReusable: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Make reusable across other modules</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Enables this section and its assigned fields to appear across other modules (e.g. Clients, Processes, Appointments, Call Logs, Services, Organizations).
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Field assignment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Fields in this section
                <span className="ml-1.5 text-[10px] font-normal text-gray-400">({form.fieldKeys.length} selected)</span>
              </label>
              <div className="relative" ref={fieldPickerRef}>
                <button type="button" onClick={() => setFieldPickerOpen(v => !v)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />Add fields
                </button>
                {fieldPickerOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col" style={{ width: 300, maxHeight: 300 }}>
                    <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">Available Fields</span>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {form.scopingRules.length > 0 ? "Filtered by scope" : "All fields"}
                      </span>
                    </div>
                    <div className="overflow-y-auto p-1 divide-y divide-gray-50">
                      {eligibleFields.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-gray-400 italic text-center">
                          No fields match this section's scope.
                        </p>
                      ) : (
                        eligibleFields.map(f => (
                          <button key={f.key} type="button"
                            onClick={() => toggleFieldKey(f.key)}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${form.fieldKeys.includes(f.key) ? "bg-blue-50 text-blue-700 font-semibold" : "text-[#111827]"}`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="truncate block font-medium">{f.label}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{f.key}</span>
                            </div>
                            {form.fieldKeys.includes(f.key) && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {form.fieldKeys.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <Layers className="w-4 h-4 text-gray-300" />
                <p className="text-sm text-gray-400">No fields added yet. Click "Add fields" above.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {form.fieldKeys.map((key, idx) => {
                  const fieldDef = moduleFields.find(f => f.key === key);
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => handleFieldDragStart(e, idx)}
                      onDragOver={(e) => handleFieldDragOver(e, idx)}
                      onDragEnter={(e) => handleFieldDragEnter(e, idx)}
                      onDrop={(e) => handleFieldDrop(e, idx)}
                      onDragEnd={handleFieldDragEnd}
                      className={`group flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg border transition-all select-none cursor-grab active:cursor-grabbing ${
                        dragOverKeyIdx === idx
                          ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-400/20 shadow-xs"
                          : draggedKeyIdx === idx
                          ? "opacity-30 border-dashed border-blue-400 bg-white"
                          : "border-gray-100 hover:border-gray-200 hover:bg-white"
                      }`}
                    >
                      <div
                        className="text-gray-400 group-hover:text-gray-600 p-0.5 pointer-events-none flex items-center justify-center shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4 pointer-events-none" />
                      </div>
                      <div className="flex-1 min-w-0 pointer-events-none">
                        <p className="text-sm font-medium text-[#111827] truncate">{fieldDef?.label ?? key}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{key}</p>
                      </div>
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFieldKey(key);
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50 shrink-0"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="px-5 py-2 bg-[#111827] text-white text-sm font-semibold rounded-lg hover:bg-[#1f2937] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isEdit ? "Save Changes" : "Create Section"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSectionDrawer;
