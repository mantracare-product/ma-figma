import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { WorkflowStep } from "../types/workflow";
import {
  CallTriggerSettings,
  DEFAULT_CALL_TRIGGER_SETTINGS,
  Process,
  Stage,
  saveStoredProcesses,
  getStoredProcesses,
  saveStoredWorkflowSteps,
  getStoredWorkflowSteps,
  PROCESS_STORE_EVENT,
} from "../../lib/useProcessStore";

export interface ProcessGlobalSettings {
  aiModel: string;
  voiceSpeed: number;
  voiceGender: "male" | "female" | "neutral";
  voiceTone: string;
  voiceEngine?: string;
  recordCalls: boolean;
  maxDurationMinutes: number;
  wrapUpWindowSeconds: number;
  retryRules: {
    enabled: boolean;
    maxAttempts: number;
    delayMinutes: number;
  };
  skipDayRules: {
    enabled: boolean;
    skipDaysOfWeek: number[]; // 0 = Sun, 6 = Sat
    skipHolidays: boolean;
  };
  voicemailDetection: {
    enabled: boolean;
    action: "hangup" | "leave_message";
    voicemailMessage?: string;
  };
  callTrigger?: CallTriggerSettings;
}

export interface ProcessTemplateStage {
  id: string;
  stageOrder: number;
  name: string;
  stageCode?: string;
  description: string;
  statusColor: string;
  systemInstruction?: string;
  aiModel?: string;
  speechSpeed?: number;
  voiceEngine?: string;
  automaticCalling?: boolean;
  enableCalling?: boolean;
  callTriggerSettings?: CallTriggerSettings;
  workflowSteps?: WorkflowStep[];
  selectedStageChannels?: string[];
  channelSources?: Array<{ id: string; channel: "calls" | "sms" | "whatsapp" | "website"; source: string }>;
  greetingPhrase?: string;
  callerPitch?: string;
  targetObjective?: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  industryName: string;
  isSystem?: boolean;
  status: "active" | "draft";
  version: string;
  globalSettings: ProcessGlobalSettings;
  stages: ProcessTemplateStage[];
  createdAt: string;
  updatedAt: string;
}

export const PROCESS_TEMPLATES_STORAGE_KEY = "mantra_admin_process_templates";
export const PROCESS_TEMPLATES_EVENT = "mantra_process_templates_updated";

export const DEFAULT_PROCESS_GLOBAL_SETTINGS: ProcessGlobalSettings = {
  aiModel: "OpenAI - GPT-4o",
  voiceSpeed: 1.0,
  voiceGender: "female",
  voiceTone: "Professional & Empathetic",
  voiceEngine: "Ava",
  recordCalls: true,
  maxDurationMinutes: 15,
  wrapUpWindowSeconds: 60,
  retryRules: {
    enabled: true,
    maxAttempts: 3,
    delayMinutes: 15,
  },
  skipDayRules: {
    enabled: true,
    skipDaysOfWeek: [0, 6],
    skipHolidays: true,
  },
  voicemailDetection: {
    enabled: true,
    action: "hangup",
    voicemailMessage: "Hello, this is MantraAssist calling to follow up. Please call us back at your earliest convenience.",
  },
};

