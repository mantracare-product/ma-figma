import { useState, useEffect, useCallback } from "react";
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
} from "../types/task";
import { addNotification } from "./notificationsStore";

export const TASKS_STORAGE_KEY = "mantra_tasks_store";
export const TASKS_STORE_EVENT = "mantra-tasks-updated";

export const INITIAL_TASKS: TaskEntity[] = [
  {
    id: "tsk-001",
    code: "TSK-101",
    title: "Verify Patient Insurance Eligibility for Fasting Labs",
    description: "Coordinate with payer clearinghouse to verify coverage for upcoming fast-panel labs across oncology outpatient clients.",
    status: "in_progress",
    stageName: "Task Created",
    stageId: "task-stg-created",
    workflowId: "process-task-default",
    workflowName: "Clinical & Operational Tasks",
    isImportant: true,
    scopeLevel: "client",
    assignee: {
      scopeLevel: "client",
      assigneeName: "Dr. Alistair Mehta",
    },
    creator: {
      id: "usr-admin-1",
      name: "Super Admin",
      role: "Platform Administrator",
    },
    project: "Oncology Care Pathway",
    deadline: "Tomorrow, 5:00 PM",
    createdAt: "2026-11-04 09:30 AM",
    updatedAt: "2026-11-05 10:00 AM",
    checklists: [
      {
        id: "chk-1",
        title: "Eligibility Checklist",
        items: [
          { id: "item-1", text: "Pull active insurance ID and group number", isCompleted: true, isImportant: true },
          { id: "item-2", text: "Run clearinghouse 270/271 real-time eligibility inquiry", isCompleted: true, isImportant: false },
          { id: "item-3", text: "Confirm in-network coverage for CPT 80061 & 82947", isCompleted: false, isImportant: true },
          { id: "item-4", text: "Attach copay estimate to client portal profile", isCompleted: false, isImportant: false },
        ],
      },
    ],
    observers: [
      { id: "obs-1", name: "Elena Rostova", role: "Care Coordinator" },
      { id: "obs-2", name: "David Miller", role: "Billing Specialist" },
    ],
    subtasks: [
      { id: "sub-1", title: "Download clearinghouse PDF summary", isCompleted: true, assigneeName: "Elena Rostova", deadline: "Today" },
      { id: "sub-2", title: "Notify patient of $15 copay via portal message", isCompleted: false, assigneeName: "Dr. Alistair Mehta", deadline: "Tomorrow" },
    ],
    recurrence: {
      enabled: false,
      interval: 1,
      unit: "weeks",
      startDate: "2026-11-04",
      createAtTime: "09:00",
      deadlineOffsetDays: 2,
      stopRule: "never",
      skipWeekends: true,
    },
    timePlanning: {
      startDate: "2026-11-04",
      dueDate: "2026-11-06",
      durationDays: 2,
      assigneeCanEditDates: true,
      skipWeekends: true,
      useSubtaskDates: false,
    },
    attachments: [
      { id: "att-1", name: "Lab_CPT_Authorization_Sheet.pdf", size: "340 KB", type: "application/pdf", uploadedAt: "Yesterday" },
    ],
  },
  {
    id: "tsk-002",
    code: "TSK-102",
    title: "Quarterly Provider Credentialing & CAQH Audit",
    description: "Review provider credentials, state medical license expirations, and DEA renewal documents for all active clinic practitioners.",
    status: "in_progress",
    stageName: "Task Created",
    stageId: "task-stg-created",
    workflowId: "process-task-compliance",
    workflowName: "Compliance & Credentialing",
    isImportant: false,
    scopeLevel: "admin",
    assignee: {
      scopeLevel: "org_role",
      orgName: "Demo Mantra Care",
      roleName: "Clinical Director",
      adminScopeName: "Healthcare (5 industries, US)",
      assigneeName: "Clinical Director",
    },
    creator: {
      id: "usr-admin-1",
      name: "Super Admin",
      role: "Platform Administrator",
    },
    project: "Compliance & Governance",
    deadline: "Nov 15, 2026",
    createdAt: "2026-11-03 11:15 AM",
    updatedAt: "2026-11-03 11:15 AM",
    checklists: [
      {
        id: "chk-2-1",
        title: "License Documents",
        items: [
          { id: "item-2-1", text: "Pull CAQH attestations updated within last 120 days", isCompleted: false, isImportant: true },
          { id: "item-2-2", text: "Verify active malpractice insurance certificate", isCompleted: false, isImportant: false },
        ],
      },
    ],
    observers: [
      { id: "obs-3", name: "Sarah Johnson", role: "Practice Admin" },
    ],
    subtasks: [],
    recurrence: {
      enabled: true,
      interval: 3,
      unit: "months",
      startDate: "2026-11-01",
      createAtTime: "08:30",
      deadlineOffsetDays: 14,
      stopRule: "never",
      skipWeekends: true,
    },
    timePlanning: {
      startDate: "2026-11-03",
      dueDate: "2026-11-15",
      durationDays: 12,
      assigneeCanEditDates: true,
      skipWeekends: true,
      useSubtaskDates: false,
    },
    attachments: [],
  },
  {
    id: "tsk-003",
    code: "TSK-103",
    title: "Post-Consultation Physical Therapy Regimen Review",
    description: "Follow up with patient regarding lumbar flexion routine, verify pain score trajectory and update therapy plan notes.",
    status: "in_progress",
    stageName: "Task Created",
    stageId: "task-stg-created",
    workflowId: "process-task-followup",
    workflowName: "Patient Care Follow-up",
    isImportant: true,
    scopeLevel: "client",
    assignee: {
      scopeLevel: "client",
      clientId: "CL-001",
      clientName: "Sarah Johnson",
      assigneeName: "Sarah Johnson",
    },
    creator: {
      id: "usr-doc-1",
      name: "Dr. Alistair Mehta",
      role: "Lead Physician",
    },
    project: "Rehabilitation Protocol",
    deadline: "Friday, 4:00 PM",
    createdAt: "2026-11-02 02:00 PM",
    updatedAt: "2026-11-05 08:30 AM",
    checklists: [
      {
        id: "chk-3-1",
        title: "Follow-up Items",
        items: [
          { id: "it-3-1", text: "Complete Day 3 pain log via portal", isCompleted: true, isImportant: true },
          { id: "it-3-2", text: "Confirm tolerability of isometric exercises", isCompleted: true, isImportant: false },
          { id: "it-3-3", text: "Schedule 2-week in-clinic re-evaluation", isCompleted: false, isImportant: true },
        ],
      },
    ],
    observers: [
      { id: "obs-pt-1", name: "Marcus Vance", role: "Therapy Tech" },
    ],
    subtasks: [
      { id: "sub-pt-1", title: "Review pain questionnaire submissions", isCompleted: true, assigneeName: "Dr. Alistair Mehta", deadline: "Wednesday" },
    ],
    recurrence: {
      enabled: false,
      interval: 1,
      unit: "weeks",
      startDate: "2026-11-02",
      createAtTime: "09:00",
      deadlineOffsetDays: 3,
      stopRule: "never",
      skipWeekends: true,
    },
    timePlanning: {
      startDate: "2026-11-02",
      dueDate: "2026-11-07",
      durationDays: 5,
      assigneeCanEditDates: false,
      skipWeekends: true,
      useSubtaskDates: false,
    },
    attachments: [
      { id: "att-pt-1", name: "Lumbar_Spine_Protocol_V2.pdf", size: "1.2 MB", type: "application/pdf", uploadedAt: "Nov 02" },
    ],
  },
  {
    id: "tsk-004",
    code: "TSK-104",
    title: "Complete Intake Medical History & HIPAA Consent",
    description: "Patient to review medication disclosures and electronically sign HIPAA privacy authorization form prior to intake session.",
    status: "deferred",
    stageName: "Task Overdue",
    stageId: "task-stg-overdue",
    workflowId: "process-task-compliance",
    workflowName: "Compliance & Credentialing",
    isImportant: false,
    scopeLevel: "portal",
    assignee: {
      scopeLevel: "contact",
      clientId: "CL-001",
      clientName: "Sarah Johnson",
      assigneeName: "Sarah Johnson",
    },
    creator: {
      id: "usr-sys-1",
      name: "Automated Intake System",
      role: "System Bot",
    },
    project: "Patient Onboarding",
    deadline: "Nov 08, 2026",
    createdAt: "2026-11-01 10:00 AM",
    updatedAt: "2026-11-04 03:20 PM",
    checklists: [
      {
        id: "chk-portal-1",
        title: "Intake Requirements",
        items: [
          { id: "it-p1", text: "Verify primary care physician details", isCompleted: true, isImportant: false },
          { id: "it-p2", text: "Upload front and back photo of insurance card", isCompleted: true, isImportant: true },
          { id: "it-p3", text: "E-sign HIPAA disclosure agreement", isCompleted: false, isImportant: true },
        ],
      },
    ],
    observers: [
      { id: "obs-4", name: "Dr. Alistair Mehta", role: "Attending Clinician" },
    ],
    subtasks: [],
    timePlanning: {
      startDate: "2026-11-01",
      dueDate: "2026-11-08",
      durationDays: 7,
      assigneeCanEditDates: false,
      skipWeekends: false,
      useSubtaskDates: false,
    },
    attachments: [],
  },
  {
    id: "tsk-005",
    code: "TSK-105",
    title: "Automated Monthly Billing Reconciliation",
    description: "Reconcile Stripe payouts against internal ledger balances and flagged chargeback disputes.",
    status: "completed",
    stageName: "Task Completed",
    stageId: "task-stg-completed",
    workflowId: "process-task-default",
    workflowName: "Clinical & Operational Tasks",
    isImportant: false,
    scopeLevel: "admin",
    assignee: {
      scopeLevel: "org_role",
      orgName: "Demo Mantra Care",
      roleName: "Financial Analyst",
      adminScopeName: "All Industries & Countries",
      assigneeName: "Financial Analyst",
    },
    creator: {
      id: "usr-admin-1",
      name: "Super Admin",
      role: "Platform Administrator",
    },
    project: "Revenue Cycle",
    deadline: "Nov 03, 2026",
    createdAt: "2026-10-31 09:00 AM",
    updatedAt: "2026-11-03 04:00 PM",
    checklists: [
      {
        id: "chk-rec-1",
        title: "Reconciliation Steps",
        items: [
          { id: "it-r1", text: "Export monthly statement CSV from Stripe", isCompleted: true, isImportant: false },
          { id: "it-r2", text: "Match invoice IDs against QuickBooks ledger", isCompleted: true, isImportant: true },
          { id: "it-r3", text: "File dispute report for transaction #TX-9902", isCompleted: true, isImportant: false },
        ],
      },
    ],
    observers: [
      { id: "obs-5", name: "Elena Rostova", role: "Operations Lead" },
    ],
    subtasks: [],
    timePlanning: {
      startDate: "2026-10-31",
      dueDate: "2026-11-03",
      durationDays: 3,
      assigneeCanEditDates: true,
      skipWeekends: true,
      useSubtaskDates: false,
    },
    attachments: [],
  },
];

