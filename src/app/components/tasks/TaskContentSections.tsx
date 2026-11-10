import React, { useState } from "react";
import {
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
  Edit2,
  Users,
  Shield,
  Building2,
  MoreVertical,
  Share2,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { InfoTooltip } from "../help/InfoTooltip";
import { SegmentedStageBar } from "../common/SegmentedStageBar";
import {
  TaskEntity,
  TaskChecklist,
  TaskChecklistItem,
  TaskObserver,
  TaskSubtask,
  TaskFileAttachment,
} from "../../../types/task";
import { Stage } from "../../../lib/useProcessStore";
import { TeamMember } from "../../../lib/teamStore";
import { toast } from "sonner";

// ── 1. Task Description & Overview Section ──
export function TaskDescriptionSection({
  task,
  onUpdateTask,
}: {
  task: TaskEntity;
  onUpdateTask: (id: string, patch: Partial<TaskEntity>) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descText, setDescText] = useState(task.description || "");

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText.trim() !== task.title) {
      onUpdateTask(task.id, { title: titleText.trim() });
      toast.success("Task title updated");
    }
    setIsEditingTitle(false);
  };

  const handleSaveDesc = () => {
    if (descText !== task.description) {
      onUpdateTask(task.id, { description: descText.trim() });
      toast.success("Task description updated");
    }
    setIsEditingDesc(false);
  };

  const isCompleted = task.status === "completed";

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="flex-1 text-sm font-bold text-slate-900 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="px-3 py-1.5 bg-[#1E293B] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleText(task.title);
                  setIsEditingTitle(false);
                }}
                className="px-3 py-1.5 border border-gray-200 text-slate-600 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h2
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {task.title}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity cursor-pointer"
                title="Edit title"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="font-mono text-slate-700 font-semibold">{task.code}</span>
            <span>•</span>
            <span>Created by {task.creator?.name || "System"}</span>
            <span>•</span>
            <span className="font-mono tabular-nums">{task.createdAt}</span>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isCompleted
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              : "bg-blue-50 text-blue-700 border border-blue-200/80"
          }`}
        >
          {isCompleted ? "Completed" : task.stageName || "In Progress"}
        </span>
      </div>

      {/* Description */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Description &amp; Guidelines
          </label>
          {!isEditingDesc && (
            <button
              type="button"
              onClick={() => setIsEditingDesc(true)}
              className="text-xs text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditingDesc ? (
          <div className="space-y-2">
            <textarea
              rows={4}
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white resize-none leading-relaxed text-slate-900"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDescText(task.description || "");
                  setIsEditingDesc(false);
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDesc}
                className="px-4 py-1.5 bg-[#1E293B] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Save Description
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3.5 rounded-xl border border-gray-200/60">
            {task.description || "No description provided."}
          </p>
        )}
      </div>
    </div>
  );
}

// ── 2. Checklists Section ──
export function TaskChecklistsSection({
  task,
  onToggleChecklistItem,
  onToggleItemImportance,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onAddChecklist,
  onDeleteChecklist,
}: {
  task: TaskEntity;
  onToggleChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  onToggleItemImportance: (taskId: string, checklistId: string, itemId: string) => void;
  onAddChecklistItem: (taskId: string, checklistId: string, text: string) => void;
  onDeleteChecklistItem: (taskId: string, checklistId: string, itemId: string) => void;
  onAddChecklist: (taskId: string, title: string) => void;
  onDeleteChecklist: (taskId: string, checklistId: string) => void;
}) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [newItemTexts, setNewItemTexts] = useState<{ [chkId: string]: string }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Checklists ({task.checklists?.length || 0})
          </h3>
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
          onClick={() => onAddChecklist(task.id, `Checklist ${(task.checklists?.length || 0) + 1}`)}
          className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Checklist</span>
        </button>
      </div>

      {(task.checklists || []).map((chk) => {
        const visibleItems = hideCompleted
          ? chk.items.filter((it) => !it.isCompleted)
          : chk.items;
        const completedCount = chk.items.filter((it) => it.isCompleted).length;

        return (
          <div key={chk.id} className="p-4 bg-slate-50/80 rounded-xl border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{chk.title}</span>
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  ({completedCount}/{chk.items.length})
                </span>
              </div>
              {(task.checklists?.length || 0) > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteChecklist(task.id, chk.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                  title="Delete Checklist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {visibleItems.map((it) => (
                <div
                  key={it.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                    it.isCompleted
                      ? "bg-slate-100/70 border-slate-200/60 opacity-70"
                      : "bg-white border-gray-200/70 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-slate-800 font-medium truncate ${
                          it.isCompleted ? "line-through text-slate-400" : ""
                        }`}
                      >
                        {it.text}
                      </span>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveItemMenuId(activeItemMenuId === it.id ? null : it.id)
                      }
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeItemMenuId === it.id && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveItemMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              onToggleItemImportance(task.id, chk.id, it.id);
                              setActiveItemMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                it.isImportant ? "fill-amber-500 text-amber-500" : "text-slate-400"
                              }`}
                            />
                            <span>{it.isImportant ? "Unmark Important" : "Mark Important"}</span>
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

            {/* Add Item Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newItemTexts[chk.id] || ""}
                onChange={(e) =>
                  setNewItemTexts((prev) => ({ ...prev, [chk.id]: e.target.value }))
                }
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
                placeholder="Add checklist item..."
                className="flex-1 text-xs p-2 bg-white border border-gray-200 rounded-xl text-slate-900"
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
  );
}

// ── 3. Subtasks Section ──
export function TaskSubtasksSection({
  task,
  onAddSubtask,
  onToggleSubtask,
}: {
  task: TaskEntity;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const handleAdd = () => {
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle("");
    toast.success("Subtask added");
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Subtasks ({task.subtasks?.length || 0})
        </h3>
      </div>

      {task.subtasks && task.subtasks.length > 0 ? (
        <div className="space-y-2">
          {task.subtasks.map((st) => (
            <div
              key={st.id}
              className="p-3 bg-slate-50/80 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={st.isCompleted}
                  onChange={() => onToggleSubtask(task.id, st.id)}
                  className="w-4 h-4 rounded text-slate-900 cursor-pointer"
                />
                <span
                  className={`font-semibold ${
                    st.isCompleted ? "line-through text-slate-400" : "text-slate-800"
                  }`}
                >
                  {st.title}
                </span>
              </div>
              {st.assigneeName && (
                <span className="text-[11px] text-slate-500">{st.assigneeName}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No subtasks defined.</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="New subtask title..."
          className="flex-1 text-xs p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
        >
          + Add Subtask
        </button>
      </div>
    </div>
  );
}

// ── 4. Attachments Section ──
export function TaskAttachmentsSection({
  task,
  onUpdateTask,
  fileInputRef,
}: {
  task: TaskEntity;
  onUpdateTask: (id: string, patch: Partial<TaskEntity>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleRemove = (attId: string) => {
    onUpdateTask(task.id, {
      attachments: task.attachments.filter((a) => a.id !== attId),
    });
    toast.success("Attachment removed");
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Files &amp; Attachments ({task.attachments?.length || 0})
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

      {task.attachments && task.attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {task.attachments.map((att) => (
            <div
              key={att.id}
              className="p-3 bg-slate-50/80 rounded-xl border border-gray-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{att.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">{att.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                  onClick={() => handleRemove(att.id)}
                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No attachments uploaded.</p>
      )}
    </div>
  );
}

// ── 5. Workflow Stage Progression Section (SegmentedStageBar + Dropdown) ──
export function TaskStageSection({
  task,
  taskStages,
  onUpdateStage,
}: {
  task: TaskEntity;
  taskStages: Stage[];
  onUpdateStage: (id: string, stageName: string, stageId?: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Workflow &amp; Stage</span>
        </h3>
        <span className="text-[11px] font-medium text-slate-500">
          {task.workflowName || task.project || "Clinical & Operational Tasks"}
        </span>
      </div>

      {/* Visual Interactive SegmentedStageBar */}
      <div className="py-1">
        <SegmentedStageBar
          stages={taskStages}
          currentStageName={task.stageName || "Task Created"}
          currentStageId={task.stageId}
          onStageSelect={(stg) => {
            onUpdateStage(task.id, stg.name, stg.id);
            toast.success(`Task moved to ${stg.name}`);
          }}
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
          Select Stage
        </label>
        <select
          value={task.stageName || "Task Created"}
          onChange={(e) => {
            const newStageName = e.target.value;
            const found = taskStages.find((s) => s.name === newStageName);
            onUpdateStage(task.id, newStageName, found?.id);
            toast.success(`Moved to ${newStageName}`);
          }}
          className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-gray-200 rounded-xl p-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20"
        >
          {taskStages.map((stg) => (
            <option key={stg.id} value={stg.name}>
              {stg.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── 6. Responsibility, Scoping & Sharing Section ──
export function TaskAssignmentSection({
  task,
  isAdmin,
  onOpenShare,
}: {
  task: TaskEntity;
  isAdmin: boolean;
  onOpenShare?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Assignment &amp; Scoping</span>
        </h3>
        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Share</span>
          </button>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {isAdmin ? (
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">
              Target Organization &amp; Role
            </label>
            <p className="font-bold text-slate-900">{task.assignee?.orgName || "Demo Mantra Care"}</p>
            <p className="text-slate-600 mt-0.5">
              Target Role: <span className="font-semibold text-slate-800">{task.assignee?.roleName || "All Roles"}</span>
            </p>
            {task.assignee?.adminScopeName && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Multi-Tenant Scope: {task.assignee.adminScopeName}
              </p>
            )}
            {task.scopingRules && task.scopingRules.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {task.scopingRules.map((rule, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono"
                  >
                    {rule.industryCategory || "Industry Rule"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">
              Responsible Assignee(s)
            </label>
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {task.assignees.map((a, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <span>{a.assigneeName}</span>
                    {a.roleName && (
                      <span className="text-[10px] text-slate-400 font-normal">({a.roleName})</span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <div>
                <p className="font-bold text-slate-900">{task.assignee?.assigneeName || "Unassigned"}</p>
                {task.assignee?.roleName && (
                  <p className="text-slate-500 text-[11px]">{task.assignee.roleName}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100">
          <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">
            Owner / Creator
          </label>
          <p className="font-bold text-slate-900">{task.creator?.name || "System"}</p>
          <p className="text-[11px] text-slate-500">{task.creator?.role || "Staff"}</p>
        </div>

        {onOpenShare && (
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onOpenShare}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share Task (SMS, WhatsApp, Email, Portal)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 7. Schedule, Planning & Recurrence Section ──
export function TaskPlanningSection({
  task,
  onUpdateTask,
  onOpenRecurrence,
  onOpenTimePlanning,
}: {
  task: TaskEntity;
  onUpdateTask: (id: string, patch: Partial<TaskEntity>) => void;
  onOpenRecurrence: () => void;
  onOpenTimePlanning: () => void;
}) {
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || "");
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || "17:00");
  const [isEditingDate, setIsEditingDate] = useState(false);

  const formatDeadlineDisplay = (dDate: string, dTime: string) => {
    if (!dDate) return "";
    try {
      const [year, month, day] = dDate.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = months[parseInt(month, 10) - 1] || month;
      let formattedTime = "";
      if (dTime) {
        const [h, m] = dTime.split(":");
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        formattedTime = `, ${hours}:${m} ${ampm}`;
      }
      return `${monthName} ${day}, ${year}${formattedTime}`;
    } catch {
      return `${dDate} ${dTime}`.trim();
    }
  };

  const handleSaveDeadline = () => {
    const formatted = formatDeadlineDisplay(deadlineDate, deadlineTime);
    onUpdateTask(task.id, {
      deadline: formatted || task.deadline,
      deadlineDate,
      deadlineTime,
    });
    setIsEditingDate(false);
    toast.success("Deadline updated");
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Schedule &amp; Planning</span>
        </h3>
        {!isEditingDate ? (
          <button
            type="button"
            onClick={() => setIsEditingDate(true)}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium"
          >
            Edit Date
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveDeadline}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Save
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">
            Deadline
          </label>
          {isEditingDate ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
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
            </div>
          ) : (
            <p className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono text-slate-800 font-semibold">
              {task.deadline || "No deadline set"}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onOpenRecurrence}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-slate-500" />
              <span>Repeat</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {task.recurrence?.enabled ? "On" : "Off"}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenTimePlanning}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Duration</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {task.timePlanning?.durationDays ? `${task.timePlanning.durationDays}d` : "None"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 8. Observers Section ──
export function TaskObserversSection({
  task,
  teamMembers,
  onAddObserver,
  onRemoveObserver,
}: {
  task: TaskEntity;
  teamMembers: TeamMember[];
  onAddObserver: (taskId: string, observer: TaskObserver) => void;
  onRemoveObserver: (taskId: string, observerId: string) => void;
}) {
  const [showObserverPicker, setShowObserverPicker] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Observers ({task.observers?.length || 0})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowObserverPicker((prev) => !prev)}
          className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center gap-1 font-medium"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add</span>
        </button>
      </div>

      {showObserverPicker && (
        <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
          <span className="text-[11px] font-semibold text-slate-700 block">
            Select Team Member:
          </span>
          <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
            {teamMembers
              .filter((m) => !(task.observers || []).some((o) => o.name === m.name))
              .map((m) => (
                <div key={m.id} className="py-1.5 flex items-center justify-between">
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
                    className="text-xs font-bold text-slate-700 px-2 py-0.5 rounded bg-white border border-gray-200 hover:bg-slate-100 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {task.observers && task.observers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {task.observers.map((obs) => (
            <div
              key={obs.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs"
            >
              <span className="font-semibold text-slate-800">{obs.name}</span>
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
      ) : (
        <p className="text-xs text-slate-400 italic">No observers assigned.</p>
      )}
    </div>
  );
}

