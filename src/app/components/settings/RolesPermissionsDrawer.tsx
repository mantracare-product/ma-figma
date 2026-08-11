import React, { useState, useEffect } from "react";
import { Drawer } from "../ui/drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Shield, Plus, Edit2, Trash2, ArrowLeft, AlertCircle, Search, X, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type {
  ActionScope,
  Action,
  ModulePermissions,
  ItemPermissions,
  Role,
} from "../../../types/permissions";
import { ACTIONS } from "../../../types/permissions";
import { createDefaultPermissions, DEFAULT_MODULE_PERMISSIONS } from "../../pages/settings-constants";
import { getStoredProcesses, Process } from "../../../lib/useProcessStore";

export type { ActionScope, Action, ModulePermissions, ItemPermissions, Role };
export { ACTIONS };

// ─── DEFAULT ROLES ────────────────────────────────────────────────────────────

const makeModulePerms = (
  read: ActionScope,
  add: ActionScope,
  edit: ActionScope,
  del: ActionScope,
  exp: ActionScope,
  imp: ActionScope
): ModulePermissions => ({
  read,
  add,
  edit,
  delete: del,
  export: exp,
  import: imp,
});

const ALL_PERMS = makeModulePerms("all", "all", "all", "all", "all", "all");
const OPERATIONAL_PERMS = makeModulePerms("all", "all", "all", "own", "all", "all");
const OWN_PERMS = makeModulePerms("own", "own", "own", "deny", "deny", "deny");
const DENY_PERMS = makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny");

export const DEFAULT_ROLES: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to every module and action",
    isDefault: true,
    permissions: {
      clients: { ...ALL_PERMS },
      processes: { ...ALL_PERMS },
      calls: { ...ALL_PERMS },
      chats: { ...ALL_PERMS },
      knowledgeBase: { ...ALL_PERMS },
      settings: { ...ALL_PERMS },
      processSettings: { ...ALL_PERMS },
      webForms: { ...ALL_PERMS },
      appointments: { ...ALL_PERMS },
      services: { ...ALL_PERMS },
      processInstances: {},
    },
  },
  {
    id: "manager",
    name: "Manager",
    description: "Operational access across all modules, restricted system settings",
    isDefault: true,
    permissions: {
      clients: { ...OPERATIONAL_PERMS },
      processes: { ...OPERATIONAL_PERMS },
      calls: { ...OPERATIONAL_PERMS },
      chats: { ...OPERATIONAL_PERMS },
      knowledgeBase: { ...OPERATIONAL_PERMS },
      settings: { ...DENY_PERMS },
      processSettings: { ...OPERATIONAL_PERMS },
      webForms: { ...OPERATIONAL_PERMS },
      appointments: { ...OPERATIONAL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      processInstances: {},
    },
  },
  {
    id: "reception",
    name: "Reception",
    description: "Own record access for front-desk operations",
    isDefault: true,
    permissions: {
      clients: { ...OWN_PERMS },
      processes: { ...OWN_PERMS },
      calls: { ...OWN_PERMS },
      chats: { ...OWN_PERMS },
      knowledgeBase: { ...OWN_PERMS },
      settings: { ...DENY_PERMS },
      processSettings: { ...DENY_PERMS },
      webForms: { ...OWN_PERMS },
      appointments: { ...OWN_PERMS },
      services: { ...OWN_PERMS },
      processInstances: {},
    },
  },
  {
    id: "sales",
    name: "Sales",
    description: "Own record access for sales deals and customer calls",
    isDefault: true,
    permissions: {
      clients: { ...OWN_PERMS },
      processes: { ...OWN_PERMS },
      calls: { ...OWN_PERMS },
      chats: { ...OWN_PERMS },
      knowledgeBase: { ...OWN_PERMS },
      settings: { ...DENY_PERMS },
      processSettings: { ...DENY_PERMS },
      webForms: { ...DENY_PERMS },
      appointments: { ...OWN_PERMS },
      services: { ...DENY_PERMS },
      processInstances: {},
    },
  },
];

