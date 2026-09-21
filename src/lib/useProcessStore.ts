import { useState, useEffect } from "react";
import { WorkflowStep } from "../app/types/workflow";
import { broadcastSync, onSyncEvent } from "./syncBroadcast";

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

export type PipelineType = "OPD" | "IPD" | "Operation";

export interface PatientStageChecklistItem {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface PatientStageConsent {
  id: string;
  title: string;
  description?: string;
  content: string;
  requiresSignature?: boolean;
}

export interface PatientStageDocRequest {
  id: string;
  title: string;
  description?: string;
  acceptedTypes?: string;
  required?: boolean;
}

export interface PatientFacingStageContent {
  infoText?: string;
  instructions?: string[];
  badge?: string;
  estimatedWaitTime?: string;
  roomOrCounter?: string;
  doctorName?: string;
  checklist?: PatientStageChecklistItem[];
  consent?: PatientStageConsent;
  documentRequests?: PatientStageDocRequest[];
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
  patientFacingContent?: PatientFacingStageContent;
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
  pipelineType?: PipelineType;
  category?: "patient_front" | "ai_calling";
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
    description: "Initial patient onboarding and verification process",
    assignedToUserId: 1,
    pipelineType: "OPD",
    category: "patient_front",
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
    id: "opd-oph",
    name: "Ophthalmology Consultation",
    description: "Comprehensive eye examination, refraction, and specialist consult",
    assignedToUserId: 1,
    pipelineType: "OPD",
    category: "patient_front",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      {
        id: "oph-1",
        name: "Reception & Token",
        description: "Patient checked in and waiting token issued",
        status: "active",
        color: "#3B82F6",
        patientFacingContent: {
          infoText: "Welcome to EyeMantra. Your token has been generated. Please proceed to Waiting Bay A.",
          instructions: ["Take a seat in Waiting Bay A", "Keep your photo ID and insurance card handy"],
          badge: "Token Issued",
          estimatedWaitTime: "~5 mins",
          roomOrCounter: "Desk 2 - Reception",
        },
      },
      {
        id: "oph-2",
        name: "Optometry & Vitals",
        description: "Visual acuity test, autorefraction, and eye pressure measurement",
        status: "active",
        color: "#10B981",
        patientFacingContent: {
          infoText: "Please proceed to Vision Room 1 for basic eye checkup with the optometrist.",
          instructions: ["Read letter charts without glasses then with glasses", "Non-contact puff test for ocular pressure"],
          badge: "Screening",
          estimatedWaitTime: "~10 mins",
          roomOrCounter: "Vision Room 1",
          checklist: [
            { id: "opt-1", label: "Wear current spectacles/contacts", description: "Bring them so optometrist can measure your current prescription", required: true },
            { id: "opt-2", label: "Note down any eye strain or headaches", description: "Mention reading or screen difficulty", required: false },
          ],
        },
      },
      {
        id: "oph-3",
        name: "Dilation & Waiting",
        description: "Pupil dilating eye drops administered for retinal examination",
        status: "active",
        color: "#F59E0B",
        patientFacingContent: {
          infoText: "Dilating eye drops have been instilled. Your vision will blur slightly for 2-3 hours.",
          instructions: ["Keep your eyes relaxed and closed if bright lights cause discomfort", "Wait for your name to be called for the doctor's cabin"],
          badge: "Dilation in Progress",
          estimatedWaitTime: "~20 mins",
          roomOrCounter: "Dilation Lounge",
          checklist: [
            { id: "dil-1", label: "Both eyes drops received", description: "Confirmed drops instilled by nurse", required: true },
            { id: "dil-2", label: "Sunglasses available", description: "Protective sunglasses handy for leaving the clinic", required: false },
          ],
        },
      },
      {
        id: "oph-4",
        name: "Doctor Consultation",
        description: "Slit-lamp examination, retina check, and diagnosis by Dr. Sarah Johnson",
        status: "active",
        color: "#6366F1",
        patientFacingContent: {
          infoText: "Dr. Sarah Johnson is ready for your comprehensive examination.",
          instructions: ["Rest your chin on the slit lamp rest", "Discuss treatment plan and ask any questions"],
          badge: "With Doctor",
          estimatedWaitTime: "In Consultation",
          roomOrCounter: "Cabin 304 - Dr. Sarah Johnson",
        },
      },
      {
        id: "oph-5",
        name: "Pharmacy & Billing",
        description: "Prescription pickup, medication counsel, and invoice settlement",
        status: "active",
        color: "#EC4899",
        patientFacingContent: {
          infoText: "Your consultation is complete! Please settle your bill and collect your eye drops.",
          instructions: ["Collect medication at Counter 4", "Review eye drop dosage schedule", "Schedule follow-up appointment if required"],
          badge: "Checkout",
          estimatedWaitTime: "~5 mins",
          roomOrCounter: "Counter 4 - Pharmacy & Billing",
        },
      },
    ],
  },
  {
    id: "op-cataract",
    name: "Cataract Surgery Daycare",
    description: "Surgical phacoemulsification with intraocular lens implantation",
    assignedToUserId: 1,
    pipelineType: "Operation",
    category: "patient_front",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      {
        id: "cat-1",
        name: "Checked In",
        description: "Pre-op check-in, baseline vitals, and surgical consent review",
        status: "active",
        color: "#10b981",
        patientFacingContent: {
          infoText: "You are checked into EyeMantra. Welcome to the Pre-Op Daycare Lounge.",
          instructions: [
            "Take a seat in the Pre-Op Lounge while nursing prepares your record",
            "Confirm you have had zero food or water since midnight (fasting)",
            "Review and sign your surgical consent before entering the holding room",
          ],
          badge: "Pre-Op Check-In",
          doctorName: "Dr. Meera Nair",
          roomOrCounter: "Pre-Op Daycare Lounge (Bay 3)",
          estimatedWaitTime: "~10 mins",
          checklist: [
            { id: "cat-f-1", label: "Strict fasting since midnight", description: "No food, tea, or water this morning as instructed", required: true },
            { id: "cat-f-2", label: "Attendant or companion present", description: "Priya Iyer is present to accompany you home today", required: true },
            { id: "cat-f-3", label: "Eyewear & personal valuables handed over", description: "Spectacles and personal valuables safely kept with your attendant", required: true },
          ],
          consent: {
            id: "cat-consent-1",
            title: "Consent for Right-Eye Cataract Phacoemulsification & Foldable Toric IOL",
            description: "Review and electronically sign procedure consent",
            content: "I hereby authorize Dr. Meera Nair and the surgical care team at EyeMantra to perform Phacoemulsification with Foldable Toric Intraocular Lens (IOL) implantation on my Right Eye. The procedure steps, topical anesthesia, and recovery care have been explained to me in plain language. I confirm that I have complied with pre-operative fasting guidelines.",
            requiresSignature: true,
          },
        },
      },
      {
        id: "cat-2",
        name: "Dilation & Drops",
        description: "Numbing and pupil-dilating drops placed in preparation room",
        status: "active",
        color: "#F59E0B",
        patientFacingContent: {
          infoText: "Dilating and topical numbing drops have been placed in your right eye. Your vision will blur slightly — this is completely normal and expected.",
          instructions: [
            "Rest comfortably in the holding chair with both eyes relaxed",
            "Pupillary dilation takes approximately 15–20 minutes",
            "Avoid touching or rubbing your right eye",
          ],
          badge: "Dilation in Progress",
          doctorName: "Dr. Meera Nair",
          roomOrCounter: "Holding Area Bay B",
          estimatedWaitTime: "~15 mins",
        },
      },
      {
        id: "cat-3",
        name: "Pre-Op Prep",
        description: "Sterile gowning, right-eye marking confirmation, and transfer prep",
        status: "active",
        color: "#3B82F6",
        patientFacingContent: {
          infoText: "You are in pre-op prep. You will be moved to Operating Theatre 2 shortly.",
          instructions: [
            "Relax on the transfer stretcher while your sterile gown is secured",
            "Nurse will verify your Right Eye surgical marking and +21.5D Toric lens prescription",
            "Dr. Meera Nair's surgical team will escort you into the theatre",
          ],
          badge: "Ready for OR",
          doctorName: "Dr. Meera Nair",
          roomOrCounter: "OT Prep Suite 4",
          estimatedWaitTime: "~5 mins",
        },
      },
      {
        id: "cat-4",
        name: "In Surgery",
        description: "Surgery in progress in Operating Theatre 2",
        status: "active",
        color: "#8B5CF6",
        patientFacingContent: {
          infoText: "Ramesh is in surgery with Dr. Meera Nair. This usually takes about 15 minutes — we'll update this the moment he's out.",
          instructions: [
            "Attendant waiting area: 2nd Floor Lounge (Bay 3)",
            "Complimentary water, coffee, and tea available at Desk 2",
            "Dr. Nair or our nurse coordinator will greet you immediately upon completion",
          ],
          badge: "In Surgery (OT-2)",
          doctorName: "Dr. Meera Nair",
          roomOrCounter: "Operating Theatre 2 (OR-2)",
          estimatedWaitTime: "~15 mins",
        },
      },
      {
        id: "cat-5",
        name: "Recovery & Discharge",
        description: "Post-op rest, clear protective eye shield, and home medication schedule",
        status: "active",
        color: "#10B981",
        patientFacingContent: {
          infoText: "Surgery complete! Ramesh is resting comfortably in the daycare recovery suite.",
          instructions: [
            "Keep the clear protective eye shield taped and dry; wear it while sleeping for 7 days",
            "View and follow the full eye drops medication schedule in Documents",
            "Attend the Post-Op Day 1 Review tomorrow at 10:30 AM with Dr. Meera Nair",
          ],
          badge: "Recovery Suite",
          doctorName: "Dr. Meera Nair",
          roomOrCounter: "Recovery Suite (Bed 4)",
          estimatedWaitTime: "Discharge ready ~30 mins",
          checklist: [
            { id: "cat-dis-1", label: "Clear protective eye shield in place", description: "Shield secured over right eye; do not rub or apply water", required: true },
            { id: "cat-dis-2", label: "Eye drops schedule & prescription received", description: "Moxifloxacin & lubricating drop regimen reviewed with Priya", required: true },
            { id: "cat-dis-3", label: "Day 1 follow-up confirmed", description: "Review appointment tomorrow at 10:30 AM with Dr. Meera Nair", required: true },
          ],
        },
      },
    ],
  },
  {
    id: "ipd-ward",
    name: "Inpatient Medical Ward",
    description: "Multi-day inpatient monitoring, intravenous therapy, and clinical observation",
    assignedToUserId: 2,
    pipelineType: "IPD",
    category: "patient_front",
    aiSettings: {
      platform: "Anthropic Claude",
      voiceSpeed: 1.0,
      voice: "Eva",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      {
        id: "ipd-1",
        name: "Admission & Bed Allocation",
        description: "Inpatient registration, room allotment, and baseline vitals",
        status: "active",
        color: "#3B82F6",
        patientFacingContent: {
          infoText: "Admission complete. You have been assigned Bed #14 in Ward 3B.",
          instructions: ["Duty nurse will conduct initial intake vitals", "Attendant pass provided at nursing desk"],
          badge: "Day 1 - Admission",
          roomOrCounter: "Ward 3B • Bed #14",
        },
      },
      {
        id: "ipd-2",
        name: "Diagnostic Workup & Vitals",
        description: "Blood draws, continuous vitals monitoring, and diagnostic imaging",
        status: "active",
        color: "#10B981",
        patientFacingContent: {
          infoText: "Morning blood labs and vitals telemetry underway.",
          instructions: ["Nurse rounds every 4 hours", "Lab samples sent to pathology"],
          badge: "Day 2 - Active Care",
          roomOrCounter: "Ward 3B • Bed #14",
        },
      },
      {
        id: "ipd-3",
        name: "Active Treatment & Rounds",
        description: "Specialist doctor morning rounds, IV therapy, and recovery response",
        status: "active",
        color: "#6366F1",
        patientFacingContent: {
          infoText: "Attending consultant morning rounds and intravenous medication.",
          instructions: ["Consultant visit between 10:00 AM - 12:00 PM", "Dietary meal served at 12:30 PM"],
          badge: "Day 3 - Observation",
          roomOrCounter: "Ward 3B • Bed #14",
        },
      },
      {
        id: "ipd-4",
        name: "Discharge Planning & Summary",
        description: "Discharge summary generation, home prescription, and insurance settlement",
        status: "active",
        color: "#06B6D4",
        patientFacingContent: {
          infoText: "Discharge authorization signed by Dr. Sarah Johnson. Preparing discharge packet.",
          instructions: ["TPA insurance cashless desk processing final claim", "Medication counseling with ward pharmacist"],
          badge: "Day 4 - Discharge",
          roomOrCounter: "Ward 3B • Bed #14",
        },
      },
    ],
  },
  {
    id: "2",
    name: "Follow-up Calls",
    description: "Post-visit follow-up and medication reminders",
    assignedToUserId: 2,
    pipelineType: "OPD",
    category: "ai_calling",
    aiSettings: {
      platform: "Anthropic Claude",
      voiceSpeed: 1.2,
      voice: "Eva",
      tone: "Friendly",
      style: "Balanced",
    },
    stages: [
      { id: "2-1", name: "Post-Visit Check", description: "Check on patient after their visit", status: "active", color: "#3B82F6" },
      { id: "2-2", name: "Medication Reminder", description: "Remind patient to take their medication", status: "active", color: "#10B981" },
    ],
  },
  {
    id: "test-cycle",
    name: "Test Cycle",
    description: "Testing the MantraAssist",
    assignedToUserId: 1,
    category: "ai_calling",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "tc-1", name: "Initial Verification", description: "Automated test cycle run", status: "active", color: "#3B82F6" },
    ],
  },
  {
    id: "insurance-outreach",
    name: "Insurance Companies - Strategic Calling",
    description: "Strategic AI calling process designed to secure meetings with insurance partnership teams.",
    assignedToUserId: 1,
    category: "ai_calling",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "ins-1", name: "Connected – Strategic Interest", description: "Interest shown in alliance discussion", status: "active", color: "#10B981" },
      { id: "ins-2", name: "Can't Connect", description: "Unreachable or voicemail reached", status: "active", color: "#EF4444" },
      { id: "ins-3", name: "New Lead", description: "New contact identified for outreach", status: "active", color: "#3B82F6" },
      { id: "ins-4", name: "Qualification Done", description: "Initial stakeholder criteria validated", status: "active", color: "#8B5CF6" },
      { id: "ins-5", name: "Demo / Intro Call Booked", description: "Partnership discovery call confirmed", status: "active", color: "#10B981" },
    ],
  },
  {
    id: "insurance-brokers",
    name: "Insurance Brokers & Consultants",
    description: "Outbound AI calling process to connect with insurance brokers and benefits consultants and schedule partnership meetings.",
    assignedToUserId: 1,
    category: "ai_calling",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "ib-1", name: "Outreach Initiated", description: "Call attempt placed", status: "active", color: "#3B82F6" },
      { id: "ib-2", name: "Follow-Up Scheduled", description: "Callback request noted", status: "active", color: "#F59E0B" },
      { id: "ib-3", name: "Partner Onboarded", description: "Broker agreement review scheduled", status: "active", color: "#10B981" },
    ],
  },
  {
    id: "hr-eap",
    name: "HR > EAP - Saudi | UAE",
    description: "AI cold calling process focused on GCC HR decision-makers to promote corporate employee assistance programs.",
    assignedToUserId: 2,
    category: "ai_calling",
    aiSettings: {
      platform: "OpenAI - GPT-4o",
      voiceSpeed: 1.0,
      voice: "Ava",
      tone: "Professional",
      style: "Balanced",
    },
    stages: [
      { id: "hr-1", name: "Prospect Contacted", description: "Initial introduction to HR head", status: "active", color: "#3B82F6" },
      { id: "hr-2", name: "Corporate Demo Booked", description: "Executive briefing scheduled", status: "active", color: "#10B981" },
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
    if (!raw) return DEFAULT_INITIAL_PROCESSES;
    const parsed: Process[] = JSON.parse(raw);
    // Auto-migrate if stored processes still have legacy doctor or outdated copy
    const cataract = parsed.find((p) => p.id === "op-cataract");
    const hasOldData = cataract?.stages.some(
      (s) =>
        s.patientFacingContent?.doctorName?.includes("Sarah Chen") ||
        s.patientFacingContent?.instructions?.some((i) => i.includes("microscope illumination")) ||
        s.patientFacingContent?.instructions?.some((i) => i.includes("Dr. Sarah Chen")) ||
        s.patientFacingContent?.checklist?.some((c) => c.description?.includes("Vikram")) ||
        s.patientFacingContent?.roomOrCounter?.includes("Daycare Suite Bed 4") ||
        s.patientFacingContent?.infoText?.includes("Mantra Eye Care") ||
        s.patientFacingContent?.consent?.content?.includes("Mantra Eye Care")
    );
    if (hasOldData) {
      const newCataract = DEFAULT_INITIAL_PROCESSES.find((p) => p.id === "op-cataract");
      if (newCataract) {
        const updated = parsed.map((p) => (p.id === "op-cataract" ? newCataract : p));
        localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }
    }
    parsed.forEach((p) => {
      if (!p.category) {
        if (p.id === "op-cataract" || p.id === "opd-oph" || p.id === "ipd-ward" || p.id === "1") {
          p.category = "patient_front";
        } else {
          p.category = "ai_calling";
        }
      }
    });
    // Ensure live dashboard default processes exist if missing
    const hasInsurance = parsed.some((p) => p.id === "insurance-outreach");
    if (!hasInsurance) {
      DEFAULT_INITIAL_PROCESSES.forEach((initP) => {
        if (!parsed.some((p) => p.id === initP.id)) {
          parsed.push(initP);
        }
      });
      localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return DEFAULT_INITIAL_PROCESSES;
  }
}

export function saveStoredProcesses(processes: Process[]) {
  try {
    localStorage.setItem(PROCESSES_STORAGE_KEY, JSON.stringify(processes));
    window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
    broadcastSync("PROCESS_UPDATED", processes);
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
    broadcastSync("PROCESS_UPDATED");
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
    const unsub = onSyncEvent("PROCESS_UPDATED", handler);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handler);
      window.removeEventListener("storage", handler);
      unsub();
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
