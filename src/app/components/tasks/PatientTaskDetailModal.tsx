import React, { useEffect, useRef } from "react";
import {
  X,
  Star,
  CheckCircle2,
  FileText,
  Download,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  CheckSquare,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { TaskEntity } from "../../../types/task";

export interface PatientTaskDetailModalProps {
  task: TaskEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleChecklistItem: (
    taskId: string,
    checklistId: string,
    itemId: string,
    itemText: string,
    currentCompleted: boolean
  ) => void;
  onToggleComplete: (task: TaskEntity) => void;
  onMessageCareTeam: () => void;
}

export default function PatientTaskDetailModal({
  task,
  isOpen,
  onClose,
  onToggleChecklistItem,
  onToggleComplete,
  onMessageCareTeam,
}: PatientTaskDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape and trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const isCompleted = task.status === "completed";

  // Total checklist items calculation
  const allItems = task.checklists?.flatMap((c) => c.items) || [];
  const completedItems = allItems.filter((it) => it.isCompleted);
  const totalCount = allItems.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-task-title"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[680px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[85vh] max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[90vh] max-sm:rounded-b-none max-sm:rounded-t-2xl"
      >
        {/* ── Sticky Header ── */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs z-10 px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                {task.code}
              </span>
              {task.isImportant && (
                <Tooltip content="Important">
                  <span className="inline-flex items-center cursor-default">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                  </span>
                </Tooltip>
              )}
            </div>
            <h2
              id="patient-task-title"
              className="text-lg font-bold text-slate-900 truncate"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Description */}
          {task.description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Description
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                {task.description}
              </p>
            </div>
          )}

          {/* 2. Details (plain label-value rows, no capsules) */}
          <div className="space-y-2.5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Task Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2 py-0.5">
                <span className="text-slate-400 font-medium">Assigned by:</span>
                <span className="text-slate-800 font-semibold">
                  {task.creator?.name || "Care Team"}
                  {task.creator?.role ? ` (${task.creator.role})` : ""}
                </span>
              </div>

              {task.deadline && (
                <div className="flex items-center justify-between sm:justify-start gap-2 py-0.5">
                  <span className="text-slate-400 font-medium">Due Date:</span>
                  <span className="font-mono tabular-nums text-slate-800 font-semibold">
                    {task.deadline}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between sm:justify-start gap-2 py-0.5">
                <span className="text-slate-400 font-medium">Stage:</span>
                <span className="text-slate-800 font-semibold">
                  {task.stageName || (isCompleted ? "Completed" : "In Progress")}
                </span>
              </div>

              {task.workflowName && (
                <div className="flex items-center justify-between sm:justify-start gap-2 py-0.5">
                  <span className="text-slate-400 font-medium">Workflow:</span>
                  <span className="text-slate-800 font-semibold">
                    {task.workflowName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Checklists */}
          {task.checklists && task.checklists.length > 0 && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {task.checklists.map((chk) => {
                const chkCompleted = chk.items.filter((it) => it.isCompleted).length;
                const chkTotal = chk.items.length;
                const percent = chkTotal > 0 ? Math.round((chkCompleted / chkTotal) * 100) : 0;

                return (
                  <div key={chk.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800">
                        {chk.title}
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-slate-500 font-semibold">
                        {chkCompleted} of {chkTotal} completed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {chkTotal > 0 && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#1E293B] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}

                    {/* Checkable Items */}
                    <div className="space-y-1.5">
                      {chk.items.map((item) => (
                        <label
                          key={item.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            item.isCompleted
                              ? "bg-slate-50/60 border-slate-200 text-slate-400"
                              : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() =>
                              onToggleChecklistItem(
                                task.id,
                                chk.id,
                                item.id,
                                item.text,
                                item.isCompleted
                              )
                            }
                            className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                          />
                          <span
                            className={`text-xs flex-1 ${
                              item.isCompleted
                                ? "line-through text-slate-400"
                                : "font-medium text-slate-800"
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.isImportant && (
                            <Tooltip content="Important item">
                              <span className="inline-flex items-center cursor-default">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0 mt-0.5" />
                              </span>
                            </Tooltip>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. Files */}
          {task.attachments && task.attachments.length > 0 && (
            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Files ({task.attachments.length})
              </h3>
              <div className="space-y-2">
                {task.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums">{att.size}</p>
                      </div>
                    </div>
                    <Tooltip content="Download file">
                      <button
                        type="button"
                        onClick={() => window.alert(`Downloading ${att.name}...`)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Any other items the task carries (Observers / Subtasks) */}
          {task.observers && task.observers.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Observers ({task.observers.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.observers.map((obs) => (
                  <span
                    key={obs.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>{obs.name}</span>
                    {obs.role && (
                      <span className="text-[10px] text-slate-400">({obs.role})</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs z-10 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onMessageCareTeam}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer hover:underline"
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>Message Care Team</span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-400 font-mono tabular-nums hidden sm:inline">
              Updated {task.updatedAt || task.createdAt}
            </span>

            <button
              type="button"
              onClick={() => onToggleComplete(task)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                isCompleted
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  : "bg-[#1E293B] hover:bg-slate-800 text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleted ? "Reopen Task" : "Mark Complete"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

