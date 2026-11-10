import React, { useMemo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Star,
  FileText,
  Download,
  AlertTriangle,
  Lock,
  User,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "../../../lib/tasksStore";
import type { Client } from "../../../lib/clientsStore";
import { TaskEntity } from "../../../types/task";
import { Tooltip } from "../../components/ui/Tooltip";
import { CircularProgressRing } from "../../components/ui/CircularProgressRing";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  const { tasks, toggleChecklistItem, toggleTaskStatus } = useTasks();

  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId) || null;
  }, [taskId, tasks]);

  // Scoping & Patient Security Check
  const isAuthorized = useMemo(() => {
    if (!task) return false;
    // 1. Admin tasks must NEVER appear or be accessible in patient portal
    if (task.scopeLevel === "admin") return false;

    // 2. If no active client profile loaded, portal access is restricted
    if (!activeClient) return false;

    const clientNameLower = (activeClient.name || "").toLowerCase().trim();
    const clientId = (activeClient.id || "").toLowerCase().trim();

    const isClientTargeted =
      task.scopeLevel === "portal" ||
      task.assignee?.scopeLevel === "contact" ||
      Boolean(task.assignee?.clientId) ||
      Boolean(task.assignee?.clientName);

    if (!isClientTargeted) return false;

    const assigneeName = (task.assignee?.assigneeName || "").toLowerCase().trim();
    const assigneeClientName = (task.assignee?.clientName || "").toLowerCase().trim();
    const assigneeClientId = (task.assignee?.clientId || "").toLowerCase().trim();

    const matchesAssignee =
      (assigneeClientId && assigneeClientId === clientId) ||
      (assigneeClientName && assigneeClientName.includes(clientNameLower)) ||
      (assigneeName && (assigneeName === clientNameLower || assigneeName.includes(clientNameLower)));

    const matchesInList =
      task.assignees &&
      task.assignees.some((a) => {
        const aId = (a.clientId || "").toLowerCase().trim();
        const aName = (a.clientName || a.assigneeName || "").toLowerCase().trim();
        return (aId && aId === clientId) || (aName && aName.includes(clientNameLower));
      });

    const isGenericPortal = task.scopeLevel === "portal" && !assigneeClientId && !assigneeClientName;

    return matchesAssignee || matchesInList || isGenericPortal;
  }, [task, activeClient]);

  // Not Found State
  if (!task || !isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Task Not Available
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              This task could not be found or you do not have permission to view it in the patient portal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/patient/tasks")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Tasks</span>
          </button>
        </div>
      </div>
    );
  }

  // Sanitize title: remove admin bracket tags, never display TSK-* codes
  const cleanTitle = task.title.replace(/^\[[^\]]+\]\s*/, "");
  const isCompleted = task.status === "completed";

  // Checklists calculations
  const allItems = task.checklists?.flatMap((c) => c.items) || [];
  const completedItems = allItems.filter((it) => it.isCompleted);
  const totalCount = allItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedItems.length / totalCount) * 100) : 0;

  // Mark complete blocked if unfinished checklist items exist
  const hasChecklists = totalCount > 0;
  const hasUncompleted = allItems.some((it) => !it.isCompleted);
  const isCompleteBlocked = !isCompleted && hasChecklists && hasUncompleted;

  const handleToggleItem = (checklistId: string, itemId: string, itemText: string, currentVal: boolean) => {
    toggleChecklistItem(task.id, checklistId, itemId);
    if (!currentVal) {
      toast.success(`Completed "${itemText}"`);
    }
  };

  const handleToggleComplete = () => {
    if (isCompleteBlocked) {
      toast.error("Please complete all checklist items before marking this task complete.");
      return;
    }
    const nextStatus = isCompleted ? "in_progress" : "completed";
    toggleTaskStatus(task.id, nextStatus);
    toast.success(isCompleted ? "Task reopened" : "Task marked completed! Great job!");
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* ── Navigation Strip ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/patient/tasks")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Back to My Tasks</span>
        </button>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isCompleted
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              : "bg-blue-50 text-blue-700 border border-blue-200/80"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isCompleted ? "Completed" : "Action Required"}</span>
        </span>
      </div>

      {/* ── Sandboxed HTML Content Container (if created as page) ── */}
      {task.isPage && task.htmlContent ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Care Instructions Document
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Interactive Guide
            </span>
          </div>
          {/* Strict bounded container with internal scroll only */}
          <div className="w-full h-[600px] relative overflow-hidden bg-white">
            <iframe
              srcDoc={task.htmlContent}
              sandbox="allow-same-origin"
              title="Patient Task Care Document"
              className="w-full h-full border-0 overflow-auto"
              style={{ display: "block" }}
            />
          </div>
        </div>
      ) : null}

      {/* ── Main Task Card ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
        <div className="space-y-2">
          <h1
            className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {cleanTitle}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {task.deadline && (
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Due: {task.deadline}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Assigned by: {task.creator?.name || "Care Team"}</span>
            </div>
          </div>
        </div>

        {/* Task Description */}
        {task.description && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {task.description}
          </div>
        )}

        {/* ── Checklist Deliverables ── */}
        {allItems.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Deliverables &amp; Checklist Items
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  ({completedItems.length}/{totalCount})
                </span>
              </div>
              <CircularProgressRing value={progressPercent} size={32} strokeWidth={3} />
            </div>

            <div className="space-y-2">
              {(task.checklists || []).map((chk) => (
                <div key={chk.id} className="space-y-2">
                  {chk.items.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => handleToggleItem(chk.id, it.id, it.text, it.isCompleted)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        it.isCompleted
                          ? "bg-slate-50 border-slate-200/70 opacity-70"
                          : "bg-white border-gray-200 hover:border-slate-400 shadow-2xs"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={it.isCompleted}
                        onChange={() => {}}
                        className="w-4 h-4 mt-0.5 rounded text-slate-900 cursor-pointer pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-semibold block ${
                            it.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                          }`}
                        >
                          {it.text}
                        </span>
                      </div>
                      {it.isImportant && (
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Attached Documents ── */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Attached Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{att.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{att.size}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info(`Downloading ${att.name}`)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer Complete Action ── */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {hasChecklists && hasUncompleted
              ? "Complete all checklist items to mark this task complete."
              : "All action items completed. You may finalize this task."}
          </p>

          {isCompleteBlocked ? (
            <Tooltip content="Complete all checklist items to mark this task complete">
              <span className="inline-block cursor-not-allowed">
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[#1E293B] text-white opacity-40 cursor-not-allowed pointer-events-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
              </span>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isCompleted
                  ? "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  : "bg-[#1E293B] text-white hover:bg-slate-800 shadow-2xs"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? "Reopen Task" : "Mark Complete"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
