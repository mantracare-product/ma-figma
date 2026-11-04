/**
 * RolesPermissionsDrawer.tsx
 * Path: src/app/components/settings/RolesPermissionsDrawer.tsx
 *
 * Clean, premium side drawer for creating and configuring roles & permissions.
 * Matches exact UI/UX from https://app.mantraassist.com/roles:
 * - 2-column header inputs: ROLE NAME * and DESCRIPTION
 * - Clean dark table header (#1E293B): MODULE | PERMISSION | LEVEL
 * - Granular per-module dropdowns and sticky Cancel / Save actions
 */

import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown, GitBranch } from "lucide-react";
import { toast } from "sonner";
import PermissionSelect, { PermissionAction, PERMISSION_ACTIONS } from "./PermissionSelect";
import { getStoredProcesses, Process } from "../../../lib/useProcessStore";
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
import { getStoredDepartments } from "../../../lib/departmentStore";

export type { ActionScope, Action, ModulePermissions, ItemPermissions, Role, Department, PermissionAction };
export { ACTIONS, PERMISSION_ACTIONS };

// ─── MODULE DEFINITIONS ────────────────────────────────────────────────────────

export interface RoleModuleItem {
  id: keyof Omit<ItemPermissions, "processInstances" | "stageInstances"> | string;
  label: string;
}

export const ROLE_PERMISSION_MODULES: RoleModuleItem[] = [
  { id: "appointments", label: "Appointments" },
  { id: "billings", label: "Billings" },
  { id: "calls", label: "Calls" },
  { id: "clients", label: "Clients" },
  { id: "dashboard", label: "Dashboard" },
  { id: "documentTemplates", label: "DocumentTemplates" },
  { id: "integrations", label: "Integrations" },
  { id: "knowledgeBase", label: "KnowledgeBase" },
  { id: "processes", label: "Processes" },
  { id: "settings", label: "Settings" },
  { id: "webForms", label: "WebForms" },
];

export type ScopeLevelOption = "all" | "department" | "own" | "deny";

