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

export type ScopeLevelOption = "all" | "department" | "role" | "own" | "deny";

export interface SimpleModulePermission {
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export interface StageItem {
  id: string;
  name: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  stages?: StageItem[];
}

export interface WorkflowPermissionState {
  isInherit: boolean;
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export interface StagePermissionState {
  isInherit: boolean;
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export const MODULE_WORKFLOW_KEYS = ["processes", "appointments", "billings"];

export function getModuleWorkflows(moduleId: string, allProcesses: Process[]): WorkflowItem[] {
  if (moduleId === "processes") {
    const list = allProcesses.filter(
      (p) => !p.entityType || p.entityType === "client" || (p.entityType as any) === "process"
    );
    if (list.length > 0) {
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s) => ({ id: s.id, name: s.name })),
      }));
    }
    return [
      {
        id: "wf-proc-test",
        name: "Test Process",
        stages: [
          { id: "st-test-1", name: "Initial Contact" },
          { id: "st-test-2", name: "In Progress" },
          { id: "st-test-3", name: "Completed" },
        ],
      },
      {
        id: "wf-proc-intake",
        name: "Client Intake",
        stages: [
          { id: "st-intake-1", name: "New Inquiry" },
          { id: "st-intake-2", name: "Consultation" },
          { id: "st-intake-3", name: "Onboarded" },
        ],
      },
      {
        id: "wf-proc-reactivation",
        name: "Client Reactivation",
        stages: [
          { id: "st-react-1", name: "Outreach" },
          { id: "st-react-2", name: "Follow Up" },
          { id: "st-react-3", name: "Reactivated" },
        ],
      },
    ];
  }
  if (moduleId === "appointments") {
    const list = allProcesses.filter((p) => p.entityType === "appointment");
    if (list.length > 0) {
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s) => ({ id: s.id, name: s.name })),
      }));
    }
    return [
      {
        id: "wf-appt-default",
        name: "Appointment Flow",
        stages: [
          { id: "st-appt-1", name: "Booked" },
          { id: "st-appt-2", name: "Confirmed" },
          { id: "st-appt-3", name: "Checked In" },
          { id: "st-appt-4", name: "Completed" },
        ],
      },
    ];
  }
  if (moduleId === "billings") {
    const list = allProcesses.filter((p) => p.entityType === "invoice");
    if (list.length > 0) {
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s) => ({ id: s.id, name: s.name })),
      }));
    }
    return [
      {
        id: "wf-bill-default",
        name: "Invoice & Billing Workflow",
        stages: [
          { id: "st-bill-draft", name: "Draft Invoice" },
          { id: "st-bill-sent", name: "Sent / Pending" },
          { id: "st-bill-paid", name: "Paid & Reconciled" },
          { id: "st-bill-overdue", name: "Overdue Followup" },
        ],
      },
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
    roleType: "responsible",
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
      stageInstances: {},
    },
  },
  {
    id: "manager",
    name: "Manager",
    roleType: "responsible",
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
      stageInstances: {},
    },
  },
  {
    id: "specialist",
    name: "Specialist",
    roleType: "responsible",
    description: "Specialized clinical consults, triage assessments, appointment booking, and patient records",
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
      appointments: { ...ALL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      processInstances: {},
      stageInstances: {},
    },
  },
  {
    id: "reception",
    name: "Reception",
    roleType: "responsible",
    description: "Front-desk reception, appointment check-ins, and visitor assistance",
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
      appointments: { ...ALL_PERMS },
      services: { ...OPERATIONAL_PERMS },
      processInstances: {},
      stageInstances: {},
    },
  },
  {
    id: "sales",
    name: "Sales",
    roleType: "responsible",
    description: "Lead acquisition, service packages, client consultations, and follow-ups",
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
      stageInstances: {},
    },
  },
  {
    id: "agent",
    name: "Agent",
    roleType: "responsible",
    description: "Customer service inquiries, live chat support, and call handling",
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
      stageInstances: {},
    },
  },
  {
    id: "observer-role",
    name: "Auditor / Observer",
    roleType: "observer",
    description: "View and monitor all workflows and stages without create or delete permissions",
    isDefault: false,
    permissions: {
      clients: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      processes: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      calls: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      chats: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      knowledgeBase: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      settings: makeModulePerms("deny", "deny", "deny", "deny", "deny", "deny"),
      processSettings: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      webForms: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      appointments: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      services: makeModulePerms("all", "deny", "all", "deny", "all", "all"),
      processInstances: {},
      stageInstances: {},
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
    if (perms.read && perms.read !== "deny") acts.push("view");
    if (perms.add && perms.add !== "deny") acts.push("create");
    if (perms.edit && perms.edit !== "deny") acts.push("edit");
    if (perms.delete && perms.delete !== "deny") acts.push("delete");
    if (perms.import && perms.import !== "deny") acts.push("import");
    if (perms.export && perms.export !== "deny") acts.push("export");

    let lvl: ScopeLevelOption = "all";
    const ref = perms.read || perms.add || perms.edit || perms.delete || "all";
    if (ref === "own") lvl = "own";
    else if (ref === "department") lvl = "department";
    else if (ref === "role") lvl = "role";
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

  MODULE_WORKFLOW_KEYS.forEach((modId) => {
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
        if (inst.read && inst.read !== "deny") acts.push("view");
        if (inst.add && inst.add !== "deny") acts.push("create");
        if (inst.edit && inst.edit !== "deny") acts.push("edit");
        if (inst.delete && inst.delete !== "deny") acts.push("delete");
        if (inst.import && inst.import !== "deny") acts.push("import");
        if (inst.export && inst.export !== "deny") acts.push("export");

        let lvl: ScopeLevelOption = "all";
        const ref = inst.read || inst.add || inst.edit || inst.delete || "all";
        if (ref === "own") lvl = "own";
        else if (ref === "department") lvl = "department";
        else if (ref === "role") lvl = "role";
        else if (ref === "deny" && acts.length === 0) lvl = "deny";

        result[modId][wf.id] = { isInherit: false, actions: acts, level: lvl };
      }
    });
  });

  return result;
}

