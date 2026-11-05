import React, { useState, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "../../../lib/tasksStore";
import type { Client } from "../../../lib/clientsStore";
import { TaskEntity } from "../../../types/task";
import { Tooltip } from "../../components/ui/Tooltip";
import PatientTaskDetailModal from "../../components/tasks/PatientTaskDetailModal";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientTasksScreen() {
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;
  const navigate = useNavigate();

  const { tasks, toggleChecklistItem, toggleTaskStatus } = useTasks();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filter tasks that belong to this client or are scoped to the patient portal
  const clientTasks = useMemo(() => {
    if (!activeClient) return [];
    const clientNameLower = (activeClient.name || "").toLowerCase().trim();
    const clientId = (activeClient.id || "").toLowerCase().trim();

    return tasks.filter((t) => {
      // 0. Admin tasks must NEVER appear in the Patient Portal
      if (t.scopeLevel === "admin") return false;

      // 1. Must be a task targeted to a patient/client or portal
      const isClientTargeted =
        t.scopeLevel === "portal" ||
        t.assignee?.scopeLevel === "contact" ||
        Boolean(t.assignee?.clientId) ||
        Boolean(t.assignee?.clientName);

      if (!isClientTargeted) return false;

      // 2. Direct assignee matches active patient
      const assigneeName = (t.assignee?.assigneeName || "").toLowerCase().trim();
      const assigneeClientName = (t.assignee?.clientName || "").toLowerCase().trim();
      const assigneeClientId = (t.assignee?.clientId || "").toLowerCase().trim();

      const matchesAssignee =
        (assigneeClientId && assigneeClientId === clientId) ||
        (assigneeClientName && assigneeClientName.includes(clientNameLower)) ||
        (assigneeName && (assigneeName === clientNameLower || assigneeName.includes(clientNameLower)));

      // 3. Matches anywhere in assignees list
      const matchesInList =
        t.assignees &&
        t.assignees.some((a) => {
          const aId = (a.clientId || "").toLowerCase().trim();
          const aName = (a.clientName || a.assigneeName || "").toLowerCase().trim();
          return (aId && aId === clientId) || (aName && aName.includes(clientNameLower));
        });

      // 4. Portal-scoped task without specific patient assignee is visible to all portal clients
      const isGenericPortal = t.scopeLevel === "portal" && !assigneeClientId && !assigneeClientName;

      return matchesAssignee || matchesInList || isGenericPortal;
    });
  }, [tasks, activeClient]);

  // Tab & search filtering
  const filteredTasks = useMemo(() => {
    return clientTasks.filter((t) => {
      // Status filter
      if (activeTab === "pending" && t.status === "completed") return false;
      if (activeTab === "completed" && t.status !== "completed") return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCode = t.code.toLowerCase().includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      const matchChecklist = t.checklists?.some((c) =>
        c.items.some((it) => it.text.toLowerCase().includes(q))
      );

      return matchTitle || matchCode || matchDesc || matchChecklist;
    });
  }, [clientTasks, activeTab, searchQuery]);

  // Selected task resolved reactively from live store
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = clientTasks.length;
    const completed = clientTasks.filter((t) => t.status === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [clientTasks]);

  const handleToggleItem = (taskId: string, checklistId: string, itemId: string, itemText: string, currentCompleted: boolean) => {
    toggleChecklistItem(taskId, checklistId, itemId);
    if (!currentCompleted) {
      toast.success(`Completed: "${itemText}"`);
    }
  };

  const handleMarkTaskComplete = (task: TaskEntity) => {
    if (task.status === "completed") {
      toggleTaskStatus(task.id, "in_progress");
      toast.info(`Task [${task.code}] reopened`);
    } else {
      toggleTaskStatus(task.id, "completed");
      toast.success(`Great job! Task [${task.code}] marked as completed.`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            My Tasks &amp; Action Items
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Action items, onboarding deliverables, and care protocol checklists assigned to you.
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-800 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono tabular-nums">{stats.pending}</span>
            <span>Action Needed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono tabular-nums">{stats.completed}</span>
            <span>Done</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Action Needed ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Tasks ({stats.total})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, items..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Task Cards List ── */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
            {searchQuery ? "No matching tasks found" : "All Caught Up!"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No tasks matched "${searchQuery}". Clear your search query to view all tasks.`
              : "You have no outstanding tasks at this time. Your care team will assign protocols, questionnaires, or intake items here when needed."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";

            // Total checklist items calculation
            const allItems = task.checklists?.flatMap((c) => c.items) || [];
            const completedItems = allItems.filter((it) => it.isCompleted);

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-4 sm:p-5 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* ── Left: Task Icon + Title & Meta Line ── */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Left: Neutral task icon inside rounded surface */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isCompleted
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                        : "bg-slate-50 border-slate-200/80 text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <CheckSquare className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Title + Important star */}
                    <div className="flex items-center gap-2 min-w-0">
                      <h2
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`text-sm font-bold truncate hover:text-blue-600 cursor-pointer transition-colors ${
                          isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {task.title}
                      </h2>

                      {task.isImportant && (
                        <Tooltip content="Important">
                          <span className="inline-flex items-center cursor-default">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {/* One meta line in plain text (no capsules) */}
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tabular-nums text-slate-600 font-semibold">
                        {task.code}
                      </span>
                      <span>•</span>
                      <span>{task.stageName || (isCompleted ? "Completed" : "Task Created")}</span>
                      {task.deadline && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums">Due: {task.deadline}</span>
                        </>
                      )}
                      {task.creator?.name && (
                        <>
                          <span>•</span>
                          <span>Assigned by: {task.creator.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* ── Right: Checklist Progress & Action Buttons ── */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  {/* Checklist progress as plain text with tooltip */}
                  {allItems.length > 0 && (
                    <Tooltip content="Checklist progress">
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-600 cursor-default px-1">
                        {completedItems.length}/{allItems.length}
                      </span>
                    </Tooltip>
                  )}

                  {/* View Details button (neutral secondary style) */}
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    View details
                  </button>

                  {/* Mark Complete action (primary #1E293B style) */}
                  <button
                    type="button"
                    onClick={() => handleMarkTaskComplete(task)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCompleted
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : "bg-[#1E293B] text-white border-slate-900 hover:bg-slate-800 shadow-2xs"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleted ? "Reopen" : "Mark Complete"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Task Detail Popup ── */}
      <PatientTaskDetailModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        onToggleChecklistItem={handleToggleItem}
        onToggleComplete={handleMarkTaskComplete}
        onMessageCareTeam={() => {
          setSelectedTaskId(null);
          navigate("/patient/messages");
        }}
      />
    </div>
  );
}