export const SEED_PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: "tmpl-dental-intake",
    name: "Dental Patient Intake & Booking",
    description: "End-to-end patient inquiry, insurance verification, and automated appointment scheduling for dental clinics.",
    categoryName: "Healthcare",
    industryName: "Dental Practice",
    isSystem: true,
    status: "active",
    version: "1.2.0",
    globalSettings: {
      ...DEFAULT_PROCESS_GLOBAL_SETTINGS,
      voiceTone: "Warm, Clinical & Reassuring",
      voiceEngine: "Ava",
    },
    stages: [
      {
        id: "stg-dental-1",
        stageOrder: 1,
        name: "New Lead Ingestion",
        stageCode: "LEAD_IN",
        description: "Receive patient contact info from web form or inbound call inquiry.",
        statusColor: "#3b82f6",
        systemInstruction: "Acknowledge patient inquiry warmly, confirm dental concern (routine exam, tooth pain, cosmetic consultation), and collect patient name.",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "immediate",
          waitDuration: 5,
          waitUnit: "minutes",
          recordCalls: true,
          transferCallEnabled: true,
          transferNumbers: [
            { id: "tn-d1", countryCode: "+1", phoneNumber: "8005550199", isPrimary: true },
            { id: "tn-d2", countryCode: "+1", phoneNumber: "8005550198", isPrimary: false },
          ],
          transferVoiceResponse: "Let me connect you directly to our lead dental coordinator.",
          transferReason: "Urgent dental pain or emergency request",
        },
        workflowSteps: [
          {
            id: "wf-d1-1",
            name: "Send Welcome WhatsApp",
            description: "Immediate greeting and clinic introduction",
            iconKey: "message-square",
            stepKey: "whatsapp",
            trigger: "stage",
            params: {
              message: "Hello! Welcome to Dental Care Partners. We received your appointment inquiry and look forward to assisting you.",
            },
          },
        ],
      },
      {
        id: "stg-dental-2",
        stageOrder: 2,
        name: "Insurance & Medical Verification",
        stageCode: "INS_VERIF",
        description: "Verify primary dental insurance coverage and pre-existing dental history.",
        statusColor: "#10b981",
        systemInstruction: "Ask for dental insurance carrier, member ID, and date of birth. Record any dental sensitivity or medical alerts.",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "wait",
          waitDuration: 30,
          waitUnit: "minutes",
        },
        workflowSteps: [
          {
            id: "wf-d2-1",
            name: "Send Intake Form Link",
            description: "Send digital medical history intake form",
            iconKey: "file-text",
            stepKey: "sms",
            trigger: "stage",
            params: {
              message: "Please take 2 minutes to complete your digital dental health history form before your appointment: https://clinic.example.com/intake",
            },
          },
        ],
      },
      {
        id: "stg-dental-3",
        stageOrder: 3,
        name: "Appointment Confirmed",
        stageCode: "CONFIRMED",
        description: "Slot reserved in operatory calendar with calendar invite sent.",
        statusColor: "#8b5cf6",
        systemInstruction: "Confirm appointment time, location, parking directions, and cancellation policy.",
        enableCalling: false,
        workflowSteps: [
          {
            id: "wf-d3-1",
            name: "Calendar Confirmation SMS",
            description: "Send date, time and doctor confirmation",
            iconKey: "calendar",
            stepKey: "sms",
            trigger: "stage",
            params: {
              message: "Your dental appointment is scheduled with Dr. Smith on {{appointment_date}} at {{appointment_time}}.",
            },
          },
        ],
      },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-03-01T14:30:00Z",
  },
  {
    id: "tmpl-primary-care",
    name: "Primary Care Patient Triage & Follow-up",
    description: "Clinical inquiry assessment, symptom triage, provider routing, and post-consultation care check-in.",
    categoryName: "Healthcare",
    industryName: "Healthcare",
    isSystem: true,
    status: "active",
    version: "1.1.0",
    globalSettings: {
      ...DEFAULT_PROCESS_GLOBAL_SETTINGS,
      voiceTone: "Compassionate, Clinical & Methodical",
      voiceEngine: "Eva",
    },
    stages: [
      {
        id: "stg-pc-1",
        stageOrder: 1,
        name: "Symptom Triage",
        stageCode: "TRIAGE",
        description: "Capture chief complaint, symptom severity, and acuity level.",
        statusColor: "#ef4444",
        systemInstruction: "Ask patient what symptoms they are experiencing, duration, and if any red-flag emergency symptoms exist.",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "immediate",
          recordCalls: true,
          transferCallEnabled: true,
          transferNumbers: [
            { id: "tn-pc-1", countryCode: "+1", phoneNumber: "8885551212", isPrimary: true },
          ],
          transferVoiceResponse: "Connecting you immediately to the on-call triage nurse.",
          transferReason: "Chest pain, shortness of breath, or high acuity triage",
        },
      },
      {
        id: "stg-pc-2",
        stageOrder: 2,
        name: "Doctor Consultation Booked",
        stageCode: "CONSULT",
        description: "Telehealth or in-clinic appointment scheduled with primary care doctor.",
        statusColor: "#3b82f6",
        workflowSteps: [
          {
            id: "wf-pc2-1",
            name: "Appointment Reminder",
            description: "SMS reminder 2 hours prior",
            iconKey: "bell",
            stepKey: "sms",
            trigger: "stage",
            params: {
              message: "Reminder: Your appointment with Dr. Johnson is today at {{appointment_time}}.",
            },
          },
        ],
      },
      {
        id: "stg-pc-3",
        stageOrder: 3,
        name: "Post-Visit Medication Follow-up",
        stageCode: "FOLLOW_UP",
        description: "Follow up 48 hours post-visit to check recovery and prescription fulfillment.",
        statusColor: "#10b981",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "wait",
          waitDuration: 2,
          waitUnit: "days",
          callingHoursStart: "10:00",
          callingHoursEnd: "17:00",
        },
      },
    ],
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-28T11:20:00Z",
  },
  {
    id: "tmpl-auto-service",
    name: "Automotive Service & Repair Pipeline",
    description: "Service booking, diagnostic authorization, vehicle readiness update, and customer handover.",
    categoryName: "Automobile",
    industryName: "Automobile",
    isSystem: true,
    status: "active",
    version: "1.0.0",
    globalSettings: {
      ...DEFAULT_PROCESS_GLOBAL_SETTINGS,
      voiceTone: "Direct, Energetic & Professional",
      voiceEngine: "Vikas",
    },
    stages: [
      {
        id: "stg-auto-1",
        stageOrder: 1,
        name: "Service Request Inbound",
        stageCode: "AUTO_REQ",
        description: "Customer requests maintenance, oil change, brake inspection, or recall service.",
        statusColor: "#f59e0b",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "immediate",
          transferCallEnabled: true,
          transferNumbers: [
            { id: "tn-auto-1", countryCode: "+1", phoneNumber: "8005554321", isPrimary: true },
          ],
          transferVoiceResponse: "Transferring you to the service advisor desk.",
        },
      },
      {
        id: "stg-auto-2",
        stageOrder: 2,
        name: "Vehicle In-Bay & Inspection",
        stageCode: "IN_BAY",
        description: "Vehicle received, multi-point inspection performed, estimate pending approval.",
        statusColor: "#3b82f6",
        workflowSteps: [
          {
            id: "wf-auto-1",
            name: "Digital Estimate SMS",
            description: "Send estimate approval link to customer",
            iconKey: "file-text",
            stepKey: "sms",
            trigger: "stage",
            params: {
              message: "Your vehicle inspection is complete. View and approve your service estimate here: https://service.example.com/est/{{service_id}}",
            },
          },
        ],
      },
      {
        id: "stg-auto-3",
        stageOrder: 3,
        name: "Ready for Pickup",
        stageCode: "READY",
        description: "Work completed, quality check passed, ready for customer handover.",
        statusColor: "#10b981",
        workflowSteps: [
          {
            id: "wf-auto-2",
            name: "Ready Notification WhatsApp",
            description: "Send vehicle ready notification",
            iconKey: "message-square",
            stepKey: "whatsapp",
            trigger: "stage",
            params: {
              message: "Great news! Your vehicle is ready for pickup at our main service bay. Total invoice: {{invoice_amount}}.",
            },
          },
        ],
      },
    ],
    createdAt: "2026-02-01T12:00:00Z",
    updatedAt: "2026-03-05T16:00:00Z",
  },
  {
    id: "tmpl-real-estate",
    name: "Real Estate Buyer/Seller Onboarding",
    description: "High-value property buyer qualification, budget assessment, property tour scheduling, and escrow tracking.",
    categoryName: "Real Estate",
    industryName: "Real Estate",
    isSystem: true,
    status: "active",
    version: "1.0.0",
    globalSettings: {
      ...DEFAULT_PROCESS_GLOBAL_SETTINGS,
      voiceTone: "Authoritative, Confident & Warm",
      voiceEngine: "Ava",
    },
    stages: [
      {
        id: "stg-re-1",
        stageOrder: 1,
        name: "Buyer Inquiry Qualification",
        stageCode: "QUALIFY",
        description: "Collect budget range, target neighborhoods, pre-approval status, and timeline.",
        statusColor: "#3b82f6",
        enableCalling: true,
        callTriggerSettings: {
          ...DEFAULT_CALL_TRIGGER_SETTINGS,
          timingType: "immediate",
          waitDuration: 2,
          waitUnit: "minutes",
          transferCallEnabled: true,
          transferNumbers: [
            { id: "tn-re-1", countryCode: "+1", phoneNumber: "8005559876", isPrimary: true },
          ],
          transferVoiceResponse: "One moment while I connect you with our premier property broker.",
        },
      },
      {
        id: "stg-re-2",
        stageOrder: 2,
        name: "Property Tour Scheduled",
        stageCode: "TOUR",
        description: "Scheduled private showing or open house tour.",
        statusColor: "#8b5cf6",
      },
      {
        id: "stg-re-3",
        stageOrder: 3,
        name: "Offer & Escrow",
        stageCode: "ESCROW",
        description: "Purchase offer submitted, earnest money deposited, escrow in progress.",
        statusColor: "#10b981",
      },
    ],
    createdAt: "2026-02-10T15:00:00Z",
    updatedAt: "2026-03-08T18:00:00Z",
  },
];