// ─── FIXED MODULE CONFIG ──────────────────────────────────────────────────────

export interface ModuleRow {
  key: keyof Omit<ItemPermissions, "processInstances">;
  label: string;
  route: string;
}

export const MODULES: ModuleRow[] = [
  { key: "clients", label: "Clients", route: "/clients" },
  { key: "processes", label: "Processes", route: "/deals" },
  { key: "calls", label: "Calls", route: "/call-logs" },
  { key: "chats", label: "Chats", route: "/chats" },
  { key: "knowledgeBase", label: "Knowledge Base", route: "/knowledge-base" },
  { key: "settings", label: "Settings", route: "/settings" },
  { key: "processSettings", label: "Process Settings", route: "/process" },
  { key: "webForms", label: "Web Forms", route: "/web-forms" },
  { key: "appointments", label: "Appointments", route: "/appointments" },
  { key: "services", label: "Services", route: "/services" },
];

// ─── SETTINGS SUB-PAGES CONFIG ────────────────────────────────────────────────

interface SettingsPageRow {
  key: string;
  label: string;
  children?: { key: string; label: string }[];
}

const SETTINGS_PAGES: SettingsPageRow[] = [
  { key: "organization", label: "Organization" },
  { key: "users", label: "Team" },
  {
    key: "billing-parent",
    label: "Billing",
    children: [
      { key: "plans", label: "Plans" },
      { key: "payments", label: "Payments" },
      { key: "credit-usage", label: "Credit Usage" },
    ],
  },
  { key: "voice-config", label: "AI Voices / Models" },
  { key: "numbers", label: "Numbers" },
  { key: "custom-fields", label: "Custom Fields" },
  { key: "integrations", label: "Integrations" },
  { key: "audit-logs", label: "Audit Logs" },
  { key: "security", label: "Security" },
];

const ACTION_LABELS: Record<Action, string> = {
  read: "Read",
  add: "Add",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
  import: "Import",
};

const SCOPE_LABELS: Record<ActionScope, string> = {
  deny: "Deny",
  own: "Own",
  all: "All",
};

// ─── INLINE SEGMENT CONTROL ───────────────────────────────────────────────────

interface ActionSegmentProps {
  value: ActionScope;
  onChange: (v: ActionScope) => void;
}

