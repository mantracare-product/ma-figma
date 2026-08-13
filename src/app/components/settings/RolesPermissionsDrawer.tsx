import React, { useState, useEffect, useRef } from "react";
import { Drawer } from "../ui/drawer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Shield, Plus, Edit2, Trash2, ArrowLeft, AlertCircle, Search, X, ChevronRight, ChevronDown, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import type {
  ActionScope,
  Action,
  ModulePermissions,
  ItemPermissions,
  Role,
  Department,
} from "../../../types/permissions";
import { ACTIONS } from "../../../types/permissions";
import { createDefaultPermissions, DEFAULT_MODULE_PERMISSIONS } from "../../pages/settings-constants";
import { getStoredProcesses, Process } from "../../../lib/useProcessStore";
import { CreateRoleDrawer, getStoredTeamMembersList } from "./CreateRoleDrawer";

// ─── DEPARTMENTS STORE ─────────────────────────────────────────────────────────
const DEPARTMENTS_KEY = "ma_departments";

function getStoredDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch {
    return [];
  }
}

function saveDepartments(deps: Department[]): void {
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(deps));
}

export type { ActionScope, Action, ModulePermissions, ItemPermissions, Role, Department };
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
  { key: "services", label: "Product/Services", route: "/services" },
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
  { key: "billing", label: "Billing" },
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
  inherit: "Inherit",
  deny: "Deny",
  own: "Own",
  role: "Department",
  all: "All",
};

// ─── PERMISSION SCOPE DEFINITIONS & POPOVER SELECTOR ─────────────────────────

const SCOPE_CONFIG: Record<
  ActionScope,
  {
    label: string;
    pillClass: string;
    popoverBadgeClass: string;
    title: string;
    description: string;
  }
> = {
  inherit: {
    label: "Inherit",
    pillClass: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 font-medium",
    popoverBadgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    title: "Inherit Process Permission",
    description: "Inherits the permission scope configured at the parent process level.",
  },
  deny: {
    label: "Deny",
    pillClass: "bg-slate-100 text-slate-700 border-slate-200/90 hover:bg-slate-200/80 hover:text-slate-900",
    popoverBadgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    title: "Deny Access",
    description: "Team member has no access to perform this action.",
  },
  own: {
    label: "Own",
    pillClass: "bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100",
    popoverBadgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    title: "Own Records",
    description: "Team member will have access to their own records only.",
  },
  role: {
    label: "Department",
    pillClass: "bg-indigo-50 text-indigo-900 border-indigo-200/90 hover:bg-indigo-100",
    popoverBadgeClass: "bg-indigo-50 text-indigo-900 border-indigo-200",
    title: "Department Records",
    description: "Team member can see & take action on client, deals, appointment, etc. of any team member in that department.",
  },
  all: {
    label: "All",
    pillClass: "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-2xs",
    popoverBadgeClass: "bg-slate-900 text-white border-slate-900",
    title: "All Modules (Org-wide)",
    description: "Full access to all modules and records in the organization.",
  },
};

interface ActionSegmentProps {
  value: ActionScope;
  onChange: (v: ActionScope) => void;
  options?: ActionScope[];
  roleName?: string;
  moduleLabel?: string;
  actionLabel?: string;
  inheritedLabel?: string;
  onOpenSelector?: (info: {
    currentValue: ActionScope;
    options: ActionScope[];
    onChange: (v: ActionScope) => void;
    roleName?: string;
    moduleLabel?: string;
    actionLabel?: string;
    inheritedLabel?: string;
  }) => void;
}

