import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  CheckSquare,
  Star,
  Clock,
  Repeat,
  Paperclip,
  Plus,
  Trash2,
  X,
  FileText,
  User,
  Users,
  Eye,
  MoreVertical,
  Edit2,
  Check,
  Building2,
  Shield,
  Globe,
  Calendar,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { InfoTooltip } from "../help/InfoTooltip";
import {
  TaskEntity,
  TaskScopeLevel,
  TaskStatus,
  TaskChecklist,
  TaskChecklistItem,
  TaskObserver,
  TaskRecurrenceConfig,
  TaskTimePlanningConfig,
  TaskFileAttachment,
  TaskAssigneeScope,
} from "../../../types/task";
import { Stage } from "../../../lib/useProcessStore";
import { useTeamMembers } from "../../../lib/teamStore";
import { initialClients } from "../../../data/canonicalClients";
import TaskRecurrenceDrawer from "./TaskRecurrenceDrawer";
import TaskTimePlanningDrawer from "./TaskTimePlanningDrawer";
import { sendTaskToPortalChat } from "./ShareTaskDrawer";
import { addNotification } from "../../../lib/notificationsStore";
import { toast } from "sonner";

export interface TaskQuickCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (taskData: Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">) => void;
  isAdmin?: boolean;
  taskStages?: Stage[];
  defaultWorkflowName?: string;
  defaultWorkflowId?: string;
}

const CONTACT_CATEGORIES = ["All Categories", "Client", "Lead", "Supplier", "Vendor"];

const ADMIN_ORGANIZATIONS = [
  { id: "org-1", name: "Demo Mantra Care", industry: "Healthcare", country: "US" },
  { id: "org-2", name: "Apex Cardiology Center", industry: "Healthcare", country: "US" },
  { id: "org-3", name: "Metro General Hospital", industry: "Healthcare", country: "US" },
  { id: "org-4", name: "California Wellness Practice", industry: "Wellness", country: "US" },
  { id: "org-5", name: "London Central Clinic", industry: "Healthcare", country: "UK" },
];

export const ADMIN_SCOPE_OPTIONS = [
  { id: "all", name: "All Scopes (Global)" },
  { id: "healthcare-us", name: "Healthcare (US)", industry: "Healthcare", country: "US" },
  { id: "wellness-us", name: "Wellness (US)", industry: "Wellness", country: "US" },
  { id: "healthcare-uk", name: "Healthcare (UK)", industry: "Healthcare", country: "UK" },
];

const ADMIN_ORG_ROLES: Record<string, string[]> = {
  "org-1": ["Lead Physician", "Clinical Director", "Care Coordinator", "Billing Specialist", "Practice Admin"],
  "org-2": ["Cardiologist", "Catheterization Specialist", "ICU Nurse", "Practice Manager"],
  "org-3": ["Chief Medical Officer", "Department Head", "Resident Doctor", "Staff Nurse"],
  "org-4": ["Wellness Director", "Physical Therapist", "Nutritionist", "Clinic Coordinator"],
  "org-5": ["General Practitioner", "Consultant Surgeon", "Reception Lead"],
};