export function getStoredTasks(): TaskEntity[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((t: any) => {
        let stageName = t.stageName;
        let stageId = t.stageId;
        if (!stageName) {
          if (t.status === "completed") {
            stageName = "Task Completed";
            stageId = "task-stg-completed";
          } else if (t.status === "deferred") {
            stageName = "Task Overdue";
            stageId = "task-stg-overdue";
          } else {
            stageName = "Task Created";
            stageId = "task-stg-created";
          }
        }
        const initialMatching = INITIAL_TASKS.find((init) => init.id === t.id);
        const observers = t.observers && t.observers.length > 0 ? t.observers : (initialMatching?.observers || []);
        const workflowId = t.workflowId || initialMatching?.workflowId || "process-task-default";
        const workflowName = t.workflowName || initialMatching?.workflowName || "Clinical & Operational Tasks";

        const assignee = {
          ...t.assignee,
          clientId: t.assignee?.clientId || initialMatching?.assignee?.clientId,
          clientName: t.assignee?.clientName || initialMatching?.assignee?.clientName,
          orgName: t.assignee?.orgName || initialMatching?.assignee?.orgName || (t.scopeLevel === "admin" ? "Demo Mantra Care" : undefined),
          adminScopeName: t.assignee?.adminScopeName || initialMatching?.assignee?.adminScopeName || (t.scopeLevel === "admin" ? "Healthcare Scope" : undefined),
        };

        const scopeLevel = t.scopeLevel || initialMatching?.scopeLevel || "client";

        return {
          ...t,
          scopeLevel,
          assignee,
          workflowId,
          workflowName,
          observers,
          stageName,
          stageId: stageId || (stageName === "Task Completed" ? "task-stg-completed" : stageName === "Task Overdue" ? "task-stg-overdue" : "task-stg-created"),
        };
      });
    }
    return INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveStoredTasks(tasks: TaskEntity[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(TASKS_STORE_EVENT, { detail: tasks }));
    window.dispatchEvent(new Event("storage"));
  } catch (err) {
    console.error("Failed to persist tasks:", err);
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskEntity[]>(() => getStoredTasks());

  useEffect(() => {
    const handleUpdate = () => {
      setTasks(getStoredTasks());
    };
    window.addEventListener(TASKS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TASKS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const createTask = useCallback((newTaskData: Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">) => {
    const current = getStoredTasks();
    const nextNumber = current.length + 101;
    const task: TaskEntity = {
      ...newTaskData,
      id: `tsk-${Date.now()}`,
      code: `TSK-${nextNumber}`,
      createdAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
      updatedAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
    };
    const updated = [task, ...current];
    saveStoredTasks(updated);

    // Trigger in-app notification
    addNotification({
      type: "task",
      title: "New Task Assigned",
      message: `${task.code}: ${task.title} assigned to ${task.assignee.assigneeName}`,
      link: `/tasks?id=${task.id}`,
      meta: { taskId: task.id },
    });

    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<TaskEntity>) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === id) {
        if (patch.assignee && patch.assignee.assigneeName !== t.assignee.assigneeName) {
          addNotification({
            type: "task",
            title: "Task Reassigned",
            message: `${t.code}: '${t.title}' reassigned to ${patch.assignee.assigneeName}`,
            link: `/tasks?id=${t.id}`,
            meta: { taskId: t.id },
          });
        }
        return {
          ...t,
          ...patch,
          updatedAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const deleteTask = useCallback((id: string) => {
    const current = getStoredTasks();
    const updated = current.filter((t) => t.id !== id);
    saveStoredTasks(updated);
  }, []);

  const toggleTaskStatus = useCallback((id: string, newStatus: TaskStatus) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === id) {
        let stageName = t.stageName;
        let stageId = t.stageId;
        if (newStatus === "completed") {
          stageName = "Task Completed";
          stageId = "task-stg-completed";
        } else if (newStatus === "deferred") {
          stageName = "Task Overdue";
          stageId = "task-stg-overdue";
        }
        return {
          ...t,
          status: newStatus,
          stageName,
          stageId,
          updatedAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const updateTaskStage = useCallback((id: string, stageName: string, stageId?: string) => {
    const current = getStoredTasks();
    const normalized = stageName.toLowerCase();
    let nextStatus: TaskStatus = "in_progress";
    if (normalized.includes("completed") || normalized.includes("won")) {
      nextStatus = "completed";
    } else if (normalized.includes("overdue") || normalized.includes("lost")) {
      nextStatus = "deferred";
    } else if (normalized.includes("created")) {
      nextStatus = "pending";
    }

    const updated = current.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          stageName,
          stageId: stageId || t.stageId,
          status: nextStatus,
          updatedAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const toggleChecklistItem = useCallback((taskId: string, checklistId: string, itemId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const nextChecklists = t.checklists.map((chk) => {
          if (chk.id === checklistId) {
            return {
              ...chk,
              items: chk.items.map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it)),
            };
          }
          return chk;
        });
        return {
          ...t,
          checklists: nextChecklists,
          updatedAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const toggleItemImportance = useCallback((taskId: string, checklistId: string, itemId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const nextChecklists = t.checklists.map((chk) => {
          if (chk.id === checklistId) {
            return {
              ...chk,
              items: chk.items.map((it) => (it.id === itemId ? { ...it, isImportant: !it.isImportant } : it)),
            };
          }
          return chk;
        });
        return {
          ...t,
          checklists: nextChecklists,
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const addChecklistItem = useCallback((taskId: string, checklistId: string, text: string, isImportant = false) => {
    if (!text.trim()) return;
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const nextChecklists = t.checklists.map((chk) => {
          if (chk.id === checklistId) {
            const newItem: TaskChecklistItem = {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              text: text.trim(),
              isCompleted: false,
              isImportant,
            };
            return {
              ...chk,
              items: [...chk.items, newItem],
            };
          }
          return chk;
        });
        return {
          ...t,
          checklists: nextChecklists,
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const deleteChecklistItem = useCallback((taskId: string, checklistId: string, itemId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const nextChecklists = t.checklists.map((chk) => {
          if (chk.id === checklistId) {
            return {
              ...chk,
              items: chk.items.filter((it) => it.id !== itemId),
            };
          }
          return chk;
        });
        return {
          ...t,
          checklists: nextChecklists,
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const addChecklist = useCallback((taskId: string, title: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const newChk: TaskChecklist = {
          id: `chk-${Date.now()}`,
          title: title.trim() || `Checklist ${t.checklists.length + 1}`,
          items: [],
        };
        return {
          ...t,
          checklists: [...t.checklists, newChk],
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const deleteChecklist = useCallback((taskId: string, checklistId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: t.checklists.filter((chk) => chk.id !== checklistId),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const addObserver = useCallback((taskId: string, observer: TaskObserver) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        if (t.observers.some((o) => o.id === observer.id || o.name === observer.name)) {
          return t;
        }
        return {
          ...t,
          observers: [...t.observers, observer],
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const removeObserver = useCallback((taskId: string, observerId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          observers: t.observers.filter((o) => o.id !== observerId),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const addSubtask = useCallback((taskId: string, title: string, assigneeName?: string, deadline?: string) => {
    if (!title.trim()) return;
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        const newSub: TaskSubtask = {
          id: `sub-${Date.now()}`,
          title: title.trim(),
          isCompleted: false,
          assigneeName,
          deadline,
        };
        return {
          ...t,
          subtasks: [...t.subtasks, newSub],
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    const current = getStoredTasks();
    const updated = current.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s)),
        };
      }
      return t;
    });
    saveStoredTasks(updated);
  }, []);

  return {
    tasks,
    setTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    updateTaskStage,
    toggleChecklistItem,
    toggleItemImportance,
    addChecklistItem,
    deleteChecklistItem,
    addChecklist,
    deleteChecklist,
    addObserver,
    removeObserver,
    addSubtask,
    toggleSubtask,
  };
}

