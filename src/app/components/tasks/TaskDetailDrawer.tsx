import React, { useState, useRef, useMemo } from "react";
import {
  CheckSquare,
  Star,
  Clock,
  Repeat,
  Paperclip,
  Plus,
  Trash2,
  X,
  FileText,
  Download,
  Check,
  UserPlus,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  MoreVertical,
  Edit2,
  Users,
  Sparkles,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import {
  TaskEntity,
  TaskStatus,
  TaskChecklist,
  TaskChecklistItem,
  TaskObserver,
  TaskSubtask,
  TaskFileAttachment,
  TaskRecurrenceConfig,
  TaskTimePlanningConfig,
} from "../../../types/task";
import { Stage } from "../../../lib/useProcessStore";
import { useTeamMembers } from "../../../lib/teamStore";
import TaskRecurrenceDrawer from "./TaskRecurrenceDrawer";
import TaskTimePlanningDrawer from "./TaskTimePlanningDrawer";
import { toast } from "sonner";

export interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskEntity | null;
  isAdmin?: boolean;
  isMyTasksView?: boolean;
  taskStages?: Stage[];
  onUpdateTask: (id: string, patch: Partial<TaskEntity>) => void;
  onUpdateStage?: (id: string, stageName: string, stageId?: string) => void;
  onDeleteTask?: (id: string) => void;
  onToggleStatus: (id: string, newStatus: TaskStatus) => void;
  onToggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  onToggleItemImportance: (taskId: string, checklistId: string, itemId: string) => void;
  onAddChecklistItem: (taskId: string, checklistId: string, text: string) => void;
  onDeleteChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  onAddChecklist: (taskId: string, title: string) => void;
  onDeleteChecklist: (taskId: string, checklistId: string) => void;
  onAddObserver: (taskId: string, observer: TaskObserver) => void;
  onRemoveObserver: (taskId: string, observerId: string) => void;
  onAddSubtask: (taskId: string, title: string, assigneeName?: string, deadline?: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  isAdmin = false,
  isMyTasksView = false,
  taskStages = [],
  onUpdateTask,
  onUpdateStage,
  onDeleteTask,
  onToggleStatus,
  onToggleChecklistItem,
  onToggleItemImportance,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onAddChecklist,
  onDeleteChecklist,
  onAddObserver,
  onRemoveObserver,
  onAddSubtask,
  onToggleSubtask,
}: TaskDetailDrawerProps) {
  if (!task) return null;

  const { teamMembers } = useTeamMembers();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || "");
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || "17:00");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<{ [chkId: string]: string }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);

  const [showObserverPicker, setShowObserverPicker] = useState(false);
  const [showRecurrenceDrawer, setShowRecurrenceDrawer] = useState(false);
  const [showTimePlanningDrawer, setShowTimePlanningDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDeadlineDisplay = (dateStr: string, timeStr: string) => {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[parseInt(month, 10) - 1] || month;

      let formattedTime = "";
      if (timeStr) {
        const [h, m] = timeStr.split(":");
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        formattedTime = `, ${hours}:${m} ${ampm}`;
      }
      return `${monthName} ${day}, ${year}${formattedTime}`;
    } catch {
      return `${dateStr} ${timeStr}`.trim();
    }
  };

  const handleSaveBasic = () => {
    const formattedDeadline = deadlineDate
      ? formatDeadlineDisplay(deadlineDate, deadlineTime)
      : task.deadline;

    onUpdateTask(task.id, {
      title: title.trim() || task.title,
      description: description.trim(),
      deadline: formattedDeadline,
      deadlineDate,
      deadlineTime,
    });
    toast.success("Task updated");
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      const newAtt: TaskFileAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        size: sizeStr,
        type: file.type || "application/pdf",
        uploadedAt: "Just now",
      };
      onUpdateTask(task.id, {
        attachments: [...task.attachments, newAtt],
      });
      toast.success(`Attached "${file.name}"`);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    onUpdateTask(task.id, {
      attachments: task.attachments.filter((a) => a.id !== attId),
    });
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title={task.code}
        subtitle={task.title}
        icon={<CheckSquare className="w-5 h-5 text-slate-700" />}
        width="max-w-[580px]"
        zIndex={650}
        headerRight={
          !isMyTasksView && onDeleteTask ? (
            <div className="flex items-center gap-2">
              <Tooltip content="Delete task">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete task ${task.code}?`)) {
                      onDeleteTask(task.id);
                      onClose();
                    }
                  }}
                  className="p-1.5 rounded-xl border border-gray-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBasic}
              className="px-5 py-2 rounded-xl bg-[#1E293B] hover:bg-black text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        }
        bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
      >
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

        {/* ── Stage & Metadata Strip (In Tasks by me: prominent Workflow & Stage card; hidden in My Tasks) ── */}
        {!isAdmin ? (
          !isMyTasksView && (
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Workflow &amp; Stage</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                  Created: {task.createdAt}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Workflow
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-gray-200 rounded-xl font-bold text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{task.workflowName || task.project || "Task Workflow"}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Stage
                  </label>
                  <select
                    value={task.stageName || "Task Created"}
                    onChange={(e) => {
                      const newStageName = e.target.value;
                      const found = taskStages?.find((s) => s.name === newStageName);
                      if (onUpdateStage) {
                        onUpdateStage(task.id, newStageName, found?.id);
                      } else {
                        const normalized = newStageName.toLowerCase();
                        const newStatus: TaskStatus =
                          normalized.includes("completed") || normalized.includes("won")
                            ? "completed"
                            : normalized.includes("overdue") || normalized.includes("lost")
                            ? "deferred"
                            : "in_progress";
                        onUpdateTask(task.id, { stageName: newStageName, stageId: found?.id, status: newStatus });
                      }
                      toast.success(`Stage updated to ${newStageName}`);
                    }}
                    className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-gray-200 rounded-xl p-2 cursor-pointer focus:outline-none"
                  >
                    {(taskStages && taskStages.length > 0 ? taskStages : [
                      { id: "task-stg-created", name: "Task Created" },
                      { id: "task-stg-completed", name: "Task Completed" },
                      { id: "task-stg-overdue", name: "Task Overdue" },
                    ]).map((stg) => (
                      <option key={stg.id} value={stg.name}>
                        {stg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-3 px-4 shadow-xs flex items-center justify-between text-xs">
            <span className="text-xs font-semibold text-slate-600">
              Corporate Administrative Task
            </span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              Created: {task.createdAt}
            </span>
          </div>
        )}

        {/* ── Basic Info Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Task Title</span>
              <InfoTooltip content="Display name of the task" />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>Description</span>
              <InfoTooltip content="Task instructions and contextual guidelines" />
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none leading-relaxed"
            />
          </div>

          {/* Mark as Important Setting Toggle (Hidden in My Tasks view) */}
          {!isMyTasksView && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-gray-200/80 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${task.isImportant ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Mark as Important</span>
                  <span className="text-[11px] text-slate-500">Flags this task with high urgency priority</span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={task.isImportant}
                onClick={() => {
                  onUpdateTask(task.id, { isImportant: !task.isImportant });
                  toast.success(task.isImportant ? "Unmarked as important" : "Marked as important");
                }}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  task.isImportant ? "bg-[#1E293B]" : "bg-gray-200"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    task.isImportant ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Assignees & Creator Details */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                <span>{isAdmin ? "Target Organization & Role" : "Responsible Assignee(s)"}</span>
                <InfoTooltip content="Corporate organization and role or team member responsible for this task" />
              </label>

              {isAdmin ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">
                    {task.assignee.orgName || "Demo Mantra Care"}
                  </p>
                  <p className="text-xs font-medium text-slate-700">
                    Role: {task.assignee.roleName || task.assignee.assigneeName}
                  </p>
                  {task.assignee.adminScopeName && (
                    <p className="text-[11px] text-slate-500">
                      Scope: {task.assignee.adminScopeName}
                    </p>
                  )}
                </div>
              ) : task.assignees && task.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {task.assignees.map((a, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-gray-200 rounded text-xs font-semibold text-slate-800"
                    >
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{a.assigneeName}</span>
                      {a.roleName && <span className="text-[10px] text-slate-400 font-normal">({a.roleName})</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-900">{task.assignee.assigneeName}</p>
                  {task.assignee.roleName && (
                    <p className="text-[11px] text-slate-500">{task.assignee.roleName}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                <span>Owner / Creator</span>
                <InfoTooltip content="Account that initiated and authored this task" />
              </label>
              <p className="text-xs font-bold text-slate-900">{task.creator.name}</p>
              <p className="text-[11px] text-slate-500">{task.creator.role || "Administrator"}</p>
            </div>
          </div>

          {/* Deadline Date & Time */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Deadline (Date & Time)</span>
              <InfoTooltip content="Target calendar date and clock time for task completion" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
              />
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-gray-200 rounded-xl text-slate-900 cursor-pointer"
              />
            </div>
            {task.deadline && (
              <p className="text-[11px] text-slate-500 font-mono">
                Current: {task.deadline}
              </p>
            )}
          </div>
        </div>

        {/* ── Checklists Card with Hamburger Menu ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <span>Checklists ({task.checklists.length})</span>
                <InfoTooltip content="Actionable checklist items with options to mark important, edit, or delete" />
              </h3>
              {/* Hide completed items toggle */}
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-slate-900"
                />
                <span>Hide completed</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => onAddChecklist(task.id, `Checklist ${task.checklists.length + 1}`)}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Checklist</span>
            </button>
          </div>

          {task.checklists.map((chk) => {
            const visibleItems = hideCompleted ? chk.items.filter((it) => !it.isCompleted) : chk.items;
            const completedCount = chk.items.filter((it) => it.isCompleted).length;

            return (
              <div key={chk.id} className="p-3.5 bg-slate-50 rounded-xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{chk.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                      ({completedCount}/{chk.items.length})
                    </span>
                  </div>
                  {task.checklists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteChecklist(task.id, chk.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {visibleItems.map((it) => (
                    <div
                      key={it.id}
                      className={`relative flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-colors ${
                        it.isCompleted ? "bg-slate-100/70 border-slate-200/50 opacity-70" : "bg-white border-gray-200/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={it.isCompleted}
                          onChange={() => onToggleChecklistItem(task.id, chk.id, it.id)}
                          className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                        />
                        {it.isImportant && (
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                        )}

                        {editingItemId === it.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingItemText.trim()) {
                                    onDeleteChecklistItem(task.id, chk.id, it.id);
                                    onAddChecklistItem(task.id, chk.id, editingItemText.trim());
                                    setEditingItemId(null);
                                  }
                                }
                                if (e.key === "Escape") setEditingItemId(null);
                              }}
                              className="flex-1 text-xs p-1 bg-slate-50 border border-gray-200 rounded text-slate-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingItemText.trim()) {
                                  onDeleteChecklistItem(task.id, chk.id, it.id);
                                  onAddChecklistItem(task.id, chk.id, editingItemText.trim());
                                  setEditingItemId(null);
                                }
                              }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className={`text-slate-800 font-medium truncate ${it.isCompleted ? "line-through text-slate-400" : ""}`}>
                            {it.text}
                          </span>
                        )}
                      </div>

                      {/* Hamburger Menu on Item */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveItemMenuId(activeItemMenuId === it.id ? null : it.id)
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                          title="Item Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeItemMenuId === it.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveItemMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 text-xs animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleItemImportance(task.id, chk.id, it.id);
                                  setActiveItemMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Star className={`w-3.5 h-3.5 ${it.isImportant ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                                <span>{it.isImportant ? "Unmark Important" : "Mark as Important"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(it.id);
                                  setEditingItemText(it.text);
                                  setActiveItemMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Item Text</span>
                              </button>

                              <div className="my-1 border-t border-gray-100" />

                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteChecklistItem(task.id, chk.id, it.id);
                                  setActiveItemMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 flex items-center gap-2 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete Item</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Item row */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newItemTexts[chk.id] || ""}
                    onChange={(e) => setNewItemTexts((prev) => ({ ...prev, [chk.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const t = newItemTexts[chk.id]?.trim();
                        if (t) {
                          onAddChecklistItem(task.id, chk.id, t);
                          setNewItemTexts((prev) => ({ ...prev, [chk.id]: "" }));
                        }
                      }
                    }}
                    placeholder="Add item to checklist..."
                    className="flex-1 text-xs p-2 bg-white border border-gray-200 rounded-lg text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = newItemTexts[chk.id]?.trim();
                      if (t) {
                        onAddChecklistItem(task.id, chk.id, t);
                        setNewItemTexts((prev) => ({ ...prev, [chk.id]: "" }));
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium px-2 py-1"
                  >
                    + Add Item
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Observers Card (Client tasks only; removed in admin and in my_tasks view) ── */}
        {!isAdmin && !isMyTasksView && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <span>Observers ({task.observers.length})</span>
                <InfoTooltip content="Users who can monitor progress and receive updates without direct assignment" />
              </h3>
              <button
                type="button"
                onClick={() => setShowObserverPicker((prev) => !prev)}
                className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Observer</span>
              </button>
            </div>

            {showObserverPicker && (
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-700 block">Select Team Member to Observe:</span>
                <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                  {teamMembers
                    .filter((m) => !task.observers.some((o) => o.name === m.name))
                    .map((m) => (
                      <div key={m.id} className="p-2 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-500">{m.role}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onAddObserver(task.id, { id: String(m.id), name: m.name, role: m.role });
                            setShowObserverPicker(false);
                            toast.success(`Added ${m.name} as observer`);
                          }}
                          className="text-xs font-bold text-slate-700 px-2 py-1 rounded bg-white border border-gray-200 cursor-pointer hover:bg-slate-100"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {task.observers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No observers added.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {task.observers.map((obs) => (
                  <div
                    key={obs.id}
                    className="flex items-center gap-2 p-1.5 px-2.5 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-800">{obs.name}</span>
                    {obs.role && <span className="text-[10px] text-slate-400">({obs.role})</span>}
                    <button
                      type="button"
                      onClick={() => onRemoveObserver(task.id, obs.id)}
                      className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Files Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <span>Files ({task.attachments.length})</span>
              <InfoTooltip content="Attached assets, protocols, and documentation" />
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>+ Add File</span>
            </button>
          </div>

          {task.attachments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No files attached.</p>
          ) : (
            <div className="space-y-2">
              {task.attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{att.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono tabular-nums">{att.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toast.info(`Downloading ${att.name}`)}
                      className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recurrence & Time Planning Links (hidden in my_tasks view) ── */}
        {!isMyTasksView && (
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <span>Planning & Automation</span>
                <InfoTooltip content="Configure recurring cadence and duration rules" />
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRecurrenceDrawer(true)}
                className="p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-slate-600" />
                  <span>Repeat Task</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {task.recurrence?.enabled ? "Configured" : "None"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowTimePlanningDrawer(true)}
                className="p-3 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <span>Time Planning</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {task.timePlanning?.durationDays ? `${task.timePlanning.durationDays}d` : "None"}
                </span>
              </button>
            </div>
          </div>
        )}
      </DrawerShell>

      {/* Recurrence Sub-Drawer */}
      <TaskRecurrenceDrawer
        isOpen={showRecurrenceDrawer}
        onClose={() => setShowRecurrenceDrawer(false)}
        config={task.recurrence}
        onSave={(cfg) => {
          onUpdateTask(task.id, { recurrence: cfg });
          toast.success("Recurrence schedule applied");
        }}
      />

      {/* Time Planning Sub-Drawer */}
      <TaskTimePlanningDrawer
        isOpen={showTimePlanningDrawer}
        onClose={() => setShowTimePlanningDrawer(false)}
        config={task.timePlanning}
        onSave={(cfg) => {
          onUpdateTask(task.id, { timePlanning: cfg });
          toast.success("Time planning applied");
        }}
      />
    </>
  );
}