// Helper to extract stage perms from role:
function getStagePermsFromRole(
  role: Role | null | undefined,
  allProcs: Process[]
): Record<string, StagePermissionState> {
  const result: Record<string, StagePermissionState> = {};

  MODULE_WORKFLOW_KEYS.forEach((modId) => {
    const wfs = getModuleWorkflows(modId, allProcs);
    wfs.forEach((wf) => {
      (wf.stages || []).forEach((st) => {
        const key = `${wf.id}_${st.id}`;
        const inst =
          role?.permissions?.stageInstances?.[key] ||
          role?.permissions?.stageInstances?.[st.id];

        if (!inst) {
          result[key] = { isInherit: true, actions: [], level: "all" };
          return;
        }

        const isInherit = Object.values(inst).every(
          (v) => v === "inherit" || v === undefined
        );
        if (isInherit) {
          result[key] = { isInherit: true, actions: [], level: "all" };
        } else {
          const acts: PermissionAction[] = [];
          if (inst.read && inst.read !== "deny") acts.push("view");
          if (inst.add && inst.add !== "deny") acts.push("create");
          if (inst.edit && inst.edit !== "deny") acts.push("edit");
          if (inst.delete && inst.delete !== "deny") acts.push("delete");
          if (inst.import && inst.import !== "deny") acts.push("import");
          if (inst.export && inst.export !== "deny") acts.push("export");

          let lvl: ScopeLevelOption = "all";
          const ref = inst.read || inst.add || inst.edit || inst.delete || "all";
          if (ref === "own") lvl = "own";
          else if (ref === "department") lvl = "department";
          else if (ref === "role") lvl = "role";
          else if (ref === "deny" && acts.length === 0) lvl = "deny";

          result[key] = { isInherit: false, actions: acts, level: lvl };
        }
      });
    });
  });

  return result;
}

