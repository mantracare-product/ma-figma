import React, { useState, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router";
import {
  Plus,
  ChevronDown,
  Check,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageTopBar from "../components/layout/PageTopBar";
import TableComponent, { TableColumn, TableRowAction } from "../components/ui/TableComponent";
import { Tooltip } from "../components/ui/Tooltip";
import { useTasks, getPersonTaskProgress, getTaskOverallProgress } from "../../lib/tasksStore";
import { TaskEntity } from "../../types/task";
import { useProcessStore, DEFAULT_ENTITY_PROCESSES, DEFAULT_TASK_PROCESSES } from "../../lib/useProcessStore";
import { SegmentedStageBar } from "../components/common/SegmentedStageBar";
import TaskQuickCreateDrawer from "../components/tasks/TaskQuickCreateDrawer";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Tasks() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
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

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("all");
  const [showWorkflowDropdown, setShowWorkflowDropdown] = useState(false);

  // Client workspace segmented tabs: "My Tasks" vs "Tasks by me"
  const [clientTab, setClientTab] = useState<"my_tasks" | "tasks_by_me">("my_tasks");

  const activeTaskWorkflow = useMemo(() => {
    if (selectedWorkflowId === "all") return taskWorkflows[0] || DEFAULT_ENTITY_PROCESSES.task;
    return taskWorkflows.find((w) => w.id === selectedWorkflowId) || taskWorkflows[0] || DEFAULT_ENTITY_PROCESSES.task;
  }, [taskWorkflows, selectedWorkflowId]);

  const taskStages = useMemo(() => activeTaskWorkflow.stages || [], [activeTaskWorkflow]);

  // Helper to retrieve stages tailored to a specific task's workflow
  const getTaskStages = (t: TaskEntity) => {
    if (t.workflowId) {
      const match = taskWorkflows.find((w) => w.id === t.workflowId);
      if (match?.stages && match.stages.length > 0) return match.stages;
    }
    return taskStages;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskEntity | null>(null);

  // Check if ?editTaskId= is in the search params
  React.useEffect(() => {
    const editTaskId = searchParams.get("editTaskId");
    if (editTaskId) {
      const match = tasks.find((t) => t.id === editTaskId);
      if (match) {
        setTaskToEdit(match);
        setShowQuickCreate(true);
      }
    }
  }, [searchParams, tasks]);

  // Auto-redirect legacy ?id= links to full task page
  React.useEffect(() => {
    const legacyId = searchParams.get("id");
    if (legacyId) {
      navigate(isAdmin ? `/admin/tasks/${legacyId}` : `/tasks/${legacyId}`, { replace: true });
    }
  }, [searchParams, isAdmin, navigate]);

  // Main task click handler:
  // "for the task that i created show the task edititng drawere only , for the task assigned to me show pages"
  const handleOpenTask = (task: TaskEntity) => {
    if (isAssignedToMe(task)) {
      // Assigned to me: show pages
      navigate(isAdmin ? `/admin/tasks/${task.id}` : `/tasks/${task.id}`);
    } else {
      // Created by me: show task editing drawer only
      setTaskToEdit(task);
      setShowQuickCreate(true);
    }
  };

  const handleCloseDrawer = () => {
    setShowQuickCreate(false);
    setTaskToEdit(null);
    if (searchParams.get("editTaskId")) {
      navigate(isAdmin ? "/admin/tasks" : "/tasks", { replace: true });
    }
  };

  // Current logged in username / persona
  const currentUserName = user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta");

  // Determine if a task is directly assigned to the current user
  const isAssignedToMe = (t: TaskEntity) => {
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
    if (
      t.responsiblePeople &&
      t.responsiblePeople.some((p) => {
        const pName = (p.name || "").toLowerCase();
        const userName = (user?.name || "").toLowerCase();
        return (
          pName.includes(u) ||
          u.includes(pName) ||
          pName.includes("alistair") ||
          (userName && (pName.includes(userName) || userName.includes(pName)))
        );
      })
    ) {
      return true;
    }
    return false;
  };

  // Badge counts for client tabs
  const { myTasksCount, tasksByMeCount } = useMemo(() => {
    let myCount = 0;
    let byMeCount = 0;
    tasks.forEach((t) => {
      if (t.scopeLevel === "admin") return;
      if (isAssignedToMe(t)) {
        myCount++;
      } else {
        byMeCount++;
      }
    });
    return { myTasksCount: myCount, tasksByMeCount: byMeCount };
  }, [tasks, currentUserName]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Role / Scope Isolation:
      // In Admin workspace (/admin/tasks), ONLY admin-level tasks appear.
      if (isAdmin && t.scopeLevel !== "admin") {
        return false;
      }
      // In Client workspace (/tasks), corporate administrative tasks are omitted
      if (!isAdmin && t.scopeLevel === "admin") {
        return false;
      }

      // 2. Client Tab Separation: "My Tasks" vs "Tasks by me"
      if (!isAdmin) {
        if (clientTab === "my_tasks") {
          if (!isAssignedToMe(t)) return false;
        } else if (clientTab === "tasks_by_me") {
          if (isAssignedToMe(t)) return false;
        }
      }

      // 3. Search query matching
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.assignee.assigneeName.toLowerCase().includes(q) ||
        (t.assignees && t.assignees.some((a) => a.assigneeName.toLowerCase().includes(q))) ||
        (t.observers && t.observers.some((o) => o.name.toLowerCase().includes(q))) ||
        (t.workflowName && t.workflowName.toLowerCase().includes(q)) ||
        (t.project && t.project.toLowerCase().includes(q));

      // 4. Workflow filter (only applies in Tasks by me or Admin; in My Tasks all assigned tasks are shown)
      const matchesWorkflow =
        (!isAdmin && clientTab === "my_tasks") ||
        selectedWorkflowId === "all" ||
        t.workflowId === selectedWorkflowId ||
        t.workflowName === activeTaskWorkflow.name ||
        t.project === activeTaskWorkflow.name ||
        (!t.workflowId && !t.workflowName && selectedWorkflowId === taskWorkflows[0]?.id);

      return matchesSearch && matchesWorkflow;
    });
  }, [tasks, searchQuery, selectedWorkflowId, activeTaskWorkflow, taskWorkflows, clientTab, currentUserName, isAdmin]);

  // Columns for 32px TableComponent
  const columns: TableColumn<TaskEntity>[] = useMemo(() => {
    const baseCols: TableColumn<TaskEntity>[] = [
      {
        key: "code",
        header: "TASK ID",
        width: "110px",
        minWidth: "110px",
        align: "left",
        render: (task) => (
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
            {task.code || "NA"}
          </span>
        ),
      },
    ];

    if (isAdmin) {
      // ADMIN WORKSPACE COLUMNS
      baseCols.push(
        {
          key: "title",
          header: "TASK NAME",
          minWidth: "240px",
          align: "left",
          render: (task) => (
            <Tooltip content={task.title || "NA"}>
              <div className="min-w-0 pr-2">
                <span
                  onClick={() => handleOpenTask(task)}
                  className="font-bold text-xs text-slate-900 hover:text-[#1456f0] hover:underline cursor-pointer truncate block"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {task.title || "NA"}
                </span>
              </div>
            </Tooltip>
          ),
        },
        {
          key: "scope",
          header: "SCOPE",
          width: "200px",
          minWidth: "200px",
          align: "left",
          render: (task) => {
            const scopeDisplay =
              task.assignee?.adminScopeName ||
              (task.scopingRules && task.scopingRules.length > 0
                ? task.scopingRules.map((r) => r.industryCategory || "Healthcare").join(", ")
                : "NA");
            return (
              <Tooltip content={scopeDisplay}>
                <span className="text-xs text-slate-700 font-medium truncate block cursor-default">
                  {scopeDisplay}
                </span>
              </Tooltip>
            );
          },
        },
        {
          key: "organization",
          header: "ORGANIZATION",
          width: "200px",
          minWidth: "200px",
          align: "left",
          render: (task) => {
            const orgDisplay = task.assignee?.orgName || "NA";
            return (
              <Tooltip content={orgDisplay}>
                <span className="text-xs font-semibold text-slate-800 truncate block cursor-default">
                  {orgDisplay}
                </span>
              </Tooltip>
            );
          },
        },
        {
          key: "assignee",
          header: "ROLE / RESPONSIBLE",
          width: "180px",
          minWidth: "180px",
          align: "left",
          render: (task) => {
            const roleOrAssignee = task.assignee?.roleName || task.assignee?.assigneeName || "NA";
            return (
              <Tooltip content={roleOrAssignee}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-800 truncate block cursor-default">
                    {roleOrAssignee}
                  </span>
                </div>
              </Tooltip>
            );
          },
        }
      );
    } else {
      // CLIENT WORKSPACE COLUMNS
      if (clientTab === "tasks_by_me") {
        // "Tasks by me": prominent WORKFLOW and interactive STAGE
        baseCols.push(
          {
            key: "workflow",
            header: "WORKFLOW",
            width: "170px",
            minWidth: "170px",
            align: "left",
            render: (task) => {
              const wfName = task.workflowName || task.project || "Clinical & Operational Tasks";
              return (
                <Tooltip content={wfName}>
                  <span className="text-xs font-medium text-slate-700 truncate block cursor-default">
                    {wfName}
                  </span>
                </Tooltip>
              );
            },
          },
          {
            key: "stage",
            header: "STAGE",
            width: "210px",
            minWidth: "210px",
            align: "left",
            render: (task) => (
              <SegmentedStageBar
                stages={getTaskStages(task)}
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
            minWidth: "240px",
            align: "left",
            render: (task) => (
              <Tooltip content={task.title || "NA"}>
                <div className="min-w-0 pr-2">
                  <span
                    onClick={() => handleOpenTask(task)}
                    className="font-bold text-xs text-slate-900 hover:text-[#1456f0] hover:underline cursor-pointer truncate block"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {task.title || "NA"}
                  </span>
                </div>
              </Tooltip>
            ),
          },
          {
            key: "assignee",
            header: "RESPONSIBLE",
            width: "180px",
            minWidth: "180px",
            align: "left",
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
              const responsibleName = task.assignee?.assigneeName || "NA";
              return (
                <Tooltip content={responsibleName}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-slate-800 truncate block cursor-default">
                      {responsibleName}
                    </span>
                  </div>
                </Tooltip>
              );
            },
          }
        );
      } else {
        // "My Tasks": TASK NAME, ASSIGNED BY (STAGE removed from My Tasks)
        baseCols.push(
          {
            key: "title",
            header: "TASK NAME",
            minWidth: "240px",
            align: "left",
            render: (task) => (
              <Tooltip content={task.title || "NA"}>
                <div className="min-w-0 pr-2">
                  <span
                    onClick={() => handleOpenTask(task)}
                    className="font-bold text-xs text-slate-900 hover:text-[#1456f0] hover:underline cursor-pointer truncate block"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {task.title || "NA"}
                  </span>
                </div>
              </Tooltip>
            ),
          },
          {
            key: "creator",
            header: "ASSIGNED BY",
            width: "180px",
            minWidth: "180px",
            align: "left",
            render: (task) => {
              const creatorName = task.creator?.name || "Admin";
              return (
                <Tooltip content={`Assigned by ${creatorName}${task.creator?.role ? ` (${task.creator.role})` : ""}`}>
                  <span className="text-xs font-semibold text-slate-800 truncate block cursor-default">
                    {creatorName}
                  </span>
                </Tooltip>
              );
            },
          }
        );
      }

      // OBSERVERS (client tables)
      baseCols.push({
        key: "observers",
        header: "OBSERVERS",
        width: "180px",
        minWidth: "180px",
        align: "left",
        render: (task) => {
          if (!task.observers || task.observers.length === 0) {
            return <span className="text-xs text-slate-700">NA</span>;
          }
          const displayNames = task.observers.map((o) => o.name).join(", ");
          return (
            <Tooltip content={task.observers.map((o) => `${o.name}${o.role ? ` (${o.role})` : ""}`).join(", ")}>
              <span className="text-xs text-slate-700 truncate block cursor-default">
                {displayNames}
              </span>
            </Tooltip>
          );
        },
      });
    }

    // Common ending columns (DEADLINE omitted in Admin workspace)
    if (!isAdmin) {
      baseCols.push({
        key: "deadline",
        header: "DEADLINE",
        width: "160px",
        minWidth: "160px",
        align: "left",
        render: (task) => (
          <span className="font-mono text-xs text-slate-700 tabular-nums truncate block">
            {task.deadline || "NA"}
          </span>
        ),
      });
    }

    baseCols.push({
      key: "checklists",
        header: "CHECKLIST",
        width: "140px",
        minWidth: "120px",
        align: "left",
        render: (task) => {
          if (!isAdmin && clientTab === "my_tasks") {
            const prog = getPersonTaskProgress(task, currentUserName);
            if (prog.total === 0) return <span className="font-mono text-xs text-slate-700 tabular-nums">NA</span>;
            return (
              <span className="font-mono text-xs text-slate-700 tabular-nums">
                {prog.completed}/{prog.total}
              </span>
            );
          } else {
            // "Tasks by me" or Admin workspace
            const overall = getTaskOverallProgress(task);
            if (overall.totalPeopleCount > 1) {
              const tooltipContent = overall.breakdown
                .map((b) => `${b.person.name}: ${b.completed}/${b.total}${b.isFinished ? " (done)" : ""}`)
                .join(", ");
              return (
                <Tooltip content={tooltipContent}>
                  <span className="font-mono text-xs text-slate-700 tabular-nums cursor-default">
                    {overall.finishedPeopleCount}/{overall.totalPeopleCount} finished
                  </span>
                </Tooltip>
              );
            }
            const prog = getPersonTaskProgress(task);
            if (prog.total === 0) return <span className="font-mono text-xs text-slate-700 tabular-nums">NA</span>;
            return (
              <span className="font-mono text-xs text-slate-700 tabular-nums">
                {prog.completed}/{prog.total}
              </span>
            );
          }
        },
      });

    return baseCols;
  }, [isAdmin, clientTab, taskStages, updateTaskStage]);

  const rowActions: TableRowAction<TaskEntity>[] = useMemo(() => {
    const actions: TableRowAction<TaskEntity>[] = [
      {
        label: clientTab === "tasks_by_me" || isAdmin ? "Edit Task" : "View Details",
        onClick: (task) => handleOpenTask(task),
      },
      {
        label: "Mark Completed",
        onClick: (task) => {
          updateTaskStage(task.id, "Task Completed", "task-stg-completed");
          toast.success(`Task ${task.code} marked completed`);
        },
      },
    ];

    // In My Tasks, no delete option is available; delete only in Tasks by me or Admin
    if (isAdmin || clientTab === "tasks_by_me") {
      actions.push({
        label: "Delete",
        isDanger: true,
        onClick: (task) => {
          if (window.confirm(`Delete task ${task.code}?`)) {
            deleteTask(task.id);
            toast.success("Task deleted");
          }
        },
      });
    }

    return actions;
  }, [isAdmin, clientTab, updateTaskStage, deleteTask]);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7">
        <PageHeader
          title="Tasks"
          subtitle={
            isAdmin
              ? "Corporate operational assignments, cross-organization delegation, and checklists"
              : "Clinical tasks, operational assignments, checklists, and deadline tracking"
          }
        />

        {/* ── PageTopBar with Tabs (My Tasks vs Tasks by me), Workflow Switcher, Search, and New Task ── */}
        <PageTopBar
          modes={
            !isAdmin
              ? [
                  { id: "my_tasks", label: "My Tasks", badge: myTasksCount },
                  { id: "tasks_by_me", label: "Tasks by me", badge: tasksByMeCount },
                ]
              : undefined
          }
          activeMode={clientTab}
          onModeChange={(id) => setClientTab(id as "my_tasks" | "tasks_by_me")}
          leftElement={
            // Workflow switcher only in "Tasks by me" or Admin; hidden in "My Tasks"
            (isAdmin || clientTab === "tasks_by_me") ? (
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
                      {selectedWorkflowId === "all" ? "All Workflows" : activeTaskWorkflow.name}
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWorkflowId("all");
                            setShowWorkflowDropdown(false);
                          }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedWorkflowId === "all" ? "bg-primary/10 text-primary font-semibold" : "text-gray-700 hover:bg-slate-50"
                          }`}
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <span className="truncate">All Workflows</span>
                          {selectedWorkflowId === "all" && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                        </button>
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
              </div>
            ) : undefined
          }
          searchPlaceholder="Search tasks by title, ID, responsible, observer, or project..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          primaryAction={
            (!isAdmin && clientTab === "my_tasks")
              ? undefined
              : {
                  label: "New Task",
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => setShowQuickCreate(true),
                }
          }
        />

        {/* ── Main Viewport: Standard 32px Table ── */}
        <TableComponent<TaskEntity>
          data={filteredTasks}
          columns={columns}
          getRowId={(t) => t.id}
          rowActions={rowActions}
          onRowClick={(task) => handleOpenTask(task)}
          emptyMessage="No tasks found matching your filters."
        />
      </div>

      {/* ── Drawers ── */}
      <TaskQuickCreateDrawer
        isOpen={showQuickCreate}
        onClose={handleCloseDrawer}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        taskToEdit={taskToEdit}
        isAdmin={isAdmin}
        taskStages={taskStages}
        defaultWorkflowName={activeTaskWorkflow.name}
        defaultWorkflowId={activeTaskWorkflow.id}
      />
    </div>
  );
}
