import React, { useState, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router";
import {
  Plus,
  ChevronDown,
  Check,
  Share2,
  UserCheck,
  UserPlus,
  ListFilter,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { Tooltip } from "../components/ui/Tooltip";
import { useTasks } from "../../lib/tasksStore";
import { TaskEntity } from "../../types/task";
import { useProcessStore, DEFAULT_ENTITY_PROCESSES, DEFAULT_TASK_PROCESSES } from "../../lib/useProcessStore";
import { SegmentedStageBar } from "../components/common/SegmentedStageBar";
import TaskQuickCreateDrawer from "../components/tasks/TaskQuickCreateDrawer";
import TaskDetailDrawer from "../components/tasks/TaskDetailDrawer";
import ShareTaskDrawer from "../components/tasks/ShareTaskDrawer";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

type AssignmentFilter = "all" | "assigned_to_me" | "assigned_by_me";

export default function Tasks() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tasks,
    createTask,
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
    if (list.length > 0) return list;
    return DEFAULT_TASK_PROCESSES;
  }, [processes]);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(() => {
    return taskWorkflows[0]?.id || "process-task-default";
  });
  const [showWorkflowDropdown, setShowWorkflowDropdown] = useState(false);

  // Assignment filter preset: All Tasks vs Assigned to me vs Assigned by me
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");

  const activeTaskWorkflow = useMemo(() => {
    return taskWorkflows.find((w) => w.id === selectedWorkflowId) || taskWorkflows[0] || DEFAULT_ENTITY_PROCESSES.task;
  }, [taskWorkflows, selectedWorkflowId]);

  const taskStages = useMemo(() => activeTaskWorkflow.stages || [], [activeTaskWorkflow]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get("id"));
  const [sharingTaskId, setSharingTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const sharingTask = useMemo(() => {
    if (!sharingTaskId) return null;
    return tasks.find((t) => t.id === sharingTaskId) || null;
  }, [sharingTaskId, tasks]);

  // Current logged in username / keywords
  const currentUserName = user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta");

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.assignee.assigneeName.toLowerCase().includes(q) ||
        (t.assignees && t.assignees.some((a) => a.assigneeName.toLowerCase().includes(q))) ||
        (t.observers && t.observers.some((o) => o.name.toLowerCase().includes(q))) ||
        (t.project && t.project.toLowerCase().includes(q));

      const matchesWorkflow =
        selectedWorkflowId === "all" ||
        t.workflowId === selectedWorkflowId ||
        t.workflowName === activeTaskWorkflow.name ||
        t.project === activeTaskWorkflow.name ||
        (!t.workflowId && !t.workflowName && selectedWorkflowId === taskWorkflows[0]?.id);

      // Assignment Filter
      let matchesAssignment = true;
      if (assignmentFilter === "assigned_to_me") {
        const u = currentUserName.toLowerCase();
        const primaryMatch = t.assignee.assigneeName.toLowerCase().includes(u) || u.includes(t.assignee.assigneeName.toLowerCase());
        const multiMatch = t.assignees && t.assignees.some((a) => a.assigneeName.toLowerCase().includes(u) || u.includes(a.assigneeName.toLowerCase()));
        matchesAssignment = Boolean(primaryMatch || multiMatch || t.assignee.assigneeName.includes("Dr. Alistair"));
      } else if (assignmentFilter === "assigned_by_me") {
        const u = currentUserName.toLowerCase();
        matchesAssignment =
          t.creator.name.toLowerCase().includes(u) ||
          u.includes(t.creator.name.toLowerCase()) ||
          t.creator.role?.toLowerCase().includes("admin");
      }

      return matchesSearch && matchesWorkflow && matchesAssignment;
    });
  }, [tasks, searchQuery, selectedWorkflowId, activeTaskWorkflow, taskWorkflows, assignmentFilter, currentUserName]);

  // Columns for 32px TableComponent
  const columns: TableColumn<TaskEntity>[] = [
    {
      key: "code",
      header: "TASK ID",
      width: "100px",
      render: (task) => (
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
          {task.code}
        </span>
      ),
    },
    {
      key: "stage",
      header: "STAGE",
      width: "190px",
      render: (task) => (
        <SegmentedStageBar
          stages={taskStages}
          currentStageName={task.stageName || "Task Created"}
          currentStageId={task.stageId}
          onStageSelect={(stg) => {
            updateTaskStage(task.id, stg.name, stg.id);
            toast.success(`Task moved to ${stg.name}`);
          }}
        />
      ),
    },
    {
      key: "title",
      header: "TASK NAME",
      render: (task) => (
        <div className="min-w-0 pr-2">
          <span
            onClick={() => setSelectedTaskId(task.id)}
            className="font-bold text-xs text-slate-900 hover:text-[#1456f0] hover:underline cursor-pointer truncate block"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {task.title}
          </span>
        </div>
      ),
    },
    {
      key: "assignee",
      header: "RESPONSIBLE",
      width: "170px",
      render: (task) => {
        if (task.assignees && task.assignees.length > 1) {
          const names = task.assignees.map((a) => a.assigneeName).join(", ");
          return (
            <Tooltip content={names}>
              <span className="text-xs font-semibold text-slate-800 truncate block cursor-default">
                {task.assignees[0].assigneeName} +{task.assignees.length - 1} more
              </span>
            </Tooltip>
          );
        }
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-slate-800 truncate">
              {task.assignee.assigneeName}
            </span>
          </div>
        );
      },
    },
    {
      key: "observers",
      header: "OBSERVERS",
      width: "170px",
      render: (task) => {
        if (!task.observers || task.observers.length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        const displayNames = task.observers.map((o) => o.name).join(", ");
        return (
          <Tooltip content={task.observers.map((o) => `${o.name}${o.role ? ` (${o.role})` : ""}`).join(", ")}>
            <span className="text-xs text-slate-600 truncate block cursor-default">
              {displayNames}
            </span>
          </Tooltip>
        );
      },
    },
    {
      key: "deadline",
      header: "DEADLINE",
      width: "160px",
      render: (task) => (
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {task.deadline || "—"}
        </span>
      ),
    },
    {
      key: "checklists",
      header: "CHECKLIST",
      width: "100px",
      render: (task) => {
        const totalItems = task.checklists.reduce((acc, c) => acc + c.items.length, 0);
        const completedItems = task.checklists.reduce(
          (acc, c) => acc + c.items.filter((it) => it.isCompleted).length,
          0
        );
        if (totalItems === 0) return <span className="text-xs text-slate-300">—</span>;
        return (
          <span className="font-mono text-xs text-slate-600 tabular-nums">
            {completedItems}/{totalItems}
          </span>
        );
      },
    },
  ];

  const rowActions: TableRowAction<TaskEntity>[] = [
    {
      label: "View Details",
      onClick: (task) => setSelectedTaskId(task.id),
    },
    {
      label: "Share Task",
      onClick: (task) => setSharingTaskId(task.id),
    },
    {
      label: "Mark Completed",
      onClick: (task) => {
        updateTaskStage(task.id, "Task Completed", "task-stg-completed");
        toast.success(`Task ${task.code} marked completed`);
      },
    },
    {
      label: "Delete",
      isDanger: true,
      onClick: (task) => {
        if (window.confirm(`Delete task ${task.code}?`)) {
          deleteTask(task.id);
          toast.success("Task deleted");
        }
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Tasks"
          subtitle={
            isAdmin
              ? "Corporate operational assignments, cross-organization delegation, checklists, and deadline tracking"
              : "Clinical tasks, operational assignments, checklists, and deadline tracking"
          }
        />

        {/* ── PageTopBar with Workflow Switcher, Filter Presets, Search, and New Task Action ── */}
        <PageTopBar
          leftElement={
            <div className="flex items-center gap-3">
              {/* Task Workflow Switcher Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowWorkflowDropdown((prev) => !prev)}
                  className="h-[36px] px-3.5 flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 transition-colors shadow-2xs cursor-pointer shrink-0"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  title="Switch Task Workflow"
                >
                  <span className="truncate max-w-[200px] font-semibold text-gray-800">
                    {activeTaskWorkflow.name}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${showWorkflowDropdown ? "rotate-180" : ""}`} />
                </button>

                {showWorkflowDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowWorkflowDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-border rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      {taskWorkflows.map((wf) => {
                        const isSelected = selectedWorkflowId === wf.id;
                        return (
                          <button
                            key={wf.id}
                            type="button"
                            onClick={() => {
                              setSelectedWorkflowId(wf.id);
                              setShowWorkflowDropdown(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-slate-50"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <span className="truncate">{wf.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Filter Presets: All Tasks | Assigned to me | Assigned by me */}
              <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setAssignmentFilter("all")}
                  className={`h-[30px] px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    assignmentFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs border border-gray-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentFilter("assigned_to_me")}
                  className={`h-[30px] px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    assignmentFilter === "assigned_to_me"
                      ? "bg-white text-slate-900 shadow-2xs border border-gray-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Assigned to me
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentFilter("assigned_by_me")}
                  className={`h-[30px] px-3 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    assignmentFilter === "assigned_by_me"
                      ? "bg-white text-slate-900 shadow-2xs border border-gray-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Assigned by me
                </button>
              </div>
            </div>
          }
          searchPlaceholder="Search tasks by title, ID, responsible, observer, or project..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          primaryAction={{
            label: "New Task",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setShowQuickCreate(true),
          }}
        />

        {/* ── Main Viewport: Standard 32px Table ── */}
        <TableComponent<TaskEntity>
          data={filteredTasks}
          columns={columns}
          getRowId={(t) => t.id}
          rowActions={rowActions}
          onRowClick={(task) => setSelectedTaskId(task.id)}
          emptyMessage="No tasks found matching your filters."
        />
      </div>

      {/* ── Drawers ── */}
      <TaskQuickCreateDrawer
        isOpen={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreateTask={createTask}
        isAdmin={isAdmin}
        taskStages={taskStages}
        defaultWorkflowName={activeTaskWorkflow.name}
        defaultWorkflowId={activeTaskWorkflow.id}
      />

      <TaskDetailDrawer
        isOpen={Boolean(selectedTaskId && selectedTask)}
        onClose={() => {
          setSelectedTaskId(null);
          setSearchParams({});
        }}
        task={selectedTask}
        isAdmin={isAdmin}
        taskStages={taskStages}
        onUpdateTask={updateTask}
        onUpdateStage={updateTaskStage}
        onDeleteTask={deleteTask}
        onToggleStatus={toggleTaskStatus}
        onToggleChecklistItem={toggleChecklistItem}
        onToggleItemImportance={toggleItemImportance}
        onAddChecklistItem={addChecklistItem}
        onDeleteChecklistItem={deleteChecklistItem}
        onAddChecklist={addChecklist}
        onDeleteChecklist={deleteChecklist}
        onAddObserver={addObserver}
        onRemoveObserver={removeObserver}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
      />

      <ShareTaskDrawer
        isOpen={Boolean(sharingTaskId && sharingTask)}
        onClose={() => setSharingTaskId(null)}
        task={sharingTask}
      />
    </div>
  );
}
