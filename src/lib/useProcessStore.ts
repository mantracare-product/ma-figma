import { useState, useEffect } from "react";
import { WorkflowStep } from "../app/types/workflow";

export interface AISettings {
  platform: string;
  voiceSpeed: number;
  voice?: string;
  tone?: string;
  style?: string;
}

export interface StageChannelSource {
  id: string;
  channel: "calls" | "sms" | "whatsapp" | "website";
  source: string;
}

export interface TransferNumberItem {
  id: string;
  countryCode: string;
  phoneNumber: string;
  isPrimary?: boolean;
}

export interface CallTriggerSettings {
  timingType: "immediate" | "wait";
  waitDuration: number;
  waitUnit: "minutes" | "hours" | "days" | "weeks" | "months";
  callingHoursType: "all_day" | "custom";
  callingHoursStart: string;
  callingHoursEnd: string;
  timezoneMode: "lead" | "custom";
  customTimezone: string;
  skipDays: string[];
  blackoutDates: Array<{ id: string; date: string; label?: string }>;
  recordCalls?: boolean;
  callDurationMinutes?: number;
  hangupWindowMinutes?: number;
  retryRulesEnabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  // Transfer Call
  transferCallEnabled?: boolean;
  transferNumbers?: TransferNumberItem[];
  transferPrimaryCountryCode?: string;
  transferPrimaryPhoneNumber?: string;
  transferSecondaryCountryCode?: string;
  transferSecondaryPhoneNumber?: string;
  transferCountryCode?: string;
  transferPhoneNumber?: string;
  transferVoiceResponse?: string;
  transferReason?: string;
}

export interface ProcessTransitionTarget {
  id?: string;
  targetProcessId: string;
  targetProcessName: string;
  targetStageId?: string;
  targetStageName: string;
  autoMove?: boolean;
  condition?: string;
  endCurrentProcess?: boolean;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  aiSettings?: AISettings;
  stageType?: string;
  selectedInboundNumbers?: string[];
  selectedStageChannels?: string[];
  channelSources?: StageChannelSource[];
  enableCalling?: boolean;
  callTriggerSettings?: CallTriggerSettings;
  isInitial?: boolean;
  isFinal?: boolean;
  isFinalStage?: boolean;
  stagePosition?: "initial" | "intermediate" | "final" | null;
  intentTrigger?: string; // "interested" | "not_interested" | "call_back" | "needs_info" | "disqualified" | "custom"
  intentLabel?: string;
  intentDescription?: string;
  endPipelineOnReach?: boolean; // System setting to end this pipeline and move to next pipeline
  nextProcessTransitions?: ProcessTransitionTarget[];
}

export interface ScopingRule {
  id?: string;
  industryCategory?: string;
  industries?: string[];
  locations?: string[];
}

export interface ProcessPermissions {
  canHide?: boolean;
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
}

export interface Process {
  id: string;
  name: string;
  description: string;
  assignedToUserId: number;
  stages: Stage[];
  aiSettings: AISettings;
  // Scoping & Tenant Permissions
  industryCategory?: string;
  industry?: string;
  locations?: string[];
  scopingRules?: ScopingRule[];
  permissions?: ProcessPermissions;
  source?: "system" | "template" | "custom";
}