// Helper to convert simple module state back to ItemPermissions
function convertToItemPermissions(
  modulePerms: Record<string, SimpleModulePermission>,
  workflowPerms: Record<string, Record<string, WorkflowPermissionState>>,
  stagePerms: Record<string, StagePermissionState>,
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
        ? "department"
        : state.level === "role"
        ? "role"
        : state.level === "own"
        ? "own"
        : "deny";

    const hasView = acts.includes("view") || acts.includes("read");
    const hasCreate = acts.includes("create") || acts.includes("write");
    const hasEdit = acts.includes("edit") || acts.includes("write");
    const hasDelete = acts.includes("delete");
    const hasExport = acts.includes("export");
    const hasImport = acts.includes("import");

    const permObj: ModulePermissions = {
      read: hasView ? scope : "deny",
      add: hasCreate ? scope : "deny",
      edit: hasEdit ? scope : "deny",
      delete: hasDelete ? scope : "deny",
      export: hasExport ? scope : "deny",
      import: hasImport ? scope : "deny",
    };

    if (mod.id in base) {
      (base as any)[mod.id] = permObj;
    }
  });

  // Dynamic processInstances and stageInstances
  const processInstances: Record<string, ModulePermissions> = {};
  const stageInstances: Record<string, Partial<Record<Action, ActionScope>>> = {};

  MODULE_WORKFLOW_KEYS.forEach((modId) => {
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
            ? "department"
            : wPerm.level === "role"
            ? "role"
            : wPerm.level === "own"
            ? "own"
            : "deny";
        const acts = wPerm.actions || [];
        const hasView = acts.includes("view") || acts.includes("read");
        const hasCreate = acts.includes("create") || acts.includes("write");
        const hasEdit = acts.includes("edit") || acts.includes("write");
        const hasDelete = acts.includes("delete");
        const hasExport = acts.includes("export");
        const hasImport = acts.includes("import");

        processInstances[wf.id] = {
          read: hasView ? scope : "deny",
          add: hasCreate ? scope : "deny",
          edit: hasEdit ? scope : "deny",
          delete: hasDelete ? scope : "deny",
          export: hasExport ? scope : "deny",
          import: hasImport ? scope : "deny",
        };
      }

      // Dynamic stageInstances
      (wf.stages || []).forEach((st) => {
        const key = `${wf.id}_${st.id}`;
        const sPerm = stagePerms[key];
        if (sPerm && !sPerm.isInherit) {
          const sScope: ActionScope =
            sPerm.level === "all"
              ? "all"
              : sPerm.level === "department"
              ? "department"
              : sPerm.level === "role"
              ? "role"
              : sPerm.level === "own"
              ? "own"
              : "deny";
          const sActs = sPerm.actions || [];
          const stageObj: Partial<Record<Action, ActionScope>> = {
            read: sActs.includes("view") || sActs.includes("read") ? sScope : "deny",
            add: sActs.includes("create") || sActs.includes("write") ? sScope : "deny",
            edit: sActs.includes("edit") || sActs.includes("write") ? sScope : "deny",
            delete: sActs.includes("delete") ? sScope : "deny",
            export: sActs.includes("export") ? sScope : "deny",
            import: sActs.includes("import") ? sScope : "deny",
          };
          stageInstances[key] = stageObj;
          stageInstances[st.id] = stageObj;
        } else {
          const inheritObj: Partial<Record<Action, ActionScope>> = {
            read: "inherit",
            add: "inherit",
            edit: "inherit",
            delete: "inherit",
            export: "inherit",
            import: "inherit",
          };
          stageInstances[key] = inheritObj;
          stageInstances[st.id] = inheritObj;
        }
      });
    });
  });

  base.processInstances = processInstances;
  base.stageInstances = stageInstances;
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
  initialDepartment?: string;
  zIndex?: number;
}

