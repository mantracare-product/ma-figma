/**
 * AdminRolesPermissions.tsx
 * Path: src/app/pages/admin/AdminRolesPermissions.tsx
 *
 * Dedicated Admin Console for Roles & Permissions Configuration.
 * Allows administrators to manage system and custom roles, configure granular CRUD
 * and action matrices per module, and scope permissions by department and admin scope.
 */

import React, { useState, useMemo } from "react";
import {
  Shield,
  Plus,
  Pencil,
  Building2,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Users,
  Workflow,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Settings,
  Calendar,
  Tag,
  Receipt,
  Sparkles,
  ChevronDown,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import DrawerShell from "../../components/ui/DrawerShell";
import { AdminControlAccordion } from "./components/AdminControlAccordion";
import PermissionSelect, { PermissionAction, PERMISSION_ACTIONS } from "../../components/settings/PermissionSelect";
import { DepartmentDrawer } from "../../components/settings/DepartmentDrawer";
import { getStoredDepartments, saveStoredDepartments } from "../../../lib/departmentStore";
import type { Department } from "../../../types/permissions";
import { getStoredProcesses, Process } from "../../../lib/useProcessStore";
import { getModuleWorkflows, WorkflowPermissionState } from "../../components/settings/RolesPermissionsDrawer";
import type { ScopingRule } from "../../context/FieldRegistryContext";
import {
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";

export type PermissionScope = "deny" | "own" | "department" | "all";
export type ScopeLevelOption = "all" | "department" | "own" | "deny";

export interface SimpleModulePermission {
  actions: PermissionAction[];
  level: ScopeLevelOption;
}

export interface ModulePermissionConfig {
  scope: PermissionScope;
  read: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
}

export const ROLE_PERMISSION_MODULES = [
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
  { id: "telephonyNumbers", label: "Phone Numbers" },
  { id: "telephonyCalls", label: "Call Logs" },
  { id: "billingOrders", label: "Orders" },
  { id: "billingSubscriptions", label: "Subscriptions" },
  { id: "productAnalytics", label: "Product Analytics" },
  { id: "telephonyProviders", label: "Telephony Providers" },
  { id: "userManagement", label: "User Management" },
  { id: "auditLogs", label: "Audit Logs" },
];

export function createDefaultModulePermissions(preset?: "full" | "standard" | "viewOnly" | "blank"): Record<string, SimpleModulePermission> {
  const result: Record<string, SimpleModulePermission> = {};
  ROLE_PERMISSION_MODULES.forEach((mod) => {
    let actions: PermissionAction[] = [];
    if (preset === "full") actions = ["read", "write", "delete", "import", "export"];
    else if (preset === "standard") actions = ["read", "write", "delete"];
    else if (preset === "viewOnly") actions = ["read"];
    else actions = [];

    result[mod.id] = {
      actions,
      level: "all",
    };
  });
  return result;
}

export function normalizeModulePermissions(
  perms?: Record<string, any>,
  fallbackPreset: "full" | "standard" | "blank" = "standard"
): Record<string, SimpleModulePermission> {
  const result: Record<string, SimpleModulePermission> = {};
  const defaults = createDefaultModulePermissions(fallbackPreset);

  ROLE_PERMISSION_MODULES.forEach((mod) => {
    const raw = perms?.[mod.id];
    if (!raw) {
      result[mod.id] = defaults[mod.id] || { actions: [], level: "all" };
      return;
    }

    if (Array.isArray(raw.actions)) {
      result[mod.id] = {
        actions: raw.actions,
        level: raw.level || "all",
      };
      return;
    }

    // Convert legacy format
    let acts: PermissionAction[] = [];
    if (raw.permission === "full") acts = ["read", "write", "delete", "import", "export"];
    else if (raw.permission === "read_write") acts = ["read", "write"];
    else if (raw.permission === "read_only") acts = ["read"];
    else acts = [];

    result[mod.id] = {
      actions: acts,
      level: raw.level || "all",
    };
  });

  return result;
}

export interface RoleItem {
  id: string;
  roleName: string;
  category: string;
  industry: string;
  description: string;
  department?: string;
  createdAt: string;
  isSystem?: boolean;
  scopingRules?: ScopingRule[];
  modulePermissions?: Record<string, SimpleModulePermission>;
  workflowPermissions?: Record<string, Record<string, WorkflowPermissionState>>;
  permissions?: Record<string, ModulePermissionConfig>;
}

const STORAGE_KEY = "ma_admin_roles_store_v2";

const ROLE_MODULES = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "processes", label: "Processes", icon: Workflow },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "knowledgeBase", label: "Knowledge Base", icon: BookOpen },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "services", label: "Product/Services", icon: Tag },
  { id: "invoices", label: "Billing & Invoices", icon: Receipt },
  { id: "settings", label: "Settings", icon: Settings },
];

