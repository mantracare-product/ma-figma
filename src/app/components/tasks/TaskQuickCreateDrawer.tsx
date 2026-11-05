import React, { useState, useRef } from "react";
import {
  CheckSquare,
  Star,
  Calendar,
  Clock,
  Repeat,
  Paperclip,
  Plus,
  Trash2,
  X,
  FileText,
  UserCheck,
  Building2,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
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
} from "../../../types/task";
import { Stage } from "../../../lib/useProcessStore";
import TaskRecurrenceDrawer from "./TaskRecurrenceDrawer";
import TaskTimePlanningDrawer from "./TaskTimePlanningDrawer";
import { toast } from "sonner";

export interface TaskQuickCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (taskData: Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">) => void;
  isAdmin?: boolean;
  taskStages?: Stage[];
}

const ADMIN_SCOPES = [
  { id: "scope-all", name: "All Industries, All Countries" },
  { id: "scope-health", name: "Healthcare (5 industries, All countries)" },
  { id: "scope-us", name: "United States (All industries)" },
];

const ORGS = [
  { id: "org-1", name: "Demo Mantra Care" },
  { id: "org-2", name: "Apex Cardiology Center" },
  { id: "org-3", name: "Metro General Hospital" },
];

const ORG_ROLES = [
  { id: "role-1", name: "Lead Physician" },
  { id: "role-2", name: "Clinical Director" },
  { id: "role-3", name: "Care Coordinator" },
  { id: "role-4", name: "Billing Specialist" },
  { id: "role-5", name: "Practice Admin" },
];

const CLIENT_CANDIDATES = [
  { id: "CL-001", name: "Sarah Johnson", type: "Client Contact" },
  { id: "CL-002", name: "Michael Chang", type: "Client Contact" },
  { id: "CL-003", name: "Aarav Patel", type: "Client Contact" },
  { id: "CL-004", name: "Elena Rostova", type: "Team Member" },
  { id: "CL-005", name: "Dr. Alistair Mehta", type: "Clinician" },
];

