/**
 * RolesPermissionsDrawer.tsx
 * Path: src/app/components/settings/RolesPermissionsDrawer.tsx
 *
 * Clean, redesigned side drawer for creating and configuring roles & permissions.
 * Implements 2-step layout:
 * - Step 1: Module access (Entity, Read, Add, Update, Delete, Export, Import, Automation)
 *   with hierarchical nesting (modules -> pipelines -> stages) and inherit/override logic.
 * - Step 2: Field access (Module selector, Pipeline selector, Field-level permissions: Inherit, Hidden, Read-only, Editable).
 * - Width: 50% of screen.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getStoredProcesses, Process } from "../../../lib/useProcessStore";
import { getContactCategories } from "../../../lib/contactCategoriesStore";
import type {
  ActionScope,
  Action,
  ModulePermissions,
  ItemPermissions,
  Role,
  Department,
} from "../../../types/permissions";
import { ACTIONS } from "../../../types/permissions";
import { createDefaultPermissions } from "../../pages/settings-constants";
import { PermissionAction, PERMISSION_ACTIONS } from "./PermissionSelect";

export type { ActionScope, Action, ModulePermissions, ItemPermissions, Role, Department, PermissionAction };
export { ACTIONS, PERMISSION_ACTIONS };

// ─── MODULE DEFINITIONS ────────────────────────────────────────────────────────

export interface RoleModuleItem {
  id: string;
  label: string;
}

export const ROLE_PERMISSION_MODULES: RoleModuleItem[] = [
  { id: "appointments", label: "Appointments" },
  { id: "aiScribe", label: "AI Scribe" },
  { id: "contacts", label: "Contacts" },
  { id: "billings", label: "Invoice" },
  { id: "tasks", label: "Tasks" },
  { id: "processes", label: "Processes" },
  { id: "calls", label: "Calls" },
  { id: "clients", label: "Clients" },
  { id: "dashboard", label: "Dashboard" },
  { id: "documentTemplates", label: "Document Templates" },
  { id: "integrations", label: "Integrations" },
  { id: "knowledgeBase", label: "Knowledge Base" },
  { id: "settings", label: "Settings" },
  { id: "webForms", label: "Web Forms" },
];

export type EntityScope = "inherit" | "deny" | "own" | "role" | "department" | "all";
export type AutomationScope = "inherit" | "deny" | "read";
export type FieldAccessLevel = "inherit" | "hidden" | "readonly" | "editable";

export const SCOPE_RANKS: Record<EntityScope, number> = {
  deny: 0,
  own: 1,
  role: 2,
  department: 3,
  all: 4,
  inherit: -1,
};

export const SCOPE_OPTIONS: { value: EntityScope; label: string }[] = [
  { value: "all", label: "All records" },
  { value: "department", label: "Department" },
  { value: "role", label: "Roles" },
  { value: "own", label: "Own only" },
  { value: "deny", label: "Access denied" },
];

export function isScopeOptionDisabled(
  optValue: EntityScope,
  effectiveRead: EntityScope
): boolean {
  if (optValue === "inherit") return false;
  const readRank = SCOPE_RANKS[effectiveRead] ?? 4;
  const optRank = SCOPE_RANKS[optValue] ?? 0;
  return optRank > readRank;
}

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export function getScopeDisplayLabel(val: EntityScope | AutomationScope | string): string {
  switch (val) {
    case "all":
      return "All records";
    case "department":
      return "Department";
    case "role":
      return "Roles";
    case "own":
      return "Own only";
    case "deny":
      return "Access denied";
    case "inherit":
      return "Inherit";
    case "read":
      return "Read";
    default:
      return val;
  }
}

export function CustomCellSelect({
  id,
  value,
  displayLabel,
  disabled = false,
  isInherit = false,
  isActive = false,
  onOpen,
}: {
  id: string;
  value: string;
  displayLabel: string;
  disabled?: boolean;
  isInherit?: boolean;
  isActive?: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          onOpen(e.currentTarget);
        }}
        className={`w-full h-7 pl-2.5 pr-6 rounded-lg text-[11px] font-medium text-left flex items-center justify-between border transition-all shadow-2xs select-none ${
          disabled
            ? "bg-slate-100/70 text-slate-400 border-gray-200 cursor-not-allowed opacity-60"
            : isActive
            ? "bg-white border-blue-500 ring-2 ring-blue-100 text-gray-900 cursor-pointer"
            : isInherit
            ? "bg-white border-gray-200 text-slate-400 italic hover:border-gray-300 cursor-pointer"
            : "bg-white border-gray-200 text-gray-800 hover:border-gray-300 cursor-pointer"
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 transition-transform duration-150 pointer-events-none ${
            isActive ? "-rotate-180 text-blue-500" : ""
          }`}
        />
      </button>
    </div>
  );
}

export interface RowAccessPermissions {
  read: EntityScope;
  add: EntityScope;
  update: EntityScope;
  delete: EntityScope;
  export: EntityScope;
  import: EntityScope;
  automation: AutomationScope;
}

export interface StageItem {
  id: string;
  name: string;
}

export interface WorkflowItem {
  id: string;
  name: string;
  stages?: StageItem[];
  isCategory?: boolean;
}

export type ScopeLevelOption = "all" | "department" | "role" | "own" | "deny";

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

export const MODULE_WORKFLOW_KEYS = ["processes", "appointments", "billings", "tasks", "clients", "contacts"];

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
      {
        id: "wf-appt-insurance",
        name: "Appointment via Insurance",
        stages: [
          { id: "st-ins-1", name: "Eligibility Verified" },
          { id: "st-ins-2", name: "Scheduled" },
          { id: "st-ins-3", name: "In Progress" },
          { id: "st-ins-4", name: "Claim Filed" },
          { id: "st-ins-5", name: "Closed" },
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
        name: "Billing & Invoicing",
        stages: [
          { id: "st-bill-draft", name: "Draft Invoice" },
          { id: "st-bill-sent", name: "Sent / Pending" },
          { id: "st-bill-paid", name: "Paid & Reconciled" },
          { id: "st-bill-overdue", name: "Overdue Followup" },
        ],
      },
    ];
  }

  if (moduleId === "tasks") {
    return [
      {
        id: "wf-task-general",
        name: "General Tasks",
        stages: [
          { id: "st-task-todo", name: "To Do" },
          { id: "st-task-prog", name: "In Progress" },
          { id: "st-task-rev", name: "Review" },
          { id: "st-task-done", name: "Completed" },
        ],
      },
      {
        id: "wf-task-followup",
        name: "Patient Follow-ups",
        stages: [
          { id: "st-fol-pending", name: "Pending" },
          { id: "st-fol-outreach", name: "Contacted" },
          { id: "st-fol-resolved", name: "Resolved" },
        ],
      },
    ];
  }

  if (moduleId === "contacts") {
    const cats = getContactCategories();
    return cats.map((cat) => ({
      id: `cat-${cat.toLowerCase().replace(/\s+/g, "-")}`,
      name: cat,
      isCategory: true,
    }));
  }

  return [];
}

// ─── FIELD DEFINITIONS FOR STEP 2: FIELD ACCESS ──────────────────────────────

export interface FieldAccessItem {
  key: string;
  label: string;
  type: string;
}

export const MODULE_FIELDS: Record<string, FieldAccessItem[]> = {
  appointments: [
    { key: "title", label: "Appointment Title", type: "text" },
    { key: "date", label: "Appointment Date & Time", type: "date_time" },
    { key: "clientName", label: "Patient / Client Name", type: "text" },
    { key: "doctorName", label: "Doctor / Clinician", type: "text" },
    { key: "service", label: "Service / Treatment", type: "text" },
    { key: "status", label: "Appointment Status", type: "select" },
    { key: "location", label: "Location / Room", type: "text" },
    { key: "duration", label: "Duration (min)", type: "number" },
    { key: "notes", label: "Clinical / Visit Notes", type: "textarea" },
    { key: "insurancePolicy", label: "Insurance Policy #", type: "text" },
  ],
  aiScribe: [
    { key: "clientName", label: "Patient / Client Name", type: "text" },
    { key: "doctorName", label: "Doctor / Clinician", type: "text" },
    { key: "date", label: "Consultation Date & Time", type: "date_time" },
    { key: "chiefComplaint", label: "Chief Complaint", type: "textarea" },
    { key: "diagnosis", label: "Primary Diagnosis & ICD-10", type: "text" },
    { key: "medications", label: "Prescribed Medications", type: "list" },
    { key: "clinicalSummary", label: "Clinical Summary & Notes", type: "richtext" },
    { key: "vitals", label: "Patient Vitals (BP, HR, SpO2)", type: "text" },
    { key: "transcript", label: "Audio Recording & Transcript", type: "text" },
    { key: "followUpDate", label: "Follow-up Recommendations", type: "date" },
  ],
  contacts: [
    { key: "name", label: "Full Name", type: "text" },
    { key: "email", label: "Email Address", type: "email" },
    { key: "phone", label: "Phone Number", type: "tel" },
    { key: "companyName", label: "Company / Organization", type: "text" },
    { key: "status", label: "Contact Status", type: "select" },
    { key: "location", label: "Address / Location", type: "text" },
    { key: "responsible", label: "Account Lead", type: "text" },
    { key: "dateOfBirth", label: "Date of Birth", type: "date" },
    { key: "tags", label: "Tags / Labels", type: "text" },
  ],
  billings: [
    { key: "invoiceNumber", label: "Invoice Number", type: "text" },
    { key: "clientName", label: "Patient / Client Name", type: "text" },
    { key: "amount", label: "Total Amount", type: "money" },
    { key: "tax", label: "Tax & Discounts", type: "money" },
    { key: "status", label: "Payment Status", type: "select" },
    { key: "dueDate", label: "Due Date", type: "date" },
    { key: "paymentMethod", label: "Payment Method", type: "text" },
    { key: "notes", label: "Invoice Notes", type: "textarea" },
  ],
  tasks: [
    { key: "title", label: "Task Subject / Title", type: "text" },
    { key: "assignee", label: "Assigned Staff Member", type: "text" },
    { key: "dueDate", label: "Due Date", type: "date" },
    { key: "priority", label: "Priority Level", type: "select" },
    { key: "status", label: "Task Status", type: "select" },
    { key: "description", label: "Task Details", type: "textarea" },
    { key: "relatedClient", label: "Related Patient Record", type: "text" },
  ],
  processes: [
    { key: "name", label: "Process Name", type: "text" },
    { key: "stage", label: "Current Workflow Stage", type: "select" },
    { key: "client", label: "Associated Client", type: "text" },
    { key: "responsible", label: "Responsible User", type: "text" },
    { key: "dealValue", label: "Value / Revenue", type: "money" },
    { key: "expectedCloseDate", label: "Target Date", type: "date" },
    { key: "description", label: "Process Summary", type: "textarea" },
  ],
  calls: [
    { key: "caller", label: "Caller / Agent Name", type: "text" },
    { key: "client", label: "Patient / Contact", type: "text" },
    { key: "duration", label: "Call Duration", type: "number" },
    { key: "outcome", label: "Call Disposition", type: "select" },
    { key: "recordingUrl", label: "Recording Audio URL", type: "link" },
    { key: "notes", label: "Call Notes / Transcript", type: "textarea" },
    { key: "date", label: "Call Timestamp", type: "date_time" },
  ],
  clients: [
    { key: "name", label: "Client Name", type: "text" },
    { key: "email", label: "Email Address", type: "email" },
    { key: "phone", label: "Phone Number", type: "tel" },
    { key: "companyName", label: "Company", type: "text" },
    { key: "stage", label: "Relationship Stage", type: "select" },
    { key: "responsible", label: "Assigned Clinician", type: "text" },
    { key: "medicalRecordNo", label: "Medical Record #", type: "text" },
    { key: "billingAddress", label: "Billing Address", type: "text" },
  ],
  dashboard: [
    { key: "kpis", label: "Key Operational KPIs", type: "metric" },
    { key: "revenueMetrics", label: "Financial Metrics", type: "metric" },
    { key: "patientVolume", label: "Patient Volume Stats", type: "metric" },
    { key: "recentActivity", label: "Activity / Audit Feed", type: "list" },
  ],
  documentTemplates: [
    { key: "templateName", label: "Document Template Title", type: "text" },
    { key: "category", label: "Document Category", type: "select" },
    { key: "bodyContent", label: "Template Body Content", type: "richtext" },
    { key: "headerFooter", label: "Letterhead & Signatures", type: "text" },
  ],
  integrations: [
    { key: "providerName", label: "Integration Provider", type: "text" },
    { key: "apiKey", label: "API Credentials & Keys", type: "password" },
    { key: "webhookUrl", label: "Webhook Endpoint URL", type: "link" },
    { key: "syncStatus", label: "Sync Status & Health", type: "select" },
  ],
  knowledgeBase: [
    { key: "articleTitle", label: "Article Title", type: "text" },
    { key: "category", label: "Clinical Category", type: "select" },
    { key: "content", label: "Knowledge Content", type: "richtext" },
    { key: "visibility", label: "Access Level", type: "select" },
  ],
  settings: [
    { key: "organizationName", label: "Organization Name", type: "text" },
    { key: "billingPlan", label: "Subscription Plan", type: "text" },
    { key: "compliancePolicies", label: "HIPAA / Security Settings", type: "select" },
  ],
  webForms: [
    { key: "formTitle", label: "Web Form Title", type: "text" },
    { key: "fieldsConfig", label: "Form Fields Definition", type: "list" },
    { key: "submitAction", label: "Workflow Submission Trigger", type: "select" },
  ],
};

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

// Helper to create default row permissions
function createDefaultRowPermissions(isRoot = false): RowAccessPermissions {
  if (isRoot) {
    return {
      read: "all",
      add: "all",
      update: "all",
      delete: "all",
      export: "all",
      import: "all",
      automation: "read",
    };
  }
  return {
    read: "inherit",
    add: "inherit",
    update: "inherit",
    delete: "inherit",
    export: "inherit",
    import: "inherit",
    automation: "inherit",
  };
}

function scopeToActionScope(scope: EntityScope): ActionScope {
  if (scope === "inherit") return "inherit";
  if (scope === "deny") return "deny";
  if (scope === "own") return "own";
  if (scope === "role") return "role";
  if (scope === "department") return "department";
  return "all";
}

function actionScopeToEntityScope(scope?: ActionScope): EntityScope {
  if (!scope || scope === "all") return "all";
  if (scope === "deny") return "deny";
  if (scope === "own") return "own";
  if (scope === "role") return "role";
  if (scope === "department") return "department";
  if (scope === "inherit") return "inherit";
  return "all";
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

  // Two-step tab state
  const [activeStep, setActiveStep] = useState<"module" | "field">("module");

  // Step 1: Module, Pipeline, and Stage Permissions
  const [moduleAccess, setModuleAccess] = useState<Record<string, RowAccessPermissions>>({});
  const [pipelineAccess, setPipelineAccess] = useState<Record<string, Record<string, RowAccessPermissions>>>({});
  const [stageAccess, setStageAccess] = useState<Record<string, RowAccessPermissions>>({});

  // Expansion state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    appointments: true,
    contacts: true,
    processes: true,
    billings: true,
    tasks: false,
  });
  const [expandedPipelines, setExpandedPipelines] = useState<Record<string, boolean>>({
    "wf-appt-default": true,
    "wf-proc-test": true,
  });

  // Step 2: Field Access State
  const [selectedFieldModule, setSelectedFieldModule] = useState<string>("appointments");
  const [selectedFieldPipeline, setSelectedFieldPipeline] = useState<string>("");
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldAccessLevel>>({});

  // Active custom dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{
    id: string;
    top: number;
    left: number;
    minWidth: number;
    options: DropdownOption[];
    value: string;
    onChange: (val: string) => void;
  } | null>(null);

  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click, Escape, or scroll
  useEffect(() => {
    if (!activeDropdown) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };

    const handleScroll = (e: Event) => {
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(e.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [activeDropdown]);

  const openCustomDropdown = (
    id: string,
    triggerEl: HTMLElement,
    options: DropdownOption[],
    currentValue: string,
    onSelect: (val: string) => void
  ) => {
    if (activeDropdown?.id === id) {
      setActiveDropdown(null);
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 130);
    const menuHeight = options.length * 30 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = showAbove ? rect.top - menuHeight - 2 : rect.bottom + 2;
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - minWidth - 8);
    }

    setActiveDropdown({
      id,
      top,
      left,
      minWidth,
      options,
      value: currentValue,
      onChange: onSelect,
    });
  };

  // Initialize or reload on drawer open / role change
  useEffect(() => {
    if (isOpen) {
      setActiveStep("module");

      if (editingRole) {
        setRoleName(editingRole.name);
        setDescription(editingRole.description || "");
        setRoleType(editingRole.roleType || "responsible");

        // Load module permissions from role
        const modAcc: Record<string, RowAccessPermissions> = {};
        const pipeAcc: Record<string, Record<string, RowAccessPermissions>> = {};
        const stAcc: Record<string, RowAccessPermissions> = {};

        ROLE_PERMISSION_MODULES.forEach((mod) => {
          const modPerm = (editingRole.permissions as any)?.[mod.id] as ModulePermissions | undefined;
          if (modPerm) {
            modAcc[mod.id] = {
              read: actionScopeToEntityScope(modPerm.read),
              add: actionScopeToEntityScope(modPerm.add),
              update: actionScopeToEntityScope(modPerm.edit),
              delete: actionScopeToEntityScope(modPerm.delete),
              export: actionScopeToEntityScope(modPerm.export),
              import: actionScopeToEntityScope(modPerm.import),
              automation: modPerm.read === "deny" ? "deny" : "read",
            };
          } else {
            modAcc[mod.id] = createDefaultRowPermissions(true);
          }

          // Pipelines
          const pipelines = getModuleWorkflows(mod.id, allProcesses);
          if (pipelines.length > 0) {
            pipeAcc[mod.id] = {};
            pipelines.forEach((p) => {
              const pInst = editingRole.permissions?.processInstances?.[p.id];
              if (pInst) {
                pipeAcc[mod.id][p.id] = {
                  read: actionScopeToEntityScope(pInst.read),
                  add: actionScopeToEntityScope(pInst.add),
                  update: actionScopeToEntityScope(pInst.edit),
                  delete: actionScopeToEntityScope(pInst.delete),
                  export: actionScopeToEntityScope(pInst.export),
                  import: actionScopeToEntityScope(pInst.import),
                  automation: pInst.read === "deny" ? "deny" : "inherit",
                };
              } else {
                pipeAcc[mod.id][p.id] = createDefaultRowPermissions(false);
              }

              // Stages
              (p.stages || []).forEach((st) => {
                const stageKey = `${p.id}_${st.id}`;
                const sInst =
                  editingRole.permissions?.stageInstances?.[stageKey] ||
                  editingRole.permissions?.stageInstances?.[st.id];
                if (sInst) {
                  stAcc[stageKey] = {
                    read: actionScopeToEntityScope(sInst.read),
                    add: actionScopeToEntityScope(sInst.add),
                    update: actionScopeToEntityScope(sInst.edit),
                    delete: actionScopeToEntityScope(sInst.delete),
                    export: actionScopeToEntityScope(sInst.export),
                    import: actionScopeToEntityScope(sInst.import),
                    automation: sInst.read === "deny" ? "deny" : "inherit",
                  };
                } else {
                  stAcc[stageKey] = createDefaultRowPermissions(false);
                }
              });
            });
          }
        });

        // Load custom field permissions if already persisted on role
        if ((editingRole as any).rawFieldAccess) {
          setFieldPermissions((editingRole as any).rawFieldAccess);
        } else {
          setFieldPermissions({});
        }

        setModuleAccess(modAcc);
        setPipelineAccess(pipeAcc);
        setStageAccess(stAcc);
      } else {
        setRoleName("");
        setDescription("");
        setRoleType("responsible");

        const modAcc: Record<string, RowAccessPermissions> = {};
        const pipeAcc: Record<string, Record<string, RowAccessPermissions>> = {};
        const stAcc: Record<string, RowAccessPermissions> = {};

        ROLE_PERMISSION_MODULES.forEach((mod) => {
          modAcc[mod.id] = createDefaultRowPermissions(true);
          const pipelines = getModuleWorkflows(mod.id, allProcesses);
          if (pipelines.length > 0) {
            pipeAcc[mod.id] = {};
            pipelines.forEach((p) => {
              pipeAcc[mod.id][p.id] = createDefaultRowPermissions(false);
              (p.stages || []).forEach((st) => {
                stAcc[`${p.id}_${st.id}`] = createDefaultRowPermissions(false);
              });
            });
          }
        });

        setModuleAccess(modAcc);
        setPipelineAccess(pipeAcc);
        setStageAccess(stAcc);
        setFieldPermissions({});
      }
    }
  }, [isOpen, editingRole, allProcesses]);

  // Handle switching role type (responsible vs observer)
  const handleRoleTypeChange = (newType: "responsible" | "observer") => {
    setRoleType(newType);
    if (newType === "observer") {
      // For observer mode: make add, export, import, delete inactive and set to deny
      setModuleAccess((prev) => {
        const next: Record<string, RowAccessPermissions> = {};
        Object.entries(prev).forEach(([k, v]) => {
          next[k] = { ...v, add: "deny", delete: "deny", export: "deny", import: "deny" };
        });
        return next;
      });
      setPipelineAccess((prev) => {
        const next: Record<string, Record<string, RowAccessPermissions>> = {};
        Object.entries(prev).forEach(([mod, pipes]) => {
          next[mod] = {};
          Object.entries(pipes).forEach(([pId, v]) => {
            next[mod][pId] = { ...v, add: "deny", delete: "deny", export: "deny", import: "deny" };
          });
        });
        return next;
      });
      setStageAccess((prev) => {
        const next: Record<string, RowAccessPermissions> = {};
        Object.entries(prev).forEach(([stKey, v]) => {
          next[stKey] = { ...v, add: "deny", delete: "deny", export: "deny", import: "deny" };
        });
        return next;
      });
    }
  };

  // Handlers for Step 1 cell changes with Read scope dependency on Update and Delete
  const handleModuleCellChange = (
    moduleId: string,
    col: keyof RowAccessPermissions,
    val: EntityScope | AutomationScope
  ) => {
    setModuleAccess((prev) => {
      const current = prev[moduleId] || createDefaultRowPermissions(true);
      const updated: RowAccessPermissions = {
        ...current,
        [col]: val,
      };

      if (col === "read") {
        const readRank = SCOPE_RANKS[val as EntityScope] ?? 4;
        if (SCOPE_RANKS[updated.update] > readRank) {
          updated.update = (val as EntityScope) === "deny" ? "deny" : (val as EntityScope);
        }
        if (SCOPE_RANKS[updated.delete] > readRank) {
          updated.delete = (val as EntityScope) === "deny" ? "deny" : (val as EntityScope);
        }
        if (val === "deny") {
          updated.automation = "deny";
        }
      }

      if (col === "update" || col === "delete") {
        const readRank = SCOPE_RANKS[current.read] ?? 4;
        if (SCOPE_RANKS[val as EntityScope] > readRank) {
          updated[col] = current.read;
        }
      }

      return {
        ...prev,
        [moduleId]: updated,
      };
    });
  };

  const handlePipelineCellChange = (
    moduleId: string,
    pipelineId: string,
    col: keyof RowAccessPermissions,
    val: EntityScope | AutomationScope
  ) => {
    setPipelineAccess((prev) => {
      const current = prev[moduleId]?.[pipelineId] || createDefaultRowPermissions(false);
      const updated: RowAccessPermissions = {
        ...current,
        [col]: val,
      };

      const parentRead = moduleAccess[moduleId]?.read || "all";
      const effRead = (col === "read" ? val : updated.read) === "inherit" ? parentRead : (col === "read" ? val : updated.read);
      const readRank = SCOPE_RANKS[effRead as EntityScope] ?? 4;

      if (col === "read") {
        if (updated.update !== "inherit" && SCOPE_RANKS[updated.update] > readRank) {
          updated.update = effRead === "deny" ? "deny" : (effRead as EntityScope);
        }
        if (updated.delete !== "inherit" && SCOPE_RANKS[updated.delete] > readRank) {
          updated.delete = effRead === "deny" ? "deny" : (effRead as EntityScope);
        }
        if (effRead === "deny") {
          updated.automation = "deny";
        }
      }

      if (col === "update" || col === "delete") {
        if (val !== "inherit" && SCOPE_RANKS[val as EntityScope] > readRank) {
          updated[col] = effRead as EntityScope;
        }
      }

      return {
        ...prev,
        [moduleId]: {
          ...(prev[moduleId] || {}),
          [pipelineId]: updated,
        },
      };
    });
  };

  const handleStageCellChange = (
    stageKey: string,
    col: keyof RowAccessPermissions,
    val: EntityScope | AutomationScope,
    moduleId: string = "",
    pipelineId: string = ""
  ) => {
    setStageAccess((prev) => {
      const current = prev[stageKey] || createDefaultRowPermissions(false);
      const updated: RowAccessPermissions = {
        ...current,
        [col]: val,
      };

      const parentPipeRead = pipelineAccess[moduleId]?.[pipelineId]?.read || "inherit";
      const parentModRead = moduleAccess[moduleId]?.read || "all";
      const effPipeRead = parentPipeRead === "inherit" ? parentModRead : parentPipeRead;
      const effRead = (col === "read" ? val : updated.read) === "inherit" ? effPipeRead : (col === "read" ? val : updated.read);
      const readRank = SCOPE_RANKS[effRead as EntityScope] ?? 4;

      if (col === "read") {
        if (updated.update !== "inherit" && SCOPE_RANKS[updated.update] > readRank) {
          updated.update = effRead === "deny" ? "deny" : (effRead as EntityScope);
        }
        if (updated.delete !== "inherit" && SCOPE_RANKS[updated.delete] > readRank) {
          updated.delete = effRead === "deny" ? "deny" : (effRead as EntityScope);
        }
        if (effRead === "deny") {
          updated.automation = "deny";
        }
      }

      if (col === "update" || col === "delete") {
        if (val !== "inherit" && SCOPE_RANKS[val as EntityScope] > readRank) {
          updated[col] = effRead as EntityScope;
        }
      }

      return {
        ...prev,
        [stageKey]: updated,
      };
    });
  };

  // Toggles for hierarchy expansion
  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const togglePipelineExpanded = (pipelineId: string) => {
    setExpandedPipelines((prev) => ({
      ...prev,
      [pipelineId]: !prev[pipelineId],
    }));
  };

  // Step 2: Available Modules where Read is NOT "Access denied" and fields exist
  const accessibleModules = useMemo(() => {
    return ROLE_PERMISSION_MODULES.filter((m) => {
      const access = moduleAccess[m.id];
      const isDenied = access ? access.read === "deny" : false;
      return !isDenied && Boolean(MODULE_FIELDS[m.id]);
    });
  }, [moduleAccess]);

  // Keep selectedFieldModule valid
  useEffect(() => {
    if (accessibleModules.length > 0) {
      if (!accessibleModules.some((m) => m.id === selectedFieldModule)) {
        setSelectedFieldModule(accessibleModules[0].id);
      }
    }
  }, [accessibleModules, selectedFieldModule]);

  // Pipelines for currently selected field module
  const currentModulePipelines = useMemo(() => {
    if (!selectedFieldModule) return [];
    return getModuleWorkflows(selectedFieldModule, allProcesses);
  }, [selectedFieldModule, allProcesses]);

  // Keep selectedFieldPipeline valid
  useEffect(() => {
    if (currentModulePipelines.length > 0) {
      if (!currentModulePipelines.some((p) => p.id === selectedFieldPipeline)) {
        setSelectedFieldPipeline(currentModulePipelines[0].id);
      }
    } else {
      setSelectedFieldPipeline("");
    }
  }, [currentModulePipelines, selectedFieldPipeline]);

  // Current fields to display in Step 2
  const currentFields = useMemo(() => {
    if (!selectedFieldModule) return [];
    return MODULE_FIELDS[selectedFieldModule] || [];
  }, [selectedFieldModule]);

  // Handle Field Access Level change
  const handleFieldAccessChange = (fieldKey: string, level: FieldAccessLevel) => {
    const compositeKey = `${selectedFieldModule}_${selectedFieldPipeline || "default"}_${fieldKey}`;
    setFieldPermissions((prev) => ({
      ...prev,
      [compositeKey]: level,
    }));
  };

  // Save permissions
  const handleSave = () => {
    const trimmed = roleName.trim();
    if (!trimmed) {
      toast.error("Permission Name is required.");
      return;
    }

    const base = createDefaultPermissions();

    // Map module permissions to standard ModulePermissions
    ROLE_PERMISSION_MODULES.forEach((mod) => {
      const current = moduleAccess[mod.id] || createDefaultRowPermissions(true);
      const permObj: ModulePermissions = {
        read: scopeToActionScope(current.read),
        add: scopeToActionScope(current.add),
        edit: scopeToActionScope(current.update),
        delete: scopeToActionScope(current.delete),
        export: scopeToActionScope(current.export),
        import: scopeToActionScope(current.import),
      };

      if (mod.id in base) {
        (base as any)[mod.id] = permObj;
      }
    });

    // Map pipeline permissions to processInstances
    const processInstances: Record<string, ModulePermissions> = {};
    const stageInstances: Record<string, Partial<Record<Action, ActionScope>>> = {};

    Object.entries(pipelineAccess).forEach(([modId, pipes]) => {
      Object.entries(pipes).forEach(([pId, pAccess]) => {
        processInstances[pId] = {
          read: scopeToActionScope(pAccess.read),
          add: scopeToActionScope(pAccess.add),
          edit: scopeToActionScope(pAccess.update),
          delete: scopeToActionScope(pAccess.delete),
          export: scopeToActionScope(pAccess.export),
          import: scopeToActionScope(pAccess.import),
        };
      });
    });

    Object.entries(stageAccess).forEach(([stKey, sAccess]) => {
      stageInstances[stKey] = {
        read: scopeToActionScope(sAccess.read),
        add: scopeToActionScope(sAccess.add),
        edit: scopeToActionScope(sAccess.update),
        delete: scopeToActionScope(sAccess.delete),
        export: scopeToActionScope(sAccess.export),
        import: scopeToActionScope(sAccess.import),
      };
    });

    base.processInstances = processInstances;
    base.stageInstances = stageInstances;

    const payload: Role = {
      id: editingRole ? editingRole.id : "role_" + Date.now(),
      name: trimmed,
      description: description.trim(),
      roleType,
      isDefault: editingRole ? editingRole.isDefault : false,
      permissions: base,
      // Granular permissions stored for round-trip fidelity
      ...({
        rawModuleAccess: { moduleAccess, pipelineAccess, stageAccess },
        rawFieldAccess: fieldPermissions,
      } as any),
    };

    if (editingRole) {
      const updated = roles.map((r) => (r.id === editingRole.id ? { ...r, ...payload } : r));
      onSaveRoles(updated);
      toast.success(`Permission "${trimmed}" updated successfully.`);
    } else {
      onSaveRoles([...roles, payload]);
      toast.success(`Permission "${trimmed}" created successfully.`);
    }

    onClose();
  };

  if (!isOpen) return null;

  const isObserverMode = roleType === "observer";

  return (
    <div className="fixed inset-0 flex justify-end overflow-hidden" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel: Width 50% of the screen */}
      <div
        className="relative w-full sm:w-[50vw] max-w-[50vw] bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-200"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header (Preserved) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              {editingRole ? "Edit Permission" : "Create Permission"}
            </h2>
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

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5 bg-white">
          {/* Top 3-Column Inputs: Permission Name, Access Type, Description (Preserved) */}
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
                className="w-full h-9 px-3 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-gray-800 transition-colors outline-none shadow-2xs"
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
                  className="w-full h-9 px-3 pr-8 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-semibold text-gray-800 transition-colors outline-none appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="responsible">Responsible (Full Execution)</option>
                  <option value="observer">Observer (View & Monitor Only)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                className="w-full h-9 px-3 bg-white border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs font-normal text-gray-800 transition-colors outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* TWO STEPS: Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 pt-1">
            <button
              type="button"
              onClick={() => setActiveStep("module")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeStep === "module"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  activeStep === "module"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                1
              </span>
              Module access
            </button>
            <button
              type="button"
              onClick={() => setActiveStep("field")}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeStep === "field"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  activeStep === "field"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                2
              </span>
              Field access
            </button>
          </div>

          {/* STEP 1: MODULE ACCESS TABLE */}
          {activeStep === "module" && (
            <div className="rounded-none border border-gray-200 overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-[#1E293B] text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-[26%]">Entity</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Read</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Add</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Update</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Delete</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Export</th>
                      <th className="py-2.5 px-2 w-[10.5%] text-center">Import</th>
                      <th className="py-2.5 px-2 w-[11%] text-center">Automation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {ROLE_PERMISSION_MODULES.map((mod) => {
                      const modPerm = moduleAccess[mod.id] || createDefaultRowPermissions(true);
                      const isReadDenied = modPerm.read === "deny";
                      const pipelines = getModuleWorkflows(mod.id, allProcesses);
                      const hasPipelines = pipelines.length > 0;
                      const showExpand = hasPipelines && !isReadDenied;
                      const isExpanded = showExpand && !!expandedModules[mod.id];

                      return (
                        <React.Fragment key={mod.id}>
                          {/* Module Row */}
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-3 font-semibold text-gray-800 text-xs">
                              <div className="flex items-center gap-1.5">
                                {showExpand ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleModuleExpanded(mod.id)}
                                    className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                                    title={
                                      isExpanded
                                        ? mod.id === "contacts"
                                          ? "Collapse categories"
                                          : "Collapse pipelines"
                                        : mod.id === "contacts"
                                        ? "Expand categories"
                                        : "Expand pipelines"
                                    }
                                  >
                                    <ChevronDown
                                      className={`w-2.5 h-2.5 stroke-[2.5] transition-transform duration-200 ${
                                        isExpanded ? "" : "-rotate-90"
                                      }`}
                                    />
                                  </button>
                                ) : (
                                  <div className="w-4" />
                                )}
                                <span className="truncate">{mod.label}</span>
                                {showExpand && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({pipelines.length} {mod.id === "contacts" ? "categories" : pipelines.length === 1 ? "pipeline" : "pipelines"})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Standard Scope Dropdowns */}
                            {(["read", "add", "update", "delete", "export", "import"] as const).map((col) => {
                              const isObserverInactive =
                                isObserverMode && (col === "add" || col === "delete" || col === "export" || col === "import");
                              const effectiveRead = modPerm.read;
                              const isRestrictedByRead = col === "update" || col === "delete";
                              const cellId = `mod_${mod.id}_${col}`;
                              const cellValue = isObserverInactive ? "deny" : modPerm[col];
                              const options: DropdownOption[] = isObserverInactive
                                ? [{ value: "deny", label: "Access denied" }]
                                : SCOPE_OPTIONS.map((opt) => ({
                                    value: opt.value,
                                    label: opt.label,
                                    disabled: isRestrictedByRead && isScopeOptionDisabled(opt.value, effectiveRead),
                                  }));

                              return (
                                <td key={col} className="py-1.5 px-1.5">
                                  <CustomCellSelect
                                    id={cellId}
                                    value={cellValue}
                                    displayLabel={getScopeDisplayLabel(cellValue)}
                                    disabled={isObserverInactive}
                                    isActive={activeDropdown?.id === cellId}
                                    onOpen={(el) =>
                                      openCustomDropdown(
                                        cellId,
                                        el,
                                        options,
                                        cellValue,
                                        (newVal) => handleModuleCellChange(mod.id, col, newVal as EntityScope)
                                      )
                                    }
                                  />
                                </td>
                              );
                            })}

                            {/* Automation Dropdown */}
                            <td className="py-1.5 px-1.5">
                              {(() => {
                                const isAutoDenied = modPerm.read === "deny";
                                const cellId = `mod_${mod.id}_automation`;
                                const cellValue = isAutoDenied ? "deny" : modPerm.automation;
                                const options: DropdownOption[] = isAutoDenied
                                  ? [{ value: "deny", label: "Access denied" }]
                                  : [
                                      { value: "deny", label: "Access denied" },
                                      { value: "read", label: "Read" },
                                    ];

                                return (
                                  <CustomCellSelect
                                    id={cellId}
                                    value={cellValue}
                                    displayLabel={getScopeDisplayLabel(cellValue)}
                                    disabled={isAutoDenied}
                                    isActive={activeDropdown?.id === cellId}
                                    onOpen={(el) =>
                                      openCustomDropdown(
                                        cellId,
                                        el,
                                        options,
                                        cellValue,
                                        (newVal) => handleModuleCellChange(mod.id, "automation", newVal as AutomationScope)
                                      )
                                    }
                                  />
                                );
                              })()}
                            </td>
                          </tr>

                          {/* Nested Pipelines (Only shown if Read is NOT denied and module is expanded) */}
                          {showExpand && isExpanded && (
                            <>
                              {pipelines.map((pipe) => {
                                const pipePerm =
                                  pipelineAccess[mod.id]?.[pipe.id] || createDefaultRowPermissions(false);

                                // Effective Read check for pipeline: inherit from module if 'inherit'
                                const effectivePipeRead =
                                  pipePerm.read === "inherit" ? modPerm.read : pipePerm.read;
                                const isPipeReadDenied = effectivePipeRead === "deny";
                                const stages = pipe.stages || [];
                                const hasStages = stages.length > 0;
                                const showPipeExpand = hasStages && !isPipeReadDenied;
                                const isPipeExpanded = showPipeExpand && !!expandedPipelines[pipe.id];

                                return (
                                  <React.Fragment key={pipe.id}>
                                    {/* Pipeline Row */}
                                    <tr className="bg-slate-50/40 hover:bg-slate-50/80 transition-colors border-t border-slate-100">
                                      <td className="py-1.5 px-3">
                                        <div className="flex items-center gap-1.5 pl-5 border-l-2 border-blue-400">
                                          {showPipeExpand ? (
                                            <button
                                              type="button"
                                              onClick={() => togglePipelineExpanded(pipe.id)}
                                              className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                                              title={isPipeExpanded ? "Collapse stages" : "Expand stages"}
                                            >
                                              <ChevronDown
                                                className={`w-2 h-2 stroke-[2.5] transition-transform duration-200 ${
                                                  isPipeExpanded ? "" : "-rotate-90"
                                                }`}
                                              />
                                            </button>
                                          ) : (
                                            <div className="w-3.5" />
                                          )}
                                          <span className="text-[11px] font-semibold text-slate-800 truncate" title={pipe.name}>
                                            {pipe.name}
                                          </span>
                                          {showPipeExpand && (
                                            <span className="text-[9px] text-slate-400 font-normal">
                                              ({stages.length})
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Standard Scope Dropdowns for Pipeline */}
                                      {(["read", "add", "update", "delete", "export", "import"] as const).map(
                                        (col) => {
                                          const isObserverInactive =
                                            isObserverMode && (col === "add" || col === "delete" || col === "export" || col === "import");
                                          const effectivePipeRead =
                                            pipePerm.read === "inherit" ? modPerm.read : pipePerm.read;
                                          const isRestrictedByRead = col === "update" || col === "delete";
                                          const parentEffectiveCol = modPerm[col];
                                          const isInheritDisabled =
                                            isRestrictedByRead &&
                                            isScopeOptionDisabled(parentEffectiveCol, effectivePipeRead);
                                          const cellId = `pipe_${mod.id}_${pipe.id}_${col}`;
                                          const cellValue = isObserverInactive ? "deny" : pipePerm[col];
                                          const options: DropdownOption[] = isObserverInactive
                                            ? [{ value: "deny", label: "Access denied" }]
                                            : [
                                                { value: "inherit", label: "Inherit", disabled: isInheritDisabled },
                                                ...SCOPE_OPTIONS.map((opt) => ({
                                                  value: opt.value,
                                                  label: opt.label,
                                                  disabled: isRestrictedByRead && isScopeOptionDisabled(opt.value, effectivePipeRead),
                                                })),
                                              ];

                                          return (
                                            <td key={col} className="py-1.5 px-1.5">
                                              <CustomCellSelect
                                                id={cellId}
                                                value={cellValue}
                                                displayLabel={getScopeDisplayLabel(cellValue)}
                                                disabled={isObserverInactive}
                                                isInherit={cellValue === "inherit"}
                                                isActive={activeDropdown?.id === cellId}
                                                onOpen={(el) =>
                                                  openCustomDropdown(
                                                    cellId,
                                                    el,
                                                    options,
                                                    cellValue,
                                                    (newVal) =>
                                                      handlePipelineCellChange(mod.id, pipe.id, col, newVal as EntityScope)
                                                  )
                                                }
                                              />
                                            </td>
                                          );
                                        }
                                      )}

                                      {/* Automation Dropdown for Pipeline */}
                                      <td className="py-1.5 px-1.5">
                                        {(() => {
                                          const effectivePipeRead =
                                            pipePerm.read === "inherit" ? modPerm.read : pipePerm.read;
                                          const isAutoDenied = effectivePipeRead === "deny";
                                          const cellId = `pipe_${mod.id}_${pipe.id}_automation`;
                                          const cellValue = isAutoDenied ? "deny" : pipePerm.automation;
                                          const options: DropdownOption[] = isAutoDenied
                                            ? [{ value: "deny", label: "Access denied" }]
                                            : [
                                                { value: "inherit", label: "Inherit" },
                                                { value: "deny", label: "Access denied" },
                                                { value: "read", label: "Read" },
                                              ];

                                          return (
                                            <CustomCellSelect
                                              id={cellId}
                                              value={cellValue}
                                              displayLabel={getScopeDisplayLabel(cellValue)}
                                              disabled={isAutoDenied}
                                              isInherit={cellValue === "inherit"}
                                              isActive={activeDropdown?.id === cellId}
                                              onOpen={(el) =>
                                                openCustomDropdown(
                                                  cellId,
                                                  el,
                                                  options,
                                                  cellValue,
                                                  (newVal) =>
                                                    handlePipelineCellChange(mod.id, pipe.id, "automation", newVal as AutomationScope)
                                                )
                                              }
                                            />
                                          );
                                        })()}
                                      </td>
                                    </tr>

                                    {/* Nested Stages (Only shown if Pipeline Read is NOT denied and pipeline is expanded) */}
                                    {showPipeExpand && isPipeExpanded && (
                                      <>
                                        {stages.map((st, sIdx) => {
                                          const stageKey = `${pipe.id}_${st.id}`;
                                          const stPerm =
                                            stageAccess[stageKey] || createDefaultRowPermissions(false);

                                          return (
                                            <tr
                                              key={st.id}
                                              className="bg-blue-50/20 hover:bg-blue-50/50 transition-colors border-t border-slate-100"
                                            >
                                              <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-1.5 pl-10">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                                  <span
                                                    className="text-[11px] text-slate-700 font-medium truncate"
                                                    title={st.name}
                                                  >
                                                    {st.name}
                                                  </span>
                                                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                                                    Stage {sIdx + 1}
                                                  </span>
                                                </div>
                                              </td>

                                              {/* Standard Scope Dropdowns for Stage */}
                                              {(["read", "add", "update", "delete", "export", "import"] as const).map(
                                                (col) => {
                                                  const isObserverInactive =
                                                    isObserverMode && (col === "add" || col === "delete" || col === "export" || col === "import");
                                                  const effectivePipeRead =
                                                    pipePerm.read === "inherit" ? modPerm.read : pipePerm.read;
                                                  const effectiveStageRead =
                                                    stPerm.read === "inherit" ? effectivePipeRead : stPerm.read;
                                                  const isRestrictedByRead = col === "update" || col === "delete";
                                                  const parentPipeEffectiveCol =
                                                    pipePerm[col] === "inherit" ? modPerm[col] : pipePerm[col];
                                                  const isInheritDisabled =
                                                    isRestrictedByRead &&
                                                    isScopeOptionDisabled(parentPipeEffectiveCol, effectiveStageRead);
                                                  const cellId = `stage_${stageKey}_${col}`;
                                                  const cellValue = isObserverInactive ? "deny" : stPerm[col];
                                                  const options: DropdownOption[] = isObserverInactive
                                                    ? [{ value: "deny", label: "Access denied" }]
                                                    : [
                                                        { value: "inherit", label: "Inherit", disabled: isInheritDisabled },
                                                        ...SCOPE_OPTIONS.map((opt) => ({
                                                          value: opt.value,
                                                          label: opt.label,
                                                          disabled: isRestrictedByRead && isScopeOptionDisabled(opt.value, effectiveStageRead),
                                                        })),
                                                      ];

                                                  return (
                                                    <td key={col} className="py-1 px-1.5">
                                                      <CustomCellSelect
                                                        id={cellId}
                                                        value={cellValue}
                                                        displayLabel={getScopeDisplayLabel(cellValue)}
                                                        disabled={isObserverInactive}
                                                        isInherit={cellValue === "inherit"}
                                                        isActive={activeDropdown?.id === cellId}
                                                        onOpen={(el) =>
                                                          openCustomDropdown(
                                                            cellId,
                                                            el,
                                                            options,
                                                            cellValue,
                                                            (newVal) =>
                                                              handleStageCellChange(
                                                                stageKey,
                                                                col,
                                                                newVal as EntityScope,
                                                                mod.id,
                                                                pipe.id
                                                              )
                                                          )
                                                        }
                                                      />
                                                    </td>
                                                  );
                                                }
                                              )}

                                              {/* Automation Dropdown for Stage */}
                                              <td className="py-1 px-1.5">
                                                {(() => {
                                                  const effectivePipeRead =
                                                    pipePerm.read === "inherit" ? modPerm.read : pipePerm.read;
                                                  const effectiveStageRead =
                                                    stPerm.read === "inherit" ? effectivePipeRead : stPerm.read;
                                                  const isAutoDenied = effectiveStageRead === "deny";
                                                  const cellId = `stage_${stageKey}_automation`;
                                                  const cellValue = isAutoDenied ? "deny" : stPerm.automation;
                                                  const options: DropdownOption[] = isAutoDenied
                                                    ? [{ value: "deny", label: "Access denied" }]
                                                    : [
                                                        { value: "inherit", label: "Inherit" },
                                                        { value: "deny", label: "Access denied" },
                                                        { value: "read", label: "Read" },
                                                      ];

                                                  return (
                                                    <CustomCellSelect
                                                      id={cellId}
                                                      value={cellValue}
                                                      displayLabel={getScopeDisplayLabel(cellValue)}
                                                      disabled={isAutoDenied}
                                                      isInherit={cellValue === "inherit"}
                                                      isActive={activeDropdown?.id === cellId}
                                                      onOpen={(el) =>
                                                        openCustomDropdown(
                                                          cellId,
                                                          el,
                                                          options,
                                                          cellValue,
                                                          (newVal) =>
                                                            handleStageCellChange(
                                                              stageKey,
                                                              "automation",
                                                              newVal as AutomationScope,
                                                              mod.id,
                                                              pipe.id
                                                            )
                                                        )
                                                      }
                                                    />
                                                  );
                                                })()}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </>
                                    )}
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
          )}

          {/* STEP 2: FIELD ACCESS CONFIGURATION */}
          {activeStep === "field" && (
            <div className="space-y-4">
              {accessibleModules.length === 0 ? (
                // Empty state if no module has Read access
                <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Accessible Modules</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Please grant Read access to at least one module in Step 1 (Module access) to configure field-level permissions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveStep("module")}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Go to Module access
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Selectors: Module & Pipeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60 shadow-2xs">
                    {/* Module Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Module
                      </label>
                      <div className="relative">
                        <select
                          value={selectedFieldModule}
                          onChange={(e) => setSelectedFieldModule(e.target.value)}
                          className="w-full h-9 px-3 pr-8 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 transition-colors cursor-pointer shadow-2xs appearance-none"
                        >
                          {accessibleModules.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Pipeline / Category Dropdown */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {selectedFieldModule === "contacts" ? "Category" : "Pipeline"}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedFieldPipeline}
                          disabled={
                            selectedFieldModule === "contacts"
                              ? currentModulePipelines.length === 0
                              : currentModulePipelines.length <= 1
                          }
                          onChange={(e) => setSelectedFieldPipeline(e.target.value)}
                          className={`w-full h-9 px-3 pr-8 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 transition-colors shadow-2xs appearance-none ${
                            (selectedFieldModule === "contacts"
                              ? currentModulePipelines.length === 0
                              : currentModulePipelines.length <= 1)
                              ? "opacity-60 cursor-not-allowed bg-slate-100"
                              : "cursor-pointer"
                          }`}
                        >
                          {currentModulePipelines.length === 0 ? (
                            <option value="">
                              {selectedFieldModule === "contacts"
                                ? "Default (No categories)"
                                : "Default (No pipelines)"}
                            </option>
                          ) : (
                            currentModulePipelines.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Fields Table */}
                  <div className="rounded-none border border-gray-200 overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1E293B] text-white text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4 w-[60%]">Field Name</th>
                          <th className="py-2.5 px-4 w-[40%] text-left">Access Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {currentFields.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="py-6 text-center text-xs text-slate-400">
                              No fields defined for this module.
                            </td>
                          </tr>
                        ) : (
                          currentFields.map((field) => {
                            const compositeKey = `${selectedFieldModule}_${
                              selectedFieldPipeline || "default"
                            }_${field.key}`;
                            const currentLevel = fieldPermissions[compositeKey] || "inherit";

                            return (
                              <tr key={field.key} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-800">
                                      {field.label}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                                      {field.key}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-4">
                                  <div className="relative max-w-xs">
                                    <select
                                      value={currentLevel}
                                      onChange={(e) =>
                                        handleFieldAccessChange(
                                          field.key,
                                          e.target.value as FieldAccessLevel
                                        )
                                      }
                                      className={`w-full h-8 pl-3 pr-8 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-colors shadow-2xs appearance-none cursor-pointer ${
                                        currentLevel === "inherit"
                                          ? "text-slate-400 italic"
                                          : currentLevel === "hidden"
                                          ? "text-rose-600 font-semibold"
                                          : currentLevel === "readonly"
                                          ? "text-amber-700 font-semibold"
                                          : "text-emerald-700 font-semibold"
                                      }`}
                                    >
                                      <option value="inherit">Inherit</option>
                                      <option value="hidden">Hidden</option>
                                      <option value="readonly">Read-only</option>
                                      <option value="editable">Editable</option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Drawer Sticky Footer with Step Navigation and Save */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {activeStep === "module" ? (
              <button
                type="button"
                onClick={() => setActiveStep("field")}
                className="px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                Next: Field access
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep("module")}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Module access
              </button>
            )}

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

      {/* Custom Clean Premium Dropdown Popover */}
      {activeDropdown &&
        createPortal(
          <div
            ref={dropdownMenuRef}
            className="fixed z-[99999] bg-white border border-gray-300 rounded-sm shadow-xl py-0.5 text-xs select-none"
            style={{
              top: activeDropdown.top,
              left: activeDropdown.left,
              minWidth: activeDropdown.minWidth,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeDropdown.options.map((opt) => {
              const isSelected = opt.value === activeDropdown.value;
              const isDisabled = !!opt.disabled;

              if (isDisabled) {
                return (
                  <div
                    key={opt.value}
                    className="px-3 py-1.5 text-[11px] font-normal text-slate-300 bg-slate-50/50 cursor-not-allowed select-none"
                    title="Exceeds Read scope"
                  >
                    {opt.label}
                  </div>
                );
              }

              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    activeDropdown.onChange(opt.value);
                    setActiveDropdown(null);
                  }}
                  className={`px-3 py-1.5 text-[11px] font-normal cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
