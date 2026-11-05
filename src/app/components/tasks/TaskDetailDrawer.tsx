import React, { useState, useRef } from "react";
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
import TaskRecurrenceDrawer from "./TaskRecurrenceDrawer";
import TaskTimePlanningDrawer from "./TaskTimePlanningDrawer";
import { toast } from "sonner";

export interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskEntity | null;
  isAdmin?: boolean;
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

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  deferred: "Deferred",
};

export default function TaskDetailDrawer({
  isOpen,
  onClose,
  task,
  isAdmin = false,
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

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadline, setDeadline] = useState(task.deadline || "");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newItemTexts, setNewItemTexts] = useState<{ [chkId: string]: string }>({});
  const [showObserverPicker, setShowObserverPicker] = useState(false);
  const [showRecurrenceDrawer, setShowRecurrenceDrawer] = useState(false);
  const [showTimePlanningDrawer, setShowTimePlanningDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveBasic = () => {
    onUpdateTask(task.id, {
      title: title.trim() || task.title,
      description: description.trim(),
      deadline: deadline.trim() || undefined,
    });
    toast.success("Task updated");
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

  const handleCreateSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle.trim(), task.assignee.assigneeName, "Next 3 days");
    setNewSubtaskTitle("");
    toast.success("Subtask added");
  };

  const CANDIDATE_OBSERVERS: TaskObserver[] = [
    { id: "usr-doc-2", name: "Dr. Rachel Reynolds", role: "Clinical Director" },
    { id: "usr-coord-1", name: "Elena Rostova", role: "Care Coordinator" },
    { id: "usr-bill-1", name: "David Miller", role: "Billing Specialist" },
    { id: "usr-pt-1", name: "Marcus Vance", role: "Therapy Tech" },
  ];

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
          <div className="flex items-center gap-2">
            {/* Important Star Toggle */}
            <Tooltip content={task.isImportant ? "Marked as Important" : "Mark as Important"}>
              <button
                type="button"
                onClick={() => onUpdateTask(task.id, { isImportant: !task.isImportant })}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  task.isImportant
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "border-gray-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Star className={`w-4 h-4 ${task.isImportant ? "fill-amber-500 text-amber-500" : ""}`} />
              </button>
            </Tooltip>

            {onDeleteTask && (
              <Tooltip content="Delete task">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete task ${task.code}?`)) {
                      onDeleteTask(task.id);
                      onClose();
                    }
                  }}
                  className="p-1.5 rounded-lg border border-gray-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}

            <button
              type="button"
              onClick={handleSaveBasic}
              className="px-4 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        }
        bodyClassName="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50"
      >
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

        {/* ── Stage & Metadata Strip (Workflow Stages, Strictly Plain Text / Neutral Icons, NO Capsules) ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Stage:</span>
            <select
              value={task.stageName || "Task Created"}
              onChange={(e) => {
                const newStageName = e.target.value;
                const found = taskStages?.find((s) => s.name === newStageName);
                if (onUpdateStage) {
                  onUpdateStage(task.id, newStageName, found?.id);
                } else {
                  const normalized = newStageName.toLowerCase();
                  const newStatus: TaskStatus = normalized.includes("completed") || normalized.includes("won")
                    ? "completed"
                    : normalized.includes("overdue") || normalized.includes("lost")
                    ? "deferred"
                    : "in_progress";
                  onUpdateTask(task.id, { stageName: newStageName, stageId: found?.id, status: newStatus });
                }
                toast.success(`Stage updated to ${newStageName}`);
              }}
              className="text-xs font-bold text-slate-900 bg-slate-50 border border-gray-200 rounded-lg p-1.5 px-2.5 cursor-pointer focus:outline-none"
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

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono tabular-nums block">
              Created: {task.createdAt}
            </span>
          </div>
        </div>

        {/* ── Basic Info Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Task Title</label>
              <InfoTooltip content="Display name of the task" />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <InfoTooltip content="Task instructions and contextual guidelines" />
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]/15 focus:border-[#1456f0] text-slate-900 resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Assignee
              </span>
              <p className="text-xs font-bold text-slate-900">{task.assignee.assigneeName}</p>
              {isAdmin && task.assignee.adminScopeName && (
                <p className="text-[11px] text-slate-500">{task.assignee.adminScopeName}</p>
              )}
              {isAdmin && (task.assignee.orgName || task.assignee.roleName) && (
                <p className="text-[11px] text-slate-500">
                  {[task.assignee.orgName, task.assignee.roleName].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Owner / Creator
              </span>
              <p className="text-xs font-bold text-slate-900">{task.creator.name}</p>
              <p className="text-[11px] text-slate-500">{task.creator.role || "Administrator"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Project
              </span>
              <p className="text-xs font-semibold text-slate-800">{task.project || "General Operations"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Deadline
              </span>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs p-1.5 bg-slate-50 border border-gray-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* ── Checklists Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Checklists ({task.checklists.length})
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
                      className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-colors ${
                        it.isCompleted ? "bg-slate-100/70 border-slate-200/50 opacity-70" : "bg-white border-gray-200/70"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={it.isCompleted}
                          onChange={() => onToggleChecklistItem(task.id, chk.id, it.id)}
                          className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                        />
                        <Tooltip content={it.isImportant ? "Important checklist item" : "Mark as important"}>
                          <button
                            type="button"
                            onClick={() => onToggleItemImportance(task.id, chk.id, it.id)}
                            className="p-0.5 text-slate-400 hover:text-amber-500 cursor-pointer"
                          >
                            <Star className={`w-3.5 h-3.5 ${it.isImportant ? "fill-amber-500 text-amber-500" : ""}`} />
                          </button>
                        </Tooltip>
                        <span className={`text-slate-800 font-medium ${it.isCompleted ? "line-through text-slate-400" : ""}`}>
                          {it.text}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteChecklistItem(task.id, chk.id, it.id)}
                        className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
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

        {/* ── Subtasks Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Subtasks ({task.subtasks.length})
            </h3>
            <InfoTooltip content="Parent and child task hierarchy" />
          </div>

          {task.subtasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No subtasks created for this parent task.</p>
          ) : (
            <div className="space-y-1.5">
              {task.subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    sub.isCompleted ? "bg-slate-100/60 border-slate-200/50 opacity-70" : "bg-slate-50 border-gray-200/70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={sub.isCompleted}
                      onChange={() => onToggleSubtask(task.id, sub.id)}
                      className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                    />
                    <span className={`font-semibold text-slate-800 ${sub.isCompleted ? "line-through text-slate-400" : ""}`}>
                      {sub.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {sub.assigneeName && <span>👤 {sub.assigneeName}</span>}
                    {sub.deadline && <span className="font-mono">{sub.deadline}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Subtask */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSubtask();
                }
              }}
              placeholder="Create subtask under this task..."
              className="flex-1 text-xs p-2 bg-slate-50 border border-gray-200 rounded-lg text-slate-900"
            />
            <button
              type="button"
              onClick={handleCreateSubtask}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium px-2 py-1"
            >
              + Add Subtask
            </button>
          </div>
        </div>

        {/* ── Observers Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Observers ({task.observers.length})
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
              <span className="text-[11px] font-semibold text-slate-700 block">Select Observer:</span>
              <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                {CANDIDATE_OBSERVERS.filter((cand) => !task.observers.some((o) => o.name === cand.name)).map((cand) => (
                  <div key={cand.id} className="p-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{cand.name}</p>
                      <p className="text-[10px] text-slate-500">{cand.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onAddObserver(task.id, cand);
                        setShowObserverPicker(false);
                      }}
                      className="text-xs font-bold text-slate-700 px-2 py-1 rounded bg-white border border-gray-200 cursor-pointer"
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

        {/* ── Files Card ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Files ({task.attachments.length})
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
                      onClick={() => alert(`Downloading ${att.name}`)}
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

        {/* ── Recurrence & Time Planning Links ── */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Planning & Automation
            </h3>
            <InfoTooltip content="Configure recurring cadence and duration rules" />
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