export function isProcessMatchingScope(
  process: Process,
  filter: { category?: string; industry?: string; location?: string }
): boolean {
  if (!process) return true;
  const { category, industry, location } = filter;

  // Multi-rule scoping evaluation
  if (process.scopingRules && process.scopingRules.length > 0) {
    return process.scopingRules.some((rule) => {
      const rCat = rule.industryCategory?.trim();
      const rInds = (rule.industries || []).map((i) => i.trim()).filter((i) => i && i !== "All" && i !== "*");
      const rLocs = (rule.locations || []).map((l) => l.trim()).filter((l) => l && l !== "All" && l !== "*");

      const hasCat = Boolean(rCat && rCat !== "All" && rCat !== "*");
      const hasInd = rInds.length > 0;
      const hasLoc = rLocs.length > 0;

      // If rule is unconstrained, it matches all
      if (!hasCat && !hasInd && !hasLoc) return true;

      // Check category match
      if (category && category !== "all" && category !== "All") {
        if (hasCat && rCat?.toLowerCase() !== category.toLowerCase()) return false;
      }

      // Check industry match
      if (industry && industry !== "all" && industry !== "All") {
        if (hasInd && !rInds.some((i) => i.toLowerCase() === industry.toLowerCase())) return false;
      }

      // Check location match
      if (location && location !== "all" && location !== "All") {
        if (hasLoc && !rLocs.some((l) => l.toLowerCase() === location.toLowerCase())) return false;
      }

      return true;
    });
  }

  // Legacy single-scope fields fallback
  if (category && category !== "all" && category !== "All") {
    if (process.industryCategory && process.industryCategory !== "All" && process.industryCategory.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
  }

  if (industry && industry !== "all" && industry !== "All") {
    if (process.industry && process.industry !== "All" && process.industry.toLowerCase() !== industry.toLowerCase()) {
      return false;
    }
  }

  if (location && location !== "all" && location !== "All") {
    if (process.locations && process.locations.length > 0 && !process.locations.includes("All")) {
      if (!process.locations.some((l) => l.toLowerCase() === location.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

export function isProcessMatchingOrg(
  process: Process,
  org?: { industryCategory?: string; industry?: string; location?: string; locations?: string[] } | null
): boolean {
  if (!process) return true;
  if (!org) return true;
  return isProcessMatchingScope(process, {
    category: org.industryCategory,
    industry: org.industry,
    location: org.location || (org.locations && org.locations[0]),
  });
}

export const PROCESS_STORE_EVENT = "processStore_updated";
const PROCESSES_STORAGE_KEY = "process_store_processes";
const STEPS_STORAGE_KEY = "process_store_steps";
export const DEFAULT_CALL_TRIGGER_STORAGE_KEY = "mantra_default_call_trigger_settings";

export const DEFAULT_CALL_TRIGGER_SETTINGS: CallTriggerSettings = {
  timingType: "immediate",
  waitDuration: 15,
  waitUnit: "minutes",
  callingHoursType: "custom",
  callingHoursStart: "09:00",
  callingHoursEnd: "18:00",
  timezoneMode: "lead",
  customTimezone: "America/New_York",
  skipDays: ["Saturday", "Sunday"],
  blackoutDates: [],
  recordCalls: true,
  callDurationMinutes: 15,
  hangupWindowMinutes: 2,
  retryRulesEnabled: false,
  retryAttempts: 3,
  retryDelay: 5,
  transferCallEnabled: false,
  transferNumbers: [
    { id: "tn-1", countryCode: "+1", phoneNumber: "", isPrimary: true },
  ],
  transferPrimaryCountryCode: "+1",
  transferPrimaryPhoneNumber: "",
  transferSecondaryCountryCode: "+1",
  transferSecondaryPhoneNumber: "",
  transferVoiceResponse: "Please hold while I transfer your call",
  transferReason: "",
};

export function getDefaultCallTriggerSettings(): CallTriggerSettings {
  try {
    const raw = localStorage.getItem(DEFAULT_CALL_TRIGGER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_CALL_TRIGGER_SETTINGS;
}

export function saveDefaultCallTriggerSettings(settings: CallTriggerSettings) {
  try {
    localStorage.setItem(DEFAULT_CALL_TRIGGER_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
  } catch {}
}

export const DEFAULT_INITIAL_PROCESSES: Process[] = [
  {
    id: "1",
    name: "Patient Intake",
    description: "Initial patient onboarding, qualification and intent triage workflow",
    assignedToUserId: 1,
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "1-1", name: "Initial Contact", description: "First outreach to contact for basic info gathering", status: "active", color: "#3B82F6" },
      { id: "1-2", name: "Contacted", description: "Conversation in progress; AI listens to customer needs and determines intent", status: "active", color: "#06B6D4" },
      {
        id: "1-3",
        name: "Interested",
        description: "Customer expressed clear interest and wants to proceed",
        status: "active",
        color: "#22C55E",
        isFinalStage: true,
        intentTrigger: "interested",
        intentLabel: "Interested",
        intentDescription: "Caller agrees to schedule consultation or requests more info to proceed",
        endPipelineOnReach: true,
        nextProcessTransitions: [
          {
            id: "trans-1",
            targetProcessId: "2",
            targetProcessName: "Follow-up Calls",
            targetStageId: "2-1",
            targetStageName: "Post-Visit Check",
            autoMove: true,
            condition: "When intent is Interested",
            endCurrentProcess: true,
          },
        ],
      },
      {
        id: "1-4",
        name: "Not Interested",
        description: "Customer declined services or asked not to be contacted again",
        status: "active",
        color: "#EF4444",
        isFinalStage: true,
        intentTrigger: "not_interested",
        intentLabel: "Not Interested",
        intentDescription: "Caller politely declines or indicates no current need",
        endPipelineOnReach: true,
        nextProcessTransitions: [
          {
            id: "trans-2",
            targetProcessId: "3",
            targetProcessName: "Nurture Campaign",
            targetStageId: "3-1",
            targetStageName: "30-Day Nurture Drip",
            autoMove: true,
            condition: "When intent is Not Interested",
            endCurrentProcess: true,
          },
        ],
      },
      {
        id: "1-5",
        name: "Call Back Later",
        description: "Customer is busy or requested a follow-up at a specific date/time",
        status: "active",
        color: "#F59E0B",
        isFinalStage: true,
        intentTrigger: "call_back",
        intentLabel: "Call Back Later",
        intentDescription: "Caller requests follow-up at a convenient time",
        endPipelineOnReach: true,
        nextProcessTransitions: [
          {
            id: "trans-3",
            targetProcessId: "2",
            targetProcessName: "Follow-up Calls",
            targetStageId: "2-2",
            targetStageName: "Medication Reminder",
            autoMove: true,
            condition: "When intent is Call Back Later",
            endCurrentProcess: true,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "Follow-up Calls",
    description: "Post-visit follow-up, consultation onboarding, and reminders",
    assignedToUserId: 2,
    aiSettings: {
      platform: "Anthropic Claude",
      voiceSpeed: 1.2,
      voice: "Eva",
      tone: "Friendly",
      style: "Balanced",
    },
    stages: [
      { id: "2-1", name: "Post-Visit Check", description: "Check on patient after their visit or consultation", status: "active", color: "#3B82F6" },
      { id: "2-2", name: "Medication Reminder", description: "Remind patient to take their medication or confirm next step", status: "active", color: "#8B5CF6" },
      {
        id: "2-3",
        name: "Completed & Discharged",
        description: "Patient workflow fully completed",
        status: "active",
        color: "#10B981",
        isFinalStage: true,
        intentTrigger: "interested",
        intentLabel: "Completed Successfully",
        endPipelineOnReach: true,
      },
    ],
  },
  {
    id: "3",
    name: "Nurture Campaign",
    description: "Long-term patient re-engagement and educational newsletter outreach",
    assignedToUserId: 3,
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Empathetic",
      style: "Balanced",
    },
    stages: [
      { id: "3-1", name: "30-Day Nurture Drip", description: "Periodic educational check-ins", status: "active", color: "#6366F1" },
      { id: "3-2", name: "Re-engagement Call", description: "Follow up to see if healthcare needs have changed", status: "active", color: "#EC4899" },
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
  } catch { }
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
  } catch { }
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