const DEFAULT_FULL_PERMS: ModulePermissionConfig = {
  scope: "all",
  read: true,
  add: true,
  edit: true,
  delete: true,
  export: true,
  import: true,
};

const DEFAULT_STANDARD_PERMS: ModulePermissionConfig = {
  scope: "department",
  read: true,
  add: true,
  edit: true,
  delete: false,
  export: true,
  import: false,
};

const DEFAULT_VIEW_ONLY_PERMS: ModulePermissionConfig = {
  scope: "all",
  read: true,
  add: false,
  edit: false,
  delete: false,
  export: false,
  import: false,
};

function createInitialMatrix(preset: "full" | "standard" | "viewOnly"): Record<string, ModulePermissionConfig> {
  const tpl =
    preset === "full"
      ? DEFAULT_FULL_PERMS
      : preset === "standard"
      ? DEFAULT_STANDARD_PERMS
      : DEFAULT_VIEW_ONLY_PERMS;
  const matrix: Record<string, ModulePermissionConfig> = {};
  ROLE_MODULES.forEach((m) => {
    matrix[m.id] = { ...tpl };
  });
  return matrix;
}

const INITIAL_ROLES_DATA: RoleItem[] = [
  {
    id: "role-1",
    roleName: "Super Administrator",
    category: "Global / Cross-Domain",
    industry: "All Industries",
    description: "Unrestricted global administrative rights across all organizations, templates, billing, and system logs.",
    createdAt: "2025-01-15T10:00:00.000Z",
    isSystem: true,
    scopingRules: [],
    permissions: createInitialMatrix("full"),
  },
  {
    id: "role-2",
    roleName: "Clinical Intake Coordinator",
    category: "Healthcare",
    industry: "Hospital & Clinics",
    description: "Manages patient onboarding, appointment schedules, insurance verification, and intake calls.",
    createdAt: "2025-02-12T14:30:00.000Z",
    scopingRules: [
      {
        id: "sr-1",
        industryCategory: "Healthcare",
        industries: ["Hospital & Clinics", "General Physician"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-3",
    roleName: "Dealership Service Advisor",
    category: "Automobile",
    industry: "Auto Dealership & Service",
    description: "Handles customer vehicle booking, maintenance requests, parts ordering, and repair status follow-ups.",
    createdAt: "2025-02-18T09:15:00.000Z",
    scopingRules: [
      {
        id: "sr-2",
        industryCategory: "Automobile",
        industries: ["Auto Dealership & Service"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-4",
    roleName: "Property Leasing Manager",
    category: "Real Estate",
    industry: "Commercial Property Leasing",
    description: "Oversees property showings, lease inquiries, tenant documentation, and contract agreements.",
    createdAt: "2025-02-20T11:45:00.000Z",
    scopingRules: [
      {
        id: "sr-3",
        industryCategory: "Real Estate",
        industries: ["Commercial Property Leasing"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-5",
    roleName: "Executive Practice Advisory Lead",
    category: "Coaching & Advisory",
    industry: "Executive Leadership Mentorship",
    description: "Manages client confidential mentorship sessions, scheduling calendars, and strategic advisory notes.",
    createdAt: "2025-03-01T16:20:00.000Z",
    scopingRules: [
      {
        id: "sr-4",
        industryCategory: "Coaching & Advisory",
        industries: ["Executive Leadership Mentorship"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-6",
    roleName: "IT Technical Support Agent",
    category: "IT/Tech",
    industry: "Cloud Migration Consultation",
    description: "Responds to technical helpdesk tickets, monitors SLA response windows, and schedules technical audits.",
    createdAt: "2025-03-05T13:10:00.000Z",
    scopingRules: [
      {
        id: "sr-5",
        industryCategory: "IT/Tech",
        industries: ["Cloud Migration Consultation"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-7",
    roleName: "Field Service Dispatcher",
    category: "Household Care",
    industry: "HVAC & Air Conditioning Repair",
    description: "Dispatches emergency technicians, updates customer work orders, and confirms service time-slots.",
    createdAt: "2025-03-10T08:50:00.000Z",
    scopingRules: [
      {
        id: "sr-6",
        industryCategory: "Household Care",
        industries: ["HVAC & Air Conditioning Repair"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
  {
    id: "role-8",
    roleName: "Practice Billing Specialist",
    category: "Healthcare",
    industry: "Hospital & Clinics",
    description: "Manages CPT billing codes, invoice generation, claims tracking, and payment processing.",
    createdAt: "2025-03-12T11:00:00.000Z",
    scopingRules: [
      {
        id: "sr-7",
        industryCategory: "Healthcare",
        industries: ["Hospital & Clinics"],
        locations: [],
      },
    ],
    permissions: createInitialMatrix("standard"),
  },
];

function getStoredRoles(): RoleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ROLES_DATA));
      return INITIAL_ROLES_DATA;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ROLES_DATA;
  } catch {
    return INITIAL_ROLES_DATA;
  }
}

function saveStoredRoles(roles: RoleItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch (err) {
    console.error("Failed to save roles:", err);
  }
}

function getScopingSummary(
  scopingRules?: ScopingRule[],
  fallbackCategory?: string,
  fallbackIndustry?: string
): string {
  const rules = scopingRules || [];
  if (rules.length === 0) {
    if (fallbackCategory && fallbackCategory !== "Global / Cross-Domain" && fallbackCategory !== "All") {
      return "1 industry, All countries";
    }
    return "All industries, All countries";
  }

  const categories = new Set<string>();
  const industries = new Set<string>();
  const locations = new Set<string>();

  for (const r of rules) {
    if (r.industryCategory && r.industryCategory !== "All") {
      categories.add(r.industryCategory);
    }
    if (r.industries && r.industries.length > 0) {
      for (const ind of r.industries) {
        if (ind && ind !== "All") industries.add(ind);
      }
    }
    if (r.locations && r.locations.length > 0) {
      for (const loc of r.locations) {
        if (loc && loc !== "All") locations.add(loc);
      }
    }
  }

  const isAllCats = categories.size === 0;
  const isAllInds = industries.size === 0;
  const isAllLocs = locations.size === 0;

  let indCount = industries.size;
  if (isAllInds) {
    if (!isAllCats) {
      let total = 0;
      for (const cat of categories) {
        total += getIndustriesForCategory(cat).length;
      }
      indCount = total > 0 ? total : INITIAL_INDUSTRIES.length;
    } else {
      indCount = INITIAL_INDUSTRIES.length;
    }
  }

  let locCount = locations.size;
  if (isAllLocs) {
    locCount = STANDARD_LOCATIONS.length;
  }

  if (isAllCats && isAllInds && isAllLocs) {
    return "All industries, All countries";
  }

  return `${indCount} ${indCount === 1 ? "industry" : "industries"}, ${locCount} ${locCount === 1 ? "country" : "countries"}`;
}

export default function AdminRolesPermissions() {
  const [roles, setRoles] = useState<RoleItem[]>(() => getStoredRoles());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<"roles" | "departments">("roles");
  const [departments, setDepartments] = useState<Department[]>(() => getStoredDepartments());
  const [isDepartmentDrawerOpen, setIsDepartmentDrawerOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formDepartment, setFormDepartment] = useState("");

  const allProcesses = useMemo(() => {
    try {
      const list = getStoredProcesses();
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {}
    return [];
  }, []);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    processes: true,
    appointments: true,
  });

  const [formWorkflowPermissions, setFormWorkflowPermissions] = useState<
    Record<string, Record<string, WorkflowPermissionState>>
  >({});

  // Form State
  const [formRoleName, setFormRoleName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formScopingRules, setFormScopingRules] = useState<ScopingRule[]>([]);
  const [formModulePermissions, setFormModulePermissions] = useState<Record<string, SimpleModulePermission>>(() =>
    createDefaultModulePermissions("standard")
  );

  const updateRolesList = (newList: RoleItem[]) => {
    setRoles(newList);
    saveStoredRoles(newList);
  };

  const availableIndustriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "All") {
      return Array.from(new Set(INITIAL_INDUSTRIES.map((i) => i.name)));
    }
    return getIndustriesForCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      // 1. Category / Scope filter
      if (selectedCategoryFilter !== "All") {
        const matchesCat =
          r.category === selectedCategoryFilter ||
          (r.scopingRules &&
            r.scopingRules.some(
              (rule) => !rule.industryCategory || rule.industryCategory === selectedCategoryFilter || rule.industryCategory === "All"
            ));
        if (!matchesCat) return false;
      }

      // 2. Industry filter
      if (selectedIndustryFilter !== "All") {
        const matchesInd =
          r.industry === selectedIndustryFilter ||
          (r.scopingRules &&
            r.scopingRules.some(
              (rule) => !rule.industries || rule.industries.length === 0 || rule.industries.includes(selectedIndustryFilter) || rule.industries.includes("All")
            ));
        if (!matchesInd) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.roleName.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchInd = r.industry.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchInd && !matchCat) return false;
      }

      return true;
    });
  }, [roles, searchQuery, selectedCategoryFilter, selectedIndustryFilter]);

  const handleOpenDrawer = (mode: "add" | "edit", item?: RoleItem) => {
    setDrawerMode(mode);
    if (mode === "edit" && item) {
      setEditingRole(item);
      setFormRoleName(item.roleName);
      setFormDescription(item.description || "");
      setFormDepartment(item.department || "");
      setFormModulePermissions(
        normalizeModulePermissions(item.modulePermissions, item.isSystem ? "full" : "standard")
      );
      setFormWorkflowPermissions(item.workflowPermissions || {});
      setFormScopingRules(
        item.scopingRules && item.scopingRules.length > 0
          ? [...item.scopingRules]
          : [
              {
                id: `sr-${Date.now()}`,
                industryCategory: item.category !== "Global / Cross-Domain" ? item.category : "Healthcare",
                industries: item.industry !== "All Industries" ? [item.industry] : [],
                locations: [],
              },
            ]
      );
    } else {
      setEditingRole(null);
      setFormRoleName("");
      setFormDescription("");
      setFormModulePermissions(createDefaultModulePermissions("blank"));
      setFormWorkflowPermissions({});
      const defaultCat =
        selectedCategoryFilter !== "All"
          ? selectedCategoryFilter
          : INITIAL_CATEGORIES[0]?.name || "Healthcare";
      const defaultInds =
        selectedIndustryFilter !== "All" ? [selectedIndustryFilter] : [];
      setFormScopingRules([
        {
          id: `sr-${Date.now()}`,
          industryCategory: defaultCat,
          industries: defaultInds,
          locations: [],
        },
      ]);
    }
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingRole(null);
  };

  const handleActionsChange = (moduleId: string, actions: PermissionAction[]) => {
    setFormModulePermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || { actions: [], level: "all" }),
        actions,
      },
    }));
  };

  const handleLevelChange = (moduleId: string, level: ScopeLevelOption) => {
    setFormModulePermissions((prev) => ({
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
    setFormWorkflowPermissions((prev) => ({
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
    setFormWorkflowPermissions((prev) => ({
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
    setFormWorkflowPermissions((prev) => ({
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

  const handleSaveRole = () => {
    const trimmedName = formRoleName.trim();
    if (!trimmedName) {
      toast.error("Role Name is required.");
      return;
    }

    const firstRule = formScopingRules[0];
    const derivedCategory = firstRule?.industryCategory || "Healthcare";
    const derivedIndustry = firstRule?.industries?.[0] || "General Physician";

    if (drawerMode === "edit" && editingRole) {
      const updated: RoleItem = {
        ...editingRole,
        roleName: trimmedName,
        department: formDepartment.trim() || undefined,
        description: formDescription.trim(),
        category: derivedCategory,
        industry: derivedIndustry,
        scopingRules: formScopingRules,
        modulePermissions: formModulePermissions,
        workflowPermissions: formWorkflowPermissions,
      };
      const newList = roles.map((r) => (r.id === editingRole.id ? updated : r));
      updateRolesList(newList);
      toast.success(`Role "${trimmedName}" updated successfully!`);
    } else {
      const newRole: RoleItem = {
        id: `role-${Date.now()}`,
        roleName: trimmedName,
        department: formDepartment.trim() || undefined,
        description: formDescription.trim(),
        category: derivedCategory,
        industry: derivedIndustry,
        createdAt: new Date().toISOString(),
        isSystem: false,
        scopingRules: formScopingRules,
        modulePermissions: formModulePermissions,
        workflowPermissions: formWorkflowPermissions,
      };
      updateRolesList([newRole, ...roles]);
      toast.success(`New role "${trimmedName}" created successfully!`);
    }

    handleCloseDrawer();
  };

  const handleDuplicate = (item: RoleItem) => {
    const copy: RoleItem = {
      ...item,
      id: `role-${Date.now()}`,
      roleName: `${item.roleName} (Copy)`,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };
    updateRolesList([copy, ...roles]);
    toast.success(`Duplicated role "${item.roleName}"`);
  };

  const handleDelete = (item: RoleItem) => {
    if (item.isSystem) {
      toast.error("System roles cannot be deleted.");
      return;
    }
    const updated = roles.filter((r) => r.id !== item.id);
    updateRolesList(updated);
    toast.success(`Deleted role "${item.roleName}"`);
  };

  // Table columns matching client MA: clean role name (no custom/system capsules), no category column, uniform admin scope
  const columns: TableColumn<RoleItem>[] = [
    {
      id: "roleName",
      header: "ROLE NAME",
      align: "left",
      render: (role) => (
        <span
          onClick={() => handleOpenDrawer("edit", role)}
          className="text-xs font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {role.roleName}
        </span>
      ),
    },
    {
      id: "description",
      header: "DESCRIPTION",
      align: "left",
      render: (role) => (
        <span className="text-xs text-gray-600 font-normal line-clamp-1 max-w-sm block" style={{ fontFamily: "Outfit, sans-serif" }}>
          {role.description || "—"}
        </span>
      ),
    },
    {
      id: "adminScope",
      header: "ADMIN SCOPE",
      align: "left",
      render: (role) => (
        <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
          {getScopingSummary(role.scopingRules, role.category, role.industry)}
        </span>
      ),
    },
    {
      id: "permissions",
      header: "PERMITTED SCOPE",
      align: "left",
      render: (role) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
          {role.isSystem ? "Global (Full Access)" : "Custom Matrix Assigned"}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "CREATED DATE",
      align: "left",
      render: (role) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {new Date(role.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  const departmentColumns: TableColumn<Department>[] = [
    {
      id: "name",
      header: "DEPARTMENT NAME",
      align: "left",
      render: (dept) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-slate-700" />
          </div>
          <span
            onClick={() => {
              setEditingDepartment(dept);
              setIsDepartmentDrawerOpen(true);
            }}
            className="text-xs font-bold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {dept.name}
          </span>
        </div>
      ),
    },
    {
      id: "description",
      header: "DESCRIPTION",
      align: "left",
      render: (dept) => (
        <span className="text-xs text-gray-600 font-normal line-clamp-1 max-w-sm block" style={{ fontFamily: "Outfit, sans-serif" }}>
          {dept.description || "—"}
        </span>
      ),
    },
    {
      id: "roles",
      header: "ASSIGNED ROLES",
      align: "left",
      render: (dept) => {
        const assigned = roles.filter((r) => (r.department || "").toLowerCase() === dept.name.toLowerCase());
        if (assigned.length === 0) {
          return <span className="text-xs text-slate-400 italic">No roles assigned</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {assigned.map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                {r.roleName}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "ACTIONS",
      align: "center",
      render: (dept) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setEditingDepartment(dept);
              setIsDepartmentDrawerOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Edit Department"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const updated = departments.filter((d) => d.id !== dept.id);
              setDepartments(updated);
              saveStoredDepartments(updated);
              toast.success(`Department "${dept.name}" deleted.`);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Department"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const rowActions: TableRowAction<RoleItem>[] = [
    {
      label: "Configure Permissions",
      icon: <Edit2 className="w-3.5 h-3.5" />,
      onClick: (role) => handleOpenDrawer("edit", role),
    },
    {
      label: "Duplicate Role",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (role) => handleDuplicate(role),
    },
    {
      label: "Delete",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      isDanger: true,
      disabled: (role) => Boolean(role.isSystem),
      onClick: (role) => handleDelete(role),
    },
  ];

  // Drawer Footer
  const drawerFooter = (
    <div className="flex items-center justify-end w-full gap-2.5">
      <button
        type="button"
        onClick={handleCloseDrawer}
        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSaveRole}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {drawerMode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        <span>{drawerMode === "edit" ? "Save Role Matrix" : "Create Role"}</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        {/* PageHeader with NO actions (keeps global header clean) */}
        <PageHeader
          title="Roles & Permissions"
          subtitle="Configure multi-tenant security roles, permission matrices, and scope access across platform modules."
        />

        {/* Subtabs for Roles & Departments */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3" style={{ fontFamily: "Outfit, sans-serif" }}>
          <button
            type="button"
            onClick={() => { setAdminSubTab("roles"); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminSubTab === "roles"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-gray-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Roles ({filteredRoles.length})
          </button>
          <button
            type="button"
            onClick={() => { setAdminSubTab("departments"); setSearchQuery(""); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              adminSubTab === "departments"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-gray-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Departments ({departments.length})
          </button>
        </div>

        {adminSubTab === "roles" ? (
          <>
            {/* Action Bar powered by PageTopBar with Industry Category & Industry Dropdowns */}
            <PageTopBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search roles by title or industry..."
              leftElement={
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Industry Category Dropdown */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => {
                      setSelectedCategoryFilter(e.target.value);
                      setSelectedIndustryFilter("All");
                    }}
                    className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="All">All Categories</option>
                    {INITIAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  {/* Industry Dropdown */}
                  <select
                    value={selectedIndustryFilter}
                    onChange={(e) => setSelectedIndustryFilter(e.target.value)}
                    className="h-[36px] px-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="All">All Industries</option>
                    {availableIndustriesForFilter.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              }
              onClearAllFilters={() => {
                setSelectedCategoryFilter("All");
                setSelectedIndustryFilter("All");
                setSearchQuery("");
              }}
              primaryAction={{
                label: "Create Role",
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: () => handleOpenDrawer("add"),
              }}
            />

            {/* Roles Table View using TableComponent */}
            <TableComponent
              data={filteredRoles}
              columns={columns}
              getRowId={(role) => role.id}
              rowActions={rowActions}
              onRowClick={(role) => handleOpenDrawer("edit", role)}
              defaultRowsPerPage={10}
              emptyMessage="No roles found matching active filters. Click 'Create Role' to create one."
              tableId="admin-roles-table"
            />
          </>
        ) : (
          <>
            {/* Departments Top Bar */}
            <PageTopBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search departments by name or description..."
              primaryAction={{
                label: "Add Department",
                icon: <Plus className="w-3.5 h-3.5" />,
                onClick: () => {
                  setEditingDepartment(null);
                  setIsDepartmentDrawerOpen(true);
                },
              }}
            />

            {/* Departments Table View */}
            <TableComponent
              data={departments.filter(
                (d) =>
                  !searchQuery.trim() ||
                  d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
              )}
              columns={departmentColumns}
              getRowId={(dept) => dept.id}
              defaultRowsPerPage={10}
              emptyMessage="No departments found. Click 'Add Department' to create one."
              tableId="admin-departments-table"
            />
          </>
        )}
      </div>

      {/* Side Drawer for Role Creation / Editing matching exact user screenshot */}
      <DrawerShell
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={drawerMode === "edit" ? "Edit Role" : "Create Role"}
        width="max-w-3xl"
        zIndex={600}
        headerRight={
          <button
            type="button"
            onClick={handleCloseDrawer}
            className="w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer mr-1"
            title="Close"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        }
        bodyClassName="p-6 space-y-6 bg-white"
        footer={drawerFooter}
      >
        <div className="space-y-6" style={{ fontFamily: "Outfit, sans-serif" }}>
          {/* Top 3-Column Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formRoleName}
                onChange={(e) => setFormRoleName(e.target.value)}
                placeholder="e.g. Executive"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Department
              </label>
              <select
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs cursor-pointer"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Can manage all clients and calls"
                className="w-full h-10 px-3.5 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-normal text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Admin Control (Admin Scope component) */}
          <AdminControlAccordion
            scopingRules={formScopingRules}
            onScopingRulesChange={(newRules) => setFormScopingRules(newRules)}
            defaultAdminControlOpen={true}
            defaultScopeOpen={true}
            defaultPermissionsOpen={false}
            scopeTooltip="Define which tenant organization categories, industries, and locations have visibility to this security role template."
          />

          {/* Clean Permissions Table matching screenshot */}
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
                  const current = formModulePermissions[mod.id] || { actions: [], level: "all" };
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
                            const wPerm = formWorkflowPermissions[mod.id]?.[wf.id] || {
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
      </DrawerShell>

      {/* Department Drawer for Admin (Name and Description ONLY) */}
      <DepartmentDrawer
        isOpen={isDepartmentDrawerOpen}
        onClose={() => {
          setIsDepartmentDrawerOpen(false);
          setEditingDepartment(null);
        }}
        roles={roles}
        initialEditDepartment={editingDepartment}
        onDepartmentsChange={(updated) => setDepartments(updated)}
        zIndex={10100}
      />
    </div>
  );
}
