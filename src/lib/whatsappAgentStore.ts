/**
 * whatsappAgentStore.ts
 * Path: src/lib/whatsappAgentStore.ts
 *
 * Dedicated reactive state store for WhatsApp Agent automation rules:
 * - Starting point: Connected WhatsApp Template
 * - Direction Applicability: Inbound, Outbound, or Both
 * - Trigger Event & Button clicks
 * - Classification Criteria: AI Semantic Prompt vs Keyword/Intent filters
 * - AI Response instructions & Prompt engineering
 * - CRM Entity creation: Contact, Lead, Patient, Deal & Workflow assignment
 * - Conversation Resolution Criteria: Immediate, Customer Confirmation, Inactivity timeout, Custom Prompt, or Manual
 */

import { useState, useEffect } from "react";

export type RuleDirection = "inbound" | "outbound" | "both";

export type ResolutionCriteriaType =
  | "immediate"
  | "customer_confirmation"
  | "inactivity_timeout"
  | "prompt_condition"
  | "manual";

export interface WhatsAppAgentRule {
  id: string;
  name: string;
  description: string;
  color: "blue" | "emerald" | "amber" | "purple" | "cyan" | "rose" | "orange" | "slate";
  enabled: boolean;

  // Direction: Inbound or Outbound or Both
  direction: RuleDirection;

  // Starting Point: Connected Template
  templateId: string; // Connected template ID, or "all"
  templateName: string;
  triggerEvent: "template_fired" | "customer_reply" | "button_click" | "any";
  targetButtonLabel?: string; // Optional: specific button click (e.g. "Confirm Attendance")

  // Classification Criteria
  criteriaType: "prompt" | "keywords";
  classificationPrompt?: string;
  keywordsFilter?: {
    contains?: string;
    doesNotContain?: string;
    intentCategory?: "inquiry" | "confirmation" | "reschedule" | "cancellation" | "complaint" | "general";
  };

  // AI Response & Prompt Instructions
  responseType: "ai_prompt" | "fixed_text" | "ai_draft_only";
  responsePrompt: string;
  fixedResponseText?: string;
  aiTone?: "friendly" | "professional" | "empathetic" | "urgent" | "concise";

  // CRM & Entity Creation Actions
  autoCreateContact: boolean;
  entityType: "Contact" | "Lead" | "Patient" | "Deal";
  crmQualificationPrompt?: string;
  assignProcessEnabled?: boolean;
  processId?: string;
  processName?: string;
  stageId?: string;
  stageName?: string;

