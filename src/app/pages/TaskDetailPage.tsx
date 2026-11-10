import React, { useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  CheckSquare,
  Star,
  Trash2,
  FileCode,
  AlertTriangle,
  Lock,
  Share2,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { useTasks } from "../../lib/tasksStore";
import { TaskEntity, TaskStatus } from "../../types/task";
import { useProcessStore, DEFAULT_TASK_PROCESSES, DEFAULT_ENTITY_PROCESSES, Stage } from "../../lib/useProcessStore";
import { useTeamMembers } from "../../lib/teamStore";
import { useAuth } from "../context/AuthContext";
import TaskRecurrenceDrawer from "../components/tasks/TaskRecurrenceDrawer";
import TaskTimePlanningDrawer from "../components/tasks/TaskTimePlanningDrawer";
import ShareTaskDrawer from "../components/tasks/ShareTaskDrawer";
import {
  TaskDescriptionSection,
  TaskChecklistsSection,
  TaskSubtasksSection,
  TaskAttachmentsSection,
  TaskStageSection,
  TaskAssignmentSection,
  TaskPlanningSection,
  TaskObserversSection,
} from "../components/tasks/TaskContentSections";
import { toast } from "sonner";

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers();

  const {
    tasks,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    updateTaskStage,
    toggleChecklistItem,
    toggleItemImportance,
    addChecklistItem,
    deleteChecklistItem,
    addChecklist,
    deleteChecklist,
    addObserver,
    removeObserver,
    addSubtask,
    toggleSubtask,
  } = useTasks();

  const { processes } = useProcessStore();
  const taskWorkflows = useMemo(() => {
    const list = processes.filter((p) => p.entityType === "task");
    return list.length > 0 ? list : DEFAULT_TASK_PROCESSES;
  }, [processes]);

  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) || null;
  }, [taskId, tasks]);

  // Current persona for permission scoping
  const currentUserName = user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta");

  const isAssignedToUser = (t: TaskEntity) => {
    const u = currentUserName.toLowerCase();
    const aName = (t.assignee?.assigneeName || "").toLowerCase();
    const aRole = (t.assignee?.roleName || "").toLowerCase();
    if (
      aName &&
      (aName.includes(u) ||
        u.includes(aName) ||
        aName.includes("alistair") ||
        aName.includes("lead physician"))
    ) {
      return true;
    }
    if (
      aRole &&
      (aRole.includes("lead physician") ||
        aRole.includes("physician") ||
        aRole.includes("clinician"))
    ) {
      return true;
    }
    if (
      t.assignees &&
      t.assignees.some((a) => {
        const name = (a.assigneeName || "").toLowerCase();
        return (
          name.includes(u) ||
          u.includes(name) ||
          name.includes("alistair") ||
          name.includes("lead physician")
        );
      })
    ) {
      return true;
    }
    return false;
  };

  // Determine stage options
  const taskStages = useMemo<Stage[]>(() => {
    if (task?.workflowId) {
      const match = taskWorkflows.find((w) => w.id === task.workflowId);
      if (match?.stages && match.stages.length > 0) return match.stages;
    }
    return DEFAULT_ENTITY_PROCESSES.task?.stages || [
      { id: "task-stg-created", name: "Task Created", description: "Created", status: "active" },
      { id: "task-stg-completed", name: "Task Completed", description: "Completed", status: "active" },
      { id: "task-stg-overdue", name: "Task Overdue", description: "Overdue", status: "active" },
    ];
  }, [task, taskWorkflows]);

  const [showRecurrenceDrawer, setShowRecurrenceDrawer] = React.useState(false);
  const [showTimePlanningDrawer, setShowTimePlanningDrawer] = React.useState(false);
  const [showShareDrawer, setShowShareDrawer] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backUrl = isAdmin ? "/admin/tasks" : "/tasks";

  // 1. Not Found State
  if (!task) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 max-w-md w-full text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Task Not Found
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              The task you are attempting to view may have been removed or does not exist.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Tasks</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Comprehensive ModulePermissionConfig Role Scope Check (all / department / own / deny)
  const permissionCheck = (() => {
    if (isAdmin) return { allowed: true };

    const userRoleStr = (user?.role || "Staff").toLowerCase();
    if (userRoleStr.includes("super admin") || userRoleStr.includes("platform administrator")) {
      return { allowed: true };
    }

    try {
      const rawRoles = localStorage.getItem("ma_admin_roles_store_v2");
      if (rawRoles) {
        const roles = JSON.parse(rawRoles);
        const matchedRole = roles.find(
          (r: any) =>
            (r.roleName || "").toLowerCase() === userRoleStr ||
            (r.name || "").toLowerCase() === userRoleStr
        );
        if (matchedRole && matchedRole.permissions) {
          const taskPerm = matchedRole.permissions.tasks || matchedRole.permissions.processes;
          if (taskPerm) {
            // "deny" or read = false
            if (taskPerm.read === false || taskPerm.scope === "deny") {
              return {
                allowed: false,
                reason: "Your role is restricted from viewing tasks (ModulePermissionConfig: deny).",
              };
            }
            // "own"
            if (taskPerm.scope === "own") {
              const isAssigned = isAssignedToUser(task);
              const isCreator =
                task.creator?.id === (user as any)?.id ||
                (task.creator?.name && user?.name && task.creator.name.toLowerCase() === user.name.toLowerCase());
              if (!isAssigned && !isCreator) {
                return {
                  allowed: false,
                  reason: "Your role permission is scoped to 'own' tasks only.",
                };
              }
            }
            // "department"
            if (taskPerm.scope === "department") {
              const userDept = ((user as any)?.department || "").toLowerCase().trim();
              const taskDept = (task.department || "").toLowerCase().trim();
              const isAssigned = isAssignedToUser(task);
              // If the task has no department, deny access (unless directly assigned to user)
              if (!taskDept || (taskDept !== userDept && !isAssigned)) {
                return {
                  allowed: false,
                  reason: "Your role permission is scoped to department tasks only, and this task has no matching department.",
                };
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error reading role permissions:", err);
    }

    // Organization & multi-tenant scope isolation for admin tasks
    if (task.scopeLevel === "admin") {
      const isTargetedToClient =
        isAssignedToUser(task) ||
        task.assignee?.orgName?.toLowerCase().includes("mantra") ||
        task.assignee?.roleName?.toLowerCase().includes("physician") ||
        task.assignee?.roleName?.toLowerCase().includes("director");

      if (!isTargetedToClient) {
        return {
          allowed: false,
          reason: "This administrative task is scoped to another organization or role and cannot be accessed from this workspace.",
        };
      }
    }

    return { allowed: true };
  })();

  if (!permissionCheck.allowed) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 max-w-md w-full text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto text-amber-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Access Denied
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {permissionCheck.reason || "You do not have permission to view this task."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tasks</span>
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === "completed";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;
      const newAtt = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: sizeStr,
        type: file.type || "application/pdf",
        uploadedAt: "Just now",
      };
      updateTask(task.id, {
        attachments: [...(task.attachments || []), newAtt],
      });
      toast.success(`Attached "${file.name}"`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── PageHeader Portals into TopBar ── */}
      <PageHeader
        title={task.code ? `${task.code}: ${task.title}` : task.title}
        subtitle={`Workflow: ${task.workflowName || "Clinical & Operational Tasks"} • Created ${task.createdAt}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(backUrl)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShareDrawer(true)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Share task via SMS, WhatsApp, Email, or Companion Chat"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextStatus: TaskStatus = isCompleted ? "in_progress" : "completed";
                toggleTaskStatus(task.id, nextStatus);
                toast.success(isCompleted ? "Task reopened" : "Task marked completed");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                isCompleted
                  ? "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  : "bg-[#1E293B] text-white hover:bg-slate-800"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isCompleted ? "Reopen Task" : "Mark Complete"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                updateTask(task.id, { isImportant: !task.isImportant });
                toast.success(task.isImportant ? "Unmarked important" : "Marked as important");
              }}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                task.isImportant
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-gray-200 bg-white text-slate-400 hover:text-amber-500"
              }`}
              title={task.isImportant ? "High Priority" : "Mark Priority"}
            >
              <Star className={`w-4 h-4 ${task.isImportant ? "fill-amber-500" : ""}`} />
            </button>

            {(isAdmin || task.creator?.name?.toLowerCase().includes("admin")) && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Permanently delete task ${task.code}?`)) {
                    deleteTask(task.id);
                    toast.success("Task deleted");
                    navigate(backUrl);
                  }
                }}
                className="p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      />

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* ── Main Viewport Content ── */}
      <div className="px-6 sm:px-10 py-6 max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb Strip */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="hover:text-slate-900 transition-colors font-semibold cursor-pointer"
          >
            {isAdmin ? "Admin Tasks" : "Tasks"}
          </button>
          <span>/</span>
          <span className="font-mono text-slate-700 font-semibold">{task.code}</span>
        </div>

        {/* ── If Task is created as Page: Sandboxed HTML Iframe Container ── */}
        {task.isPage && task.htmlContent ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Custom Page Content
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                Sandboxed HTML Iframe
              </span>
            </div>
            {/* Strict bounded container with internal scroll only */}
            <div className="w-full h-[650px] relative overflow-hidden bg-white">
              <iframe
                srcDoc={task.htmlContent}
                sandbox="allow-same-origin"
                title="Task Page Document"
                className="w-full h-full border-0 overflow-auto"
                style={{ display: "block" }}
              />
            </div>
          </div>
        ) : null}

        {/* ── Structured Content Grid (2 Columns: Main 2/3, Sidebar 1/3) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── Left Column: Details, Checklists, Subtasks, Attachments ── */}
          <div className="lg:col-span-2 space-y-6">
            <TaskDescriptionSection task={task} onUpdateTask={updateTask} />

            <TaskChecklistsSection
              task={task}
              onToggleChecklistItem={toggleChecklistItem}
              onToggleItemImportance={toggleItemImportance}
              onAddChecklistItem={addChecklistItem}
              onDeleteChecklistItem={deleteChecklistItem}
              onAddChecklist={addChecklist}
              onDeleteChecklist={deleteChecklist}
            />

            <TaskSubtasksSection
              task={task}
              onAddSubtask={addSubtask}
              onToggleSubtask={toggleSubtask}
            />

            <TaskAttachmentsSection
              task={task}
              onUpdateTask={updateTask}
              fileInputRef={fileInputRef}
            />
          </div>

          {/* ── Right Column: Workflow Stage, Responsibility, Planning, Observers ── */}
          <div className="space-y-6">
            <TaskStageSection
              task={task}
              taskStages={taskStages}
              onUpdateStage={updateTaskStage}
            />

            <TaskAssignmentSection
              task={task}
              isAdmin={isAdmin}
              onOpenShare={() => setShowShareDrawer(true)}
            />

            <TaskPlanningSection
              task={task}
              onUpdateTask={updateTask}
              onOpenRecurrence={() => setShowRecurrenceDrawer(true)}
              onOpenTimePlanning={() => setShowTimePlanningDrawer(true)}
            />

            {!isAdmin && (
              <TaskObserversSection
                task={task}
                teamMembers={teamMembers}
                onAddObserver={addObserver}
                onRemoveObserver={removeObserver}
              />
            )}
          </div>
        </div>
      </div>

      {/* Recurrence Sub-Drawer */}
      <TaskRecurrenceDrawer
        isOpen={showRecurrenceDrawer}
        onClose={() => setShowRecurrenceDrawer(false)}
        config={task.recurrence}
        onSave={(cfg) => {
          updateTask(task.id, { recurrence: cfg });
          toast.success("Recurrence schedule applied");
        }}
      />

      {/* Time Planning Sub-Drawer */}
      <TaskTimePlanningDrawer
        isOpen={showTimePlanningDrawer}
        onClose={() => setShowTimePlanningDrawer(false)}
        config={task.timePlanning}
        onSave={(cfg) => {
          updateTask(task.id, { timePlanning: cfg });
          toast.success("Time planning applied");
        }}
      />

      {/* Share Task Drawer (SMS, WhatsApp, Email, Companion Chat) */}
      <ShareTaskDrawer
        isOpen={showShareDrawer}
        onClose={() => setShowShareDrawer(false)}
        task={task}
      />
    </div>
  );
}