export default function TaskQuickCreateDrawer({
  isOpen,
  onClose,
  onCreateTask,
  isAdmin = false,
  taskStages = [],
  defaultWorkflowName,
  defaultWorkflowId,
}: TaskQuickCreateDrawerProps) {
  const { teamMembers } = useTeamMembers();

  // Basic task attributes
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  // Deadline: Date & Time
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [deadlineTime, setDeadlineTime] = useState("17:00");

  // Workflow Stage
  const defaultStage = taskStages[0]?.name || "Task Created";
  const [selectedStageName, setSelectedStageName] = useState(defaultStage);

  // Admin Scope: Single plain dropdown selector
  const [selectedAdminScopeId, setSelectedAdminScopeId] = useState("all");

  // Admin Scope filters Target Organizations
  const filteredAdminOrganizations = useMemo(() => {
    if (selectedAdminScopeId === "all") return ADMIN_ORGANIZATIONS;
    const scopeObj = ADMIN_SCOPE_OPTIONS.find((s) => s.id === selectedAdminScopeId);
    if (!scopeObj) return ADMIN_ORGANIZATIONS;
    return ADMIN_ORGANIZATIONS.filter(
      (org) =>
        (!scopeObj.industry || org.industry === scopeObj.industry) &&
        (!scopeObj.country || org.country === scopeObj.country)
    );
  }, [selectedAdminScopeId]);

  // Admin Mode: Organization & Role selection
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState("org-1");

  const availableAdminRoles = useMemo(() => {
    return ADMIN_ORG_ROLES[selectedAdminOrgId] || ADMIN_ORG_ROLES["org-1"] || [];
  }, [selectedAdminOrgId]);

  const [selectedAdminRole, setSelectedAdminRole] = useState(availableAdminRoles[0] || "Lead Physician");

  // Synchronize target organization when admin scope changes
  useEffect(() => {
    if (filteredAdminOrganizations.length > 0) {
      const isCurrentValid = filteredAdminOrganizations.some((o) => o.id === selectedAdminOrgId);
      if (!isCurrentValid) {
        const nextOrgId = filteredAdminOrganizations[0].id;
        setSelectedAdminOrgId(nextOrgId);
        const nextRoles = ADMIN_ORG_ROLES[nextOrgId] || [];
        if (nextRoles.length > 0) setSelectedAdminRole(nextRoles[0]);
      }
    }
  }, [filteredAdminOrganizations, selectedAdminOrgId]);

  // Synchronize role when organization changes
  useEffect(() => {
    if (availableAdminRoles.length > 0 && !availableAdminRoles.includes(selectedAdminRole)) {
      setSelectedAdminRole(availableAdminRoles[0]);
    }
  }, [availableAdminRoles, selectedAdminRole]);

  // Non-Admin: Assignment mode (Team Member vs Contact)
  const [assignmentType, setAssignmentType] = useState<"team" | "contact">("team");

  // Team Member Assignment (Role -> Multi-select members)
  const availableRoles = useMemo(() => {
    const roles = Array.from(new Set(teamMembers.map((m) => m.role).filter(Boolean))) as string[];
    return ["All Roles", ...roles];
  }, [teamMembers]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All Roles");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>(() => {
    return teamMembers[0] ? [String(teamMembers[0].id)] : ["1"];
  });

  const filteredTeamMembers = useMemo(() => {
    if (selectedRoleFilter === "All Roles") return teamMembers;
    return teamMembers.filter((m) => m.role === selectedRoleFilter);
  }, [teamMembers, selectedRoleFilter]);

  // Contact Assignment (Category -> Contact)
  const [selectedContactCategory, setSelectedContactCategory] = useState("All Categories");
  const [selectedContactId, setSelectedContactId] = useState<string>(initialClients[0]?.id || "CL-001");

  const filteredContacts = useMemo(() => {
    if (selectedContactCategory === "All Categories") return initialClients;
    return initialClients.filter(
      (c) => (c.contactType || c.contact_type || "Client").toLowerCase() === selectedContactCategory.toLowerCase()
    );
  }, [selectedContactCategory]);

  const [visibleInPortal, setVisibleInPortal] = useState(true);

  // Checklists
  const [checklists, setChecklists] = useState<TaskChecklist[]>([
    {
      id: "chk-init",
      title: "Deliverables Checklist",
      items: [
        { id: "item-1", text: "Review chart documentation & verify baseline records", isCompleted: false, isImportant: true },
        { id: "item-2", text: "Submit compliance authorization stamp", isCompleted: false, isImportant: false },
      ],
    },
  ]);
  const [newItemText, setNewItemText] = useState<{ [chkId: string]: string }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);

  // Observers
  const [observers, setObservers] = useState<TaskObserver[]>([
    { id: "obs-1", name: "Elena Rostova", role: "Care Coordinator" },
  ]);
  const [showAddObserver, setShowAddObserver] = useState(false);

  // Recurrence & Time Planning Configs
  const [recurrenceConfig, setRecurrenceConfig] = useState<TaskRecurrenceConfig | undefined>(undefined);
  const [timePlanningConfig, setTimePlanningConfig] = useState<TaskTimePlanningConfig | undefined>(undefined);

  // Sub-drawers
  const [showRecurrenceDrawer, setShowRecurrenceDrawer] = useState(false);
  const [showTimePlanningDrawer, setShowTimePlanningDrawer] = useState(false);

  // File Upload
  const [attachments, setAttachments] = useState<TaskFileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      const newAtt: TaskFileAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: sizeStr,
        type: file.type || "application/pdf",
        uploadedAt: "Just now",
      };
      setAttachments((prev) => [...prev, newAtt]);
      toast.success(`Attached "${file.name}"`);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const formatDeadlineDisplay = (dateStr: string, timeStr: string) => {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[parseInt(month, 10) - 1] || month;

      let formattedTime = "";
      if (timeStr) {
        const [h, m] = timeStr.split(":");
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        formattedTime = `, ${hours}:${m} ${ampm}`;
      }
      return `${monthName} ${day}, ${year}${formattedTime}`;
    } catch {
      return `${dateStr} ${timeStr}`.trim();
    }
  };

  const handleAddItem = (chkId: string) => {
    const text = newItemText[chkId]?.trim();
    if (!text) return;
    setChecklists((prev) =>
      prev.map((chk) => {
        if (chk.id === chkId) {
          return {
            ...chk,
            items: [
              ...chk.items,
              {
                id: `item-${Date.now()}`,
                text,
                isCompleted: false,
                isImportant: false,
              },
            ],
          };
        }
        return chk;
      })
    );
    setNewItemText((prev) => ({ ...prev, [chkId]: "" }));
  };

  const handleToggleItemImportance = (chkId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((chk) => {
        if (chk.id === chkId) {
          return {
            ...chk,
            items: chk.items.map((it) => (it.id === itemId ? { ...it, isImportant: !it.isImportant } : it)),
          };
        }
        return chk;
      })
    );
  };

  const handleDeleteItem = (chkId: string, itemId: string) => {
    setChecklists((prev) =>
      prev.map((chk) => {
        if (chk.id === chkId) {
          return {
            ...chk,
            items: chk.items.filter((it) => it.id !== itemId),
          };
        }
        return chk;
      })
    );
    setActiveItemMenuId(null);
  };

  const handleStartEditItem = (item: TaskChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemText(item.text);
    setActiveItemMenuId(null);
  };

  const handleSaveEditItem = (chkId: string, itemId: string) => {
    if (!editingItemText.trim()) return;
    setChecklists((prev) =>
      prev.map((chk) => {
        if (chk.id === chkId) {
          return {
            ...chk,
            items: chk.items.map((it) => (it.id === itemId ? { ...it, text: editingItemText.trim() } : it)),
          };
        }
        return chk;
      })
    );
    setEditingItemId(null);
    setEditingItemText("");
  };

  const handleAddChecklist = () => {
    const newChk: TaskChecklist = {
      id: `chk-${Date.now()}`,
      title: `Checklist ${checklists.length + 1}`,
      items: [],
    };
    setChecklists((prev) => [...prev, newChk]);
  };

  const handleDeleteChecklist = (chkId: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== chkId));
  };

  const handleAddObserver = (member: { id: string | number; name: string; role?: string }) => {
    const strId = String(member.id);
    if (observers.some((o) => o.id === strId || o.name === member.name)) {
      toast.info(`${member.name} is already an observer`);
      return;
    }
    setObservers((prev) => [...prev, { id: strId, name: member.name, role: member.role }]);
    setShowAddObserver(false);
    toast.success(`Added ${member.name} as observer`);
  };

  const handleRemoveObserver = (obsId: string) => {
    setObservers((prev) => prev.filter((o) => o.id !== obsId));
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const targetStage = taskStages.find((s) => s.name === selectedStageName) || taskStages[0];
    const stageId = targetStage?.id || (selectedStageName === "Task Completed" ? "task-stg-completed" : selectedStageName === "Task Overdue" ? "task-stg-overdue" : "task-stg-created");
    const normalizedStage = selectedStageName.toLowerCase();
    const status: TaskStatus = normalizedStage.includes("completed") || normalizedStage.includes("won")
      ? "completed"
      : normalizedStage.includes("overdue") || normalizedStage.includes("lost")
      ? "deferred"
      : "in_progress";

    const formattedDeadline = formatDeadlineDisplay(deadlineDate, deadlineTime);

    // Build Assignees
    let primaryAssignee: TaskAssigneeScope;
    let assigneesList: TaskAssigneeScope[] = [];

    if (isAdmin) {
      const org = filteredAdminOrganizations.find((o) => o.id === selectedAdminOrgId) || filteredAdminOrganizations[0] || ADMIN_ORGANIZATIONS[0];
      const selectedScopeObj = ADMIN_SCOPE_OPTIONS.find((s) => s.id === selectedAdminScopeId);
      const adminScopeName = selectedScopeObj && selectedScopeObj.id !== "all" ? selectedScopeObj.name : `${org.industry} (${org.country})`;

      primaryAssignee = {
        scopeLevel: "org_role",
        orgId: org.id,
        orgName: org.name,
        roleName: selectedAdminRole,
        adminScopeName,
        assigneeName: selectedAdminRole,
      };

      assigneesList = [primaryAssignee];
    } else if (assignmentType === "team") {
      const selectedMembers = teamMembers.filter((m) => selectedTeamMemberIds.includes(String(m.id)));
      if (selectedMembers.length === 0) {
        toast.error("Please select at least one team member");
        return;
      }
      assigneesList = selectedMembers.map((m) => ({
        scopeLevel: "client" as const,
        userId: String(m.id),
        assigneeName: m.name,
        roleName: m.role,
      }));
      primaryAssignee = assigneesList[0];
    } else {
      const contact = initialClients.find((c) => c.id === selectedContactId) || initialClients[0];
      primaryAssignee = {
        scopeLevel: "contact",
        clientId: contact?.id,
        clientName: contact?.name || "Sarah Johnson",
        assigneeName: contact?.name || "Sarah Johnson",
        roleName: contact?.contactType || contact?.contact_type || "Client",
      };
      assigneesList = [primaryAssignee];
    }

    const resolvedScopeLevel: TaskScopeLevel = isAdmin
      ? "admin"
      : assignmentType === "contact" || visibleInPortal
      ? "portal"
      : "client";

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      status,
      stageName: selectedStageName,
      stageId,
      isImportant,
      scopeLevel: resolvedScopeLevel,
      assignee: primaryAssignee,
      assignees: assigneesList,
      creator: {
        id: isAdmin ? "usr-admin-1" : "usr-clinic-1",
        name: isAdmin ? "Platform Administrator" : "Clinic Administrator",
        role: isAdmin ? "Super Admin" : "Practice Admin",
      },
      workflowId: defaultWorkflowId || "process-task-default",
      workflowName: defaultWorkflowName || "Clinical & Operational Tasks",
      deadline: formattedDeadline,
      deadlineDate,
      deadlineTime,
      scopingRules: isAdmin
        ? [{ industryCategory: ADMIN_SCOPE_OPTIONS.find((s) => s.id === selectedAdminScopeId)?.name || "Healthcare (US)" }]
        : undefined,
      checklists,
      observers,
      subtasks: [],
      recurrence: recurrenceConfig,
      timePlanning: timePlanningConfig,
      attachments,
    });

    // Explicit In-App Notification Triggered on Task Creation
    addNotification({
      type: "task",
      title: "New Task Assigned",
      message: `${title.trim()} assigned to ${primaryAssignee.assigneeName}${isAdmin ? ` (${primaryAssignee.orgName})` : ""}`,
      link: `/tasks`,
    });

    // If assigned to a client contact or marked visible in portal, sync to client portal chat & notify
    if (assignmentType === "contact" || visibleInPortal) {
      const targetClientId = primaryAssignee.clientId || selectedContactId || "CL-001";
      const targetClientName = primaryAssignee.clientName || primaryAssignee.assigneeName || "Client";
      sendTaskToPortalChat(targetClientId, targetClientName, {
        id: `tsk-${Date.now()}`,
        code: `TSK-${Date.now()}`,
        title: title.trim(),
        stageName: selectedStageName,
        deadline: formattedDeadline,
      } as any);

      addNotification({
        type: "task",
        title: "New Action Item for You",
        message: `Task '${title.trim()}' has been added to your portal tasks. Due: ${formattedDeadline || "Soon"}`,
        link: `/patient/tasks`,
        meta: { clientId: targetClientId },
      });
    }

    toast.success("Task created and notification sent");
    onClose();
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="New Task"
        subtitle="Quick Create Drawer"
        icon={<CheckSquare className="w-5 h-5 text-slate-700" />}
        width="max-w-[580px]"
        zIndex={650}
        headerRight={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!title.trim()}
              className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Create Task
            </button>
          </div>
        }
        bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
      >
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

        {/* ── 1. Task Details Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Task Details</span>
              <InfoTooltip content="Primary identifiers, title, description, and admin scoping rules" />
            </h3>
          </div>

          {/* Task Name (required) */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Task Name</span>
              <span className="text-red-500">*</span>
              <InfoTooltip content="Descriptive summary of the task objective" />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify Patient Insurance Eligibility for Fasting Labs"
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-semibold"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Description</span>
              <InfoTooltip content="Action items, guidelines, and reference steps for the assignee" />
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and execution instructions..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none leading-relaxed"
            />
          </div>

          {/* Admin Scope: Plain dropdown field (Replaces the multi-tenant accordion card, no outer card or boundary) */}
          {isAdmin && (
            <div className="space-y-1.5 pt-1">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin Scope</span>
                <InfoTooltip content="Filter tenant organizations and roles by designated multi-tenant administrative scope" />
              </label>
              <select
                value={selectedAdminScopeId}
                onChange={(e) => setSelectedAdminScopeId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white text-slate-900 cursor-pointer font-semibold"
              >
                {ADMIN_SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 2. Assignment & Stage Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Assignment &amp; Stage</span>
              <InfoTooltip content="Set target organization/roles or team members/clients, followed by initial workflow stage" />
            </h3>
          </div>

          {/* ADMIN ASSIGNMENT: Target Organization -> Organization Role */}
          {isAdmin ? (
            <div className="space-y-3">
              {/* Target Organization (Filtered by selected Admin Scope) */}
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Target Organization</span>
                  <InfoTooltip content="Select the corporate tenant organization within the designated admin scope" />
                </label>
                <select
                  value={selectedAdminOrgId}
                  onChange={(e) => {
                    const newOrgId = e.target.value;
                    setSelectedAdminOrgId(newOrgId);
                    const newRoles = ADMIN_ORG_ROLES[newOrgId] || [];
                    if (newRoles.length > 0) setSelectedAdminRole(newRoles[0]);
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer font-semibold"
                >
                  {filteredAdminOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.industry} · {org.country})
                    </option>
                  ))}
                </select>
              </div>

              {/* Organization Role (Filtered by selected Organization) */}
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>Organization Role</span>
                  <InfoTooltip content="Target role within the selected tenant organization" />
                </label>
                <select
                  value={selectedAdminRole}
                  onChange={(e) => setSelectedAdminRole(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer font-semibold"
                >
                  {availableAdminRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin Delegation Note */}
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-gray-200 leading-relaxed">
                Corporate tasks are delegated directly to the <strong>{selectedAdminRole}</strong> role at <strong>{filteredAdminOrganizations.find((o) => o.id === selectedAdminOrgId)?.name || "the selected organization"}</strong> across all active tenant members with that role.
              </p>
            </div>
          ) : (
            /* CLIENT WORKSPACE ASSIGNMENT: Team Members vs Contact / Client */
            <div className="space-y-3">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span>Assign To</span>
                <InfoTooltip content="Choose whether to delegate this task to Team Members or an External Contact / Client" />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignmentType("team")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    assignmentType === "team"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Team Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAssignmentType("contact");
                    setVisibleInPortal(true);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    assignmentType === "contact"
                      ? "bg-[#1E293B] text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Contact / Client</span>
                </button>
              </div>

              {/* TEAM MEMBER ASSIGNMENT */}
              {assignmentType === "team" && (
                <div className="space-y-3 pt-2 bg-slate-50/70 p-3.5 rounded-xl border border-gray-200/80">
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span>Select Role</span>
                      <InfoTooltip content="Filter available team members by their designated organizational role" />
                    </label>
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span>Select Team Member(s)</span>
                      <InfoTooltip content="Add one or more team members who are responsible for this task" />
                    </label>
                    <select
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id && !selectedTeamMemberIds.includes(id)) {
                          setSelectedTeamMemberIds((prev) => [...prev, id]);
                        }
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                    >
                      <option value="" disabled>
                        + Click to add a team member...
                      </option>
                      {filteredTeamMembers.map((m) => {
                        const isAdded = selectedTeamMemberIds.includes(String(m.id));
                        return (
                          <option key={m.id} value={String(m.id)} disabled={isAdded}>
                            {m.name} {m.role ? `(${m.role})` : ""} {isAdded ? "✓ Added" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedTeamMemberIds.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">
                          No team member selected. Please choose from the dropdown above.
                        </p>
                      ) : (
                        selectedTeamMemberIds.map((id) => {
                          const member = teamMembers.find((m) => String(m.id) === String(id));
                          if (!member) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                            >
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>{member.name}</span>
                              {member.role && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({member.role})
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTeamMemberIds((prev) => prev.filter((x) => x !== id))
                                }
                                className="text-slate-400 hover:text-red-500 ml-1 p-0.5 cursor-pointer rounded hover:bg-slate-100"
                                title="Remove team member"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACT ASSIGNMENT */}
              {assignmentType === "contact" && (
                <div className="space-y-3 pt-2 bg-slate-50/70 p-3.5 rounded-xl border border-gray-200/80">
                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span>Contact Category</span>
                      <InfoTooltip content="Filter contacts by type: Lead, Client, Supplier, or Vendor" />
                    </label>
                    <select
                      value={selectedContactCategory}
                      onChange={(e) => setSelectedContactCategory(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                    >
                      {CONTACT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <span>Select Contact</span>
                      <InfoTooltip content="External contact or patient responsible for this task" />
                    </label>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl text-slate-900 cursor-pointer font-semibold"
                    >
                      {filteredContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.contactType || c.contact_type || "Client"}) - {c.location || c.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleInPortal}
                        onChange={(e) => setVisibleInPortal(e.target.checked)}
                        className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                      />
                      <span className="text-xs font-semibold text-slate-700">Visible in Client Portal</span>
                    </label>
                    <InfoTooltip content="Allow this client to view this task and checklist items in their portal" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Initial Stage: Positioned at the end of Assignment & Stage in client drawer (removed in admin) */}
          {!isAdmin && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span>Initial Stage</span>
                <InfoTooltip content="Select the starting workflow stage for this task" />
              </label>
              <select
                value={selectedStageName}
                onChange={(e) => setSelectedStageName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer font-semibold"
              >
                {(taskStages.length > 0 ? taskStages : [
                  { id: "task-stg-created", name: "Task Created" },
                  { id: "task-stg-completed", name: "Task Completed" },
                  { id: "task-stg-overdue", name: "Task Overdue" },
                ]).map((stg) => (
                  <option key={stg.id} value={stg.name}>
                    {stg.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── 3. Schedule & Priority Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-slate-700" />
              <span>Schedule &amp; Priority</span>
              <InfoTooltip content="Set completion deadline, priority importance, recurrence triggers, and duration planning" />
            </h3>
          </div>

          {/* Deadline: Date & Time Picker */}
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Deadline (Date &amp; Time)</span>
              <InfoTooltip content="Target calendar date and clock time for task completion" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white text-slate-900 cursor-pointer"
                />
              </div>
              <div className="relative">
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white text-slate-900 cursor-pointer"
                />
              </div>
            </div>
            {deadlineDate && (
              <p className="text-[11px] text-slate-500 font-mono">
                Formatted: {formatDeadlineDisplay(deadlineDate, deadlineTime)}
              </p>
            )}
          </div>

          {/* Mark as Important: Setting Toggle Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-gray-200/80 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Star className={`w-4 h-4 ${isImportant ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Mark as Important</span>
                <span className="text-[11px] text-slate-500">Flags this task with high urgency priority</span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isImportant}
              onClick={() => setIsImportant((prev) => !prev)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                isImportant ? "bg-[#1E293B]" : "bg-gray-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  isImportant ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Repeat Task & Time Planning (Moved up from bottom into Schedule & Priority) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowRecurrenceDrawer(true)}
              className="p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-slate-600" />
                <span>Repeat Task</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {recurrenceConfig?.enabled ? "Configured" : "None"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowTimePlanningDrawer(true)}
              className="p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Time Planning</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {timePlanningConfig?.durationDays ? `${timePlanningConfig.durationDays}d` : "None"}
              </span>
            </button>
          </div>
        </div>

        {/* ── 4. Observers Section (Client workspace only, removed in admin) ── */}
        {!isAdmin && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-slate-700" />
                <span>Observers ({observers.length})</span>
                <InfoTooltip content="Users who can monitor progress and receive updates without direct assignment" />
              </h3>
              <button
                type="button"
                onClick={() => setShowAddObserver((prev) => !prev)}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Observer</span>
              </button>
            </div>

            {showAddObserver && (
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  Select Team Member to Observe:
                </span>
                <select
                  onChange={(e) => {
                    const m = teamMembers.find((tm) => String(tm.id) === e.target.value);
                    if (m) handleAddObserver(m);
                  }}
                  defaultValue=""
                  className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg cursor-pointer text-slate-900"
                >
                  <option value="" disabled>
                    Choose observer...
                  </option>
                  {teamMembers.map((tm) => (
                    <option key={tm.id} value={String(tm.id)}>
                      {tm.name} {tm.role ? `(${tm.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {observers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No observers assigned yet.</p>
              ) : (
                observers.map((obs) => (
                  <span
                    key={obs.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>{obs.name}</span>
                    {obs.role && (
                      <span className="text-[10px] text-slate-400 font-normal">({obs.role})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveObserver(obs.id)}
                      className="text-slate-400 hover:text-red-500 ml-1 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 5. Checklists Card with Item Hamburger Menu ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Checklists</span>
              <InfoTooltip content="Granular deliverables and verification steps with action menus" />
            </h3>
            <button
              type="button"
              onClick={handleAddChecklist}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Checklist</span>
            </button>
          </div>

          {checklists.map((chk) => (
            <div key={chk.id} className="p-3.5 bg-slate-50 rounded-xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{chk.title}</span>
                {checklists.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklist(chk.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                {chk.items.map((it) => (
                  <div
                    key={it.id}
                    className="relative flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {it.isImportant && (
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      )}

                      {editingItemId === it.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingItemText}
                            onChange={(e) => setEditingItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEditItem(chk.id, it.id);
                              if (e.key === "Escape") setEditingItemId(null);
                            }}
                            className="flex-1 text-xs p-1 bg-slate-50 border border-gray-200 rounded text-slate-900"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditItem(chk.id, it.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-800 font-medium truncate">{it.text}</span>
                      )}
                    </div>

                    {/* Hamburger / Menu Action Button on each item */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveItemMenuId(activeItemMenuId === it.id ? null : it.id)
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                        title="Item Actions"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Hamburger Dropdown Popover */}
                      {activeItemMenuId === it.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveItemMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 text-xs animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleItemImportance(chk.id, it.id);
                                setActiveItemMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <Star className={`w-3.5 h-3.5 ${it.isImportant ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                              <span>{it.isImportant ? "Unmark Important" : "Mark as Important"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditItem(it)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edit Item Text</span>
                            </button>

                            <div className="my-1 border-t border-gray-100" />

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(chk.id, it.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete Item</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item Row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newItemText[chk.id] || ""}
                  onChange={(e) => setNewItemText((prev) => ({ ...prev, [chk.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(chk.id);
                    }
                  }}
                  placeholder="Add item to checklist..."
                  className="flex-1 text-xs p-2 bg-white border border-gray-200 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(chk.id)}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium px-2 py-1"
                >
                  + Add Item
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── 6. Files & Attachments Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Files ({attachments.length})</span>
              <InfoTooltip content="Supporting documentation, protocols, or reference sheets attached to this task" />
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>+ Add File</span>
            </button>
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No files attached to this task.</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{att.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono tabular-nums">{att.size}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerShell>

      {/* Recurrence Sub-Drawer */}
      <TaskRecurrenceDrawer
        isOpen={showRecurrenceDrawer}
        onClose={() => setShowRecurrenceDrawer(false)}
        config={recurrenceConfig}
        onSave={(cfg) => setRecurrenceConfig(cfg)}
      />

      {/* Time Planning Sub-Drawer */}
      <TaskTimePlanningDrawer
        isOpen={showTimePlanningDrawer}
        onClose={() => setShowTimePlanningDrawer(false)}
        config={timePlanningConfig}
        onSave={(cfg) => setTimePlanningConfig(cfg)}
      />
    </>
  );
}
