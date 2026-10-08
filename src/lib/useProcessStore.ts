import { useState, useEffect } from "react";
import { WorkflowStep } from "../app/types/workflow";
import { runEntityStageMigration } from "./entityMigration";

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

export type EntityType = "client" | "appointment" | "invoice" | "insurance" | "claim";

export interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  systemCategory?: string; // e.g. "booked", "completed", "draft", "paid", "verified"
  isSystemCategoryRequired?: boolean; // Required system categories cannot be deleted
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
  scopingRules?: ScopingRule[];
}

export interface ScopingRule {
  id?: string;
  industryCategory?: string;
  industries?: string[];
  locations?: string[];
  entities?: string[];
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
  entityType?: EntityType; // "client" | "appointment" | "invoice" | "insurance" | "claim" (default: "client")
  // Scoping & Tenant Permissions
  industryCategory?: string;
  industry?: string;
  locations?: string[];
  scopingRules?: ScopingRule[];
  permissions?: ProcessPermissions;
  source?: "system" | "template" | "custom";
  draft?: boolean;
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

export function isProcessMatchingScopingRules(
  process: Process,
  scopingRules?: ScopingRule[]
): boolean {
  if (!scopingRules || scopingRules.length === 0) return true;
  const activeRules = scopingRules.filter(
    (r) =>
      Boolean(r.industryCategory && r.industryCategory !== "All" && r.industryCategory !== "*") ||
      Boolean(r.industries && r.industries.length > 0 && !r.industries.includes("All")) ||
      Boolean(r.locations && r.locations.length > 0 && !r.locations.includes("All"))
  );
  if (activeRules.length === 0) return true;

  return activeRules.some((rule) => {
    return isProcessMatchingScope(process, {
      category: rule.industryCategory,
      industry: rule.industries?.[0],
      location: rule.locations?.[0],
    });
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

export const REQUIRED_SYSTEM_CATEGORIES: Record<EntityType, string[]> = {
  client: [],
  appointment: ["booked", "rescheduled", "completed", "cancelled"],
  invoice: ["draft", "paid", "void"],
  insurance: ["pending", "verified", "failed"],
  claim: ["draft", "submitted", "paid", "denied"],
};

export const DEFAULT_ENTITY_PROCESSES: Record<Exclude<EntityType, "client">, Process> = {
  appointment: {
    id: "process-appointment-default",
    name: "Appointment Flow",
    description: "Standard scheduling, attendance, and completion lifecycle",
    assignedToUserId: 1,
    entityType: "appointment",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "appt-1", name: "Booked", description: "Appointment confirmed and scheduled", status: "active", color: "#3B82F6", systemCategory: "booked", isSystemCategoryRequired: true, isInitial: true, stagePosition: "initial" },
      { id: "appt-2", name: "Rescheduled", description: "Appointment date or time moved", status: "active", color: "#F59E0B", systemCategory: "rescheduled", isSystemCategoryRequired: true, stagePosition: "intermediate" },
      { id: "appt-3", name: "Reminder", description: "Reminder notification dispatched", status: "active", color: "#8B5CF6", systemCategory: "reminder", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "appt-4", name: "Checked In", description: "Patient arrived at facility or joined session", status: "active", color: "#06B6D4", systemCategory: "checked_in", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "appt-5", name: "Completed", description: "Consultation successfully completed", status: "active", color: "#10B981", systemCategory: "completed", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "appt-6", name: "Cancelled", description: "Appointment cancelled by patient or clinic", status: "active", color: "#EF4444", systemCategory: "cancelled", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "appt-7", name: "No-show", description: "Patient did not attend scheduled time", status: "active", color: "#64748B", systemCategory: "no_show", isSystemCategoryRequired: false, isFinal: true, isFinalStage: true, stagePosition: "final" },
    ],
  },
  invoice: {
    id: "process-invoice-default",
    name: "Billing & Invoicing",
    description: "Patient and provider billing lifecycle from draft to settlement",
    assignedToUserId: 1,
    entityType: "invoice",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "inv-1", name: "Draft", description: "New invoice created, pending review", status: "active", color: "#64748B", systemCategory: "draft", isSystemCategoryRequired: true, isInitial: true, stagePosition: "initial" },
      { id: "inv-2", name: "Sent", description: "Invoice sent to client or payer", status: "active", color: "#3B82F6", systemCategory: "sent", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "inv-3", name: "Viewed", description: "Invoice viewed by recipient", status: "active", color: "#06B6D4", systemCategory: "viewed", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "inv-4", name: "Partially Paid", description: "Partial payment received", status: "active", color: "#F59E0B", systemCategory: "partially_paid", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "inv-5", name: "Paid", description: "Full balance settled", status: "active", color: "#10B981", systemCategory: "paid", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "inv-6", name: "Overdue", description: "Payment past due date", status: "active", color: "#F97316", systemCategory: "overdue", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "inv-7", name: "Void", description: "Invoice cancelled or voided", status: "active", color: "#EF4444", systemCategory: "void", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
    ],
  },
  insurance: {
    id: "process-insurance-default",
    name: "Insurance Verification",
    description: "Patient policy verification and coverage validation",
    assignedToUserId: 1,
    entityType: "insurance",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "ins-1", name: "Pending", description: "Eligibility verification in progress", status: "active", color: "#F59E0B", systemCategory: "pending", isSystemCategoryRequired: true, isInitial: true, stagePosition: "initial" },
      { id: "ins-2", name: "Verified", description: "Coverage active and verified", status: "active", color: "#10B981", systemCategory: "verified", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "ins-3", name: "Failed", description: "Coverage inactive or verification rejected", status: "active", color: "#EF4444", systemCategory: "failed", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
    ],
  },
  claim: {
    id: "process-claim-default",
    name: "Claims Management",
    description: "Submission, adjudication, and reimbursement lifecycle",
    assignedToUserId: 1,
    entityType: "claim",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "clm-1", name: "Draft", description: "Claim prepared, pending submission", status: "active", color: "#64748B", systemCategory: "draft", isSystemCategoryRequired: true, isInitial: true, stagePosition: "initial" },
      { id: "clm-2", name: "Submitted", description: "Sent to clearinghouse / payer", status: "active", color: "#3B82F6", systemCategory: "submitted", isSystemCategoryRequired: true, stagePosition: "intermediate" },
      { id: "clm-3", name: "In Review", description: "Under adjudication by payer", status: "active", color: "#8B5CF6", systemCategory: "in_review", isSystemCategoryRequired: false, stagePosition: "intermediate" },
      { id: "clm-4", name: "Paid", description: "Claim paid and reconciled", status: "active", color: "#10B981", systemCategory: "paid", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "clm-5", name: "Denied", description: "Claim denied or rejected by payer", status: "active", color: "#EF4444", systemCategory: "denied", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
    ],
  },
};

