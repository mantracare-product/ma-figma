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
  callingNumber?: string;
  callingNumbers?: string[];
  recordCalls?: boolean;
  callDurationMinutes?: number;
  hangupWindowMinutes?: number;
  detectVoicemail?: boolean;
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
  // AI Model Settings
  aiModel?: string;
  aiVoiceSpeed?: number;
  aiVoice?: string;
  aiTone?: string;
  aiStyle?: string;
  aiSettings?: AISettings;
}

export interface ChatbotSettings {
  enableWhatsapp?: boolean;
  whatsappNumber?: string;
  whatsappNumbers?: string[];
  enableSms?: boolean;
  smsNumber?: string;
  smsNumbers?: string[];
  enableWebsite?: boolean;
  websiteSource?: string;
  welcomeMessage?: string;
  botModel?: string;
  autoCreateClient?: boolean;
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

export interface StagePortalReceptionSettings {
  enabled?: boolean;
  enabledPortal?: boolean;
  enabledReception?: boolean;
  cardTitle?: string;
  cardDescription?: string;
  text?: string;
  htmlContent?: string;
  videos?: Array<{ id: string; title: string; url: string }>;
  links?: Array<{ id: string; title: string; url: string }>;
  images?: Array<{ id: string; title: string; url: string }>;
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  status: string;
  color?: string;
  systemCategory?: string; // e.g. "booked", "completed", "draft", "paid", "verified"
  isSystemCategoryRequired?: boolean; // Required system categories cannot be deleted
  isPredefined?: boolean; // Predefined stages cannot be deleted
  aiSettings?: AISettings;
  stageType?: string;
  selectedInboundNumbers?: string[];
  selectedStageChannels?: string[];
  channelSources?: StageChannelSource[];
  enableCalling?: boolean;
  callTriggerSettings?: CallTriggerSettings;
  enableChatbot?: boolean;
  chatbotSettings?: ChatbotSettings;
  connectedToPatientPortal?: boolean;
  connectedToAiReceptionist?: boolean;
  portalReceptionSettings?: StagePortalReceptionSettings;
  receptionStationId?: string;
  receptionAutoAdvance?: boolean;
  receptionIsOptional?: boolean;
  isInitial?: boolean;
  isFinal?: boolean;
  isFinalStage?: boolean;
  stagePosition?: "initial" | "intermediate" | "final" | null;
  stageCategory?: "in_progress" | "success" | "lost";
  intentTrigger?: string; // "interested" | "not_interested" | "call_back" | "needs_info" | "disqualified" | "custom"
  intentLabel?: string;
  intentDescription?: string;
  endPipelineOnReach?: boolean; // System setting to end this pipeline and move to next pipeline
  nextProcessTransitions?: ProcessTransitionTarget[];
  scopingRules?: ScopingRule[];
  workflowSteps?: WorkflowStep[];
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
  receptionEnabled?: boolean;
  enableCalling?: boolean;
  callTriggerSettings?: CallTriggerSettings;
  enableChatbot?: boolean;
  chatbotSettings?: ChatbotSettings;
  connectedToPatientPortal?: boolean;
  connectedToAiReceptionist?: boolean;
  entityType?: EntityType; // "client" | "appointment" | "invoice" | "insurance" | "claim" (default: "client")
  assignedServiceIds?: (number | string)[]; // Assigned products & services for this workflow
  assignedProductIds?: (number | string)[];
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
    const inds = (rule.industries || []).filter((i) => i && i !== "All" && i !== "*");
    const locs = (rule.locations || []).filter((l) => l && l !== "All" && l !== "*");

    if (inds.length === 0 && locs.length === 0) {
      return isProcessMatchingScope(process, {
        category: rule.industryCategory,
      });
    }

    if (inds.length > 0) {
      return inds.some((ind) =>
        locs.length > 0
          ? locs.some((loc) => isProcessMatchingScope(process, { category: rule.industryCategory, industry: ind, location: loc }))
          : isProcessMatchingScope(process, { category: rule.industryCategory, industry: ind })
      );
    }

