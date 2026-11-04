/**
 * RoleStudioModal.tsx
 * Path: src/app/pages/admin/components/RoleStudioModal.tsx
 *
 * Full-screen / large studio modal for granular role permissions configuration.
 * Matrix covers standard modules, operational modules, and settings sub-pages
 * with customizable CRUD + Import/Export permissions and scope limits.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Users,
  Workflow,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Settings,
  Sliders,
  CheckSquare,
  Calendar,
  Tag,
  Building2,
  Users2,
  CreditCard,
  Bot,
  Phone,
  SlidersHorizontal,
  Share2,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  getIndustriesForCategory,
} from "../../../../data/industryReferenceData";

export type PermissionScope = "deny" | "own" | "department" | "all" | "allow";

export const STANDARD_MODULES = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "processes", label: "Processes", icon: Workflow },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "knowledge_base", label: "Knowledge Base", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export const EXTRA_MODULES = [
  { id: "process_settings", label: "Process Settings", icon: Sliders },
  { id: "web_forms", label: "Web Forms", icon: CheckSquare },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "products_services", label: "Product/Services", icon: Tag },
] as const;

export const SETTINGS_SUB_PAGES = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team", icon: Users2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "ai_voices_models", label: "AI Voices / Models", icon: Bot },
  { id: "numbers", label: "Numbers", icon: Phone },
  { id: "custom_fields", label: "Custom Fields", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Share2 },
  { id: "audit_logs", label: "Audit Logs", icon: FileText },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;

export interface ActionItem {
  id: string;
  label: string;
}

export const FULL_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "add", label: "Add" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "export", label: "Export" },
  { id: "import", label: "Import" },
];

export const FOUR_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "add", label: "Add" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

export const SETTINGS_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "edit", label: "Edit" },
];

export interface ModulePermissionConfig {
  scope: PermissionScope;
  actions: Record<string, boolean>;
}

export interface RolePermissionsState {
  roleName: string;
  category: string;
  industry: string;
  description: string;
  permissions: Record<string, ModulePermissionConfig>;
}

interface RoleStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: {
    id?: string;
    roleName: string;
    category: string;
    industry: string;
    description?: string;
    isSystem?: boolean;
    permissions?: Record<string, ModulePermissionConfig>;
  } | null;
  onSave: (roleData: {
    id?: string;
    roleName: string;
    category: string;
    industry: string;
    description: string;
    permissions: Record<string, ModulePermissionConfig>;
  }) => void;
}

export function RoleStudioModal({
  isOpen,
  onClose,
  initialRole,
  onSave,
}: RoleStudioModalProps) {
  const [roleName, setRoleName] = useState("");
  const [category, setCategory] = useState("Healthcare");
  const [industry, setIndustry] = useState("Hospital & Clinics");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"standard" | "operational" | "settings">("standard");

  // Dynamic available industries
  const availableIndustries = useMemo(() => {
    return getIndustriesForCategory(category);
  }, [category]);

  // Initial permissions builder
  const createDefaultPermissions = (preset: "full" | "standard" | "viewonly" = "standard") => {
    const perm: Record<string, ModulePermissionConfig> = {};

    const allModuleKeys = [
      ...STANDARD_MODULES.map((m) => m.id),
      ...EXTRA_MODULES.map((m) => m.id),
      ...SETTINGS_SUB_PAGES.map((m) => m.id),
    ];

    allModuleKeys.forEach((modId) => {
      const isSettings = SETTINGS_SUB_PAGES.some((s) => s.id === modId);
      const isStandard = STANDARD_MODULES.some((s) => s.id === modId);

      const defaultScope: PermissionScope =
        preset === "full" ? "all" : preset === "viewonly" ? "own" : "department";

      const actions: Record<string, boolean> = {};
      const actionList = isSettings ? SETTINGS_ACTIONS : isStandard ? FULL_ACTIONS : FOUR_ACTIONS;

      actionList.forEach((act) => {
        actions[act.id] = preset === "full" ? true : act.id === "read";
      });

      perm[modId] = {
        scope: defaultScope,
        actions,
      };
    });

    return perm;
  };

  const [permissions, setPermissions] = useState<Record<string, ModulePermissionConfig>>(() =>
    createDefaultPermissions("standard")
  );

  // Sync state when initialRole opens
  useEffect(() => {
    if (initialRole) {
      setRoleName(initialRole.roleName || "");
      setCategory(initialRole.category || "Healthcare");
      setIndustry(initialRole.industry || "Hospital & Clinics");
      setDescription(initialRole.description || "");
      if (initialRole.permissions && Object.keys(initialRole.permissions).length > 0) {
        setPermissions(initialRole.permissions);
      } else {
        setPermissions(
          createDefaultPermissions(initialRole.isSystem ? "full" : "standard")
        );
      }
    } else {
      setRoleName("");
      setCategory("Healthcare");
      setIndustry("Hospital & Clinics");
      setDescription("");
      setPermissions(createDefaultPermissions("standard"));
    }
  }, [initialRole, isOpen]);

  // Scope toggle handler
  const handleScopeChange = (moduleId: string, newScope: PermissionScope) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        scope: newScope,
      },
    }));
  };

  // Action checkbox handler
  const handleActionToggle = (moduleId: string, actionId: string) => {
    setPermissions((prev) => {
      const mod = prev[moduleId] || { scope: "department", actions: {} };
      return {
        ...prev,
        [moduleId]: {
          ...mod,
          actions: {
            ...mod.actions,
            [actionId]: !mod.actions[actionId],
          },
        },
      };
    });
  };

  // Apply quick preset
  const handleApplyPreset = (preset: "full" | "standard" | "viewonly") => {
    setPermissions(createDefaultPermissions(preset));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      return;
    }
    onSave({
      id: initialRole?.id,
      roleName: roleName.trim(),
      category,
      industry,
      description: description.trim(),
      permissions,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/90 w-full max-w-5xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {initialRole?.id ? `Edit Role: ${initialRole.roleName}` : "Create New Role Studio"}
              </h2>
              <p className="text-xs text-gray-500">
                Define access scopes, record capabilities, and module authorizations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Role Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/60 border border-gray-200/70">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Clinical Intake Coordinator"
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {INITIAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {availableIndustries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-gray-800 mb-1">Role Scope Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of duties and operational permissions granted to this role..."
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section 2: Permission Matrix Tabs & Presets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                {[
                  { id: "standard", label: "Core Modules", count: STANDARD_MODULES.length },
                  { id: "operational", label: "Operational Workflows", count: EXTRA_MODULES.length },
                  { id: "settings", label: "Settings & Administration", count: SETTINGS_SUB_PAGES.length },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === t.id
                        ? "bg-gray-900 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-medium">Quick Template:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("full")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                >
                  Full Access
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("standard")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md border border-gray-200 transition-colors"
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("viewonly")}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md border border-amber-200 transition-colors"
                >
                  View Only
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 w-56">MODULE</th>
                    <th className="py-2.5 px-4 w-44">SCOPE LEVEL</th>
                    <th className="py-2.5 px-4">PERMISSIONS (CRUD & ACTIONS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Current Active Modules List */}
                  {(activeTab === "standard"
                    ? STANDARD_MODULES
                    : activeTab === "operational"
                    ? EXTRA_MODULES
                    : SETTINGS_SUB_PAGES
                  ).map((mod) => {
                    const Icon = mod.icon;
                    const isSettings = activeTab === "settings";
                    const isStandard = activeTab === "standard";
                    const availableActions = isSettings
                      ? SETTINGS_ACTIONS
                      : isStandard
                      ? FULL_ACTIONS
                      : FOUR_ACTIONS;

                    const modPerm = permissions[mod.id] || {
                      scope: "department",
                      actions: {},
                    };

                    return (
                      <tr key={mod.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 font-semibold text-gray-900">
                            <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                            <span>{mod.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={modPerm.scope}
                            onChange={(e) => handleScopeChange(mod.id, e.target.value as PermissionScope)}
                            className="w-full px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">All Records (Global)</option>
                            <option value="department">Department / Branch</option>
                            <option value="own">Own Assigned Only</option>
                            <option value="allow">Allow (Full Flag)</option>
                            <option value="deny">Deny Access</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            {availableActions.map((act) => {
                              const isChecked = !!modPerm.actions[act.id];
                              return (
                                <label
                                  key={act.id}
                                  className="flex items-center gap-1.5 cursor-pointer select-none text-gray-700 font-medium"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleActionToggle(mod.id, act.id)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <span>{act.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
          <p className="text-[11px] text-gray-500">
            Changes apply to all members assigned to this role upon save.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-[#1F2937] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Save Role Matrix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

