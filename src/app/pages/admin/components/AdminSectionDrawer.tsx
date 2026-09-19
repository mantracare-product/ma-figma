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
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../../lib/useProcessStore";
import { getStoredTeamMembers, TeamMember, TEAM_STORE_EVENT } from "../../../../lib/teamStore";
import { InfoTooltip } from "../../../components/help/InfoTooltip";
import { AdminSelect } from "../../../components/ui/AdminSelect";

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
  selectedModules: Exclude<FieldModule, "deal">[];
  fieldKeys: string[];
  required: boolean;
  requiredStages: string[];
  showAlways: boolean;
  userVisibility: boolean;
  visibleToUserIds: string[];
  scopingRules: ScopingRule[];
  processIds: string[];
  permissions: SectionPermissions;
}

function defaultSectionForm(module: Exclude<FieldModule, "deal">): SectionFormState {
  return {
    title: "",
    description: "",
    iconName: "layers",
    module,
    selectedModules: [module],
    fieldKeys: [],
    required: false,
    requiredStages: [],
    showAlways: true,
    userVisibility: true,
    visibleToUserIds: [],
    scopingRules: [],
    processIds: [],
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

  const primaryMod = (s.module || "client") as Exclude<FieldModule, "deal">;
  const extraMods = ((s.reusableModules || []) as Exclude<FieldModule, "deal">[]).filter((m) => m !== primaryMod);
  const selectedModules: Exclude<FieldModule, "deal">[] = [primaryMod, ...extraMods];

  return {
    title: s.title,
    description: s.description ?? "",
    iconName: s.iconName ?? "layers",
    module: primaryMod,
    selectedModules,
    fieldKeys: s.fieldKeys ?? [],
    required: Boolean(s.required),
    requiredStages: s.requiredStages ? [...s.requiredStages] : [],
    showAlways: s.showAlways !== false,
    userVisibility: s.userVisibility !== false,
    visibleToUserIds: s.visibleToUserIds ? s.visibleToUserIds.map(String) : [],
    scopingRules: rules,
    processIds: s.processIds ? [...s.processIds] : [],
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
  zIndex?: number;
  activeProcessId?: string;
  activeProcessName?: string;
  processStages?: Array<{ id: string; name: string; color?: string }>;
  onClose: () => void;
  onSaved?: (section: SectionDefinition) => void;
}

export function AdminSectionDrawer({
  section,
  initialModule,
  isAdmin = true,
  zIndex = 500,
  activeProcessId,
  activeProcessName,
  processStages,
  onClose,
  onSaved,
}: AdminSectionDrawerProps) {
  const isEdit = Boolean(section);
  const { addCustomSection, updateCustomSection, getAllFields } = useFieldRegistry();
  const hasActiveProcessContext = Boolean(
    activeProcessId || activeProcessName || (processStages && processStages.length > 0)
  );

  const [form, setForm] = useState<SectionFormState>(() => {
    if (isEdit) {
      const init = sectionToForm(section!);
      if (activeProcessId && (!init.processIds || init.processIds.length === 0)) {
        return { ...init, processIds: [activeProcessId] };
      }
      return init;
    }
    const def = defaultSectionForm(initialModule);
    if (activeProcessId) {
      return { ...def, processIds: [activeProcessId] };
    }
    return def;
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => getStoredTeamMembers());
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const teamPickerRef = useRef<HTMLDivElement>(null);

  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [processPickerOpen, setProcessPickerOpen] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [sectionSettingsOpen, setSectionSettingsOpen] = useState(false);
  const [adminControlOpen, setAdminControlOpen] = useState(true);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);
  const [permissionsDropdownOpen, setPermissionsDropdownOpen] = useState(false);
  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);
  const [errors, setErrors] = useState<{ title?: string }>({});
  const modulePickerRef = useRef<HTMLDivElement>(null);
  const processPickerRef = useRef<HTMLDivElement>(null);
  const fieldPickerRef = useRef<HTMLDivElement>(null);

  const isProcessActive = form.selectedModules.includes("process") || form.module === "process";

  useEffect(() => {
    const handleUpdate = () => {
      setAllProcesses(getStoredProcesses());
    };
    const handleTeamUpdate = () => {
      setTeamMembers(getStoredTeamMembers());
    };
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener(TEAM_STORE_EVENT, handleTeamUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("storage", handleTeamUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener(TEAM_STORE_EVENT, handleTeamUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("storage", handleTeamUpdate);
    };
  }, []);

  const toggleModuleSelection = (modVal: Exclude<FieldModule, "deal">) => {
    setForm((p) => {
      const exists = p.selectedModules.includes(modVal);
      if (exists) {
        if (p.selectedModules.length <= 1) return p;
        const next = p.selectedModules.filter((m) => m !== modVal);
        return {
          ...p,
          selectedModules: next,
          module: next[0],
        };
      } else {
        const next = [...p.selectedModules, modVal];
        return {
          ...p,
          selectedModules: next,
        };
      }
    });
  };

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
    if (!isProcessActive) return [];

    // 1. Explicit processStages passed directly
    if (processStages && processStages.length > 0) {
      return processStages.map((s) => ({ id: s.name, name: s.name, color: s.color }));
    }

    // 2. Explicit active process context (by ID or name)
    if (activeProcessId || activeProcessName) {
      const targetProc = allProcesses.find(
        (p) =>
          (activeProcessId && (p.id === activeProcessId || p.name === activeProcessId)) ||
          (activeProcessName &&
            (p.name.toLowerCase() === activeProcessName.toLowerCase() || p.id === activeProcessName))
      );
      if (targetProc && targetProc.stages && targetProc.stages.length > 0) {
        return targetProc.stages.map((st) => ({ id: st.name, name: st.name, color: st.color }));
      }
    }

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
  }, [isProcessActive, form.processIds, availableProcesses, processStages, activeProcessId, activeProcessName, allProcesses]);

  const targetProcessesForRequirement = useMemo(() => {
    if (!isProcessActive) return [];
    if (form.processIds && form.processIds.length > 0 && !form.processIds.includes("all")) {
      const filtered = availableProcesses.filter((p) => form.processIds.includes(p.id) || form.processIds.includes(p.name));
      if (filtered.length > 0) return filtered;
    }
    return availableProcesses.length > 0 ? availableProcesses : allProcesses;
  }, [isProcessActive, form.processIds, availableProcesses, allProcesses]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (modulePickerRef.current && !modulePickerRef.current.contains(e.target as Node)) setModulePickerOpen(false);
      if (processPickerRef.current && !processPickerRef.current.contains(e.target as Node)) setProcessPickerOpen(false);
      if (fieldPickerRef.current && !fieldPickerRef.current.contains(e.target as Node)) setFieldPickerOpen(false);
      if (teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) setTeamPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const moduleFields: FieldDefinition[] = useMemo(() => {
    const fieldsMap = new Map<string, FieldDefinition>();
    form.selectedModules.forEach((mod) => {
      getAllFields(mod).forEach((f) => {
        if (!fieldsMap.has(f.key)) {
          fieldsMap.set(f.key, f);
        }
      });
    });
    return Array.from(fieldsMap.values());
  }, [form.selectedModules, getAllFields]);

  const eligibleFields = useMemo(() => {
    return moduleFields.filter((f) => {
      if (!doesFieldMatchSectionScope(f, form.scopingRules)) return false;
      if (isProcessActive && hasActiveProcessContext && activeProcessId) {
        if (f.processIds && f.processIds.length > 0) {
          const match = f.processIds.includes(activeProcessId) || (activeProcessName && f.processIds.includes(activeProcessName));
          if (!match) return false;
        }
      }
      return true;
    });
  }, [moduleFields, form.scopingRules, isProcessActive, hasActiveProcessContext, activeProcessId, activeProcessName]);

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

    const primaryModule = form.selectedModules[0] || form.module;
    const additionalModules = form.selectedModules.filter((m) => m !== primaryModule);

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
      module: primaryModule,
      source: isEdit && section ? section.source : targetSource,
      createdIn: isEdit && section ? section.createdIn : targetCreatedIn,
      fieldKeys: form.fieldKeys,
      required: form.required,
      requiredStages: (form.selectedModules.includes("process") || form.module === "process") && form.required && form.requiredStages.length > 0 ? form.requiredStages : undefined,
      showAlways: form.showAlways,
      userVisibility: form.userVisibility,
      visibleToUserIds: form.userVisibility !== false && form.visibleToUserIds.length > 0 ? form.visibleToUserIds : undefined,
      scopingRules: form.scopingRules.length > 0 ? form.scopingRules : undefined,
      processIds: (form.selectedModules.includes("process") || form.module === "process") ? (form.processIds.length > 0 ? form.processIds : (activeProcessId ? [activeProcessId] : undefined)) : undefined,
      isReusable: additionalModules.length > 0,
      reusableModules: additionalModules.length > 0 ? additionalModules : undefined,
      permissions: form.permissions,
      industryCategory: legacyCategory,
      industry: legacyIndustry,
      locations: legacyLocations,
    };
    if (isEdit && section) {
      updateCustomSection(primaryModule, section.id, payload);
      onSaved?.({ ...section, ...payload });
    } else {
      const created = addCustomSection(primaryModule, payload);
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 flex" style={{ zIndex, pointerEvents: "none" }}>
      <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div className="flex-1 bg-black/30 backdrop-blur-[1px]" style={{ pointerEvents: "auto" }} onClick={onClose} />
      <div className="flex flex-col bg-white" style={{ width: 540, maxWidth: "100%", height: "100vh", boxShadow: "-4px 0 40px rgba(0,0,0,0.14)", animation: "slideInFromRight 220ms cubic-bezier(0.16,1,0.3,1)", pointerEvents: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{isEdit ? "Edit Section" : "New Custom Section"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sections group fields in record overview profiles</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Module Multi-Select Dropdown */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Module <span className="text-red-500">*</span>
              </label>
              <InfoTooltip text="Select the CRM entity modules this section belongs to. Selecting multiple modules shares this section across them." size="sm" />
            </div>

            <div className="relative" ref={modulePickerRef}>
              <button
                type="button"
                onClick={() => setModulePickerOpen((v) => !v)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-medium flex items-center justify-between transition-all select-none min-h-[40px] cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {form.selectedModules.map((m) => {
                    const opt = MODULE_OPTIONS.find((o) => o.value === m);
                    return (
                      <span key={m} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                        {opt?.label || m}
                      </span>
                    );
                  })}
                  {form.selectedModules.length > 1 && (
                    <span className="text-[10px] text-gray-400 font-medium ml-1">
                      (Shared across {form.selectedModules.length} modules)
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${modulePickerOpen ? "rotate-180" : ""}`} />
              </button>

              {modulePickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden p-1.5">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/80 rounded-md mb-1">
                    Select Target Modules
                  </div>
                  <div className="space-y-0.5">
                    {MODULE_OPTIONS.map((opt) => {
                      const isChecked = form.selectedModules.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleModuleSelection(opt.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                            isChecked ? "bg-blue-50/80 text-blue-900 font-semibold" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Process Workflow Selector (when module includes 'process') */}
          {isProcessActive && (() => {
            const activeProcessList = availableProcesses.length > 0 ? availableProcesses : allProcesses;
            const allSelected = activeProcessList.length > 0 && activeProcessList.every((p) => form.processIds?.includes(p.id));
            const noneSelected = !form.processIds || form.processIds.length === 0;

            const toggleSelectAllProcesses = () => {
              if (allSelected) {
                setForm((p) => ({ ...p, processIds: [] }));
              } else {
                setForm((p) => ({ ...p, processIds: activeProcessList.map((proc) => proc.id) }));
              }
            };

            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="block text-xs font-semibold text-gray-700">
                      Process Workflow
                    </label>
                    <InfoTooltip text="Select the process workflows this section applies to." size="sm" />
                  </div>
                  {activeProcessList.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllProcesses}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                <div className="relative" ref={processPickerRef}>
                  <button
                    type="button"
                    onClick={() => setProcessPickerOpen((v) => !v)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium flex items-center justify-between transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {noneSelected ? (
                        <span className="text-gray-400 text-xs">
                          Select process workflows...
                        </span>
                      ) : allSelected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          <span>All ({activeProcessList.length}) Processes Selected</span>
                        </span>
                      ) : (
                        form.processIds.map((pId) => {
                          const proc = allProcesses.find((p) => p.id === pId);
                          return (
                            <span key={pId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              <span className="truncate max-w-[150px]">{proc?.name || `Process #${pId}`}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${processPickerOpen ? "rotate-180" : ""}`} />
                  </button>

                  {processPickerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden p-1.5 max-h-60 overflow-y-auto">
                      {/* Select All Row */}
                      <button
                        type="button"
                        onClick={toggleSelectAllProcesses}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none font-semibold ${
                          allSelected ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>Select All Processes ({activeProcessList.length})</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          allSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                        }`}>
                          {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>

                      <div className="my-1 border-t border-gray-100" />

                      <div className="space-y-0.5">
                        {activeProcessList.map((proc) => {
                          const isChecked = form.processIds && form.processIds.includes(proc.id);
                          return (
                            <button
                              key={proc.id}
                              type="button"
                              onClick={() => {
                                setForm((p) => {
                                  const current = p.processIds || [];
                                  const exists = current.includes(proc.id);
                                  const next = exists
                                    ? current.filter((id) => id !== proc.id)
                                    : [...current, proc.id];
                                  return { ...p, processIds: next };
                                });
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                                isChecked ? "bg-blue-50/80 text-blue-900 font-semibold" : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span className="truncate pr-2">{proc.name}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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

          {/* Section Settings Dropdown (Global Rules & Configurations) — Placed BELOW Field Addition */}
          <div className="pt-2 border-t border-gray-100">
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setSectionSettingsOpen((v) => !v)}
                className="w-full px-4 py-3 bg-gray-50/80 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Settings2 className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        {isAdmin ? "Global Rules" : "Section Settings"}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {form.required && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Required
                          </span>
                        )}
                        {form.showAlways && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Show Always
                          </span>
                        )}
                        {form.userVisibility !== false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            User Visible
                          </span>
                        )}
                        {form.selectedModules.length > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            Shared ({form.selectedModules.length})
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      Configure global section rules and field visibility
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${sectionSettingsOpen ? "rotate-180" : ""}`} />
              </button>

              {sectionSettingsOpen && (
                <div className="p-4 space-y-4 border-t border-gray-100 bg-white">
                  {/* 1. Required Section */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.required}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((p) => ({
                              ...p,
                              required: checked,
                              ...(checked ? { showAlways: true } : {}),
                            }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-800">Required section</span>
                      </label>
                      <InfoTooltip text="Users must complete all required fields within this section." size="sm" />
                    </div>

                    {form.required && isProcessActive && (
                      <div className="mt-2.5 ml-6 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                            Process Stage Requirements
                          </span>
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            {targetProcessesForRequirement.length} {targetProcessesForRequirement.length === 1 ? "Process" : "Processes"}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {targetProcessesForRequirement.map((proc) => {
                            const procStages = proc.stages && proc.stages.length > 0 ? proc.stages : [
                              { id: "initial", name: "Initial Contact" },
                              { id: "review", name: "Insurance Verify" },
                              { id: "schedule", name: "Schedule Appointment" },
                              { id: "last", name: "last stage" },
                            ];
                            const selectedStagesInProc = procStages.filter((st) => form.requiredStages.includes(st.name));
                            const allStagesSelected = selectedStagesInProc.length === procStages.length;

                            const toggleSelectAllStagesInProc = () => {
                              setForm((p) => {
                                const currentStages = p.requiredStages || [];
                                if (allStagesSelected) {
                                  const remaining = currentStages.filter((st) => !procStages.some((s) => s.name === st));
                                  return { ...p, requiredStages: remaining };
                                } else {
                                  const procStageNames = procStages.map((s) => s.name);
                                  const otherStages = currentStages.filter((st) => !procStageNames.includes(st));
                                  return { ...p, requiredStages: [...otherStages, ...procStageNames] };
                                }
                              });
                            };

                            const toggleStage = (stageName: string) => {
                              setForm((p) => {
                                const currentStages = p.requiredStages || [];
                                const exists = currentStages.includes(stageName);
                                const next = exists
                                  ? currentStages.filter((s) => s !== stageName)
                                  : [...currentStages, stageName];
                                return { ...p, requiredStages: next };
                              });
                            };

                            return (
                              <div key={proc.id} className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                    <span className="text-xs font-bold text-gray-900 truncate" title={proc.name}>
                                      {proc.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={toggleSelectAllStagesInProc}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                                  >
                                    {allStagesSelected ? "Deselect All" : "Select All"}
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Required at Stages ({selectedStagesInProc.length} of {procStages.length})
                                  </label>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {procStages.map((st) => {
                                      const isChecked = form.requiredStages.includes(st.name);
                                      return (
                                        <button
                                          key={st.id || st.name}
                                          type="button"
                                          onClick={() => toggleStage(st.name)}
                                          className={`px-2.5 py-1.5 rounded-lg border text-left text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                            isChecked
                                              ? "bg-amber-100/90 border-amber-300 text-amber-950 font-semibold shadow-2xs"
                                              : "bg-white/80 border-gray-200 text-gray-700 hover:bg-white"
                                          }`}
                                        >
                                          <span className="truncate">{st.name}</span>
                                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                            isChecked ? "bg-amber-600 border-amber-600 text-white" : "border-gray-300 bg-white"
                                          }`}>
                                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <p className="text-[10px] text-amber-800/80 leading-relaxed">
                                  {selectedStagesInProc.length === 0 ? (
                                    <span className="text-gray-400 italic">No stages selected for this process workflow.</span>
                                  ) : allStagesSelected ? (
                                    <>Mandatory across <strong>all {procStages.length} stages</strong> in {proc.name}.</>
                                  ) : (
                                    <>Mandatory when entering <strong>{selectedStagesInProc.map((s) => s.name).join(", ")}</strong> in {proc.name}.</>
                                  )}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Show Always Checkbox */}
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.showAlways}
                        onChange={(e) => setForm((p) => ({ ...p, showAlways: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-800">Show always</span>
                    </label>
                    <InfoTooltip text="Display the section in the form even if none of its fields are filled in." size="sm" />
                  </div>

                  {/* 3. User Visibility Toggle (Admin Mode) */}
                  {isAdmin && (
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.userVisibility !== false}
                          onChange={(e) => setForm((p) => ({ ...p, userVisibility: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-800">User Visibility</span>
                      </label>
                      <InfoTooltip text="Enable this to allow users in client records to restrict visibility of this section to specific team members." size="sm" />
                    </div>
                  )}

                  {/* User Visibility & Team Members Selection (Client Mode) */}
                  {!isAdmin && form.userVisibility !== false && (
                    <div className="space-y-3 p-3.5 rounded-xl bg-gray-50/80 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 select-none">
                          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-xs font-semibold text-gray-800">User Visibility</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </div>
                        <InfoTooltip text="Specify which team members are permitted to view and edit this section." size="sm" />
                      </div>

                      {/* Team Member Dropdown */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                          Assigned Team Members ({form.visibleToUserIds.length > 0 ? form.visibleToUserIds.length : "All"})
                        </label>

                        <div className="relative" ref={teamPickerRef}>
                          <button
                            type="button"
                            onClick={() => setTeamPickerOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 focus:border-blue-500 rounded-xl text-xs font-semibold text-gray-800 transition-all cursor-pointer shadow-2xs outline-none group text-left"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                {form.visibleToUserIds.length > 0 ? form.visibleToUserIds.length : "👥"}
                              </div>
                              <span className="truncate text-gray-700">
                                {form.visibleToUserIds.length === 0
                                  ? "Visible to all team members"
                                  : `${form.visibleToUserIds.length} team ${form.visibleToUserIds.length === 1 ? "member" : "members"} selected`}
                              </span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-transform duration-150 shrink-0 ml-2 ${teamPickerOpen ? "rotate-180" : ""}`} />
                          </button>

                          {teamPickerOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                              <div className="p-2.5 bg-gray-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700">Select Team Members</span>
                                {form.visibleToUserIds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, visibleToUserIds: [] }))}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                  >
                                    Reset to All
                                  </button>
                                )}
                              </div>
                              <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                                {teamMembers.map((member) => {
                                  const idStr = String(member.id);
                                  const isAssigned = form.visibleToUserIds.includes(idStr);
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => {
                                        if (isAssigned) {
                                          setForm((p) => ({
                                            ...p,
                                            visibleToUserIds: p.visibleToUserIds.filter((id) => id !== idStr),
                                          }));
                                        } else {
                                          setForm((p) => ({
                                            ...p,
                                            visibleToUserIds: [...p.visibleToUserIds, idStr],
                                          }));
                                        }
                                      }}
                                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                        isAssigned ? "bg-blue-50 text-blue-800 font-semibold" : "hover:bg-gray-50 text-gray-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                          {member.name.charAt(0)}
                                        </div>
                                        <div className="truncate">
                                          <span className="block truncate font-medium">{member.name}</span>
                                          {member.role && (
                                            <span className="text-[10px] text-gray-400 block truncate">
                                              {member.role}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                        isAssigned ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                                      }`}>
                                        {isAssigned && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Selected Member Badges */}
                        {form.visibleToUserIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {form.visibleToUserIds.map((userId) => {
                              const member = teamMembers.find((m) => String(m.id) === String(userId));
                              const memberName = member?.name || `User #${userId}`;
                              return (
                                <div
                                  key={userId}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 text-gray-800 text-xs font-medium rounded-lg shadow-2xs"
                                >
                                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px]">
                                    {memberName.charAt(0)}
                                  </div>
                                  <span className="truncate max-w-[140px]">{memberName}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setForm((p) => ({
                                        ...p,
                                        visibleToUserIds: p.visibleToUserIds.filter((id) => id !== userId),
                                      }))
                                    }
                                    className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer ml-0.5"
                                    title="Remove team member"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isAdmin && form.userVisibility === false && (
                    <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-xs text-gray-500 flex items-center justify-between">
                      <span className="font-medium">User Visibility</span>
                      <span className="text-[11px] text-gray-400 italic">Disabled by Administrator</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