export function isRequiredSystemCategory(entityType: EntityType | undefined, category: string | undefined): boolean {
  if (!category) return false;
  const targetEntity = entityType || "client";
  const requiredList = REQUIRED_SYSTEM_CATEGORIES[targetEntity] || [];
  return requiredList.includes(category.toLowerCase().trim());
}

export function isStageDeletable(process: Process, stageId: string): { deletable: boolean; reason?: string } {
  if (!process?.stages) return { deletable: false, reason: "Process has no stages" };
  const stage = process.stages.find((s) => s.id === stageId);
  if (!stage) return { deletable: false, reason: "Stage not found" };

  if (process.stages.length <= 1) {
    return { deletable: false, reason: "A process must have at least one stage" };
  }

  if (stage.isSystemCategoryRequired || isRequiredSystemCategory(process.entityType, stage.systemCategory)) {
    return {
      deletable: false,
      reason: `Stages with required category "${stage.systemCategory || stage.name}" cannot be deleted.`,
    };
  }

  return { deletable: true };
}

export function getEntityProcess(
  processes: Process[],
  entityType: EntityType,
  org?: { industryCategory?: string; industry?: string; location?: string; locations?: string[] } | null
): Process | undefined {
  const entityProcs = processes.filter((p) => (p.entityType || "client") === entityType);
  if (org) {
    const matching = entityProcs.find((p) => isProcessMatchingOrg(p, org));
    if (matching) return matching;
  }
  if (entityType === "client") {
    return entityProcs[0];
  }
  return entityProcs[0] || DEFAULT_ENTITY_PROCESSES[entityType];
}

export function getEntityProcesses(
  processes: Process[],
  entityType: EntityType,
  org?: { industryCategory?: string; industry?: string; location?: string; locations?: string[] } | null
): Process[] {
  const entityProcs = processes.filter((p) => (p.entityType || "client") === entityType);
  if (org) {
    const matching = entityProcs.filter((p) => isProcessMatchingOrg(p, org));
    if (matching.length > 0) return matching;
  }
  return entityProcs.length > 0
    ? entityProcs
    : (entityType !== "client" && DEFAULT_ENTITY_PROCESSES[entityType] ? [DEFAULT_ENTITY_PROCESSES[entityType]] : []);
}

