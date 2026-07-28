import { useState, useEffect } from "react";
import { WorkflowStep } from "../app/types/workflow";

export interface AISettings {
  platform: string;
  voiceSpeed: number;
  voice?: string;
  tone?: string;
  style?: string;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  aiSettings?: AISettings;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  aiSettings: AISettings;
}

export const PROCESS_STORE_EVENT = "processStore_updated";
const PROCESSES_STORAGE_KEY = "process_store_processes";
const STEPS_STORAGE_KEY = "process_store_steps";

export const DEFAULT_INITIAL_PROCESSES: Process[] = [
  {
    id: "1",
    name: "Patient Intake",
    description: "Initial patient onboarding and verification process",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "1-1", name: "Initial Contact", description: "First call to patient for basic information gathering", status: "active", color: "#22D3EE" },
      { id: "1-2", name: "Insurance Verify", description: "Verify patient insurance details and coverage", status: "active", color: "#22D3EE" },
      { id: "1-3", name: "Schedule Appointment", description: "Schedule the patient's first appointment", status: "active", color: "#EC4899" },
    ],
  },
  {
    id: "2",
    name: "Follow-up Calls",
    description: "Post-visit follow-up and medication reminders",
    aiSettings: {
      platform: "Anthropic Claude",
      voiceSpeed: 1.2,
      voice: "Eva",
      tone: "Friendly",
      style: "Balanced",
    },
    stages: [
      { id: "2-1", name: "Post-Visit Check", description: "Check on patient after their visit", status: "active" },
      { id: "2-2", name: "Medication Reminder", description: "Remind patient to take their medication", status: "active" },
    ],
  },
];

export const DEFAULT_WORKFLOW_STEPS: Record<string, WorkflowStep[]> = {
  "1-1": [
    {
      id: "step-1",
      name: "Send Welcome WhatsApp",
      description: "Send initial welcome message to contact",
      iconKey: "message-square",
      stepKey: "whatsapp",
      trigger: "stage",
      params: {
        message: "Hello! Welcome to Mantra Health. How can we help you today?",
      },
    },
  ],
};

export function getStoredProcesses(): Process[] {
  try {
    const raw = localStorage.getItem(PROCESSES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_INITIAL_PROCESSES;
  } catch {
    return DEFAULT_INITIAL_PROCESSES;
  }
}

export function saveStoredProcesses(processes: Process[]) {
  try {
    localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(processes));
    window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
  } catch {}
}

export function getStoredWorkflowSteps(): Record<string, WorkflowStep[]> {
  try {
    const raw = localStorage.getItem(STEPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_WORKFLOW_STEPS;
  } catch {
    return DEFAULT_WORKFLOW_STEPS;
  }
}

export function saveStoredWorkflowSteps(steps: Record<string, WorkflowStep[]>) {
  try {
    localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(steps));
    window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
  } catch {}
}

export function getWorkflowStepsForStage(processId: string, stageId: string): WorkflowStep[] {
  const processes = getStoredProcesses();
  const proc = processes.find((p) => p.id === processId);
  const stage = proc?.stages.find((s) => s.id === stageId);
  return (stage as any)?.workflowSteps ?? [];
}

export function useProcessStore() {
  const [processes, setProcessesState] = useState<Process[]>(getStoredProcesses);
  const [workflowSteps, setWorkflowStepsState] = useState<Record<string, WorkflowStep[]>>(getStoredWorkflowSteps);

  useEffect(() => {
    const handler = () => {
      setProcessesState(getStoredProcesses());
      setWorkflowStepsState(getStoredWorkflowSteps());
    };
    window.addEventListener(PROCESS_STORE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setProcesses = (newProcesses: Process[] | ((prev: Process[]) => Process[])) => {
    setProcessesState((prev) => {
      const updated = typeof newProcesses === "function" ? newProcesses(prev) : newProcesses;
      saveStoredProcesses(updated);
      return updated;
    });
  };

  const setWorkflowSteps = (
    newSteps: Record<string, WorkflowStep[]> | ((prev: Record<string, WorkflowStep[]>) => Record<string, WorkflowStep[]>)
  ) => {
    setWorkflowStepsState((prev) => {
      const updated = typeof newSteps === "function" ? newSteps(prev) : newSteps;
      saveStoredWorkflowSteps(updated);
      return updated;
    });
  };

  return {
    processes,
    setProcesses,
    workflowSteps,
    setWorkflowSteps,
    getWorkflowStepsForStage: (processId: string, stageId: string) => {
      return workflowSteps[stageId] ?? DEFAULT_WORKFLOW_STEPS["1-1"] ?? [];
    },
  };
}