export function getStoredProcessTemplates(): ProcessTemplate[] {
  try {
    const raw = localStorage.getItem(PROCESS_TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return SEED_PROCESS_TEMPLATES;
}

export function saveStoredProcessTemplates(templates: ProcessTemplate[]) {
  try {
    localStorage.setItem(PROCESS_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new Event(PROCESS_TEMPLATES_EVENT));
  } catch {}
}

interface ProcessTemplateContextType {
  templates: ProcessTemplate[];
  saveTemplate: (template: ProcessTemplate) => ProcessTemplate;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => ProcessTemplate | null;
  getTemplatesForIndustry: (industryName?: string, categoryName?: string) => ProcessTemplate[];
  instantiateProcessFromTemplate: (template: ProcessTemplate, customName?: string) => Process;
  resetToDefaults: () => void;
}

const ProcessTemplateContext = createContext<ProcessTemplateContextType | null>(null);

export function ProcessTemplateProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplatesState] = useState<ProcessTemplate[]>(getStoredProcessTemplates);

  useEffect(() => {
    const handleUpdate = () => {
      setTemplatesState(getStoredProcessTemplates());
    };
    window.addEventListener(PROCESS_TEMPLATES_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_TEMPLATES_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const saveTemplate = useCallback((template: ProcessTemplate): ProcessTemplate => {
    const existing = getStoredProcessTemplates();
    const index = existing.findIndex((t) => t.id === template.id);
    const updatedTemplate: ProcessTemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };

    let newTemplates: ProcessTemplate[];
    if (index >= 0) {
      newTemplates = [...existing];
      newTemplates[index] = updatedTemplate;
    } else {
      newTemplates = [updatedTemplate, ...existing];
    }

    saveStoredProcessTemplates(newTemplates);
    setTemplatesState(newTemplates);
    return updatedTemplate;
  }, []);

  const deleteTemplate = useCallback((templateId: string) => {
    const existing = getStoredProcessTemplates();
    const newTemplates = existing.filter((t) => t.id !== templateId);
    saveStoredProcessTemplates(newTemplates);
    setTemplatesState(newTemplates);
  }, []);

  const duplicateTemplate = useCallback((templateId: string): ProcessTemplate | null => {
    const existing = getStoredProcessTemplates();
    const target = existing.find((t) => t.id === templateId);
    if (!target) return null;

    const duplicated: ProcessTemplate = {
      ...target,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} (Copy)`,
      isSystem: false,
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stages: target.stages.map((stg, i) => ({
        ...stg,
        id: `stg-${Date.now()}-${i}`,
      })),
    };

    const newTemplates = [duplicated, ...existing];
    saveStoredProcessTemplates(newTemplates);
    setTemplatesState(newTemplates);
    return duplicated;
  }, []);

  const getTemplatesForIndustry = useCallback((industryName?: string, categoryName?: string): ProcessTemplate[] => {
    const all = getStoredProcessTemplates();
    if (!industryName && !categoryName) return all;
    return all.filter((t) => {
      const matchInd = !industryName || industryName === "All" || t.industryName.toLowerCase() === industryName.toLowerCase();
      const matchCat = !categoryName || categoryName === "All" || t.categoryName.toLowerCase() === categoryName.toLowerCase();
      return matchInd && matchCat;
    });
  }, []);

  // Instantiates an active Client Process from an Admin Template
  const instantiateProcessFromTemplate = useCallback((template: ProcessTemplate, customName?: string): Process => {
    const existingProcesses = getStoredProcesses();
    const newProcessId = String(Date.now());

    // Map template stages to client stages & register workflow steps
    const existingSteps = getStoredWorkflowSteps();
    const updatedSteps = { ...existingSteps };

    const clientStages: Stage[] = template.stages.map((tStage, idx) => {
      const clientStageId = `${newProcessId}-${idx + 1}`;

      if (tStage.workflowSteps && tStage.workflowSteps.length > 0) {
        updatedSteps[clientStageId] = tStage.workflowSteps.map((ws, wIdx) => ({
          ...ws,
          id: `step-${Date.now()}-${idx}-${wIdx}`,
        }));
      }

      return {
        id: clientStageId,
        name: tStage.name,
        description: tStage.description,
        status: "active",
        color: tStage.statusColor || "#3b82f6",
        enableCalling: tStage.enableCalling ?? tStage.automaticCalling,
        callTriggerSettings: tStage.callTriggerSettings ? { ...tStage.callTriggerSettings } : undefined,
        channelSources: tStage.channelSources,
        selectedStageChannels: tStage.selectedStageChannels,
        callerPitch: tStage.callerPitch,
        greetingIntroMessage: tStage.greetingPhrase,
        objectiveText: tStage.targetObjective,
        aiSettings: {
          platform: template.globalSettings.aiModel || "OpenAI - GPT-4o",
          voiceSpeed: template.globalSettings.voiceSpeed || 1.0,
          voice: template.globalSettings.voiceEngine || "Ava",
          tone: template.globalSettings.voiceTone || "Professional",
          style: "Balanced",
        },
      };
    });

    const clientProcess: Process = {
      id: newProcessId,
      name: customName || template.name,
      description: template.description,
      assignedToUserId: 1,
      stages: clientStages,
      aiSettings: {
        platform: template.globalSettings.aiModel || "OpenAI - GPT-4o",
        voiceSpeed: template.globalSettings.voiceSpeed || 1.0,
        voice: template.globalSettings.voiceEngine || "Ava",
        tone: template.globalSettings.voiceTone || "Professional",
        style: "Balanced",
      },
    };

    saveStoredProcesses([...existingProcesses, clientProcess]);
    saveStoredWorkflowSteps(updatedSteps);
    window.dispatchEvent(new Event(PROCESS_STORE_EVENT));

    return clientProcess;
  }, []);

  const resetToDefaults = useCallback(() => {
    saveStoredProcessTemplates(SEED_PROCESS_TEMPLATES);
    setTemplatesState(SEED_PROCESS_TEMPLATES);
  }, []);

  return (
    <ProcessTemplateContext.Provider
      value={{
        templates,
        saveTemplate,
        deleteTemplate,
        duplicateTemplate,
        getTemplatesForIndustry,
        instantiateProcessFromTemplate,
        resetToDefaults,
      }}
    >
      {children}
    </ProcessTemplateContext.Provider>
  );
}

export function useProcessTemplates() {
  const context = useContext(ProcessTemplateContext);
  if (!context) {
    throw new Error("useProcessTemplates must be used within a ProcessTemplateProvider");
  }
  return context;
}