    return locs.some((loc) =>
      isProcessMatchingScope(process, { category: rule.industryCategory, location: loc })
    );
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
  callingNumber: "+1 (555) 123-4567",
  callingNumbers: ["+1 (555) 123-4567"],
  recordCalls: true,
  callDurationMinutes: 15,
  hangupWindowMinutes: 2,
  detectVoicemail: true,
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
  aiModel: "Gemini 2.5 Flash",
  aiVoiceSpeed: 1.0,
  aiVoice: "Ava",
  aiTone: "Professional",
  aiStyle: "Balanced",
  aiSettings: {
    platform: "Gemini 2.5 Flash",
    voiceSpeed: 1.0,
    voice: "Ava",
    tone: "Professional",
    style: "Balanced",
  },
};

export const DEFAULT_CHATBOT_SETTINGS: ChatbotSettings = {
  enableWhatsapp: true,
  whatsappNumber: "+1 (555) 123-4567",
  whatsappNumbers: ["+1 (555) 123-4567"],
  enableSms: true,
  smsNumber: "+1 (555) 123-4567",
  smsNumbers: ["+1 (555) 123-4567"],
  enableWebsite: true,
  websiteSource: "Mantra AI Web Widget",
  welcomeMessage: "Hello! How can I assist you today?",
  botModel: "Gemini 2.5 Flash",
  autoCreateClient: true,
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
  insurance: ["draft", "submitted", "paid", "failed"],
  claim: ["draft", "submitted", "paid", "denied"],
};

export function createDefaultStagesForEntity(entityType: EntityType, processIdPrefix: string): Stage[] {
  if (entityType === "appointment") {
    return [
      {
        id: processIdPrefix === "appt" ? "appt-1" : `${processIdPrefix}-appt-booked`,
        name: "Booked",
        description: "Appointment confirmed and scheduled",
        status: "active",
        color: "#3B82F6",
        systemCategory: "booked",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "in_progress",
        stagePosition: "initial",
        isInitial: true,
        workflowSteps: [
          {
            id: `step-fixed-booked-${Date.now()}-1`,
            name: "Book Appointment",
            description: "Fixed action: Automatically books and confirms the appointment in the system",
            iconKey: "calendar",
            stepKey: "book_appointment",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: processIdPrefix === "appt" ? "appt-2" : `${processIdPrefix}-appt-reminder`,
        name: "Reminder",
        description: "Reminder notification dispatched prior to session",
        status: "active",
        color: "#8B5CF6",
        systemCategory: "reminder",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "in_progress",
        stagePosition: "intermediate",
        workflowSteps: [
          {
            id: `step-reminder-${Date.now()}-2`,
            name: "Send Upcoming Reminder",
            description: "Automated reminder message dispatched to client",
            iconKey: "messagecircle",
            stepKey: "whatsapp",
            trigger: "stage",
            enabled: true,
          },
        ],
      },
      {
        id: processIdPrefix === "appt" ? "appt-3" : `${processIdPrefix}-appt-completed`,
        name: "Completed",
        description: "Consultation successfully completed",
        status: "active",
        color: "#10B981",
        systemCategory: "completed",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "success",
        stagePosition: "final",
        isFinal: true,
        isFinalStage: true,
        workflowSteps: [
          {
            id: `step-fixed-completed-${Date.now()}-3`,
            name: "Complete Appointment",
            description: "Fixed action: Closes appointment session and marks as completed",
            iconKey: "calendar",
            stepKey: "complete_appointment",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: processIdPrefix === "appt" ? "appt-4" : `${processIdPrefix}-appt-reschedule`,
        name: "Reschedule",
        description: "Appointment date or time moved or rescheduled",
        status: "active",
        color: "#F59E0B",
        systemCategory: "rescheduled",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "lost",
        stagePosition: "final",
        isFinal: true,
        isFinalStage: true,
        workflowSteps: [
          {
            id: `step-fixed-reschedule-${Date.now()}-4`,
            name: "Reschedule Appointment",
            description: "Fixed action: Flags appointment as rescheduled and opens rebooking workflow",
            iconKey: "calendar",
            stepKey: "reschedule_appointment",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: processIdPrefix === "appt" ? "appt-7" : `${processIdPrefix}-appt-noshow`,
        name: processIdPrefix === "appt" ? "No-show" : "No show",
        description: "Patient did not attend scheduled time",
        status: "active",
        color: "#64748B",
        systemCategory: "no_show",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "lost",
        stagePosition: "final",
        isFinal: true,
        isFinalStage: true,
        workflowSteps: [
          {
            id: `step-fixed-noshow-${Date.now()}-5`,
            name: "Mark No-Show",
            description: "Fixed action: Records missed appointment and triggers follow-up",
            iconKey: "calendar",
            stepKey: "no_show_appointment",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
    ];
  }

  if (entityType === "invoice") {
    return [
      {
        id: `${processIdPrefix}-inv-draft`,
        name: "Draft",
        description: "New invoice created, pending review",
        status: "active",
        color: "#64748B",
        systemCategory: "draft",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "in_progress",
        stagePosition: "initial",
        isInitial: true,
        workflowSteps: [
          {
            id: `step-fixed-draft-${Date.now()}-1`,
            name: "Create Draft Invoice",
            description: "Fixed action: Initializes draft invoice and computes line items",
            iconKey: "filetext",
            stepKey: "generate_invoice",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: `${processIdPrefix}-inv-payment-recorded`,
        name: "Payment recorded",
        description: "Payment or transaction has been received and recorded",
        status: "active",
        color: "#3B82F6",
        systemCategory: "payment_recorded",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "in_progress",
        stagePosition: "intermediate",
        workflowSteps: [
          {
            id: `step-fixed-payment-${Date.now()}-2`,
            name: "Record Payment",
            description: "Fixed action: Automatically records payment against invoice balance",
            iconKey: "creditcard",
            stepKey: "record_payment",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: `${processIdPrefix}-inv-paid`,
        name: "Paid",
        description: "Full balance settled and receipt generated",
        status: "active",
        color: "#10B981",
        systemCategory: "paid",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "success",
        stagePosition: "final",
        isFinal: true,
        isFinalStage: true,
        workflowSteps: [
          {
            id: `step-fixed-paid-${Date.now()}-3`,
            name: "Mark Paid & Issue Receipt",
            description: "Fixed action: Closes invoice as paid and generates receipt",
            iconKey: "creditcard",
            stepKey: "mark_paid",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
      {
        id: `${processIdPrefix}-inv-overdue`,
        name: "Overdue",
        description: "Payment past due date",
        status: "active",
        color: "#EF4444",
        systemCategory: "overdue",
        isSystemCategoryRequired: true,
        isPredefined: true,
        stageCategory: "lost",
        stagePosition: "final",
        isFinal: true,
        isFinalStage: true,
        workflowSteps: [
          {
            id: `step-fixed-overdue-${Date.now()}-4`,
            name: "Mark Overdue & Notice",
            description: "Fixed action: Flags invoice as past due and dispatches payment reminder",
            iconKey: "filetext",
            stepKey: "mark_overdue",
            trigger: "stage",
            enabled: true,
            isFixed: true,
            isFixedAction: true,
          },
        ],
      },
    ];
  }

  // Default Process / Client: Stage 1 (Inprogress), Stage 2 (Won), Stage 3 (Lost)
  return [
    {
      id: `${processIdPrefix}-stg-1`,
      name: "Stage 1",
      description: "Initial intake and active engagement",
      status: "active",
      color: "#3B82F6",
      isPredefined: true,
      isSystemCategoryRequired: true,
      stageCategory: "in_progress",
      stagePosition: "initial",
      isInitial: true,
    },
    {
      id: `${processIdPrefix}-stg-2`,
      name: "Stage 2",
      description: "Successful outcome reached (Won)",
      status: "active",
      color: "#10B981",
      isPredefined: true,
      isSystemCategoryRequired: true,
      stageCategory: "success",
      stagePosition: "final",
      isFinal: true,
      isFinalStage: true,
    },
    {
      id: `${processIdPrefix}-stg-3`,
      name: "Stage 3",
      description: "Unsuccessful or lost engagement (Lost)",
      status: "active",
      color: "#EF4444",
      isPredefined: true,
      isSystemCategoryRequired: true,
      stageCategory: "lost",
      stagePosition: "final",
      isFinal: true,
      isFinalStage: true,
    },
  ];
}

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
    stages: createDefaultStagesForEntity("appointment", "appt"),
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
    stages: createDefaultStagesForEntity("invoice", "inv"),
  },
  insurance: {
    id: "process-insurance-default",
    name: "Insurance and Claims",
    description: "Patient policy verification, coverage validation, and claims management",
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
      { id: "ins-1", name: "Draft & Intake", description: "Patient policy info collected and claim intake prepared", status: "active", color: "#64748B", systemCategory: "draft", stageCategory: "in_progress", isSystemCategoryRequired: true, isInitial: true, stagePosition: "initial" },
      { id: "ins-2", name: "Coverage Verified", description: "Eligibility, benefits, copay and deductible verified", status: "active", color: "#06B6D4", systemCategory: "verified_coverage", stageCategory: "in_progress", stagePosition: "intermediate" },
      { id: "ins-3", name: "Submitted (837P)", description: "Electronic claim submitted to clearinghouse / payer", status: "active", color: "#3B82F6", systemCategory: "submitted", stageCategory: "in_progress", isSystemCategoryRequired: true, stagePosition: "intermediate" },
      { id: "ins-4", name: "Under Review", description: "Payer adjudication and claims review in progress", status: "active", color: "#F59E0B", systemCategory: "in_review", stageCategory: "in_progress", stagePosition: "intermediate" },
      { id: "ins-5", name: "Paid & Settled", description: "Claim paid in full and reconciled with billing", status: "active", color: "#10B981", systemCategory: "paid", stageCategory: "success", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
      { id: "ins-6", name: "Denied", description: "Claim denied or coverage verification failed", status: "active", color: "#EF4444", systemCategory: "failed", stageCategory: "lost", isSystemCategoryRequired: true, isFinal: true, isFinalStage: true, stagePosition: "final" },
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

export function isPredefinedStage(stage: Stage | null | undefined, entityType?: EntityType | string): boolean {
  if (!stage) return false;
  if (stage.isPredefined || stage.isSystemCategoryRequired) return true;
  if (stage.workflowSteps?.some((ws) => ws.isFixed || ws.isFixedAction)) return true;

  const nameLower = (stage.name || "").trim().toLowerCase();
  const ent = (entityType || "client").toLowerCase();

  if (ent === "appointment") {
    if (["booked", "reminder", "completed", "reschedule", "no show", "no-show"].includes(nameLower)) {
      return true;
    }
  }
  if (ent === "invoice") {
    if (["draft", "payment recorded", "paid", "overdue"].includes(nameLower)) {
      return true;
    }
  }
  if (ent === "process" || ent === "client") {
    if (["stage 1", "stage 2", "stage 3"].includes(nameLower)) {
      return true;
    }
  }

  // Fallback: If stage name matches any predefined name across appointment/invoice/process
  if (
    [
      "booked",
      "reminder",
      "completed",
      "reschedule",
      "no show",
      "no-show",
      "draft",
      "payment recorded",
      "paid",
      "overdue",
      "stage 1",
      "stage 2",
      "stage 3",
    ].includes(nameLower)
  ) {
    return true;
  }

  return false;
}

export function isStageDeletable(process: Process, stageId: string): { deletable: boolean; reason?: string } {
  if (!process?.stages) return { deletable: false, reason: "Process has no stages" };
  const stage = process.stages.find((s) => s.id === stageId);
  if (!stage) return { deletable: false, reason: "Stage not found" };

  if (process.stages.length <= 1) {
    return { deletable: false, reason: "A process must have at least one stage" };
  }

  // Predefined stages cannot be deleted
  if (isPredefinedStage(stage, process.entityType)) {
    return { deletable: false, reason: "Predefined workflow stages cannot be deleted" };
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

export const DEMO_PATIENT_PORTAL_PROCESS_ID = "demo-patient-care-journey";

export const DEMO_PATIENT_PORTAL_PROCESS: Process = {
  id: DEMO_PATIENT_PORTAL_PROCESS_ID,
  name: "Patient Care Journey",
  description: "End-to-end clinical journey across AI Receptionist and Patient Self-Service Portal",
  assignedToUserId: 1,
  entityType: "client",
  source: "system",
  connectedToPatientPortal: true,
  connectedToAiReceptionist: true,
  receptionEnabled: true,
  aiSettings: {
    platform: "Gemini 2.5 Flash",
    voiceSpeed: 1.0,
    voice: "Ava",
    tone: "Professional",
    style: "Balanced",
  },
  stages: [
    {
      id: "stage-client-checked-in",
      name: "Client Checked In",
      description: "Patient registered at AI Receptionist or verified via Patient Portal QR code scan",
      status: "active",
      color: "#06B6D4",
      isInitial: true,
      stagePosition: "initial",
      stageCategory: "in_progress",
      connectedToPatientPortal: true,
      connectedToAiReceptionist: true,
      portalReceptionSettings: {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Client Checked In",
        cardDescription: "Your hospital arrival and token have been verified. Welcome to Mantra Care!",
        htmlContent: "<h3>Check-in Verified</h3><p>Welcome to Mantra Care! Your arrival has been recorded. Please wait in the lounge for your appointment.</p><p><strong>Patient:</strong> {{client.name}}<br/><strong>Client ID:</strong> {{client.id}}</p>",
      },
    },
    {
      id: "stage-book-appointment",
      name: "Book Appointment",
      description: "Patient schedules consultation with doctor or clinical specialist",
      status: "active",
      color: "#3B82F6",
      stagePosition: "intermediate",
      stageCategory: "in_progress",
      connectedToPatientPortal: false,
      connectedToAiReceptionist: false,
      portalReceptionSettings: {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Doctor Consultation Booking",
        cardDescription: "Select your specialist and convenient time slot.",
        htmlContent: "<h3>Schedule Consultation</h3><p>Choose your doctor, consultation type, and preferred slot.</p>",
      },
    },
    {
      id: "stage-move-to-pharmacy",
      name: "Move to Pharmacy",
      description: "Informational step: buy prescribed medicine at dispensary counter",
      status: "active",
      color: "#8B5CF6",
      stagePosition: "intermediate",
      stageCategory: "in_progress",
      connectedToPatientPortal: false,
      connectedToAiReceptionist: false,
      portalReceptionSettings: {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Dispensary Counter Directions",
        cardDescription: "Pick up your digital e-prescription at Pharmacy Counter B.",
        htmlContent: "<h3>Dispensary & Pharmacy</h3><p>Your electronic prescription has been dispatched to Pharmacy Counter B.</p>",
      },
    },
    {
      id: "stage-pay-bill",
      name: "Pay Bill",
      description: "Patient reviews clinical consultation and medication bill invoice",
      status: "active",
      color: "#F59E0B",
      stagePosition: "intermediate",
      stageCategory: "in_progress",
      connectedToPatientPortal: false,
      connectedToAiReceptionist: false,
      portalReceptionSettings: {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Invoice Settlement",
        cardDescription: "Review items and complete secure settlement.",
        htmlContent: "<h3>Billing & Payment</h3><p>Review and settle your outpatient consultation fee.</p>",
      },
    },
    {
      id: "stage-payment-done",
      name: "Payment Done",
      description: "Frontend demo QR payment settlement and invoice confirmation",
      status: "active",
      color: "#10B981",
      isFinal: true,
      isFinalStage: true,
      stagePosition: "final",
      stageCategory: "success",
      connectedToPatientPortal: false,
      connectedToAiReceptionist: false,
      portalReceptionSettings: {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Receipt & Discharge Confirmation",
        cardDescription: "Payment confirmed. Download your official tax invoice.",
        htmlContent: "<h3>Payment Settled</h3><p>Thank you! Your payment is complete. You may download your receipt.</p>",
      },
    },
  ],
};

export function isStageEnabledForPortal(stage: Stage): boolean {
  if (!stage) return false;
  const isEnabled = Boolean(
    stage.connectedToPatientPortal ||
    stage.portalReceptionSettings?.enabledPortal ||
    stage.portalReceptionSettings?.enabled
  );
  return isEnabled;
}

export function isProcessConnectedToPortal(proc: Process): boolean {
  if (!proc) return false;
  return Boolean(
    proc.connectedToPatientPortal ||
    proc.connectedToAiReceptionist ||
    proc.stages?.some((s) => isStageEnabledForPortal(s))
  );
}

export function getProcessesForPatientPortal(): Process[] {
  return getStoredProcesses().filter(isProcessConnectedToPortal);
}

export function getProcessesForAiReceptionist(): Process[] {
  return getStoredProcesses().filter((p) => Boolean(p.connectedToAiReceptionist));
}

export function isStageEnabledForAiReceptionist(stage: Stage): boolean {
  if (!stage) return false;
  const isEnabled = Boolean(
    stage.connectedToAiReceptionist ||
    stage.portalReceptionSettings?.enabledReception ||
    stage.portalReceptionSettings?.enabled
  );
  if (!isEnabled) return false;
  // Stage is only shown if configuration is actually done (has cardTitle or htmlContent configured)
  const isConfigured = Boolean(
    stage.portalReceptionSettings?.cardTitle?.trim() ||
    stage.portalReceptionSettings?.htmlContent?.trim()
  );
  return isConfigured;
}

export const DEFAULT_INITIAL_PROCESSES: Process[] = [
  DEMO_PATIENT_PORTAL_PROCESS,
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
        stageCategory: "success",
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
        stageCategory: "lost",
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
        stageCategory: "lost",
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

  // Filter out claim entity processes from workflows
  const beforeLen = list.length;
  list = list.filter((p) => p.entityType !== "claim");
  if (list.length !== beforeLen) changed = true;

  // Rename insurance entity process to "Insurance and Claims" and populate in-progress stages if missing
  list = list.map((p) => {
    if (p.entityType === "insurance") {
      const hasInProgress = p.stages.some(
        (s) => s.stageCategory === "in_progress" && !s.isFinalStage && !s.isFinal
      );
      if (!hasInProgress || p.stages.length <= 3) {
        changed = true;
        return {
          ...p,
          name: "Insurance and Claims",
          stages: DEFAULT_ENTITY_PROCESSES.insurance.stages,
        };
      } else if (p.name === "Insurance Verification" || p.name === "Insurance") {
        changed = true;
        return { ...p, name: "Insurance and Claims" };
      }
    }
    return p;
  });

  // Ensure existing client processes have entityType assigned
  list = list.map((p) => {
    if (!p.entityType) {
      changed = true;
      return { ...p, entityType: "client" as EntityType };
    }
    return p;
  });

  // Ensure stageCategory is properly populated for outcome stages, strictly enforcing SINGLE WON STAGE per process
  list = list.map((p) => {
    let hasWonStage = false;
    const updatedStages = p.stages.map((st) => {
      const lower = (st.name || "").toLowerCase().trim();

      // Check explicit lost intents first to avoid substring collision (e.g. "not interested" containing "interested")
      const isLostExplicit =
        st.intentTrigger === "not_interested" ||
        st.intentTrigger === "call_back" ||
        lower.includes("not interested") ||
        lower.includes("not_interested") ||
        lower.includes("lost") ||
        lower.includes("unqualified") ||
        lower.includes("cancel") ||
        lower.includes("call back") ||
        (lower.includes("not") && lower.includes("interest"));

      if (isLostExplicit) {
        if (st.stageCategory !== "lost" || !st.isFinalStage) {
          changed = true;
          return { ...st, stageCategory: "lost" as const, isFinalStage: true, isFinal: true };
        }
        return st;
      }

      // Check won candidate
      const isWonCandidate =
        !isLostExplicit &&
        (st.stageCategory === "success" ||
          st.intentTrigger === "interested" ||
          lower === "won" ||
          lower === "interested" ||
          lower.includes("closed won") ||
          (lower.includes("interested") && !lower.includes("not")) ||
          lower.includes("qualified") ||
          lower.includes("success"));

      if (isWonCandidate) {
        if (!hasWonStage) {
          hasWonStage = true;
          if (st.stageCategory !== "success") {
            changed = true;
            return { ...st, stageCategory: "success" as const };
          }
          return st;
        } else {
          // Process already has a won stage! Enforce single Won stage rule.
          changed = true;
          return { ...st, stageCategory: "lost" as const, isFinalStage: true, isFinal: true };
        }
      }

      // If stage was previously tagged success, check against single won constraint
      if (st.stageCategory === "success") {
        if (!hasWonStage) {
          hasWonStage = true;
          return st;
        } else {
          changed = true;
          return { ...st, stageCategory: "lost" as const, isFinalStage: true, isFinal: true };
        }
      }

      return st;
    });
    return { ...p, stages: updatedStages };
  });

  // Ensure Demo Patient Care Journey exists and is connected to portal
  const demoProcIdx = list.findIndex((p) => p.id === DEMO_PATIENT_PORTAL_PROCESS_ID || p.name === "Patient Care Journey");
  if (demoProcIdx === -1) {
    list.unshift(DEMO_PATIENT_PORTAL_PROCESS);
    changed = true;
  } else {
    const existingDemo = list[demoProcIdx];
    if (!existingDemo.connectedToPatientPortal) {
      existingDemo.connectedToPatientPortal = true;
      existingDemo.connectedToAiReceptionist = true;
      changed = true;
    }
    const checkinSt = existingDemo.stages.find((s) => s.id === "stage-client-checked-in" || s.name === "Client Checked In");
    if (checkinSt && (!checkinSt.connectedToPatientPortal || !checkinSt.portalReceptionSettings)) {
      checkinSt.connectedToPatientPortal = true;
      checkinSt.connectedToAiReceptionist = true;
      checkinSt.portalReceptionSettings = {
        enabled: true,
        enabledPortal: true,
        enabledReception: true,
        cardTitle: "Client Checked In",
        cardDescription: "Your hospital arrival and token have been verified. Welcome to Mantra Care!",
        htmlContent: "<h3>Check-in Verified</h3><p>Welcome to Mantra Care! Your arrival has been recorded. Please wait in the lounge for your appointment.</p><p><strong>Patient:</strong> {{client.name}}<br/><strong>Client ID:</strong> {{client.id}}</p>",
      };
      changed = true;
    }
  }

  // Ensure singleton processes for non-client entities exist
  const nonClientTypes: Array<Exclude<EntityType, "client">> = ["appointment", "invoice", "insurance"];
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
    const nonClientTypes: Array<Exclude<EntityType, "client">> = ["appointment", "invoice", "insurance"];
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
  if ((stage as any)?.workflowSteps && (stage as any).workflowSteps.length > 0) {
    return (stage as any).workflowSteps;
  }
  const stored = getStoredWorkflowSteps();
  return stored[stageId] ?? (stage as any)?.workflowSteps ?? [];
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
      const proc = processes.find((p) => p.id === processId);
      const stage = proc?.stages.find((s) => s.id === stageId);
      if ((stage as any)?.workflowSteps && (stage as any).workflowSteps.length > 0) {
        return (stage as any).workflowSteps;
      }
      return workflowSteps[stageId] ?? (stage as any)?.workflowSteps ?? DEFAULT_WORKFLOW_STEPS["1-1"] ?? [];
    },
  };
}
