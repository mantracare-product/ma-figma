import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ExternalLink,
  DollarSign,
  Calendar,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  Plus,
  RefreshCw,
  Send,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { ArRecord, getArWorkflow, saveArRecord } from "../../../lib/arStore";
import { arService } from "../../../lib/arService";
import { getStoredClaims, Claim } from "../../../lib/claimsStore";
import { RemittancePanel } from "../claims/RemittancePanel";
import { buildAppealLetter } from "../../../lib/remittanceActions";
import { getStoredTasks, createTaskRecord, completeTaskRecord } from "../../../lib/tasksStore";
import type { TaskEntity } from "../../../types/task";
import { SegmentedStageBar } from "../common/SegmentedStageBar";
import { useNavigate } from "react-router";

interface ARDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: ArRecord | null;
  onRecordUpdated?: (updated: ArRecord) => void;
  onOpenClaim?: (claimId: string) => void;
}

const fmtMoney = (n: number | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export default function ARDetailDrawer({
  isOpen,
  onClose,
  record,
  onRecordUpdated,
  onOpenClaim,
}: ARDetailDrawerProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"details" | "remittance" | "appeal" | "tasks">("details");
  const [appealText, setAppealText] = useState("");
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [isEditingAmounts, setIsEditingAmounts] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ArRecord>>({});

  const workflow = useMemo(() => {
    if (!record) return null;
    return getArWorkflow(record.processId);
  }, [record]);

  const linkedClaim = useMemo<Claim | null>(() => {
    if (!record) return null;
    const claims = getStoredClaims();
    return claims.find((c) => c.id === record.claimId || c.claimNumber === record.claimNumber) || null;
  }, [record]);

  useEffect(() => {
    if (record) {
      setEditForm(record);
      setAppealText(record.appealDraft?.letter || (linkedClaim ? buildAppealLetter(linkedClaim) : ""));
      refreshTasks();
    }
  }, [record, linkedClaim]);

  const refreshTasks = () => {
    if (!record) return;
    const all = getStoredTasks();
    const matched = all.filter(
      (t) =>
        (t.entityRef?.type === "ar" && t.entityRef?.id === record.id) ||
        (t.entityRef?.type === "claim" && t.entityRef?.id === record.claimId)
    );
    setTasks(matched);
  };

  if (!isOpen || !record) return null;

  const handleStageClick = (stageId: string) => {
    try {
      const res = arService.moveToStage(record.id, stageId, { type: "manual" });
      if (res && res.record) {
        toast.success(`Moved to ${res.stageName}`);
        onRecordUpdated?.(res.record);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to change stage");
    }
  };

  const handleAcceptAppeal = () => {
    try {
      const updated = arService.updateArRecord(record.id, {
        appealDraft: {
          letter: appealText,
          accepted: true,
          createdDate: new Date().toISOString(),
        },
      });
      // Move to appeal drafted if stage exists
      const targetStage = workflow?.stages.find(
        (s) => s.id === "proc-ar-appeal-drafted" || s.name.toLowerCase().includes("appeal draft")
      );
      if (targetStage) {
        arService.moveToStage(record.id, targetStage.id, { type: "manual" });
      }
      toast.success("Appeal draft accepted and moved to Appeal drafted");
      if (updated) onRecordUpdated?.(updated);
    } catch (e: any) {
      toast.error(e.message || "Failed to accept appeal draft");
    }
  };

  const handleRegenerateAppeal = () => {
    if (linkedClaim) {
      const letter = buildAppealLetter(linkedClaim);
      setAppealText(letter);
      toast.success("Regenerated appeal letter template");
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTaskRecord({
      title: newTaskTitle.trim(),
      description: "",
      queueId: "Denials and A/R",
      priority: record.priority === "urgent" || record.priority === "high" ? "high" : "normal",
      status: "pending",
      isImportant: record.priority === "urgent" || record.priority === "high",
      scopeLevel: "client",
      assignee: { scopeLevel: "client", assigneeName: "Unassigned" },
      creator: { id: "user", name: "User" },
      checklists: [],
      observers: [],
      subtasks: [],
      attachments: [],
      entityRef: {
        type: "ar",
        id: record.id,
        stageId: record.currentStageId,
        stageName: record.statusLabel,
        autoCloseOnStageExit: true,
      },
    } as any);
    setNewTaskTitle("");
    refreshTasks();
    toast.success("Task created");
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const historyItem = {
      date: new Date().toISOString(),
      type: "note",
      description: newNoteText.trim(),
    };
    const updated = arService.updateArRecord(record.id, {
      history: [...(record.history || []), historyItem],
    });
    setNewNoteText("");
    if (updated) onRecordUpdated?.(updated);
    toast.success("Note added");
  };

  const handleSaveDetails = () => {
    const updated = arService.updateArRecord(record.id, editForm);
    setIsEditingAmounts(false);
    if (updated) {
      onRecordUpdated?.(updated);
      toast.success("AR record updated");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-4xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                AR
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 truncate">
                    {record.claimNumber}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {record.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {record.patientName} &bull; {record.payerName} &bull; DOS: {record.dateOfService}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onOpenClaim) {
                    onOpenClaim(record.claimId);
                  } else {
                    navigate(`/claims?claimId=${record.claimId}`);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="View original claim"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Open claim</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stage Ribbon Bar */}
          {workflow && workflow.stages && (
            <div className="px-6 py-2.5 bg-white border-b border-slate-100 overflow-x-auto">
              <div className="min-w-[600px]">
                <SegmentedStageBar
                  stages={workflow.stages}
                  currentStageId={record.currentStageId}
                  currentStageName={record.statusLabel}
                  onStageSelect={(s) => handleStageClick(s.id)}
                />
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 grid grid-cols-5 gap-3 text-center text-xs">
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Billed</span>
              <p className="font-bold text-slate-800">{fmtMoney(record.billedAmount)}</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Paid</span>
              <p className="font-bold text-emerald-600">{fmtMoney(record.paidAmount)}</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Adjusted</span>
              <p className="font-bold text-slate-600">{fmtMoney(record.adjustmentAmount)}</p>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Patient Resp</span>
              <p className="font-bold text-amber-600">{fmtMoney(record.patientResponsibility)}</p>
            </div>
            <div className="bg-blue-50/80 p-2 rounded-lg border border-blue-100 shadow-2xs">
              <span className="text-[10px] text-blue-600 uppercase font-bold">Outstanding</span>
              <p className="font-bold text-blue-700">{fmtMoney(record.outstandingAmount)}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "details"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("remittance")}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "remittance"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Remittance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("appeal")}
              className={`py-3 border-b-2 transition-colors cursor-pointer relative ${
                activeTab === "appeal"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Appeal
              {record.denialCategory && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  Denied
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "tasks"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Tasks & Notes
              {tasks.filter((t) => t.status !== "completed").length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {tasks.filter((t) => t.status !== "completed").length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Section 1: Details */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Details</h3>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingAmounts) {
                          handleSaveDetails();
                        } else {
                          setIsEditingAmounts(true);
                        }
                      }}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      {isEditingAmounts ? "Save Changes" : "Edit"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Claim Reference:</span>
                      <p className="font-semibold text-slate-800">{record.claimNumber}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Patient:</span>
                      <p className="font-semibold text-slate-800">{record.patientName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Insurance Payer:</span>
                      <p className="font-semibold text-slate-800">{record.payerName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Rendering Provider:</span>
                      <p className="font-semibold text-slate-800">{record.providerName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Date of Service:</span>
                      <p className="font-semibold text-slate-800">{record.dateOfService}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Submitted Date:</span>
                      <p className="font-semibold text-slate-800">{record.submittedDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Age in Days:</span>
                      <p className="font-semibold text-slate-800">{record.ageInDays} days</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Current Stage:</span>
                      <p className="font-semibold text-slate-800">{record.statusLabel}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Amounts */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
                    Amounts & Balances
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Billed Charge</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.billedAmount ?? record.billedAmount}
                          onChange={(e) => setEditForm({ ...editForm, billedAmount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-bold text-slate-800">{fmtMoney(record.billedAmount)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Allowed Amount</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.allowedAmount ?? record.allowedAmount}
                          onChange={(e) => setEditForm({ ...editForm, allowedAmount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-bold text-slate-800">{fmtMoney(record.allowedAmount)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Paid by Payer</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.paidAmount ?? record.paidAmount}
                          onChange={(e) => setEditForm({ ...editForm, paidAmount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-bold text-emerald-600">{fmtMoney(record.paidAmount)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Contractual Adjustments</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.adjustmentAmount ?? record.adjustmentAmount}
                          onChange={(e) => setEditForm({ ...editForm, adjustmentAmount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-bold text-slate-700">{fmtMoney(record.adjustmentAmount)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Patient Responsibility</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.patientResponsibility ?? record.patientResponsibility}
                          onChange={(e) => setEditForm({ ...editForm, patientResponsibility: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-bold text-amber-600">{fmtMoney(record.patientResponsibility)}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Outstanding Balance</label>
                      {isEditingAmounts ? (
                        <input
                          type="number"
                          value={editForm.outstandingAmount ?? record.outstandingAmount}
                          onChange={(e) => setEditForm({ ...editForm, outstandingAmount: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-blue-700"
                        />
                      ) : (
                        <p className="font-bold text-blue-700 text-sm">{fmtMoney(record.outstandingAmount)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Follow-up */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-2 border-b border-slate-100">
                    Follow-up & Escalation
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Next Follow-up Date</label>
                      {isEditingAmounts ? (
                        <input
                          type="date"
                          value={editForm.nextFollowUpDate || ""}
                          onChange={(e) => setEditForm({ ...editForm, nextFollowUpDate: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{record.nextFollowUpDate || "Not scheduled"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Assignee</label>
                      {isEditingAmounts ? (
                        <input
                          type="text"
                          value={editForm.assigneeName || ""}
                          onChange={(e) => setEditForm({ ...editForm, assigneeName: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{record.assigneeName || "Unassigned"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Priority</label>
                      {isEditingAmounts ? (
                        <select
                          value={editForm.priority || "normal"}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          record.priority === "urgent" ? "bg-rose-100 text-rose-700" :
                          record.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {record.priority || "Normal"}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Appeal Deadline</label>
                      <p className="font-semibold text-slate-800">{record.appealDeadline || "None"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "remittance" && (
              <div>
                <RemittancePanel claim={linkedClaim} />
              </div>
            )}

            {activeTab === "appeal" && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Denial Details</span>
                    {record.appealDeadline && (
                      <span className="text-xs text-rose-600 font-semibold">
                        Deadline: {record.appealDeadline}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Category:</span>{" "}
                      <span className="font-semibold text-slate-800">{record.denialCategory || "None"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">CARC Codes:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {(record.carcCodes || []).join(", ") || "None"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Appeal Letter Draft
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateAppeal}
                        className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={12}
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                    placeholder="Draft appeal letter..."
                  />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      {record.appealDraft?.accepted ? (
                        <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Accepted on {record.appealDraft.createdDate?.slice(0, 10)}
                        </span>
                      ) : (
                        "Draft proposal only — accepting moves stage to Appeal drafted"
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleAcceptAppeal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Accept Appeal Draft
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="space-y-6">
                {/* Add Task */}
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add follow-up task..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add Task
                  </button>
                </form>

                {/* Tasks List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Linked Tasks</h4>
                  {tasks.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                      No tasks linked to this AR record
                    </p>
                  ) : (
                    tasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          t.status === "completed"
                            ? "bg-slate-50 border-slate-100 text-slate-400 line-through"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (t.status !== "completed") {
                                completeTaskRecord(t.id, "manual");
                                refreshTasks();
                              }
                            }}
                            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                              t.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                            }`}
                          >
                            {t.status === "completed" && <Check className="w-3 h-3" />}
                          </button>
                          <span className="truncate">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {t.queueId || "General"}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Notes and History */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">History & Notes</h4>
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add an internal note..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Post Note
                    </button>
                  </form>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(record.history || []).slice().reverse().map((h, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="uppercase font-bold">{h.type}</span>
                          <span>{new Date(h.date).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700">{h.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
