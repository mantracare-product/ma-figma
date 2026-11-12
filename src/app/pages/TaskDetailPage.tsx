import React, { useRef, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  CheckCircle2,
  Star,
  Trash2,
  FileCode,
  AlertTriangle,
  Lock,
  Share2,
  Calendar,
  Clock,
  Eye,
  User,
  Users,
  ExternalLink,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import {
  useTasks,
  getPersonTaskProgress,
  getTaskOverallProgress,
} from "../../lib/tasksStore";
import { TaskEntity, TaskStatus, TaskStudioItem } from "../../types/task";
import { useProcessStore, DEFAULT_TASK_PROCESSES, DEFAULT_ENTITY_PROCESSES, Stage } from "../../lib/useProcessStore";
import { useTeamMembers } from "../../lib/teamStore";
import { useAuth } from "../context/AuthContext";
import ShareTaskDrawer from "../components/tasks/ShareTaskDrawer";
import { CircularProgressRing } from "../components/ui/CircularProgressRing";
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
    toggleStudioItemCompletion,
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

  // Current persona for permission scoping & completion
  const currentUserName = user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta");
  const currentUserId = (user as any)?.id || (isAdmin ? "admin-1" : "usr-lead-physician");

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
      t.responsiblePeople &&
      t.responsiblePeople.some((p) => {
        const pName = (p.name || "").toLowerCase();
        return pName.includes(u) || u.includes(pName) || pName.includes("alistair");
      })
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

  // "for the task that i created show the task edititng drawere only , for the task assigned to me show pages"
  React.useEffect(() => {
    if (task && !isAssignedToUser(task)) {
      navigate(isAdmin ? `/admin/tasks?editTaskId=${task.id}` : `/tasks?editTaskId=${task.id}`, { replace: true });
    }
  }, [task, isAdmin, navigate]);

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

  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [showPeopleBreakdown, setShowPeopleBreakdown] = useState(false);

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

  // 2. Permission Check
  const isAssigned = isAssignedToUser(task);
  const isMyTask = !isAdmin && isAssigned;
  const isCompleted = task.status === "completed";

  // Progress computations
  const myProgress = getPersonTaskProgress(task, currentUserId) || getPersonTaskProgress(task, currentUserName);
  const overallProgress = getTaskOverallProgress(task);

  // Mark item done handler (per-person)
  const handleToggleItemDone = (item: TaskStudioItem) => {
    toggleStudioItemCompletion(task.id, item.id, currentUserId, currentUserName);
    const wasDone = !!(item.completion?.[currentUserId]?.done || item.completion?.[currentUserName]?.done);
    if (!wasDone) {
      toast.success(`Completed "${item.title}"`);
    } else {
      toast.info(`Marked "${item.title}" incomplete`);
    }
  };

  const items = task.studioItems || [];

  return (
    <div className="min-h-screen bg-[#fafafa] pb-16">
      <PageHeader
        title={task.code ? `${task.code}: ${task.title}` : task.title}
        subtitle={
          isMyTask
            ? `Assigned to you • Created ${task.createdAt}`
            : `Workflow: ${task.workflowName || "Clinical & Operational Tasks"} • Created ${task.createdAt}`
        }
      />

      {/* ── Main Viewport: ONE CENTERED COLUMN (No right sidebar anywhere) ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150">
        {/* Above the first block: Back button & Top Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Tasks</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Share & Delete: ONLY in Tasks by me or Admin; NEVER in My Tasks */}
            {!isMyTask && (
              <>
                <button
                  type="button"
                  onClick={() => setShowShareDrawer(true)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Share task"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Share</span>
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
                    className="p-1.5 rounded-xl border border-gray-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            {/* Importance star */}
            <button
              type="button"
              onClick={() => {
                updateTask(task.id, { isImportant: !task.isImportant });
                toast.success(task.isImportant ? "Unmarked important" : "Marked as important");
              }}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                task.isImportant
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-gray-200 bg-white text-slate-400 hover:text-amber-500"
              }`}
              title={task.isImportant ? "High Priority" : "Mark Priority"}
            >
              <Star className={`w-4 h-4 ${task.isImportant ? "fill-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── 1. FIRST BLOCK: "TASK INFO" ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          {/* Header Row: Title, Code, and Important Badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {task.code}
                </span>
                {task.isImportant && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>Important</span>
                  </span>
                )}
                {/* Workflow stage badge (ONLY shown in Tasks by me / Admin; hidden in My Tasks) */}
                {!isMyTask && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1456f0] border border-blue-200/60">
                    {task.stageName || "Task Created"}
                  </span>
                )}
              </div>

              <h1
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {task.title}
              </h1>
            </div>

            {/* Overall status pill */}
            <div className="shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isCompleted
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>In Progress</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
              {task.description}
            </p>
          )}

          {/* Metadata Row: Observers (& Deadline for non-Admin tasks) */}
          <div className={`grid grid-cols-1 ${isAdmin ? "" : "sm:grid-cols-2"} gap-4 pt-1 border-t border-slate-100 text-xs`}>
            {/* Deadline (omitted for Admin tasks) */}
            {!isAdmin && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Deadline
                </span>
                <span className="font-semibold text-slate-800">
                  {task.deadline || "No scheduled deadline"}
                </span>
              </div>
            </div>
            )}

            {/* Observers */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Observers ({task.observers?.length || 0})
                </span>
                <div className="flex items-center gap-1.5 flex-wrap truncate">
                  {task.observers && task.observers.length > 0 ? (
                    task.observers.map((o) => (
                      <span
                        key={o.id}
                        className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md"
                      >
                        {o.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Per-person Progress Summary ── */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircularProgressRing
                  value={isMyTask ? myProgress.completed : overallProgress.finishedPeopleCount}
                  max={isMyTask ? myProgress.total : overallProgress.totalPeopleCount}
                  size={24}
                  strokeWidth={3}
                  indicatorColor={
                    (isMyTask ? myProgress.isFinished : overallProgress.isAllDone)
                      ? "#10b981"
                      : "#1456f0"
                  }
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {isMyTask
                      ? `Your Progress: ${myProgress.completed}/${myProgress.total} Items Completed`
                      : `Overall Completion: ${overallProgress.finishedPeopleCount}/${overallProgress.totalPeopleCount} People Finished`}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isMyTask
                      ? myProgress.isFinished
                        ? "You have completed all items assigned to you"
                        : "Check off your deliverables below as you finish them"
                      : overallProgress.isAllDone
                      ? "All responsible people have completed every deliverable"
                      : "Task completes when all responsible members finish"}
                  </span>
                </div>
              </div>

              {/* In Tasks by me: toggle expandable per-person breakdown */}
              {!isMyTask && overallProgress.breakdown.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowPeopleBreakdown(!showPeopleBreakdown)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#1456f0] hover:underline cursor-pointer"
                >
                  <span>{showPeopleBreakdown ? "Hide Details" : "View Breakdown"}</span>
                  {showPeopleBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Expandable Per-Person Breakdown (Tasks by me) */}
            {!isMyTask && showPeopleBreakdown && (
              <div className="pt-3 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-150">
                {overallProgress.breakdown.map((b) => (
                  <div
                    key={b.person.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[9px]">
                        {b.person.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{b.person.name}</span>
                      {b.person.role && <span className="text-[10px] text-slate-400">({b.person.role})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-600 tabular-nums">
                        {b.completed}/{b.total} items
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.isFinished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.isFinished ? "Done" : `${b.percent}%`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. BELOW IT: TASK STUDIO ITEMS (Line by Line) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2
              className="text-xs font-bold uppercase tracking-wider text-slate-500"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Deliverables & Studio Items ({items.length})
            </h2>
            <span className="text-xs text-slate-400">
              Each member completes their own copy
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const isDoneByMe = !!(
                item.completion?.[currentUserId]?.done ||
                item.completion?.[currentUserName]?.done
              );

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all shadow-xs p-5 space-y-3.5 ${
                    isDoneByMe
                      ? "border-emerald-200/80 bg-emerald-50/20"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                >
                  {/* Item Row Header: Number, Star, Title, and Mark As Done Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5 ${
                          isDoneByMe
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {isDoneByMe ? "✓" : index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.isImportant && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <h3
                            className={`text-sm font-bold leading-snug ${
                              isDoneByMe ? "line-through text-slate-500" : "text-slate-900"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {item.title}
                          </h3>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action: Mark as done / Undo button */}
                    <button
                      type="button"
                      onClick={() => handleToggleItemDone(item)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 ${
                        isDoneByMe
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {isDoneByMe ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Done</span>
                          <span className="text-[10px] opacity-75 ml-0.5">(Undo)</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mark as done</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* ── Resource Rendering ── */}
                  {item.resource && item.resource.value && (
                    <div className="pt-2 border-t border-slate-100">
                      {/* Image Resource */}
                      {item.resource.type === "image" && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1.5 max-w-lg">
                          <img
                            src={item.resource.value}
                            alt={item.title}
                            className="w-full max-h-72 object-contain rounded-lg"
                          />
                        </div>
                      )}

                      {/* Video Resource */}
                      {item.resource.type === "video" && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black max-w-lg">
                          <video
                            src={item.resource.value}
                            controls
                            className="w-full max-h-72 object-contain"
                          />
                        </div>
                      )}

                      {/* URL Resource */}
                      {item.resource.type === "url" && (
                        <a
                          href={item.resource.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs font-semibold text-[#1456f0] hover:bg-blue-100/60 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-md">{item.resource.value}</span>
                        </a>
                      )}

                      {/* File Resource */}
                      {item.resource.type === "file" && (
                        <a
                          href={item.resource.value}
                          download={item.resource.name || "document"}
                          className="inline-flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors max-w-md cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="truncate font-semibold">{item.resource.name || "Download Attachment"}</span>
                            {item.resource.size && (
                              <span className="text-[10px] text-slate-400 font-mono">({item.resource.size})</span>
                            )}
                          </div>
                          <Download className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                        </a>
                      )}

                      {/* HTML Block Resource (Strictly Sandboxed inside Bordered Container) */}
                      {item.resource.type === "html" && (
                        <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
                          <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 text-slate-500" />
                              <span>Sandboxed Custom HTML Block</span>
                            </span>
                            <span className="text-slate-400 font-mono">iframe sandbox</span>
                          </div>
                          <div className="w-full max-h-64 overflow-y-auto bg-white p-1">
                            <iframe
                              srcDoc={item.resource.value}
                              sandbox="allow-same-origin"
                              title={`HTML Block for ${item.title}`}
                              className="w-full h-48 border-0 overflow-auto"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share Task Drawer */}
      <ShareTaskDrawer
        isOpen={showShareDrawer}
        onClose={() => setShowShareDrawer(false)}
        task={task}
      />
    </div>
  );
}
