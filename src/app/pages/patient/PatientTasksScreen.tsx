import React, { useState, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Search,
  FileText,
  Download,
  MessageSquare,
  ArrowRight,
  Star,
  Users,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "../../../lib/tasksStore";
import type { Client } from "../../../lib/clientsStore";
import { TaskEntity, TaskChecklist, TaskChecklistItem } from "../../../types/task";

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
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Filter tasks that belong to this client or are scoped to the patient portal
  const clientTasks = useMemo(() => {
    if (!activeClient) return [];
    const clientNameLower = (activeClient.name || "").toLowerCase().trim();
    const clientId = (activeClient.id || "").toLowerCase().trim();

    return tasks.filter((t) => {
      // 1. Direct assignee matches active patient
      const assigneeName = (t.assignee?.assigneeName || "").toLowerCase().trim();
      const assigneeClientName = (t.assignee?.clientName || "").toLowerCase().trim();
      const assigneeClientId = (t.assignee?.clientId || "").toLowerCase().trim();

      const matchesAssignee =
        (assigneeClientId && assigneeClientId === clientId) ||
        (assigneeClientName && assigneeClientName.includes(clientNameLower)) ||
        (assigneeName && (assigneeName === clientNameLower || assigneeName.includes(clientNameLower)));

      // 2. Matches anywhere in assignees list
      const matchesInList =
        t.assignees &&
        t.assignees.some((a) => {
          const aId = (a.clientId || "").toLowerCase().trim();
          const aName = (a.clientName || a.assigneeName || "").toLowerCase().trim();
          return (aId && aId === clientId) || (aName && aName.includes(clientNameLower));
        });

      // 3. Portal scope tasks
      const isPortalScoped = t.scopeLevel === "portal";

      return matchesAssignee || matchesInList || isPortalScoped;
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

  // Stats calculation
  const stats = useMemo(() => {
    const total = clientTasks.length;
    const completed = clientTasks.filter((t) => t.status === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [clientTasks]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: prev[taskId] !== undefined ? !prev[taskId] : false, // Default was expanded (undefined)
    }));
  };

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-slate-800" />
            <span>My Tasks &amp; Action Items</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Action items, onboarding deliverables, and care protocol checklists assigned to you.
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200/60 rounded-xl text-blue-800 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{stats.pending} Action Needed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-xl text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{stats.completed} Done</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? "No matching tasks found" : "All Caught Up!"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No tasks matched "${searchQuery}". Clear your search query to view all tasks.`
              : "You have no outstanding tasks at this time. Your care team will assign protocols, questionnaires, or intake items here when needed."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isOverdue = task.status === "deferred" || task.stageName === "Task Overdue";
            const isExpanded = expandedTaskIds[task.id] !== false; // Default true

            // Total checklist items calculation
            const allItems = task.checklists?.flatMap((c) => c.items) || [];
            const completedItems = allItems.filter((it) => it.isCompleted);
            const progressPercent = allItems.length > 0 ? Math.round((completedItems.length / allItems.length) * 100) : 0;

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl transition-all shadow-2xs overflow-hidden ${
                  isCompleted
                    ? "border-slate-200 opacity-90"
                    : isOverdue
                    ? "border-amber-200/90 ring-1 ring-amber-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* ── Task Card Header ── */}
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {task.code}
                      </span>

                      {task.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Important</span>
                        </span>
                      )}

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isOverdue
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {task.stageName || (isCompleted ? "Completed" : "In Progress")}
                      </span>

                      {task.deadline && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Due: {task.deadline}</span>
                        </span>
                      )}
                    </div>

                    <h2
                      className={`text-base font-bold transition-all ${
                        isCompleted ? "text-slate-500 line-through" : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </h2>

                    {task.creator?.name && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Assigned by:</span>
                        <strong className="font-semibold text-slate-700">
                          {task.creator.name} {task.creator.role ? `(${task.creator.role})` : ""}
                        </strong>
                      </p>
                    )}
                  </div>

                  {/* Header action controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMarkTaskComplete(task)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isCompleted
                          ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          : "bg-[#1E293B] text-white border-slate-900 hover:bg-slate-800 shadow-2xs"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? "Reopen Task" : "Mark Complete"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleTaskExpanded(task.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={isExpanded ? "Collapse task" : "Expand task"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Task Body (Collapsible) ── */}
                {isExpanded && (
                  <div className="p-5 space-y-5">
                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60">
                        {task.description}
                      </p>
                    )}

                    {/* Checklists & Deliverables */}
                    {task.checklists && task.checklists.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-600" />
                            <span>Action Checklist ({completedItems.length}/{allItems.length} completed)</span>
                          </h4>
                          {allItems.length > 0 && (
                            <span className="text-xs font-mono font-bold text-slate-600">
                              {progressPercent}%
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {allItems.length > 0 && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}

                        {/* Checklist sections */}
                        <div className="space-y-3">
                          {task.checklists.map((chk) => (
                            <div
                              key={chk.id}
                              className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2.5"
                            >
                              <div className="text-xs font-bold text-slate-800">
                                {chk.title}
                              </div>

                              <div className="space-y-1.5">
                                {chk.items.map((item) => (
                                  <label
                                    key={item.id}
                                    className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                                      item.isCompleted
                                        ? "bg-white/60 border-slate-200/60 text-slate-400"
                                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.isCompleted}
                                      onChange={() =>
                                        handleToggleItem(task.id, chk.id, item.id, item.text, item.isCompleted)
                                      }
                                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />

                                    <div className="flex-1 min-w-0">
                                      <span
                                        className={`text-xs block ${
                                          item.isCompleted ? "line-through text-slate-400" : "font-medium text-slate-800"
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                    </div>

                                    {item.isImportant && (
                                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments Section */}
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Attached Documents &amp; Instructions</span>
                        </h4>

                        <div className="flex flex-wrap gap-2">
                          {task.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="inline-flex items-center gap-2 p-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span className="truncate max-w-[200px]">{att.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                              <button
                                type="button"
                                onClick={() => toast.info(`Downloading ${att.name}...`)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer ml-1"
                                title="Download attachment"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Footer: Quick Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/patient/messages")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>Have questions? Message Care Team</span>
                      </button>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Updated {task.updatedAt || task.createdAt}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
