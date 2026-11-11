import React, { useState, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  Search,
  Star,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks, getPersonTaskProgress } from "../../../lib/tasksStore";
import type { Client } from "../../../lib/clientsStore";
import { TaskEntity } from "../../../types/task";
import { CircularProgressRing } from "../../components/ui/CircularProgressRing";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientTasksScreen() {
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;
  const navigate = useNavigate();

  const { tasks } = useTasks();

  const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const patientId = activeClient?.id || "CL-001";
  const patientName = activeClient?.name || "Patient";

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

      // 4. Matches responsible people
      const matchesResponsible =
        t.responsiblePeople &&
        t.responsiblePeople.some((p) => {
          const pId = (p.id || "").toLowerCase().trim();
          const pName = (p.name || "").toLowerCase().trim();
          return (pId && pId === clientId) || (pName && pName.includes(clientNameLower));
        });

      // 5. Portal-scoped task without specific patient assignee
      const isGenericPortal = t.scopeLevel === "portal" && !assigneeClientId && !assigneeClientName;

      return matchesAssignee || matchesInList || matchesResponsible || isGenericPortal;
    });
  }, [tasks, activeClient]);

  // Tab & search filtering
  const filteredTasks = useMemo(() => {
    return clientTasks.filter((t) => {
      const prog = getPersonTaskProgress(t, patientId) || getPersonTaskProgress(t, patientName);
      const isFinished = prog.isFinished || t.status === "completed";

      // Status filter
      if (activeTab === "pending" && isFinished) return false;
      if (activeTab === "completed" && !isFinished) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cleanTitle = t.title.replace(/^\[[^\]]+\]\s*/, "").replace(/^TSK-\d+:\s*/i, "").toLowerCase();
      const matchTitle = cleanTitle.includes(q);
      const matchDesc = (t.description || "").toLowerCase().includes(q);
      const matchItems = t.studioItems?.some((si) => si.title.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchItems;
    });
  }, [clientTasks, activeTab, searchQuery, patientId, patientName]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = clientTasks.length;
    let completed = 0;
    clientTasks.forEach((t) => {
      const prog = getPersonTaskProgress(t, patientId) || getPersonTaskProgress(t, patientName);
      if (prog.isFinished || t.status === "completed") completed++;
    });
    const pending = total - completed;
    return { total, completed, pending };
  }, [clientTasks, patientId, patientName]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            My Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Clinical protocols, questionnaires, and deliverables assigned to your care journey
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200/60 rounded-2xl text-blue-800 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono tabular-nums">{stats.pending}</span>
            <span>Action Needed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-2xl text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono tabular-nums">{stats.completed}</span>
            <span>Done</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher & Search Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Action Needed ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Completed ({stats.completed})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
            style={{ fontFamily: "Outfit, sans-serif" }}
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
            placeholder="Search deliverables..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Tasks Rows List (Same style as 6a) ── */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
            {searchQuery ? "No matching tasks found" : "All Caught Up!"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No tasks matched "${searchQuery}". Clear your search query to view all tasks.`
              : "You have no outstanding tasks in this category. Your care team will assign protocols and intake items here when needed."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredTasks.map((task) => {
            const cleanTitle = task.title.replace(/^\[[^\]]+\]\s*/, "").replace(/^TSK-\d+:\s*/i, "");
            const prog = getPersonTaskProgress(task, patientId) || getPersonTaskProgress(task, patientName);
            const isDone = prog.isFinished || task.status === "completed";

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/patient/tasks/${task.id}`)}
                className="py-4 px-4 sm:px-5 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Left: Progress Ring + Star + Title & Due Date */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="shrink-0 flex items-center">
                    <CircularProgressRing
                      value={prog.completed}
                      max={prog.total}
                      size={26}
                      strokeWidth={3}
                      indicatorColor={isDone ? "#10b981" : "#1456f0"}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {task.isImportant && (
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                      <span
                        className={`text-sm font-bold truncate transition-colors ${
                          isDone
                            ? "line-through text-slate-400"
                            : "text-slate-900 group-hover:text-blue-600"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {cleanTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                      {task.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{task.deadline}</span>
                        </span>
                      )}
                      {prog.total > 0 && (
                        <span>
                          · {prog.completed}/{prog.total} done
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status chip & Arrow */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isDone
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                        : "bg-blue-50 text-blue-700 border border-blue-200/80"
                    }`}
                  >
                    {isDone ? "Completed" : "Action Needed"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
