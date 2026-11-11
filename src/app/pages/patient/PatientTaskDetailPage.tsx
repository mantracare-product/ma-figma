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
  Calendar,
  ExternalLink,
  FileCode,
  Check,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  useTasks,
  getPersonTaskProgress,
} from "../../../lib/tasksStore";
import type { Client } from "../../../lib/clientsStore";
import { TaskEntity, TaskStudioItem } from "../../../types/task";
import { CircularProgressRing } from "../../components/ui/CircularProgressRing";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  const { tasks, toggleStudioItemCompletion } = useTasks();

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

    const matchesResponsible =
      task.responsiblePeople &&
      task.responsiblePeople.some((p) => {
        const pId = (p.id || "").toLowerCase().trim();
        const pName = (p.name || "").toLowerCase().trim();
        return (pId && pId === clientId) || (pName && pName.includes(clientNameLower));
      });

    const isGenericPortal = task.scopeLevel === "portal" && !assigneeClientId && !assigneeClientName;

    return matchesAssignee || matchesInList || matchesResponsible || isGenericPortal;
  }, [task, activeClient]);

  // Not Found State
  if (!task || !isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center shadow-xs space-y-4">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Tasks</span>
          </button>
        </div>
      </div>
    );
  }

  // Sanitize title: remove admin bracket tags, never display TSK-* codes
  const cleanTitle = task.title.replace(/^\[[^\]]+\]\s*/, "").replace(/^TSK-\d+:\s*/i, "");
  const patientId = activeClient?.id || "CL-001";
  const patientName = activeClient?.name || "Patient";

  // Person-specific progress
  const progress = getPersonTaskProgress(task, patientId) || getPersonTaskProgress(task, patientName);
  const items = task.studioItems || [];

  const handleToggleItemDone = (item: TaskStudioItem) => {
    toggleStudioItemCompletion(task.id, item.id, patientId, patientName);
    const wasDone = !!(item.completion?.[patientId]?.done || item.completion?.[patientName]?.done);
    if (!wasDone) {
      toast.success(`Completed "${item.title}"`);
    } else {
      toast.info(`Marked "${item.title}" incomplete`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-in fade-in duration-150">
      {/* ── Above the first block: Back button ── */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => navigate("/patient/tasks")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to My Tasks</span>
        </button>

        {task.isImportant && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>Priority Care</span>
          </span>
        )}
      </div>

      {/* ── 1. FIRST BLOCK: "TASK INFO" ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {cleanTitle}
            </h1>
            <p className="text-xs text-slate-500">
              Assigned by your clinical care team • {task.createdAt}
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            <CircularProgressRing
              value={progress.completed}
              max={progress.total}
              size={36}
              strokeWidth={3.5}
              indicatorColor={progress.isFinished ? "#10b981" : "#1456f0"}
            />
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/70 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {task.description}
          </div>
        )}

        {/* Task Details Strip */}
        <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-slate-100 text-xs text-slate-600">
          {task.deadline && (
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Due: {task.deadline}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              {progress.completed}/{progress.total} items completed ({progress.percent}%)
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. BELOW IT: ITEMS LINE BY LINE ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2
            className="text-xs font-bold uppercase tracking-wider text-slate-500"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Your Deliverables ({items.length})
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Check off each item as completed
          </span>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const isDone = !!(
              item.completion?.[patientId]?.done ||
              item.completion?.[patientName]?.done
            );

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs p-5 space-y-3.5 ${
                  isDone
                    ? "border-emerald-200/80 bg-emerald-50/20"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                {/* Item Row Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-50 text-blue-700 border border-blue-200/70"
                      }`}
                    >
                      {isDone ? "✓" : index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {item.isImportant && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <h3
                          className={`text-sm font-bold leading-snug ${
                            isDone ? "line-through text-slate-400" : "text-slate-900"
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

                  {/* Mark as Done Button (Patient Portal Styling) */}
                  <button
                    type="button"
                    onClick={() => handleToggleItemDone(item)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 ${
                      isDone
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {isDone ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Completed</span>
                        <span className="text-[10px] opacity-75 font-normal">(Undo)</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span>Mark as done</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Resource Rendering */}
                {item.resource && item.resource.value && (
                  <div className="pt-2 border-t border-slate-100">
                    {/* Image */}
                    {item.resource.type === "image" && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-1.5 max-w-md">
                        <img
                          src={item.resource.value}
                          alt={item.title}
                          className="w-full max-h-72 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Video */}
                    {item.resource.type === "video" && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black max-w-md">
                        <video
                          src={item.resource.value}
                          controls
                          className="w-full max-h-72 object-contain"
                        />
                      </div>
                    )}

                    {/* URL */}
                    {item.resource.type === "url" && (
                      <a
                        href={item.resource.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate max-w-sm">{item.resource.value}</span>
                      </a>
                    )}

                    {/* File */}
                    {item.resource.type === "file" && (
                      <a
                        href={item.resource.value}
                        download={item.resource.name || "document"}
                        className="inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors max-w-md cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">{item.resource.name || "Download Document"}</span>
                          {item.resource.size && (
                            <span className="text-[10px] text-slate-400 font-mono">({item.resource.size})</span>
                          )}
                        </div>
                        <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </a>
                    )}

                    {/* HTML Block (Sandboxed in Bordered Container) */}
                    {item.resource.type === "html" && (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>Clinical Instructions & Protocol</span>
                          </span>
                        </div>
                        <div className="w-full max-h-60 overflow-y-auto bg-white p-1">
                          <iframe
                            srcDoc={item.resource.value}
                            sandbox="allow-same-origin"
                            title={`Protocol for ${item.title}`}
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
  );
}