function ActionSegment({
  value,
  onChange,
  options = ["deny", "own", "role", "all"],
  roleName,
  moduleLabel,
  actionLabel,
  inheritedLabel,
  onOpenSelector,
}: ActionSegmentProps) {
  const currentOpt = value || "deny";
  const isBinary = options.length === 2 && options.includes("all");
  const currentConfig = SCOPE_CONFIG[currentOpt] || SCOPE_CONFIG.deny;
  let currentDisplayLabel = isBinary && currentOpt === "all" ? "Allow" : currentConfig.label;
  if (currentOpt === "inherit" && inheritedLabel) {
    currentDisplayLabel = inheritedLabel;
  }

  const handleClick = () => {
    if (onOpenSelector) {
      onOpenSelector({
        currentValue: value,
        options,
        onChange,
        roleName,
        moduleLabel,
        actionLabel,
        inheritedLabel,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 min-w-[105px] text-xs font-bold rounded-xl border transition-all shadow-2xs cursor-pointer select-none ${currentConfig.pillClass}`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <span className="truncate max-w-[120px]">{currentDisplayLabel}</span>
      <ChevronDown className="w-3.5 h-3.5 opacity-75 shrink-0" />
    </button>
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
  const [searchQuery, setSearchQuery] = useState("");

  // Create/Edit Role sub-drawer
  const [createRoleDrawerOpen, setCreateRoleDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Navigation Selection States
  const [selectedModuleKey, setSelectedModuleKey] =
    useState<keyof Omit<ItemPermissions, "processInstances">>("clients");
  const [selectedSettingsPage, setSelectedSettingsPage] = useState("organization");
  const [billingExpandedInDrawer, setBillingExpandedInDrawer] = useState(true);
  const [selectedProcessInstanceId, setSelectedProcessInstanceId] = useState<string | null>(null);
  const [showMoreModules, setShowMoreModules] = useState(false);

  // Dynamic process instances list
  const [storedProcesses, setStoredProcesses] = useState<Process[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [isProcessOverridesExpanded, setIsProcessOverridesExpanded] = useState(false);

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");

  // ── CENTRALIZED PERMISSION SELECTOR MODAL ─────────────────────────────────
  type SelectorInfo = {
    currentValue: ActionScope;
    options: ActionScope[];
    onChange: (v: ActionScope) => void;
    roleName?: string;
    moduleLabel?: string;
    actionLabel?: string;
    inheritedLabel?: string;
  } | null;
  const [selectorInfo, setSelectorInfo] = useState<SelectorInfo>(null);

  const openSelector = (info: NonNullable<SelectorInfo>) => {
    setSelectorInfo(info);
  };

  const liveUserCounts = React.useMemo(() => {
    const members = getStoredTeamMembersList();
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      if (m.role) {
        counts[m.role] = (counts[m.role] || 0) + 1;
      }
    });
    return { ...assignedUserCounts, ...counts };
  }, [isOpen, roles, createRoleDrawerOpen]);

  const availableDepartments = React.useMemo(() => {
    const stored = getStoredDepartments();
    const names = new Set<string>(stored.map((d) => d.name));
    roles.forEach((r) => {
      if (r.department) names.add(r.department);
    });
    return Array.from(names);
  }, [roles, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedDepartmentFilter("");
      setSelectedModuleKey("clients");
      setSelectedSettingsPage("organization");
      setBillingExpandedInDrawer(true);
      setSelectedProcessInstanceId(null);
      setIsProcessOverridesExpanded(false);
      try {
        const procs = getStoredProcesses();
        setStoredProcesses(procs);
        if (procs.length > 0) {
          setSelectedProcessId(procs[0].id);
        } else {
          setSelectedProcessId(null);
        }
      } catch {
        setStoredProcesses([]);
        setSelectedProcessId(null);
      }
    }
  }, [isOpen]);

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

  // Expandable Action Rows in Process Accordion
  const [expandedActionRows, setExpandedActionRows] = useState<Record<string, boolean>>({});

  const toggleActionRow = (procId: string, action: string) => {
    const key = `${procId}_${action}`;
    setExpandedActionRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateStageInstanceAction = (
    roleId: string,
    processId: string,
    stageId: string,
    action: Action,
    scope: ActionScope
  ) => {
    const updated = roles.map((r) => {
      if (r.id !== roleId) return r;
      const stageKey = `${processId}_${stageId}`;
      const currentStagePerms = r.permissions.stageInstances?.[stageKey] ?? {};
      return {
        ...r,
        permissions: {
          ...r.permissions,
          stageInstances: {
            ...r.permissions.stageInstances,
            [stageKey]: {
              ...currentStagePerms,
              [action]: scope,
            },
          },
        },
      };
    });
    onSaveRoles(updated);
  };



  // ── MAIN RENDER ──────────────────────────────────────────────────────────────

  const selectedModuleObj = MODULES.find((m) => m.key === selectedModuleKey);

  // Build isBinary flag for selector modal display
  const selectorIsBinary = selectorInfo
    ? selectorInfo.options.length === 2 && selectorInfo.options.includes("all")
    : false;

  return (
    <>
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
              Sidebar module navigation · Uniform 6 actions (Deny / Own / Role / All) · Dynamic process overrides
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 pb-20 relative">

        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 border border-gray-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-3 flex-1">
                {/* Search Role */}
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

              </div>

              <Button
                variant="primary"
                onClick={() => { setEditingRole(null); setCreateRoleDrawerOpen(true); }}
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
                {/* Primary modules: always visible (first 6 matching sidebar order) */}
                {MODULES.slice(0, 6).map((mod) => (
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
                    </div>
                    {selectedModuleKey === mod.key && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))}

                {/* Show more / Show less toggle — matching sidebar pattern */}
                <button
                  type="button"
                  onClick={() => setShowMoreModules((v) => !v)}
                  className="w-full text-left px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-indigo-700 hover:bg-slate-50/60 transition-colors select-none"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showMoreModules ? "rotate-180" : ""
                    }`}
                  />
                  {showMoreModules ? "Show less" : "Show more"}
                </button>

                {/* Secondary modules: hidden behind show more (matching sidebar) */}
                {showMoreModules &&
                  MODULES.slice(6).map((mod) => (
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
                      </div>
                      {selectedModuleKey === mod.key && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  ))}
              </div>

              {/* Right Content Pane */}
              <div className="flex-1 min-w-0">
                {filteredRoles.length === 0 ? (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200/90 text-center shadow-xs">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                      No roles found matching "{searchQuery}"
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No roles match your search criteria.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); }}
                      className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      Reset Search
                    </button>
                  </div>
                ) : (
                  <>
                    {/* ── CASE 1: SETTINGS MODULE (Nested Settings Pages Sidebar) ── */}
                    {selectedModuleKey === "settings" && (
                      <div className="flex min-h-[480px] bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                    {/* Second-level Sidebar: Settings Pages */}
                    <div className="w-52 flex-shrink-0 border-r border-slate-200/80 bg-slate-50/50">
                      <div className="px-3.5 py-2.5 bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Settings Sub-Pages
                      </div>
                      {SETTINGS_PAGES.map((page) => (
                        <button
                          key={page.key}
                          type="button"
                          onClick={() => setSelectedSettingsPage(page.key)}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-medium border-b border-slate-100 transition-colors flex items-center justify-between ${
                            selectedSettingsPage === page.key
                              ? "bg-indigo-100/60 text-indigo-900 font-bold"
                              : "text-slate-600 hover:bg-slate-100/60"
                          }`}
                        >
                          <span>{page.label}</span>
                        </button>
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
                                <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  <span>{role.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingRole(role); setCreateRoleDrawerOpen(true); }}
                                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                    title={`Edit role ${role.name}`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                                    {liveUserCounts[role.name] || 0} users
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ACTIONS.filter(
                            (action) => action === "read" || action === "edit"
                          ).map((action) => (
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
                                    options={["deny", "all"]}
                                    roleName={role.name}
                                    moduleLabel="Settings"
                                    actionLabel={ACTION_LABELS[action]}
                                    onOpenSelector={openSelector}
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

                {/* ── CASE 2: PROCESS & PROCESS SETTINGS (Accordion view: Only 1 process open at a time) ── */}
                {selectedModuleKey === "processSettings" || selectedModuleKey === "processes" ? (
                  <div className="space-y-4">
                    {storedProcesses.length > 0 ? (
                      storedProcesses.map((proc) => {
                        const isOpen = (selectedProcessId || storedProcesses[0]?.id) === proc.id;

                        return (
                          <div
                            key={proc.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                          >
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => setSelectedProcessId(isOpen ? null : proc.id)}
                              className="w-full px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between transition-colors hover:bg-slate-800 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm text-slate-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  Process: {proc.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                                  {isOpen ? "Click to collapse" : "Click to expand"}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Accordion Content (Permissions Table) */}
                            {isOpen && (
                              <div className="overflow-x-auto border-t border-slate-200">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-800 text-slate-200">
                                      <th className="p-3 pl-5 text-xs font-bold uppercase tracking-wider text-slate-300">
                                        Action
                                      </th>
                                      {filteredRoles.map((role) => (
                                        <th key={role.id} className="p-3 text-center min-w-[170px]">
                                          <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                                            <span>{role.name}</span>
                                            <button
                                              type="button"
                                              onClick={() => { setEditingRole(role); setCreateRoleDrawerOpen(true); }}
                                              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                              title={`Edit role ${role.name}`}
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                          <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-900 text-slate-300">
                                              {liveUserCounts[role.name] || 0} users
                                            </span>
                                          </div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ACTIONS.map((action) => {
                                      const isRowExpanded = !!expandedActionRows[`${proc.id}_${action}`];
                                      const processStages =
                                        proc.stages && proc.stages.length > 0
                                          ? proc.stages
                                          : [
                                              { id: "s1", name: "Stage 1: Onboarding" },
                                              { id: "s2", name: "Stage 2: Verification" },
                                              { id: "s3", name: "Stage 3: Completion" },
                                            ];

                                      return (
                                        <React.Fragment key={action}>
                                          {/* Main Action Row */}
                                          <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3.5 pl-4 text-xs font-bold text-slate-800">
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleActionRow(proc.id, action)}
                                                  className="w-5 h-5 rounded hover:bg-slate-200/80 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                                                  title={isRowExpanded ? "Collapse stages" : "Expand stages"}
                                                >
                                                  <ChevronDown
                                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                                      isRowExpanded ? "" : "-rotate-90"
                                                    }`}
                                                  />
                                                </button>
                                                <span>{ACTION_LABELS[action]}</span>
                                                <span className="text-[10px] font-normal text-slate-400">
                                                  ({processStages.length})
                                                </span>
                                              </div>
                                            </td>
                                            {filteredRoles.map((role) => {
                                              const parentScope =
                                                role.permissions.processInstances?.[proc.id]?.[action] ??
                                                role.permissions.processSettings?.[action] ??
                                                "deny";

                                              const options =
                                                selectedModuleKey === "processSettings"
                                                  ? (["deny", "all"] as ActionScope[])
                                                  : (["deny", "own", "role", "all"] as ActionScope[]);

                                              return (
                                                <td key={role.id} className="p-2.5 text-center align-middle">
                                                  <ActionSegment
                                                    value={parentScope}
                                                    onChange={(v) =>
                                                      handleUpdateProcessInstanceAction(role.id, proc.id, action, v)
                                                    }
                                                    options={options}
                                                    roleName={role.name}
                                                    moduleLabel={proc.name}
                                                    actionLabel={ACTION_LABELS[action]}
                                                    onOpenSelector={openSelector}
                                                  />
                                                </td>
                                              );
                                            })}
                                          </tr>

                                          {/* Stage Sub-rows */}
                                          {isRowExpanded &&
                                            processStages.map((stg) => (
                                              <tr
                                                key={stg.id}
                                                className="bg-slate-50/70 border-b border-slate-100/80 hover:bg-slate-100/50 transition-colors"
                                              >
                                                <td className="p-2.5 pl-10 text-[11px] font-medium text-slate-600">
                                                  <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                    <span className="text-slate-400 font-normal text-[10px]">Stage:</span>
                                                    <span className="font-semibold text-slate-800">{stg.name}</span>
                                                  </div>
                                                </td>
                                                {filteredRoles.map((role) => {
                                                  const parentScope =
                                                    role.permissions.processInstances?.[proc.id]?.[action] ??
                                                    role.permissions.processSettings?.[action] ??
                                                    "deny";

                                                  const parentDisplayLabel =
                                                    selectedModuleKey === "processSettings"
                                                      ? parentScope === "all"
                                                        ? "Allow"
                                                        : "Deny"
                                                      : SCOPE_CONFIG[parentScope]?.label ?? "Deny";

                                                  const stageKey = `${proc.id}_${stg.id}`;
                                                  const stageScope =
                                                    role.permissions.stageInstances?.[stageKey]?.[action] ?? "inherit";

                                                  const stageOptions =
                                                    selectedModuleKey === "processSettings"
                                                      ? (["inherit", "deny", "all"] as ActionScope[])
                                                      : (["inherit", "deny", "own", "role", "all"] as ActionScope[]);

                                                  return (
                                                    <td key={role.id} className="p-2 text-center align-middle">
                                                      <ActionSegment
                                                        value={stageScope}
                                                        onChange={(v) =>
                                                          handleUpdateStageInstanceAction(
                                                            role.id,
                                                            proc.id,
                                                            stg.id,
                                                            action,
                                                            v
                                                          )
                                                        }
                                                        options={stageOptions}
                                                        inheritedLabel={`Inherit (${parentDisplayLabel})`}
                                                        roleName={role.name}
                                                        moduleLabel={`${proc.name} → Stage: ${stg.name}`}
                                                        actionLabel={ACTION_LABELS[action]}
                                                        onOpenSelector={openSelector}
                                                      />
                                                    </td>
                                                  );
                                                })}
                                              </tr>
                                            ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
                        No processes available. Add processes in Process Settings first.
                      </div>
                    )}
                  </div>
                ) : selectedModuleKey !== "settings" && (
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto divide-y divide-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white sticky top-0 z-10">
                          <th className="p-3.5 pl-5 text-xs font-bold uppercase tracking-wider w-56 text-slate-200">
                            {selectedModuleObj?.label ?? selectedModuleKey} — Action
                          </th>
                          {filteredRoles.map((role) => (
                            <th key={role.id} className="p-3.5 text-center min-w-[170px]">
                              <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                                <span>{role.name}</span>
                                <button
                                  type="button"
                                  onClick={() => { setEditingRole(role); setCreateRoleDrawerOpen(true); }}
                                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                  title={`Edit role ${role.name}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/50">
                                  {liveUserCounts[role.name] || 0} users
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                        <tbody>
                          {ACTIONS.filter((action) => {
                            if (
                              (selectedModuleKey === "appointments" ||
                                selectedModuleKey === "chats" ||
                                selectedModuleKey === "services" ||
                                selectedModuleKey === "webForms") &&
                              (action === "import" || action === "export")
                            ) {
                              return false;
                            }
                            return true;
                          }).map((action) => (
                            <tr key={action} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 pl-5 text-xs font-semibold text-slate-700">
                                {ACTION_LABELS[action]}
                              </td>
                              {filteredRoles.map((role) => {
                                const modPerms = role.permissions[
                                  selectedModuleKey as keyof Omit<ItemPermissions, "processInstances" | "stageInstances">
                                ] as ModulePermissions | undefined;
                                return (
                                  <td key={role.id} className="p-2.5 text-center align-middle">
                                    <ActionSegment
                                      value={modPerms?.[action] ?? "deny"}
                                      onChange={(v) =>
                                        handleUpdateModuleAction(role.id, selectedModuleKey, action, v)
                                      }
                                      options={
                                        (selectedModuleKey as string) === "knowledgeBase"
                                          ? ["deny", "all"]
                                          : ["deny", "own", "role", "all"]
                                      }
                                      roleName={role.name}
                                      moduleLabel={selectedModuleObj?.label ?? selectedModuleKey}
                                      actionLabel={ACTION_LABELS[action]}
                                      onOpenSelector={openSelector}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

              </div>
            </div>
          </div>
        </div>

        {/* ── CENTRALIZED PERMISSION SELECTOR MODAL ── */}
        {selectorInfo && (
          <div
            className="absolute inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={() => setSelectorInfo(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-xs transition-opacity" />

            {/* Modal Container */}
            <div
              className="relative bg-white border border-slate-200/90 rounded-2xl shadow-2xl w-[480px] max-w-[92vw] overflow-hidden transition-all transform scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-slate-900 flex items-center justify-between border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Permission Scope
                  </div>
                  {(selectorInfo.roleName || selectorInfo.actionLabel) && (
                    <div className="text-sm text-slate-200 font-semibold mt-1 flex items-center gap-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {selectorInfo.roleName && <span className="text-white font-bold">{selectorInfo.roleName}</span>}
                      {selectorInfo.roleName && selectorInfo.actionLabel && <span className="text-slate-500">•</span>}
                      {selectorInfo.actionLabel && <span className="text-indigo-300 font-medium">{selectorInfo.actionLabel} Action</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectorInfo(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Options List */}
              <div className="p-3.5 space-y-2 bg-slate-50/50">
                {selectorInfo.options.map((opt) => {
                  const config = SCOPE_CONFIG[opt] || SCOPE_CONFIG.deny;
                  const isSelected = selectorIsBinary && opt === "all"
                    ? selectorInfo.currentValue !== "deny"
                    : selectorInfo.currentValue === opt;

                  let itemLabel = selectorIsBinary && opt === "all" ? "Allow" : config.label;
                  let itemTitle = selectorIsBinary && opt === "all" ? "Allow Access" : config.title;
                  let itemDesc = selectorIsBinary && opt === "all"
                    ? "Team member is granted full access to this section."
                    : config.description;

                  if (opt === "inherit") {
                    itemLabel = selectorInfo.inheritedLabel || "Inherit";
                    itemTitle = "Inherit Process Permission";
                    const cleanParentScope = selectorInfo.inheritedLabel
                      ? selectorInfo.inheritedLabel.replace("Inherit ", "").replace("(", "").replace(")", "")
                      : "process level";
                    itemDesc = `Inherits the permission scope (${cleanParentScope}) configured at the parent process level.`;
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        selectorInfo.onChange(opt);
                        setSelectorInfo(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-4 border cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-200 shadow-xs ring-1 ring-indigo-200/60"
                          : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {/* Fixed Uniform Badge Column for 100% Perfect Alignment */}
                      <span
                        className={`mt-0.5 min-w-[105px] max-w-[140px] px-3 shrink-0 text-center py-1.5 text-xs font-bold rounded-lg border inline-flex items-center justify-center truncate ${config.popoverBadgeClass}`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {itemLabel}
                      </span>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 flex items-center justify-between gap-2">
                          <span>{itemTitle}</span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {itemDesc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Drawer>

    {/* ── CREATE / EDIT ROLE DRAWER (narrow, stacked) ── */}
    <CreateRoleDrawer
      isOpen={createRoleDrawerOpen}
      onClose={() => { setCreateRoleDrawerOpen(false); setEditingRole(null); }}
      roles={roles}
      onSaveRoles={(updated) => { onSaveRoles(updated); }}
      editingRole={editingRole}
      assignedUserCounts={assignedUserCounts}
      zIndex={(zIndex ?? 9999) + 60}
    />
  </>);
}

