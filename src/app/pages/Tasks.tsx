import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router";
import {
  CheckSquare,
  GitBranch,
  Calendar,
  FileText,
  Shield,
  Search,
  Plus,
  Star,
  LayoutList,
  LayoutGrid,
  Settings,
  ChevronDown,
  Filter,
  Check,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { Tooltip } from "../components/ui/Tooltip";
import { InfoTooltip } from "../components/help/InfoTooltip";
import { useTasks } from "../../lib/tasksStore";
import { TaskEntity, TaskStatus } from "../../types/task";
import { useProcessStore, DEFAULT_ENTITY_PROCESSES } from "../../lib/useProcessStore";
import { SegmentedStageBar } from "../components/common/SegmentedStageBar";
import TaskQuickCreateDrawer from "../components/tasks/TaskQuickCreateDrawer";
import TaskDetailDrawer from "../components/tasks/TaskDetailDrawer";
import { toast } from "sonner";

const ENTITY_TABS = [
  { id: "process", label: "Processes", path: "/process", icon: GitBranch },
  { id: "appointment", label: "Appointments", path: "/appointments", icon: Calendar },
  { id: "invoice", label: "Invoices", path: "/invoices", icon: FileText },
  { id: "insurance", label: "Insurance & Claims", path: "/claims", icon: Shield },
  { id: "task", label: "Tasks", path: "/tasks", icon: CheckSquare },
];

export default function Tasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
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
  const taskProcess = useMemo(() => {
    return processes.find((p) => p.entityType === "task") || DEFAULT_ENTITY_PROCESSES.task;
  }, [processes]);
  const taskStages = useMemo(() => taskProcess.stages || [], [taskProcess]);

  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => searchParams.get("id"));
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.assignee.assigneeName.toLowerCase().includes(q) ||
        (t.observers && t.observers.some((o) => o.name.toLowerCase().includes(q))) ||
        (t.project && t.project.toLowerCase().includes(q));

      const matchesStage = stageFilter === "all" || (t.stageName || "Task Created") === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [tasks, searchQuery, stageFilter]);

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
      render: (task) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-slate-800 truncate">
            {task.assignee.assigneeName}
          </span>
        </div>
      ),
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
      width: "150px",
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

        {/* ── PageTopBar with Entity Switcher, Search, View Mode, and New Task Action ── */}
        <PageTopBar
          leftElement={
            <div className="flex items-center gap-2">
              {/* Entity Dropdown Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEntityDropdown((prev) => !prev)}
                  className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-bold text-[#1E293B] flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <CheckSquare className="w-4 h-4 text-[#1456f0]" />
                  <span>Tasks</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showEntityDropdown && (
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-border rounded-xl shadow-xl z-50 py-1 space-y-0.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                    {ENTITY_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isCurrent = tab.id === "task";
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setShowEntityDropdown(false);
                            navigate(tab.path);
                          }}
                          className={`w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                            isCurrent ? "text-[#1456f0] font-bold bg-blue-50/60" : "text-slate-800"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-[36px] px-3 bg-white hover:bg-slate-50 border border-border rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="all">All Stages</option>
                {taskStages.map((stg) => (
                  <option key={stg.id} value={stg.name}>
                    {stg.name}
                  </option>
                ))}
              </select>
            </div>
          }
          searchPlaceholder="Search tasks by title, ID, responsible, observer, or project..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewToggles={[
            {
              id: "list",
              label: "List",
              icon: <LayoutList className="w-4 h-4" />,
              isActive: viewMode === "list",
              onClick: () => setViewMode("list"),
            },
            {
              id: "kanban",
              label: "Kanban",
              icon: <LayoutGrid className="w-4 h-4" />,
              isActive: viewMode === "kanban",
              onClick: () => setViewMode("kanban"),
            },
          ]}
          primaryAction={{
            label: "New Task",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => setShowQuickCreate(true),
          }}
        />

        {/* ── Main Viewport: List or Kanban ── */}
        {viewMode === "list" ? (
          <TableComponent<TaskEntity>
            data={filteredTasks}
            columns={columns}
            getRowId={(t) => t.id}
            rowActions={rowActions}
            onRowClick={(task) => setSelectedTaskId(task.id)}
            emptyMessage="No tasks found matching your filters."
          />
        ) : (
          /* Kanban Board */
          <div className="flex gap-4 min-h-[580px] overflow-x-auto pb-4">
            {taskStages.map((stage) => {
              const colTasks = filteredTasks.filter(
                (t) => (t.stageName || "Task Created") === stage.name
              );
              const isWon = stage.stageCategory === "success" || stage.systemCategory === "completed";
              const isLost = stage.stageCategory === "lost" || stage.systemCategory === "overdue";
              const stageColor =
                stage.color || (isWon ? "#10B981" : isLost ? "#EF4444" : "#3B82F6");

              return (
                <div
                  key={stage.id}
                  className="bg-slate-100/70 border border-gray-200/80 rounded-2xl p-3 flex flex-col flex-1 min-w-[260px] max-w-[340px]"
                >
                  <div className="flex items-center justify-between pb-3 px-1 border-b border-gray-200/60 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: stageColor }}
                      />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                        {stage.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {colTasks.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs italic">
                        No tasks
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTaskId(t.id)}
                          className="p-3 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-[#1456f0] cursor-pointer transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
                              {t.code}
                            </span>
                            {t.isImportant && (
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                            {t.title}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-gray-100">
                            <span className="truncate max-w-[120px]">
                              {t.assignee.assigneeName}
                            </span>
                            {t.deadline && (
                              <span className="font-mono tabular-nums text-[10px]">
                                {t.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Drawers ── */}
      <TaskQuickCreateDrawer
        isOpen={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreateTask={createTask}
        isAdmin={isAdmin}
        taskStages={taskStages}
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
    </div>
  );
}