  // Resolution Criteria
  resolutionCriteria: ResolutionCriteriaType;
  resolutionTimeoutHours?: number; // e.g. 2, 12, 24, 48
  resolutionPromptCondition?: string;
  resolutionTag?: string;
  reopenOnCustomerReply?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export const WHATSAPP_AGENT_STORAGE_KEY = "mantra_whatsapp_agent_rules";
export const WHATSAPP_AGENT_EVENT = "whatsapp_agent_rules_updated";

export const DEFAULT_WHATSAPP_RULES: WhatsAppAgentRule[] = [
  {
    id: "wa-rule-1",
    name: "Appointment Attendance Confirmation",
    description: "When patient confirms attendance via Appointment Reminder template, thank them and provide arrival instructions.",
    color: "emerald",
    enabled: true,
    direction: "both",
    templateId: "tpl-1",
    templateName: "Appointment Reminder",
    triggerEvent: "button_click",
    targetButtonLabel: "Confirm Attendance",
    criteriaType: "prompt",
    classificationPrompt: "Patient is confirming their upcoming clinic appointment or replying with affirmative acknowledgment.",
    responseType: "ai_prompt",
    responsePrompt: "Warmly acknowledge and thank {{contact_name}} for confirming their appointment on {{appointment_date}}. Advise them to arrive 10 minutes early with valid identification and their insurance card. Provide clinic address and parking details.",
    aiTone: "empathetic",
    autoCreateContact: true,
    entityType: "Patient",
    crmQualificationPrompt: "Mark patient attendance as confirmed and verify primary insurance coverage status.",
    assignProcessEnabled: true,
    processId: "process-client-onboarding",
    processName: "Client Onboarding",
    stageId: "stage-confirmed",
    stageName: "Appointment Confirmed",
    resolutionCriteria: "customer_confirmation",
    resolutionTag: "Attendance Confirmed",
    reopenOnCustomerReply: true,
    createdAt: "2026-11-20",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-2",
    name: "Reschedule Request & Slot Reallocation",
    description: "Detects reschedule clicks or messages on reminders, offers available doctor slots, and updates workflow.",
    color: "blue",
    enabled: true,
    direction: "inbound",
    templateId: "tpl-1",
    templateName: "Appointment Reminder",
    triggerEvent: "button_click",
    targetButtonLabel: "Reschedule Visit",
    criteriaType: "prompt",
    classificationPrompt: "Patient asks to reschedule, move, or change their scheduled appointment date or time slot.",
    responseType: "ai_prompt",
    responsePrompt: "Politely acknowledge {{contact_name}}'s reschedule request. Offer the next 2 available slots with their assigned provider. Ask whether morning or afternoon works best for them.",
    aiTone: "professional",
    autoCreateContact: true,
    entityType: "Patient",
    assignProcessEnabled: true,
    processId: "process-client-onboarding",
    processName: "Client Onboarding",
    stageId: "stage-reschedule",
    stageName: "Reschedule Queue",
    resolutionCriteria: "prompt_condition",
    resolutionPromptCondition: "Mark conversation resolved once the patient selects a new slot and calendar booking is verified.",
    resolutionTag: "Reschedule Handled",
    reopenOnCustomerReply: true,
    createdAt: "2026-11-21",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-3",
    name: "Booking Follow-up & Intake Lead Capture",
    description: "Outbound trigger when Booking Confirmation template fires to qualify intake form details.",
    color: "purple",
    enabled: true,
    direction: "outbound",
    templateId: "tpl-2",
    templateName: "Booking Confirmation",
    triggerEvent: "template_fired",
    criteriaType: "keywords",
    keywordsFilter: {
      contains: "booking, confirmation, appointment",
      intentCategory: "confirmation",
    },
    responseType: "ai_prompt",
    responsePrompt: "Verify if {{contact_name}} has completed their pre-consultation medical questionnaire. If incomplete, provide the link and instructions.",
    aiTone: "friendly",
    autoCreateContact: true,
    entityType: "Lead",
    crmQualificationPrompt: "Extract contact name, preferred service, and insurance details from intake response.",
    assignProcessEnabled: false,
    resolutionCriteria: "inactivity_timeout",
    resolutionTimeoutHours: 24,
    resolutionTag: "Booking Intake Verified",
    reopenOnCustomerReply: true,
    createdAt: "2026-11-22",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-4",
    name: "Post-Consultation Feedback & Review Triage",
    description: "Evaluates feedback replies: routes positive reviews to Google and flags low ratings for care coordinator.",
    color: "amber",
    enabled: true,
    direction: "inbound",
    templateId: "tpl-3",
    templateName: "Post-Consultation Feedback",
    triggerEvent: "customer_reply",
    criteriaType: "prompt",
    classificationPrompt: "Patient shares satisfaction ratings, stars, or written feedback regarding their recent consultation.",
    responseType: "ai_prompt",
    responsePrompt: "If the patient expresses high satisfaction (4-5 stars or positive remarks), warmly thank them and invite them to leave a public review. If any dissatisfaction or concern is raised, apologize empathetically and assure them a care coordinator will call within 2 hours.",
    aiTone: "empathetic",
    autoCreateContact: false,
    entityType: "Patient",
    resolutionCriteria: "immediate",
    resolutionTag: "Feedback Processed",
    reopenOnCustomerReply: true,
    createdAt: "2026-11-22",
    updatedAt: "2026-11-23",
  },
];

export function getStoredWhatsAppRules(): WhatsAppAgentRule[] {
  try {
    const raw = localStorage.getItem(WHATSAPP_AGENT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WHATSAPP_AGENT_STORAGE_KEY, JSON.stringify(DEFAULT_WHATSAPP_RULES));
      return DEFAULT_WHATSAPP_RULES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(WHATSAPP_AGENT_STORAGE_KEY, JSON.stringify(DEFAULT_WHATSAPP_RULES));
      return DEFAULT_WHATSAPP_RULES;
    }
    return parsed;
  } catch {
    return DEFAULT_WHATSAPP_RULES;
  }
}

export function saveStoredWhatsAppRules(rules: WhatsAppAgentRule[]) {
  try {
    localStorage.setItem(WHATSAPP_AGENT_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent(WHATSAPP_AGENT_EVENT, { detail: rules }));
  } catch (err) {
    console.error("Failed to save WhatsApp agent rules", err);
  }
}

export function useWhatsappAgentStore() {
  const [rules, setRules] = useState<WhatsAppAgentRule[]>(getStoredWhatsAppRules);

  useEffect(() => {
    const handleUpdate = () => setRules(getStoredWhatsAppRules());
    window.addEventListener(WHATSAPP_AGENT_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WHATSAPP_AGENT_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const saveRule = (rule: WhatsAppAgentRule) => {
    const current = getStoredWhatsAppRules();
    const idx = current.findIndex((r) => r.id === rule.id);
    let next: WhatsAppAgentRule[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...rule, updatedAt: new Date().toISOString().substring(0, 10) };
    } else {
      next = [
        {
          ...rule,
          id: rule.id || `wa-rule-${Date.now()}`,
          createdAt: new Date().toISOString().substring(0, 10),
          updatedAt: new Date().toISOString().substring(0, 10),
        },
        ...current,
      ];
    }
    saveStoredWhatsAppRules(next);
    setRules(next);
  };

  const deleteRule = (ruleId: string) => {
    const current = getStoredWhatsAppRules();
    const next = current.filter((r) => r.id !== ruleId);
    saveStoredWhatsAppRules(next);
    setRules(next);
  };

  const toggleRuleEnabled = (ruleId: string) => {
    const current = getStoredWhatsAppRules();
    const next = current.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    saveStoredWhatsAppRules(next);
    setRules(next);
  };

  const duplicateRule = (rule: WhatsAppAgentRule) => {
    const copy: WhatsAppAgentRule = {
      ...rule,
      id: `wa-rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };
    saveRule(copy);
  };

  return {
    rules,
    saveRule,
    deleteRule,
    toggleRuleEnabled,
    duplicateRule,
    resetToDefault: () => {
      saveStoredWhatsAppRules(DEFAULT_WHATSAPP_RULES);
      setRules(DEFAULT_WHATSAPP_RULES);
    },
  };
}