export default function TaskQuickCreateDrawer({
  isOpen,
  onClose,
  onCreateTask,
  isAdmin = false,
  taskStages = [],
}: TaskQuickCreateDrawerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [project, setProject] = useState("Clinical Operations");
  const [deadline, setDeadline] = useState("Tomorrow, 5:00 PM");

  // Workflow Stage
  const defaultStage = taskStages[0]?.name || "Task Created";
  const [selectedStageName, setSelectedStageName] = useState(defaultStage);

  // Scoping: client app vs admin corporate
  const [scopeLevel, setScopeLevel] = useState<TaskScopeLevel>(isAdmin ? "admin" : "client");
  const [adminScope, setAdminScope] = useState(ADMIN_SCOPES[1].name);
  const [selectedOrg, setSelectedOrg] = useState(ORGS[0].name);
  const [selectedRole, setSelectedRole] = useState(ORG_ROLES[0].name);
  const [assigneeName, setAssigneeName] = useState("Dr. Alistair Mehta");
  const [visibleInPortal, setVisibleInPortal] = useState(false);

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

  // Observers
  const [observers, setObservers] = useState<TaskObserver[]>([
    { id: "obs-1", name: "Elena Rostova", role: "Care Coordinator" },
  ]);

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

    const resolvedScopeLevel: TaskScopeLevel = isAdmin ? scopeLevel : (visibleInPortal ? "portal" : "client");

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      status,
      stageName: selectedStageName,
      stageId,
      isImportant,
      scopeLevel: resolvedScopeLevel,
      assignee: {
        scopeLevel: isAdmin
          ? (scopeLevel === "admin" ? "admin" : scopeLevel === "client" ? "client" : "contact")
          : (visibleInPortal ? "contact" : "client"),
        adminScopeName: isAdmin && scopeLevel === "admin" ? adminScope : undefined,
        orgName: isAdmin ? selectedOrg : undefined,
        roleName: isAdmin ? selectedRole : undefined,
        assigneeName,
      },
      creator: {
        id: isAdmin ? "usr-admin-1" : "usr-clinic-1",
        name: isAdmin ? "Platform Administrator" : "Clinic Administrator",
        role: isAdmin ? "Super Admin" : "Practice Admin",
      },
      project,
      deadline,
      checklists,
      observers,
      subtasks: [],
      recurrence: recurrenceConfig,
      timePlanning: timePlanningConfig,
      attachments,
    });

    toast.success("Task created successfully");
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

        {/* ── Title & Priority Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Task Details
            </h3>
            {/* Important Star Toggle */}
            <Tooltip content={isImportant ? "Marked as high priority" : "Mark as high priority"}>
              <button
                type="button"
                onClick={() => setIsImportant((prev) => !prev)}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isImportant
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "border-gray-200 text-slate-400 hover:text-slate-700"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${isImportant ? "fill-amber-500 text-amber-500" : ""}`} />
                <span>Important</span>
              </button>
            </Tooltip>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Task Name <span className="text-red-500">*</span>
              </label>
              <InfoTooltip content="Descriptive summary of the task objective" />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verify Patient Insurance Eligibility for Fasting Labs"
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <InfoTooltip content="Action items, guidelines, and reference steps for the assignee" />
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and execution instructions..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Project */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Project / Category</label>
                <InfoTooltip content="Operational bucket for reporting and pipeline sorting" />
              </div>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
              />
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Deadline</label>
                <InfoTooltip content="Target date or time for deliverable completion" />
              </div>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* ── Assignee & Stage Card (Client Workspace: Clean UI, NO Admin Scope) ── */}
        {!isAdmin ? (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Assignment & Stage
              </h3>
              <InfoTooltip content="Set the initial workflow stage and team member assignment" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Initial Stage</label>
                  <InfoTooltip content="Select the starting stage for this task" />
                </div>
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Assignee Person</label>
                  <InfoTooltip content="Individual team member or contact responsible for this task" />
                </div>
                <select
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer font-semibold"
                >
                  {CLIENT_CANDIDATES.map((cand) => (
                    <option key={cand.id} value={cand.name}>
                      {cand.name} ({cand.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Portal Visibility Checkbox */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleInPortal}
                  onChange={(e) => setVisibleInPortal(e.target.checked)}
                  className="rounded border-gray-300 text-[#1456f0] focus:ring-[#1456f0]"
                />
                <span className="text-xs font-semibold text-slate-700">Visible in Client Portal</span>
              </label>
              <InfoTooltip content="Allow clients to view this task and checklist items in their portal" />
            </div>
          </div>
        ) : (
          /* ── Admin Corporate View: 3-Level Scoping ── */
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Assignee & Scope Level
              </h3>
              <InfoTooltip content="Configure administrative, client, or portal scope targeting" />
            </div>

            {/* Scope Level Toggle */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "admin", label: "Admin Level" },
                  { id: "client", label: "Client Level" },
                  { id: "portal", label: "Portal Level" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScopeLevel(s.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    scopeLevel === s.id
                      ? "bg-[#1E293B] text-white border-slate-900"
                      : "bg-white text-slate-700 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Conditional Scope Pickers */}
            {scopeLevel === "admin" && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Admin Scope</label>
                    <InfoTooltip content="Industry and geographical boundaries" />
                  </div>
                  <select
                    value={adminScope}
                    onChange={(e) => setAdminScope(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                  >
                    {ADMIN_SCOPES.map((sc) => (
                      <option key={sc.id} value={sc.name}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Organization</label>
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                    >
                      {ORGS.map((org) => (
                        <option key={org.id} value={org.name}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Org Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                    >
                      {ORG_ROLES.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Initial Stage</label>
                  <InfoTooltip content="Select starting workflow stage" />
                </div>
                <select
                  value={selectedStageName}
                  onChange={(e) => setSelectedStageName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
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

              {/* Assignee Person Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Assignee Person</label>
                  <InfoTooltip content="Individual responsible for executing the task" />
                </div>
                <select
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
                >
                  {CLIENT_CANDIDATES.map((cand) => (
                    <option key={cand.id} value={cand.name}>
                      {cand.name} ({cand.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Checklists Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Checklists
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
                    className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-gray-200/70 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tooltip content={it.isImportant ? "Important checklist item" : "Mark as important"}>
                        <button
                          type="button"
                          onClick={() => handleToggleItemImportance(chk.id, it.id)}
                          className="p-0.5 text-slate-400 hover:text-amber-500 cursor-pointer"
                        >
                          <Star className={`w-3.5 h-3.5 ${it.isImportant ? "fill-amber-500 text-amber-500" : ""}`} />
                        </button>
                      </Tooltip>
                      <span className="text-slate-800 font-medium">{it.text}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(chk.id, it.id)}
                      className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
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

        {/* ── Files & Attachments Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Files ({attachments.length})
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

        {/* ── Advanced Planning Triggers (Stacked Links) ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Planning & Recurrence
            </h3>
            <InfoTooltip content="Open sub-drawers for recurring triggers and schedule timeframes" />
          </div>

          <div className="grid grid-cols-2 gap-3">
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