function ActionSegment({ value, onChange }: ActionSegmentProps) {
  return (
    <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-inner gap-1 transition-all">
      {(["deny", "own", "all"] as ActionScope[]).map((opt) => {
        const isSelected = value === opt;

        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer select-none ${
              isSelected
                ? "bg-slate-900 text-white shadow-xs scale-[1.02] ring-1 ring-slate-900/20"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {SCOPE_LABELS[opt]}
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface RolesPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSaveRoles: (updatedRoles: Role[]) => void;
  assignedUserCounts?: Record<string, number>;
  zIndex?: number;
}

export function RolesPermissionsDrawer({
  isOpen,
  onClose,
  roles,
  onSaveRoles,
  assignedUserCounts = {},
  zIndex = 9999,
}: RolesPermissionsDrawerProps) {
  const [viewMode, setViewMode] = useState<"list" | "edit">("list");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Navigation Selection States
  const [selectedModuleKey, setSelectedModuleKey] =
    useState<keyof Omit<ItemPermissions, "processInstances">>("clients");
  const [selectedSettingsPage, setSelectedSettingsPage] = useState("organization");
  const [billingExpandedInDrawer, setBillingExpandedInDrawer] = useState(true);
  const [selectedProcessInstanceId, setSelectedProcessInstanceId] = useState<string | null>(null);

  // Expanded states in Edit Role view
  const [editExpandedKeys, setEditExpandedKeys] = useState<Set<string>>(new Set());

  // Dynamic process instances list
  const [storedProcesses, setStoredProcesses] = useState<Process[]>([]);
  const [isProcessOverridesExpanded, setIsProcessOverridesExpanded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setViewMode("list");
      setEditingRoleId(null);
      setSearchQuery("");
      setSelectedModuleKey("clients");
      setSelectedSettingsPage("organization");
      setBillingExpandedInDrawer(true);
      setSelectedProcessInstanceId(null);
      setEditExpandedKeys(new Set());
      setIsProcessOverridesExpanded(false);
      setFormErrors({});
      try {
        setStoredProcesses(getStoredProcesses());
      } catch {
        setStoredProcesses([]);
      }
    }
  }, [isOpen]);

  const [roleFormData, setRoleFormData] = useState<{
    name: string;
    description: string;
    permissions: ItemPermissions;
  }>({
    name: "",
    description: "",
    permissions: createDefaultPermissions(),
  });

  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── MATRIX UPDATE HANDLERS ──────────────────────────────────────────────────

  const handleUpdateModuleAction = (
    roleId: string,
    moduleKey: keyof Omit<ItemPermissions, "processInstances">,
    action: Action,
    scope: ActionScope
  ) => {
    const updated = roles.map((r) => {
      if (r.id !== roleId) return r;
      return {
        ...r,
        permissions: {
          ...r.permissions,
          [moduleKey]: {
            ...r.permissions[moduleKey],
            [action]: scope,
          },
        },
      };
    });
    onSaveRoles(updated);
  };

  const handleUpdateProcessInstanceAction = (
    roleId: string,
    processId: string,
    action: Action,
    scope: ActionScope
  ) => {
    const updated = roles.map((r) => {
      if (r.id !== roleId) return r;
      const currentInstance =
        r.permissions.processInstances?.[processId] ?? { ...r.permissions.processSettings };
      return {
        ...r,
        permissions: {
          ...r.permissions,
          processInstances: {
            ...r.permissions.processInstances,
            [processId]: {
              ...currentInstance,
              [action]: scope,
            },
          },
        },
      };
    });
    onSaveRoles(updated);
  };

  const toggleEditExpand = (key: string) => {
    setEditExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── FORM HANDLERS ───────────────────────────────────────────────────────────

  const handleStartCreateRole = () => {
    setEditingRoleId(null);
    setRoleFormData({ name: "", description: "", permissions: createDefaultPermissions() });
    setFormErrors({});
    setEditExpandedKeys(new Set());
    setViewMode("edit");
  };

  const handleStartEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleFormData({
      name: role.name,
      description: role.description || "",
      permissions: JSON.parse(JSON.stringify(role.permissions)),
    });
    setFormErrors({});
    setEditExpandedKeys(new Set());
    setViewMode("edit");
  };

  const handleFormUpdateModuleAction = (
    moduleKey: keyof Omit<ItemPermissions, "processInstances">,
    action: Action,
    scope: ActionScope
  ) => {
    setRoleFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...prev.permissions[moduleKey],
          [action]: scope,
        },
      },
    }));
  };

  const handleFormUpdateProcessInstanceAction = (
    processId: string,
    action: Action,
    scope: ActionScope
  ) => {
    setRoleFormData((prev) => {
      const currentInstance =
        prev.permissions.processInstances?.[processId] ?? { ...prev.permissions.processSettings };
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          processInstances: {
            ...prev.permissions.processInstances,
            [processId]: {
              ...currentInstance,
              [action]: scope,
            },
          },
        },
      };
    });
  };

  const handleSaveRoleForm = () => {
    const trimmedName = roleFormData.name.trim();
    if (!trimmedName) {
      setFormErrors({ name: "Role name is required." });
      toast.error("Please enter a role name.");
      return;
    }
    const duplicate = roles.find(
      (r) => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== editingRoleId
    );
    if (duplicate) {
      setFormErrors({ name: "A role with this name already exists." });
      toast.error("A role with this name already exists.");
      return;
    }

    let updatedRoles: Role[];
    if (editingRoleId) {
      updatedRoles = roles.map((r) =>
        r.id === editingRoleId
          ? {
              ...r,
              name: trimmedName,
              description: roleFormData.description.trim(),
              permissions: { ...roleFormData.permissions },
            }
          : r
      );
      toast.success(`Role "${trimmedName}" updated successfully.`);
    } else {
      const newRole: Role = {
        id: "custom_" + Date.now(),
        name: trimmedName,
        description: roleFormData.description.trim(),
        isDefault: false,
        permissions: { ...roleFormData.permissions },
      };
      updatedRoles = [...roles, newRole];
      toast.success(`Role "${trimmedName}" created successfully.`);
    }

    onSaveRoles(updatedRoles);
    setViewMode("list");
  };

  // ── EDIT FORM MODULE RENDERER ────────────────────────────────────────────────

  const renderEditModule = (mod: ModuleRow) => {
    const isExpanded = editExpandedKeys.has(mod.key);
    const isProcessSettings = mod.key === "processSettings";

    return (
      <div key={mod.key} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => toggleEditExpand(mod.key)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            <span className="text-xs font-bold text-gray-900">{mod.label}</span>
            <span className="text-[10px] text-gray-400 font-medium">· {mod.route} · 6 actions</span>
          </div>
        </button>

        {isExpanded && (
          <div className="divide-y divide-gray-100">
            {ACTIONS.map((action) => {
              const scope = roleFormData.permissions[mod.key]?.[action] ?? "deny";
              return (
                <div key={action} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-700">{ACTION_LABELS[action]}</span>
                  <ActionSegment
                    value={scope}
                    onChange={(v) => handleFormUpdateModuleAction(mod.key, action, v)}
                  />
                </div>
              );
            })}

            {/* Dynamic Process Instances Override in Edit Form */}
            {isProcessSettings && storedProcesses.length > 0 && (
              <div className="p-3 bg-blue-50/30 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Process Instances Overrides
                </p>
                {storedProcesses.map((proc) => {
                  const procKey = `edit_proc_${proc.id}`;
                  const isProcExpanded = editExpandedKeys.has(procKey);
                  return (
                    <div key={proc.id} className="border border-blue-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => toggleEditExpand(procKey)}
                        className="w-full flex items-center justify-between p-2.5 bg-blue-50/50 hover:bg-blue-100/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          {isProcExpanded ? <ChevronDown className="w-3.5 h-3.5 text-blue-600" /> : <ChevronRight className="w-3.5 h-3.5 text-blue-600" />}
                          <span className="text-xs font-semibold text-blue-950">{proc.name}</span>
                        </div>
                      </button>

                      {isProcExpanded && (
                        <div className="divide-y divide-gray-100">
                          {ACTIONS.map((action) => {
                            const scope =
                              roleFormData.permissions.processInstances?.[proc.id]?.[action] ??
                              roleFormData.permissions.processSettings[action];
                            return (
                              <div key={action} className="flex items-center justify-between px-4 py-2">
                                <span className="text-[11px] font-medium text-gray-700">{ACTION_LABELS[action]}</span>
                                <ActionSegment
                                  value={scope}
                                  onChange={(v) =>
                                    handleFormUpdateProcessInstanceAction(proc.id, action, v)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── MAIN RENDER ──────────────────────────────────────────────────────────────

  const selectedModuleObj = MODULES.find((m) => m.key === selectedModuleKey);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      zIndex={zIndex}
      maxWidth="sm:max-w-[92vw] w-[92vw]"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Roles & Permissions
            </h3>
            <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
              Sidebar module navigation · Uniform 6 actions (Deny / Own / All) · Dynamic process overrides
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 pb-20 relative">

        {/* ── VIEW 1: MATRIX / LIST VIEW WITH SIDEBAR ── */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 border border-gray-200 rounded-xl shadow-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search roles by name..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="primary"
                onClick={handleStartCreateRole}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Role
              </Button>
            </div>

            {/* Two-Pane Layout */}
            <div className="flex gap-4 items-start">
              {/* First-level Module Sidebar */}
              <div className="w-56 flex-shrink-0 border border-slate-200/90 rounded-2xl overflow-hidden bg-white sticky top-0 shadow-xs">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Modules Navigation
                </div>
                {MODULES.map((mod) => (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => setSelectedModuleKey(mod.key)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 transition-all flex items-center justify-between ${
                      selectedModuleKey === mod.key
                        ? "bg-indigo-50/80 text-indigo-900 font-bold border-l-4 border-l-indigo-600 shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50/80 hover:text-slate-900"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{mod.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{mod.route}</div>
                    </div>
                    {selectedModuleKey === mod.key && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 min-w-0 border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">

                {/* ── CASE 1: SETTINGS MODULE (Nested Settings Pages Sidebar) ── */}
                {selectedModuleKey === "settings" && (
                  <div className="flex min-h-[480px]">
                    {/* Second-level Sidebar: Settings Pages */}
                    <div className="w-52 flex-shrink-0 border-r border-slate-200/80 bg-slate-50/50">
                      <div className="px-3.5 py-2.5 bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Settings Sub-Pages
                      </div>
                      {SETTINGS_PAGES.map((page) => (
                        <div key={page.key}>
                          <button
                            type="button"
                            onClick={() => {
                              if (page.children) {
                                setBillingExpandedInDrawer((v) => !v);
                                setSelectedSettingsPage(page.children[0].key);
                              } else {
                                setSelectedSettingsPage(page.key);
                              }
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-medium border-b border-slate-100 transition-colors flex items-center justify-between ${
                              selectedSettingsPage === page.key ||
                              page.children?.some((c) => c.key === selectedSettingsPage)
                                ? "bg-indigo-100/60 text-indigo-900 font-bold"
                                : "text-slate-600 hover:bg-slate-100/60"
                            }`}
                          >
                            <span>{page.label}</span>
                            {page.children && (
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  billingExpandedInDrawer ? "" : "-rotate-90"
                                }`}
                              />
                            )}
                          </button>
                          {page.children && billingExpandedInDrawer && (
                            <div className="bg-slate-100/40">
                              {page.children.map((child) => (
                                <button
                                  key={child.key}
                                  type="button"
                                  onClick={() => setSelectedSettingsPage(child.key)}
                                  className={`w-full text-left pl-6 pr-3 py-2 text-[11px] border-b border-slate-100 transition-colors ${
                                    selectedSettingsPage === child.key
                                      ? "bg-indigo-200/60 text-indigo-900 font-bold"
                                      : "text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {child.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Settings Action Table */}
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white sticky top-0 z-10">
                            <th className="p-3.5 pl-5 text-xs font-bold uppercase tracking-wider w-56 text-slate-200">
                              {SETTINGS_PAGES.flatMap((p) => p.children ?? [p]).find(
                                (p) => p.key === selectedSettingsPage
                              )?.label ?? "Settings"}{" "}
                              — Action
                            </th>
                            {filteredRoles.map((role) => (
                              <th key={role.id} className="p-3.5 text-center min-w-[170px]">
                                <div className="font-bold text-sm text-white">{role.name}</div>
                                <div className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                                  {assignedUserCounts[role.name] || 0} users
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ACTIONS.map((action) => (
                            <tr key={action} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 pl-5 text-xs font-semibold text-slate-700">
                                {ACTION_LABELS[action]}
                              </td>
                              {filteredRoles.map((role) => (
                                <td key={role.id} className="p-2.5 text-center align-middle">
                                  <ActionSegment
                                    value={role.permissions.settings?.[action] ?? "deny"}
                                    onChange={(v) =>
                                      handleUpdateModuleAction(role.id, "settings", action, v)
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── CASE 2: DEFAULT MODULES (Clients, Processes, Calls, Chats, Process Settings, etc.) ── */}
                {selectedModuleKey !== "settings" && (
                  <div className="overflow-x-auto divide-y divide-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white sticky top-0 z-10">
                          <th className="p-3.5 pl-5 text-xs font-bold uppercase tracking-wider w-56 text-slate-200">
                            {selectedModuleObj?.label ?? selectedModuleKey} — Action
                          </th>
                          {filteredRoles.map((role) => (
                            <th key={role.id} className="p-3.5 text-center min-w-[170px]">
                              <div className="font-bold text-sm text-white">{role.name}</div>
                              <div className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                                {assignedUserCounts[role.name] || 0} users
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ACTIONS.map((action) => (
                          <tr key={action} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 pl-5 text-xs font-semibold text-slate-700">
                              {ACTION_LABELS[action]}
                            </td>
                            {filteredRoles.map((role) => (
                              <td key={role.id} className="p-2.5 text-center align-middle">
                                <ActionSegment
                                  value={role.permissions[selectedModuleKey]?.[action] ?? "deny"}
                                  onChange={(v) =>
                                    handleUpdateModuleAction(role.id, selectedModuleKey, action, v)
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Dynamic Process Instances Overrides under Process Settings */}
                    {selectedModuleKey === "processSettings" && storedProcesses.length > 0 && (
                      <div className="bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => setIsProcessOverridesExpanded((prev) => !prev)}
                          className="w-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100/80 border-y border-indigo-100 flex items-center justify-between transition-colors cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`w-4 h-4 text-indigo-700 transition-transform duration-200 ${
                                isProcessOverridesExpanded ? "" : "-rotate-90"
                              }`}
                            />
                            <span>Specific Process Overrides</span>
                          </div>
                          <span className="text-[10px] font-normal text-indigo-700">
                            {storedProcesses.length} available process{storedProcesses.length > 1 ? "es" : ""}
                          </span>
                        </button>

                        {isProcessOverridesExpanded && (
                          <div className="pb-4">
                            {storedProcesses.map((proc) => (
                              <div key={proc.id} className="border-b border-slate-200/80 last:border-0">
                                <div className="bg-slate-100/90 px-5 py-2 text-xs font-bold text-slate-800 border-b border-slate-200/50 flex items-center gap-2">
                                  <span>Process: {proc.name}</span>
                                </div>
                                <table className="w-full text-left border-collapse bg-white">
                                  <tbody>
                                    {ACTIONS.map((action) => (
                                      <tr key={action} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-3.5 pl-8 text-xs font-medium text-slate-600">
                                          {ACTION_LABELS[action]}
                                        </td>
                                        {filteredRoles.map((role) => (
                                          <td key={role.id} className="p-2.5 text-center align-middle min-w-[170px]">
                                            <ActionSegment
                                              value={
                                                role.permissions.processInstances?.[proc.id]?.[action] ??
                                                role.permissions.processSettings?.[action] ??
                                                "deny"
                                              }
                                              onChange={(v) =>
                                                handleUpdateProcessInstanceAction(role.id, proc.id, action, v)
                                              }
                                            />
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: ROLE EDIT FORM ── */}
        {viewMode === "edit" && (
          <div className="space-y-6">
            <button
              onClick={() => setViewMode("list")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Roles list
            </button>

            {/* Role Name & Description */}
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={roleFormData.name}
                  onChange={(e) => {
                    setRoleFormData({ ...roleFormData, name: e.target.value });
                    if (formErrors.name) setFormErrors({});
                  }}
                  placeholder="e.g. Sales Manager, Reception"
                  className="w-full text-sm bg-white"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="Briefly describe what this role is responsible for..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </div>

            {/* Permissions list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="text-sm font-bold text-gray-900">Module Access Control</h4>
                <span className="text-xs text-gray-500">Deny / Own / All per action</span>
              </div>

              <div className="space-y-3">
                {MODULES.map((mod) => renderEditModule(mod))}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setViewMode("list")} className="text-xs">
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveRoleForm} className="text-xs font-bold px-4 py-2">
                Save Role
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