export function RolesPermissionsDrawer({
  isOpen,
  onClose,
  roles,
  onSaveRoles,
  editingRole = null,
  initialDepartment = "",
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
  const [roleType, setRoleType] = useState<"responsible" | "observer">("responsible");
  const [modulePerms, setModulePerms] = useState<Record<string, SimpleModulePermission>>({});
  const [workflowPerms, setWorkflowPerms] = useState<Record<string, Record<string, WorkflowPermissionState>>>({});
  const [stagePerms, setStagePerms] = useState<Record<string, StagePermissionState>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    processes: true,
    appointments: true,
    billings: true,
  });
  const [expandedWorkflows, setExpandedWorkflows] = useState<Record<string, boolean>>({
    "wf-proc-test": true,
    "wf-appt-default": true,
    "wf-bill-default": true,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingRole) {
        setRoleName(editingRole.name);
        setDescription(editingRole.description || "");
        setRoleType(editingRole.roleType || "responsible");
        setModulePerms(getModulePermsFromRole(editingRole));
        setWorkflowPerms(getWorkflowPermsFromRole(editingRole, allProcesses));
        setStagePerms(getStagePermsFromRole(editingRole, allProcesses));
      } else {
        setRoleName("");
        setDescription("");
        setRoleType("responsible");
        setModulePerms(getModulePermsFromRole(null));
        setWorkflowPerms(getWorkflowPermsFromRole(null, allProcesses));
        setStagePerms(getStagePermsFromRole(null, allProcesses));
      }
    }
  }, [isOpen, editingRole, allProcesses]);

  if (!isOpen) return null;

  const handleRoleTypeChange = (newType: "responsible" | "observer") => {
    setRoleType(newType);
    if (newType === "observer") {
      // Strip create and delete from modulePerms, workflowPerms, stagePerms
      setModulePerms((prev) => {
        const updated: Record<string, SimpleModulePermission> = {};
        Object.entries(prev).forEach(([k, v]) => {
          updated[k] = {
            ...v,
            actions: v.actions.filter((a) => a !== "create" && a !== "delete"),
          };
        });
        return updated;
      });
      setWorkflowPerms((prev) => {
        const updated: Record<string, Record<string, WorkflowPermissionState>> = {};
        Object.entries(prev).forEach(([modKey, wfs]) => {
          updated[modKey] = {};
          Object.entries(wfs).forEach(([wfId, state]) => {
            updated[modKey][wfId] = {
              ...state,
              actions: state.actions.filter((a) => a !== "create" && a !== "delete"),
            };
          });
        });
        return updated;
      });
      setStagePerms((prev) => {
        const updated: Record<string, StagePermissionState> = {};
        Object.entries(prev).forEach(([key, state]) => {
          updated[key] = {
            ...state,
            actions: state.actions.filter((a) => a !== "create" && a !== "delete"),
          };
        });
        return updated;
      });
    }
  };

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

  const handleStageActionsChange = (
    stageKey: string,
    actions: PermissionAction[]
  ) => {
    setStagePerms((prev) => ({
      ...prev,
      [stageKey]: {
        ...(prev[stageKey] || { isInherit: true, level: "all" }),
        actions,
        isInherit: false,
      },
    }));
  };

  const handleStageToggleInherit = (stageKey: string, inherit: boolean) => {
    setStagePerms((prev) => ({
      ...prev,
      [stageKey]: {
        ...(prev[stageKey] || { level: "all" }),
        isInherit: inherit,
        actions: inherit ? [] : prev[stageKey]?.actions || [],
      },
    }));
  };

  const handleStageLevelChange = (
    stageKey: string,
    level: ScopeLevelOption
  ) => {
    setStagePerms((prev) => ({
      ...prev,
      [stageKey]: {
        ...(prev[stageKey] || { isInherit: true, actions: [] }),
        level,
      },
    }));
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const toggleWorkflowExpanded = (workflowId: string) => {
    setExpandedWorkflows((prev) => ({
      ...prev,
      [workflowId]: !prev[workflowId],
    }));
  };

  const handleSave = () => {
    const trimmed = roleName.trim();
    if (!trimmed) {
      toast.error("Permission Name is required.");
      return;
    }

    const permissions = convertToItemPermissions(
      modulePerms,
      workflowPerms,
      stagePerms,
      allProcesses
    );

    if (editingRole) {
      const updated = roles.map((r) =>
        r.id === editingRole.id
          ? {
              ...r,
              name: trimmed,
              description: description.trim(),
              roleType,
              permissions,
            }
          : r
      );
      onSaveRoles(updated);
      toast.success(`Permission "${trimmed}" updated successfully`);
    } else {
      const newRole: Role = {
        id: "role_" + Date.now(),
        name: trimmed,
        description: description.trim(),
        roleType,
        isDefault: false,
        permissions,
      };
      onSaveRoles([...roles, newRole]);
      toast.success(`Permission "${trimmed}" created successfully`);
    }

    onClose();
  };

  const isObserverMode = roleType === "observer";

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
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {editingRole ? "Edit Permission" : "Create Permission"}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isObserverMode
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isObserverMode ? "Observer Mode" : "Responsible Mode"}
            </span>
          </div>
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
        <div className="flex-1 overflow-y-auto min-0 p-6 space-y-6 bg-white">
          {/* Top 3-Column Inputs: Permission Name, Role Type (Responsible / Observer), Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Permission Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Clinical Executive"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Access Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={roleType}
                  onChange={(e) => handleRoleTypeChange(e.target.value as "responsible" | "observer")}
                  className="w-full h-10 px-3.5 pr-8 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="responsible">Responsible (Full Execution)</option>
                  <option value="observer">Observer (View & Monitor Only)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Can oversee workflows and processes"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-normal text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Permissions Table with dark #1E293B header */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E293B] text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-[32%]">MODULE & WORKFLOWS</th>
                  <th className="py-3 px-4 w-[42%]">PERMISSION</th>
                  <th className="py-3 px-4 w-[26%]">SCOPE</th>
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
                            {hasWorkflows && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({workflows.length} {workflows.length === 1 ? "workflow" : "workflows"})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <PermissionSelect
                            value={current.actions}
                            onChange={(actions) => handleActionsChange(mod.id, actions)}
                            isObserver={isObserverMode}
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
                              <option value="department">Department</option>
                              <option value="role">Role</option>
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
                            const hasStages = Array.isArray(wf.stages) && wf.stages.length > 0;
                            const isWfExpanded = !!expandedWorkflows[wf.id];

                            return (
                              <React.Fragment key={wf.id}>
                                <tr className="bg-slate-50/30 hover:bg-slate-50/70 transition-colors border-t border-slate-100">
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2 pl-4 border-l-2 border-blue-500 min-w-0">
                                      {hasStages ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleWorkflowExpanded(wf.id);
                                          }}
                                          className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                                          title={isWfExpanded ? "Collapse stages" : "Expand stages"}
                                        >
                                          <ChevronDown
                                            className={`w-2.5 h-2.5 stroke-[2.5] transition-transform duration-200 ${
                                              isWfExpanded ? "" : "-rotate-90"
                                            }`}
                                          />
                                        </button>
                                      ) : (
                                        <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span
                                        className="text-xs font-semibold text-slate-800 truncate"
                                        title={wf.name}
                                      >
                                        {wf.name}
                                      </span>
                                      {hasStages && (
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          ({wf.stages!.length} stages)
                                        </span>
                                      )}
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
                                      inheritLabel="Inherit from module"
                                      isObserver={isObserverMode}
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
                                        <option value="department">Department</option>
                                        <option value="role">Role</option>
                                        <option value="own">Own Records</option>
                                        <option value="deny">Deny</option>
                                      </select>
                                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                  </td>
                                </tr>

                                {/* Stages Rows under Workflow */}
                                {hasStages && isWfExpanded && wf.stages!.map((stage, sIdx) => {
                                  const stageKey = `${wf.id}_${stage.id}`;
                                  const sPerm = stagePerms[stageKey] || {
                                    isInherit: true,
                                    actions: [],
                                    level: "all",
                                  };

                                  return (
                                    <tr
                                      key={stage.id}
                                      className="bg-blue-50/15 hover:bg-blue-50/40 transition-colors border-t border-slate-100"
                                    >
                                      <td className="py-2 px-4">
                                        <div className="flex items-center gap-2 pl-9 min-w-0">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                          <span
                                            className="text-[11px] font-medium text-slate-700 truncate"
                                            title={stage.name}
                                          >
                                            {stage.name}
                                          </span>
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                                            Stage {sIdx + 1}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-4">
                                        <PermissionSelect
                                          value={sPerm.actions}
                                          onChange={(actions) => handleStageActionsChange(stageKey, actions)}
                                          allowInherit={true}
                                          isInherit={sPerm.isInherit ?? true}
                                          inheritLabel="Inherit from workflow"
                                          isObserver={isObserverMode}
                                          onToggleInherit={(inherit) =>
                                            handleStageToggleInherit(stageKey, inherit)
                                          }
                                        />
                                      </td>
                                      <td className="py-1.5 px-4">
                                        <div className="relative">
                                          <select
                                            value={sPerm.level || "all"}
                                            onChange={(e) =>
                                              handleStageLevelChange(
                                                stageKey,
                                                e.target.value as ScopeLevelOption
                                              )
                                            }
                                            className="w-full h-8 px-2.5 pr-7 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-700 font-medium appearance-none cursor-pointer outline-none focus:border-blue-500 transition-colors shadow-2xs"
                                          >
                                            <option value="all">All Records</option>
                                            <option value="department">Department</option>
                                            <option value="role">Role</option>
                                            <option value="own">Own Records</option>
                                            <option value="deny">Deny</option>
                                          </select>
                                          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
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
            Save Permission
          </button>
        </div>
      </div>
    </div>
  );
}