export interface SimpleModulePermission {
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export interface WorkflowItem {
  id: string;
  name: string;
}

export interface WorkflowPermissionState {
  isInherit: boolean;
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export function getModuleWorkflows(moduleId: string, allProcesses: Process[]): WorkflowItem[] {
  if (moduleId === "processes") {
    const list = allProcesses.filter(
      (p) => !p.entityType || p.entityType === "client" || (p.entityType as any) === "process"
    );
    if (list.length > 0) return list.map((p) => ({ id: p.id, name: p.name }));
    return [
      { id: "wf-proc-test", name: "Test Process" },
      { id: "wf-proc-intake", name: "Client Intake" },
      { id: "wf-proc-reactivation", name: "Client Reactivation" },
    ];
  }
  if (moduleId === "appointments") {
    const list = allProcesses.filter((p) => p.entityType === "appointment");
    if (list.length > 0) return list.map((p) => ({ id: p.id, name: p.name }));
    return [
      { id: "wf-appt-default", name: "Appointment Flow" },
    ];
  }
  return [];
}

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
      settings: { ...makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny") },
      processSettings: { ...OPERATIONAL_PERMS },
      webForms: { ...OPERATIONAL_PERMS },
      appointments: { ...OPERATIONAL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      processInstances: {},
    },
  },
  {
    id: "agent",
    name: "Executive",
    description: "Can manage all clients and calls",
    isDefault: false,
    permissions: {
      clients: { ...OPERATIONAL_PERMS },
      processes: { ...OPERATIONAL_PERMS },
      calls: { ...OPERATIONAL_PERMS },
      chats: { ...OPERATIONAL_PERMS },
      knowledgeBase: { ...OPERATIONAL_PERMS },
      settings: { ...makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny") },
      processSettings: { ...OPERATIONAL_PERMS },
      webForms: { ...OPERATIONAL_PERMS },
      appointments: { ...OPERATIONAL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      processInstances: {},
    },
  },
];

// Helper to convert existing Role permissions into simple module state
function getModulePermsFromRole(role?: Role | null): Record<string, SimpleModulePermission> {
  const result: Record<string, SimpleModulePermission> = {};

  ROLE_PERMISSION_MODULES.forEach((mod) => {
    if (!role) {
      result[mod.id] = { actions: [], level: "all" };
      return;
    }

    const perms = (role.permissions as any)?.[mod.id] as ModulePermissions | undefined;
    if (!perms) {
      result[mod.id] = {
        actions: role.isDefault
          ? ["read", "write", "delete", "import", "export"]
          : ["read", "write"],
        level: "all",
      };
      return;
    }

    const acts: PermissionAction[] = [];
    if (perms.read && perms.read !== "deny") acts.push("read");
    if ((perms.add && perms.add !== "deny") || (perms.edit && perms.edit !== "deny")) acts.push("write");
    if (perms.delete && perms.delete !== "deny") acts.push("delete");
    if (perms.import && perms.import !== "deny") acts.push("import");
    if (perms.export && perms.export !== "deny") acts.push("export");

    let lvl: ScopeLevelOption = "all";
    const ref = perms.read || perms.add || perms.edit || perms.delete || "all";
    if (ref === "own") lvl = "own";
    else if (ref === "role" || (ref as any) === "department") lvl = "department";
    else if (ref === "deny" && acts.length === 0) lvl = "deny";

    result[mod.id] = { actions: acts, level: lvl };
  });

  return result;
}

// Helper to extract workflow perms from role:
function getWorkflowPermsFromRole(
  role: Role | null | undefined,
  allProcs: Process[]
): Record<string, Record<string, WorkflowPermissionState>> {
  const result: Record<string, Record<string, WorkflowPermissionState>> = {};

  ["processes", "appointments"].forEach((modId) => {
    result[modId] = {};
    const wfs = getModuleWorkflows(modId, allProcs);
    wfs.forEach((wf) => {
      const inst = role?.permissions?.processInstances?.[wf.id];
      if (!inst) {
        result[modId][wf.id] = { isInherit: true, actions: [], level: "all" };
        return;
      }

      // Check if all actions are inherit
      const isInherit = Object.values(inst).every(
        (v) => v === "inherit" || v === undefined
      );
      if (isInherit) {
        result[modId][wf.id] = { isInherit: true, actions: [], level: "all" };
      } else {
        const acts: PermissionAction[] = [];
        if (inst.read && inst.read !== "deny") acts.push("read");
        if ((inst.add && inst.add !== "deny") || (inst.edit && inst.edit !== "deny"))
          acts.push("write");
        if (inst.delete && inst.delete !== "deny") acts.push("delete");
        if (inst.import && inst.import !== "deny") acts.push("import");
        if (inst.export && inst.export !== "deny") acts.push("export");

        let lvl: ScopeLevelOption = "all";
        const ref = inst.read || inst.add || inst.edit || inst.delete || "all";
        if (ref === "own") lvl = "own";
        else if (ref === "role" || (ref as any) === "department") lvl = "department";
        else if (ref === "deny" && acts.length === 0) lvl = "deny";

        result[modId][wf.id] = { isInherit: false, actions: acts, level: lvl };
      }
    });
  });

  return result;
}

// Helper to convert simple module state back to ItemPermissions
function convertToItemPermissions(
  modulePerms: Record<string, SimpleModulePermission>,
  workflowPerms: Record<string, Record<string, WorkflowPermissionState>>,
  allProcs: Process[]
): ItemPermissions {
  const base = createDefaultPermissions();

  ROLE_PERMISSION_MODULES.forEach((mod) => {
    const state = modulePerms[mod.id] || { actions: [], level: "all" };
    const acts = state.actions || [];
    const scope: ActionScope =
      state.level === "all"
        ? "all"
        : state.level === "department"
        ? "role"
        : state.level === "own"
        ? "own"
        : "deny";

    const permObj: ModulePermissions = {
      read: acts.includes("read") ? scope : "deny",
      add: acts.includes("write") ? scope : "deny",
      edit: acts.includes("write") ? scope : "deny",
      delete: acts.includes("delete") ? scope : "deny",
      export: acts.includes("export") ? scope : "deny",
      import: acts.includes("import") ? scope : "deny",
    };

    if (mod.id in base) {
      (base as any)[mod.id] = permObj;
    }
  });

  // Dynamic processInstances
  const processInstances: Record<string, ModulePermissions> = {};
  ["processes", "appointments"].forEach((modId) => {
    const wfs = getModuleWorkflows(modId, allProcs);
    wfs.forEach((wf) => {
      const wPerm = workflowPerms[modId]?.[wf.id] || {
        isInherit: true,
        actions: [],
        level: "all",
      };
      if (wPerm.isInherit) {
        processInstances[wf.id] = {
          read: "inherit",
          add: "inherit",
          edit: "inherit",
          delete: "inherit",
          export: "inherit",
          import: "inherit",
        };
      } else {
        const scope: ActionScope =
          wPerm.level === "all"
            ? "all"
            : wPerm.level === "department"
            ? "role"
            : wPerm.level === "own"
            ? "own"
            : "deny";
        const acts = wPerm.actions || [];
        processInstances[wf.id] = {
          read: acts.includes("read") ? scope : "deny",
          add: acts.includes("write") ? scope : "deny",
          edit: acts.includes("write") ? scope : "deny",
          delete: acts.includes("delete") ? scope : "deny",
          export: acts.includes("export") ? scope : "deny",
          import: acts.includes("import") ? scope : "deny",
        };
      }
    });
  });

  base.processInstances = processInstances;
  return base;
}

// ─── MAIN DRAWER COMPONENT ────────────────────────────────────────────────────

export interface RolesPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onSaveRoles: (updatedRoles: Role[]) => void;
  assignedUserCounts?: Record<string, number>;
  editingRole?: Role | null;
  zIndex?: number;
}

export function RolesPermissionsDrawer({
  isOpen,
  onClose,
  roles,
  onSaveRoles,
  editingRole = null,
  zIndex = 9999,
}: RolesPermissionsDrawerProps) {
  const allProcesses = useMemo(() => {
    try {
      const list = getStoredProcesses();
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {}
    return [];
  }, []);

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [modulePerms, setModulePerms] = useState<Record<string, SimpleModulePermission>>({});
  const [workflowPerms, setWorkflowPerms] = useState<Record<string, Record<string, WorkflowPermissionState>>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    processes: true,
    appointments: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingRole) {
        setRoleName(editingRole.name);
        setDescription(editingRole.description || "");
        setModulePerms(getModulePermsFromRole(editingRole));
        setWorkflowPerms(getWorkflowPermsFromRole(editingRole, allProcesses));
      } else {
        setRoleName("");
        setDescription("");
        setModulePerms(getModulePermsFromRole(null));
        setWorkflowPerms(getWorkflowPermsFromRole(null, allProcesses));
      }
    }
  }, [isOpen, editingRole, allProcesses]);

  if (!isOpen) return null;

  const handleActionsChange = (moduleId: string, actions: PermissionAction[]) => {
    setModulePerms((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || { actions: [], level: "all" }),
        actions,
      },
    }));
  };

  const handleLevelChange = (moduleId: string, level: ScopeLevelOption) => {
    setModulePerms((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || { actions: [], level: "all" }),
        level,
      },
    }));
  };

  const handleWorkflowActionsChange = (
    moduleId: string,
    workflowId: string,
    actions: PermissionAction[]
  ) => {
    setWorkflowPerms((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [workflowId]: {
          ...(prev[moduleId]?.[workflowId] || { isInherit: true, level: "all" }),
          actions,
          isInherit: false,
        },
      },
    }));
  };

  const handleWorkflowToggleInherit = (
    moduleId: string,
    workflowId: string,
    inherit: boolean
  ) => {
    setWorkflowPerms((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [workflowId]: {
          ...(prev[moduleId]?.[workflowId] || { level: "all" }),
          isInherit: inherit,
          actions: inherit ? [] : prev[moduleId]?.[workflowId]?.actions || [],
        },
      },
    }));
  };

  const handleWorkflowLevelChange = (
    moduleId: string,
    workflowId: string,
    level: ScopeLevelOption
  ) => {
    setWorkflowPerms((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [workflowId]: {
          ...(prev[moduleId]?.[workflowId] || { isInherit: true, actions: [] }),
          level,
        },
      },
    }));
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleSave = () => {
    const trimmed = roleName.trim();
    if (!trimmed) {
      toast.error("Role Name is required.");
      return;
    }

    const permissions = convertToItemPermissions(modulePerms, workflowPerms, allProcesses);

    if (editingRole) {
      const updated = roles.map((r) =>
        r.id === editingRole.id
          ? {
              ...r,
              name: trimmed,
              description: description.trim(),
              permissions,
            }
          : r
      );
      onSaveRoles(updated);
      toast.success(`Role "${trimmed}" updated successfully`);
    } else {
      const newRole: Role = {
        id: "role_" + Date.now(),
        name: trimmed,
        description: description.trim(),
        isDefault: false,
        permissions,
      };
      onSaveRoles([...roles, newRole]);
      toast.success(`Role "${trimmed}" created successfully`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-end overflow-hidden" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-2xl sm:max-w-3xl bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-200"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header matching screenshot */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            {editingRole ? "Edit Role" : "Create Role"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 bg-white">
          {/* Top 2-Column Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Executive"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Can manage all clients and calls"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-normal text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Permissions Table with dark #1E293B header */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[28%]">MODULE</th>
                  <th className="py-3 px-4 w-[44%]">PERMISSION</th>
                  <th className="py-3 px-4 w-[28%]">LEVEL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {ROLE_PERMISSION_MODULES.map((mod) => {
                  const current = modulePerms[mod.id] || { actions: [], level: "all" };
                  const workflows = getModuleWorkflows(mod.id, allProcesses);
                  const hasWorkflows = workflows.length > 0;
                  const isExpanded = !!expandedModules[mod.id];

                  return (
                    <React.Fragment key={mod.id}>
                      <tr className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-gray-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            {hasWorkflows && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(mod.id);
                                }}
                                className="w-5 h-5 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer mr-1 shrink-0"
                                title={isExpanded ? "Collapse workflows" : "Expand workflows"}
                              >
                                <ChevronDown
                                  className={`w-3 h-3 stroke-[2.5] transition-transform duration-200 ${
                                    isExpanded ? "" : "-rotate-90"
                                  }`}
                                />
                              </button>
                            )}
                            <span>{mod.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <PermissionSelect
                            value={current.actions}
                            onChange={(actions) => handleActionsChange(mod.id, actions)}
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="relative">
                            <select
                              value={current.level}
                              onChange={(e) =>
                                handleLevelChange(mod.id, e.target.value as ScopeLevelOption)
                              }
                              className="w-full h-9 px-3 pr-8 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium appearance-none cursor-pointer outline-none focus:border-blue-500 transition-colors shadow-2xs"
                            >
                              <option value="all">All Records</option>
                              <option value="department">Role</option>
                              <option value="own">Own Records</option>
                              <option value="deny">Deny</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                      </tr>

                      {/* Granular Workflows Accordion Rows */}
                      {hasWorkflows && isExpanded && (
                        <>
                          {workflows.map((wf) => {
                            const wPerm = workflowPerms[mod.id]?.[wf.id] || {
                              isInherit: true,
                              actions: [],
                              level: "all",
                            };

                            return (
                              <tr
                                key={wf.id}
                                className="bg-slate-50/20 hover:bg-slate-50/60 transition-colors border-t border-slate-100/60"
                              >
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2.5 pl-4 border-l-2 border-blue-400 min-w-0">
                                    <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span
                                      className="text-xs font-medium text-slate-700 truncate"
                                      title={wf.name}
                                    >
                                      {wf.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-4">
                                  <PermissionSelect
                                    value={wPerm.actions}
                                    onChange={(actions) =>
                                      handleWorkflowActionsChange(mod.id, wf.id, actions)
                                    }
                                    allowInherit={true}
                                    isInherit={wPerm.isInherit ?? true}
                                    onToggleInherit={(inherit) =>
                                      handleWorkflowToggleInherit(mod.id, wf.id, inherit)
                                    }
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <div className="relative">
                                    <select
                                      value={wPerm.level || "all"}
                                      onChange={(e) =>
                                        handleWorkflowLevelChange(
                                          mod.id,
                                          wf.id,
                                          e.target.value as ScopeLevelOption
                                        )
                                      }
                                      className="w-full h-9 px-3 pr-8 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-medium appearance-none cursor-pointer outline-none focus:border-blue-500 transition-colors shadow-2xs"
                                    >
                                      <option value="all">All Records</option>
                                      <option value="department">Role</option>
                                      <option value="own">Own Records</option>
                                      <option value="deny">Deny</option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            Save Role
          </button>
        </div>
      </div>
    </div>
  );
}