export const DEFAULT_INITIAL_PROCESSES: Process[] = [
  {
    id: "1",
    name: "Client Intake",
    description: "Initial client onboarding, qualification and intent triage workflow",
    assignedToUserId: 1,
    entityType: "client",
    source: "system",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "1-1", name: "Initial Contact", description: "First outreach to contact for basic info gathering", status: "active", color: "#3B82F6", isInitial: true, stagePosition: "initial" },
      { id: "1-2", name: "Contacted", description: "Conversation in progress; AI listens to customer needs and determines intent", status: "active", color: "#06B6D4", stagePosition: "intermediate" },
      {
        id: "1-3",
        name: "Interested",
        description: "Customer expressed clear interest and wants to proceed",
        status: "active",
        color: "#22C55E",
        isFinalStage: true,
        stagePosition: "final",
        intentTrigger: "interested",
        intentLabel: "Interested",
        intentDescription: "Caller agrees to schedule consultation or requests more info to proceed",
        endPipelineOnReach: true,
      },
      {
        id: "1-4",
        name: "Not Interested",
        description: "Customer declined services or asked not to be contacted again",
        status: "active",
        color: "#EF4444",
        isFinalStage: true,
        stagePosition: "final",
        intentTrigger: "not_interested",
        intentLabel: "Not Interested",
        intentDescription: "Caller politely declines or indicates no current need",
        endPipelineOnReach: true,
        nextProcessTransitions: [
          {
            id: "trans-reactivate",
            targetProcessId: "2",
            targetProcessName: "Client Reactivation",
            targetStageId: "2-1",
            targetStageName: "Outreach",
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
        stagePosition: "final",
        intentTrigger: "call_back",
        intentLabel: "Call Back Later",
        intentDescription: "Caller requests follow-up at a convenient time",
        endPipelineOnReach: true,
      },
    ],
  },
  {
    id: "2",
    name: "Client Reactivation",
    description: "Re-engagement outreach and reactivation for dormant or disengaged clients",
    assignedToUserId: 2,
    entityType: "client",
    source: "system",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Empathetic",
      style: "Balanced",
    },
    stages: [
      { id: "2-1", name: "Outreach", description: "First outreach to dormant or previously disengaged client", status: "active", color: "#3B82F6", isInitial: true, stagePosition: "initial" },
      { id: "2-2", name: "Contacted", description: "Conversation in progress to explore renewed interest", status: "active", color: "#06B6D4", stagePosition: "intermediate" },
      {
        id: "2-3",
        name: "Reactivated",
        description: "Client agreed to re-engage, book appointment, or resume services",
        status: "active",
        color: "#22C55E",
        isFinalStage: true,
        stagePosition: "final",
        intentTrigger: "interested",
        intentLabel: "Reactivated",
        intentDescription: "Client confirms desire to resume care or services",
        endPipelineOnReach: true,
      },
      {
        id: "2-4",
        name: "Call Back Later",
        description: "Client requested follow-up at a future date",
        status: "active",
        color: "#F59E0B",
        isFinalStage: true,
        stagePosition: "final",
        intentTrigger: "call_back",
        intentLabel: "Call Back Later",
        intentDescription: "Client asks for a follow-up at a later time",
        endPipelineOnReach: true,
      },
      {
        id: "2-5",
        name: "Lost",
        description: "Client declined re-engagement or unreachable",
        status: "active",
        color: "#EF4444",
        isFinalStage: true,
        stagePosition: "final",
        intentTrigger: "not_interested",
        intentLabel: "Lost",
        intentDescription: "Client not interested or opted out of communications",
        endPipelineOnReach: true,
      },
    ],
  },
  DEFAULT_ENTITY_PROCESSES.appointment,
  DEFAULT_ENTITY_PROCESSES.invoice,
  DEFAULT_ENTITY_PROCESSES.insurance,
  DEFAULT_ENTITY_PROCESSES.claim,
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
  let list: Process[] = [];
  try {
    const raw = localStorage.getItem(PROCESSES_STORAGE_KEY);
    list = raw ? JSON.parse(raw) : DEFAULT_INITIAL_PROCESSES;
    if (!Array.isArray(list) || list.length === 0) {
      list = [...DEFAULT_INITIAL_PROCESSES];
    }
  } catch {
    list = [...DEFAULT_INITIAL_PROCESSES];
  }

  let changed = false;

  // Migration: Ensure only Client Intake and Client Reactivation exist as standard client workflow processes
  const legacyClientNames = ["Patient Intake", "Follow-up Calls", "Nurture Campaign", "Billing Support", "Payment Reminder", "Insurance Verification", "Appointment Scheduling"];
  const hasLegacyClient = list.some(
    (p) => (!p.entityType || p.entityType === "client") && legacyClientNames.some((legacy) => p.name?.toLowerCase().includes(legacy.toLowerCase()))
  );
  if (hasLegacyClient) {
    const nonLegacy = list.filter((p) => {
      const isClient = !p.entityType || p.entityType === "client";
      if (!isClient) return true;
      return !legacyClientNames.some((legacy) => p.name?.toLowerCase().includes(legacy.toLowerCase()));
    });
    const defaultClientProcs = DEFAULT_INITIAL_PROCESSES.filter((p) => !p.entityType || p.entityType === "client");
    for (const dcp of [...defaultClientProcs].reverse()) {
      if (!nonLegacy.some((p) => p.name?.toLowerCase() === dcp.name?.toLowerCase())) {
        nonLegacy.unshift(dcp);
      }
    }
    list = nonLegacy;
    changed = true;
  }

  // Ensure existing client processes have entityType assigned
  list = list.map((p) => {
    if (!p.entityType) {
      changed = true;
      return { ...p, entityType: "client" as EntityType };
    }
    return p;
  });

  // Ensure singleton processes for non-client entities exist
  const nonClientTypes: Array<Exclude<EntityType, "client">> = ["appointment", "invoice", "insurance", "claim"];
  for (const et of nonClientTypes) {
    const exists = list.some((p) => p.entityType === et);
    if (!exists) {
      list.push(DEFAULT_ENTITY_PROCESSES[et]);
      changed = true;
    }
  }

  // Ensure systemCategory and isSystemCategoryRequired flags are set properly
  list = list.map((p) => {
    if (p.entityType && p.entityType !== "client") {
      const defaultProc = DEFAULT_ENTITY_PROCESSES[p.entityType];
      if (defaultProc) {
        const updatedStages = p.stages.map((st) => {
          const defaultStage = defaultProc.stages.find((ds) => ds.id === st.id || ds.systemCategory === st.systemCategory);
          const req = isRequiredSystemCategory(p.entityType, st.systemCategory || defaultStage?.systemCategory);
          return {
            ...st,
            systemCategory: st.systemCategory || defaultStage?.systemCategory,
            isSystemCategoryRequired: req || defaultStage?.isSystemCategoryRequired || false,
          };
        });
        return { ...p, stages: updatedStages };
      }
    }
    return p;
  });

  if (changed) {
    try {
      localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  // Trigger one-time entity migration if needed
  try {
    runEntityStageMigration(list);
  } catch (err) {
    console.warn("Entity stage migration notice:", err);
  }

  return list;
}

export function getActiveOrganizationSync(): {
  id: string;
  name?: string;
  industryCategory?: string;
  industry?: string;
  location?: string;
  locations?: string[];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const rawOrgs = localStorage.getItem("mantra_organizations_v1");
    const orgs = rawOrgs ? JSON.parse(rawOrgs) : [];
    const activeOrgId = localStorage.getItem("mantra_active_org_id_v1") || (orgs[0] && orgs[0].id);
    const rawActive = orgs.find((o: any) => o.id === activeOrgId) || orgs[0];
    const sessionOverrideRaw = sessionStorage.getItem("mantra_org_session_override_v1");
    const sessionOverride = sessionOverrideRaw ? JSON.parse(sessionOverrideRaw) : null;
    if (rawActive) {
      return { ...rawActive, ...(sessionOverride || {}) };
    }
  } catch {}
  return null;
}

export function saveStoredProcesses(processes: Process[]) {
  try {
    const nonClientTypes: Array<Exclude<EntityType, "client">> = ["appointment", "invoice", "insurance", "claim"];
    const sanitized: Process[] = [];

    // 1. Client processes (free to add, edit, delete, reorder)
    for (const p of processes) {
      if (!p.entityType || p.entityType === "client") {
        sanitized.push({ ...p, entityType: "client" });
      }
    }

    // 2. Non-client processes (supports multiple processes per entity with scoping rules)
    for (const et of nonClientTypes) {
      const candidates = processes.filter((p) => p.entityType === et);
      if (candidates.length > 0) {
        sanitized.push(...candidates);
      } else {
        sanitized.push(DEFAULT_ENTITY_PROCESSES[et]);
      }
    }

    localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(sanitized));
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
