/**
 * whatsappAgentStore.ts
 * Path: src/lib/whatsappAgentStore.ts
 *
 * Dedicated reactive state store for WhatsApp Agent automation rules:
 * - Mental model: "When a contact replies to X, if they say Y, reply like Z, then do these things."
 * - Trigger: Contact replies to a template OR contact sends a new message.
 * - Condition (for template replies): Any reply, Clicks a button, Matches intent (AI), Contains keywords, or Fallback.
 * - Trigger prompt (for new messages): AI describes when this agent should run.
 * - Agent prompt: Instructions for the whole conversation flow.
 * - Deterministic button & keyword evaluation.
 * - Priority-based execution order; first matching agent wins; fallback pinned to bottom.
 */

import { useState, useEffect } from "react";

export type RuleDirection = "inbound" | "outbound" | "both";

export type ResolutionCriteriaType =
  | "immediate"
  | "customer_confirmation"
  | "inactivity_timeout"
  | "prompt_condition"
  | "transferred_to_team"
  | "manual";

export interface HandoffCondition {
  id: string;
  title?: string;
  prompt: string;
  assigneeId: string | number;
  assigneeName?: string;
  handoffMessage: string;
}

export interface WhatsAppAgentRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean; // Controlled only from list Status toggle. Default true on create.
  enabled: boolean; // Alias of is_active for backward compatibility
  priority: number; // 1-based order; 1 wins first; fallback is lowest & pinned

  // Step 2: When it runs
  trigger_type: "template_reply" | "new_message";
  templates: string[]; // Approved template IDs (required if trigger_type === "template_reply")
  templateNames?: string[];
  trigger_prompt?: string; // Required if trigger_type === "new_message" ("When should this run")

  // Condition fields (apply only when trigger_type === "template_reply")
  condition_type?: "any" | "button" | "intent" | "keywords" | "fallback";
  button_ids?: string[]; // Selected button labels/payloads
  intent_text?: string;
  keywords?: string; // Comma-separated
  keyword_match?: "any" | "all"; // default: any

  // Step 3: Agent replies
  agent_prompt: string; // Instructions for how the agent handles the whole conversation
  use_kb?: boolean;
  send_mode: "auto" | "draft";

  // Step 4: Hand off
  handoff_enabled: boolean; // default: true
  handoff_conditions?: HandoffCondition[];
  handoff_condition_prompt?: string;
  handoff_assignee_id?: string | number;
  handoff_assignee_name?: string;
  handoff_message?: string;

  // Step 5: After replying (Advanced)
  create_contact_enabled: boolean; // default: false
  contact_category_id?: string;
  contact_category_name?: string;
  workflow_id?: string;
  workflow_name?: string;
  resolve_mode: "condition" | "inactivity" | "transferred_to_team";
  resolve_condition_prompt?: string;
  resolve_after_hours?: number; // 1 to 24 max

  // Derived direction: "both" for template_reply, "inbound" for new_message
  direction: RuleDirection;

  createdAt?: string;
  updatedAt?: string;

  // Optional legacy fields for backward compatibility
  description?: string;
  color?: string;
  templateId?: string;
  templateName?: string;
  triggerEvent?: "template_fired" | "customer_reply" | "button_click" | "any";
  targetButtonLabel?: string;
  classificationPrompt?: string;
  responsePrompt?: string;
  fixedResponseText?: string;
  responseType?: string;
  instructions?: string;
  keywordsFilter?: { contains?: string };
}

export const WHATSAPP_AGENT_STORAGE_KEY = "mantra_whatsapp_agent_rules";
export const WHATSAPP_AGENT_EVENT = "whatsapp_agent_rules_updated";

/**
 * Derive direction from trigger type:
 * Contact replying to an outbound template operates in both directions (outbound template -> inbound reply).
 * New contact message is purely inbound.
 */
export function deriveRuleDirection(triggerType: "template_reply" | "new_message"): RuleDirection {
  return triggerType === "template_reply" ? "both" : "inbound";
}

/**
 * Deterministically evaluates whether a button payload matches the rule's button_ids.
 * No AI call is required.
 */
export function evaluateButtonMatch(rule: WhatsAppAgentRule, buttonPayload: string): boolean {
  if (rule.condition_type !== "button") return false;
  if (!rule.button_ids || rule.button_ids.length === 0) return true;
  const target = buttonPayload.trim().toLowerCase();
  return rule.button_ids.some((b) => b.trim().toLowerCase() === target);
}

/**
 * Deterministically evaluates keywords against incoming text.
 * Supports "any" or "all" keyword matching.
 */
export function evaluateKeywordsMatch(rule: WhatsAppAgentRule, messageText: string): boolean {
  if (rule.condition_type !== "keywords" || !rule.keywords) return false;
  const terms = rule.keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return false;

  const lower = messageText.toLowerCase();
  if (rule.keyword_match === "all") {
    return terms.every((t) => lower.includes(t));
  }
  return terms.some((t) => lower.includes(t));
}

export const DEFAULT_WHATSAPP_RULES: WhatsAppAgentRule[] = [
  {
    id: "wa-rule-1",
    name: "Appointment Attendance Confirmation",
    description: "Confirms attendance, shares clinic directions, and checks patient preparation before arrival.",
    is_active: true,
    enabled: true,
    priority: 1,
    trigger_type: "template_reply",
    templates: ["tpl-1"],
    templateNames: ["Appointment Reminder"],
    condition_type: "button",
    button_ids: ["Confirm Attendance"],
    agent_prompt:
      "Warmly acknowledge and thank {{contact_name}} for confirming their appointment on {{appointment_date}}. Advise them to arrive 10 minutes early with valid identification and their insurance card. Provide clinic address and parking details.",
    use_kb: false,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "cond-1-1",
        title: "Medical Emergency or Complaints",
        prompt: "Contact is upset, asks for a refund, or raises a medical emergency",
        assigneeId: 2,
        assigneeName: "Akshita Sharma",
        handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our care team who will reply shortly.",
      },
    ],
    handoff_condition_prompt: "Contact is upset, asks for a refund, or raises a medical emergency",
    handoff_assignee_id: 2,
    handoff_assignee_name: "Akshita Sharma",
    handoff_message: "Thanks {{contact_name}}, I'm connecting you with our care team who will reply shortly.",
    create_contact_enabled: true,
    contact_category_id: "Patient",
    contact_category_name: "Patient",
    resolve_mode: "condition",
    resolve_condition_prompt: "Contact has confirmed the appointment or has no further questions",
    direction: "both",
    createdAt: "2026-11-20",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-2",
    name: "Reschedule Request & Slot Reallocation",
    description: "Handles rescheduling inquiries, checks provider calendars, and proposes alternative booking slots.",
    is_active: true,
    enabled: true,
    priority: 2,
    trigger_type: "template_reply",
    templates: ["tpl-1"],
    templateNames: ["Appointment Reminder"],
    condition_type: "button",
    button_ids: ["Reschedule Visit"],
    agent_prompt:
      "Politely acknowledge {{contact_name}}'s reschedule request. Offer the next 2 available slots with their assigned provider. Ask whether morning or afternoon works best for them.",
    use_kb: false,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "cond-2-1",
        title: "Unavailable Provider or Special Request",
        prompt: "Contact requests a provider who is unavailable or has complex scheduling requirements",
        assigneeId: 1,
        assigneeName: "Admin User",
        handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our scheduling team to finalize your visit.",
      },
    ],
    handoff_condition_prompt: "Contact requests a provider who is unavailable or has complex scheduling requirements",
    handoff_assignee_id: 1,
    handoff_assignee_name: "Admin User",
    handoff_message: "Thanks {{contact_name}}, I'm connecting you with our scheduling team to finalize your visit.",
    create_contact_enabled: true,
    contact_category_id: "Patient",
    contact_category_name: "Patient",
    resolve_mode: "inactivity",
    resolve_after_hours: 24,
    direction: "both",
    createdAt: "2026-11-21",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-3",
    name: "Booking Follow-up & Intake Lead Capture",
    description: "Sends digital intake forms, collects pre-visit questionnaires, and answers intake questions.",
    is_active: true,
    enabled: true,
    priority: 3,
    trigger_type: "template_reply",
    templates: ["tpl-2"],
    templateNames: ["Booking Confirmation"],
    condition_type: "keywords",
    keywords: "booking, confirmation, appointment",
    keyword_match: "any",
    agent_prompt:
      "Verify if {{contact_name}} has completed their pre-consultation medical questionnaire. If incomplete, provide the link and instructions.",
    use_kb: false,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "cond-3-1",
        title: "Intake Error or Form Questions",
        prompt: "Contact is unable to access forms or encounters an error",
        assigneeId: 4,
        assigneeName: "Charu Arora",
        handoffMessage: "Thanks {{contact_name}}, our clinical coordinator will assist you with your intake forms directly.",
      },
    ],
    handoff_condition_prompt: "Contact is unable to access forms or encounters an error",
    handoff_assignee_id: 4,
    handoff_assignee_name: "Charu Arora",
    handoff_message: "Thanks {{contact_name}}, our clinical coordinator will assist you with your intake forms directly.",
    create_contact_enabled: true,
    contact_category_id: "Lead",
    contact_category_name: "Lead",
    resolve_mode: "inactivity",
    resolve_after_hours: 24,
    direction: "both",
    createdAt: "2026-11-22",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-4",
    name: "General Template Reply Fallback",
    description: "Fallback handler when contact messages do not match specific button clicks or intents.",
    is_active: true,
    enabled: true,
    priority: 4,
    trigger_type: "template_reply",
    templates: ["tpl-1", "tpl-2"],
    templateNames: ["Appointment Reminder", "Booking Confirmation"],
    condition_type: "fallback",
    agent_prompt:
      "Warmly thank {{contact_name}} for their message. Let them know their inquiry has been received and our care coordinator will assist them shortly.",
    use_kb: true,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "cond-4-1",
        title: "Urgent Inquiry Fallback",
        prompt: "Contact is upset, asks for refund, or has an urgent inquiry",
        assigneeId: 1,
        assigneeName: "Admin User",
        handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
      },
    ],
    handoff_condition_prompt: "Contact is upset, asks for refund, or has an urgent inquiry",
    handoff_assignee_id: 1,
    handoff_assignee_name: "Admin User",
    handoff_message: "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
    create_contact_enabled: false,
    resolve_mode: "inactivity",
    resolve_after_hours: 24,
    direction: "both",
    createdAt: "2026-11-22",
    updatedAt: "2026-11-23",
  },
  {
    id: "wa-rule-5",
    name: "Inbound Inquiries & Appointment Booking",
    description: "Direct customer greeting, services overview, knowledge base queries, and triage for incoming messages.",
    is_active: true,
    enabled: true,
    priority: 5,
    trigger_type: "new_message",
    templates: [],
    trigger_prompt: "Contact asks about clinic pricing, services, insurance, or wants to book an appointment",
    agent_prompt:
      "Warmly welcome the contact to MantraCare. Explain our available care services, answer inquiries accurately using our knowledge base, and offer to schedule a consultation with the appropriate doctor.",
    use_kb: true,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "cond-5-1",
        title: "Clinical Symptoms or Emergency",
        prompt: "Contact reports urgent symptoms or asks to speak with a physician directly",
        assigneeId: 2,
        assigneeName: "Akshita Sharma",
        handoffMessage: "Thanks {{contact_name}}, I'm connecting you with our clinical team immediately.",
      },
    ],
    handoff_condition_prompt: "Contact reports urgent symptoms or asks to speak with a physician directly",
    handoff_assignee_id: 2,
    handoff_assignee_name: "Akshita Sharma",
    handoff_message: "Thanks {{contact_name}}, I'm connecting you with our clinical team immediately.",
    create_contact_enabled: true,
    contact_category_id: "Patient",
    contact_category_name: "Patient",
    resolve_mode: "condition",
    resolve_condition_prompt: "Contact has confirmed their appointment or has no further questions",
    direction: "inbound",
    createdAt: "2026-11-23",
    updatedAt: "2026-11-23",
  },
];

/**
 * Normalizes any stored rule to ensure strict conformity with the schema.
 */
function normalizeRule(raw: any, index: number): WhatsAppAgentRule {
  const trigger_type: "template_reply" | "new_message" =
    raw.trigger_type || (raw.triggerEvent === "customer_reply" || raw.templateId ? "template_reply" : "template_reply");

  // Multi-template array normalization
  let templates: string[] = [];
  if (trigger_type === "template_reply") {
    if (Array.isArray(raw.templates) && raw.templates.length > 0) {
      templates = raw.templates;
    } else if (raw.templateId && raw.templateId !== "all") {
      templates = [raw.templateId];
    } else if (raw.templateId === "all") {
      templates = ["tpl-1", "tpl-2"];
    }
  }

  // Trigger prompt for new message
  const trigger_prompt: string | undefined =
    trigger_type === "new_message"
      ? raw.trigger_prompt || raw.intent_text || raw.classificationPrompt || "Contact asks about services, appointments, or general information"
      : undefined;

  // Condition normalization (for template replies only)
  let condition_type: "any" | "button" | "intent" | "keywords" | "fallback" = "any";
  if (trigger_type === "template_reply") {
    condition_type = raw.condition_type || "any";
    if (!raw.condition_type) {
      if (raw.triggerEvent === "button_click" || raw.targetButtonLabel) {
        condition_type = "button";
      } else if (raw.criteriaType === "keywords") {
        condition_type = "keywords";
      } else if (raw.classificationPrompt) {
        condition_type = "intent";
      }
    }
  }

  // Buttons array normalization
  let button_ids: string[] = [];
  if (trigger_type === "template_reply" && condition_type === "button") {
    if (Array.isArray(raw.button_ids)) {
      button_ids = raw.button_ids;
    } else if (raw.targetButtonLabel) {
      button_ids = [raw.targetButtonLabel];
    }
  }

  // Migration for agent prompt:
  let agent_prompt = "";
  if (raw.agent_prompt) {
    agent_prompt = raw.agent_prompt;
  } else if (raw.instructions) {
    agent_prompt = raw.instructions;
  } else if (raw.responsePrompt) {
    agent_prompt = raw.responsePrompt;
  } else if (raw.fixedResponseText && raw.reply_type !== "fixed") {
    agent_prompt = raw.fixedResponseText;
  }

  const send_mode: "auto" | "draft" =
    raw.send_mode === "draft" || raw.responseType === "ai_draft_only" ? "draft" : "auto";

  // Hand off migration & multi-conditions support
  const handoff_enabled =
    raw.handoff_enabled !== undefined
      ? Boolean(raw.handoff_enabled)
      : raw.human_handoff !== undefined
      ? Boolean(raw.human_handoff)
      : true;

  let handoff_conditions: HandoffCondition[] = [];
  if (Array.isArray(raw.handoff_conditions) && raw.handoff_conditions.length > 0) {
    handoff_conditions = raw.handoff_conditions.map((c: any, cIdx: number) => ({
      id: c.id || `cond-${cIdx + 1}`,
      title: c.title || `Condition ${cIdx + 1}`,
      prompt: c.prompt || c.conditionPrompt || "",
      assigneeId: c.assigneeId || c.handoff_assignee_id || 1,
      assigneeName: c.assigneeName || c.handoff_assignee_name || "Admin User",
      handoffMessage:
        c.handoffMessage ||
        c.handoff_message ||
        "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
    }));
  } else {
    handoff_conditions = [
      {
        id: "cond-1",
        title: "Condition 1",
        prompt:
          raw.handoff_condition_prompt ||
          "Contact is upset, asks for a refund, or raises a medical emergency",
        assigneeId: raw.handoff_assignee_id || 1,
        assigneeName: raw.handoff_assignee_name || "Admin User",
        handoffMessage:
          raw.handoff_message ||
          "Thanks {{contact_name}}, I'm connecting you with our team who will reply shortly.",
      },
    ];
  }

  const primaryCondition = handoff_conditions[0];
  const handoff_condition_prompt = primaryCondition?.prompt || "";
  const handoff_assignee_id = primaryCondition?.assigneeId || 1;
  const handoff_assignee_name = primaryCondition?.assigneeName || "Admin User";
  const handoff_message = primaryCondition?.handoffMessage || "";

  // Create contact migration
  const create_contact_enabled =
    raw.create_contact_enabled !== undefined
      ? Boolean(raw.create_contact_enabled)
      : Boolean(raw.crm_update || raw.autoCreateContact);
  const contact_category_id =
    raw.contact_category_id || raw.crm_create_as || raw.entityType || "Patient";
  const contact_category_name =
    raw.contact_category_name || raw.crm_create_as || raw.entityType || "Patient";

  // Resolve mode migration:
  // "transferred_to_team" | "condition" | "inactivity" (capped at 24 hours max)
  let resolve_mode: "condition" | "inactivity" | "transferred_to_team" = "condition";
  let resolve_condition_prompt = raw.resolve_condition_prompt || "";
  let resolve_after_hours = Math.min(24, Math.max(1, raw.resolve_after_hours || raw.resolutionTimeoutHours || 24));

  if (raw.resolve_mode === "transferred_to_team" || raw.resolutionCriteria === "transferred_to_team") {
    resolve_mode = "transferred_to_team";
  } else if (
    raw.resolve_mode === "never" ||
    raw.resolve_mode === "after_reply" ||
    raw.resolutionCriteria === "immediate"
  ) {
    resolve_mode = "inactivity";
    resolve_after_hours = 24;
  } else if (
    raw.resolve_mode === "inactivity" ||
    raw.resolve_mode === "after_inactivity" ||
    raw.resolutionCriteria === "inactivity_timeout"
  ) {
    resolve_mode = "inactivity";
    resolve_after_hours = Math.min(24, Math.max(1, raw.resolve_after_hours || 24));
  } else if (
    raw.resolve_mode === "condition" ||
    raw.resolve_mode === "customer_confirms" ||
    raw.resolutionCriteria === "prompt_condition" ||
    raw.resolutionCriteria === "customer_confirmation"
  ) {
    resolve_mode = "condition";
    resolve_condition_prompt =
      resolve_condition_prompt ||
      raw.resolutionPromptCondition ||
      "Contact has confirmed or has no further questions";
  } else {
    resolve_mode = "condition";
    resolve_condition_prompt = resolve_condition_prompt || "Contact has confirmed or has no further questions";
  }

  const is_active =
    raw.is_active !== undefined
      ? Boolean(raw.is_active)
      : raw.enabled !== undefined
      ? Boolean(raw.enabled)
      : true;

  return {
    id: raw.id || `wa-rule-${Date.now()}-${index}`,
    name: raw.name || "Untitled Agent Rule",
    description: raw.description || undefined,
    is_active,
    enabled: is_active,
    priority: typeof raw.priority === "number" ? raw.priority : index + 1,

    trigger_type,
    templates,
    templateNames: raw.templateNames || (raw.templateName ? [raw.templateName] : []),
    trigger_prompt,

    condition_type: trigger_type === "template_reply" ? condition_type : undefined,
    button_ids: trigger_type === "template_reply" && condition_type === "button" ? button_ids : undefined,
    intent_text: trigger_type === "template_reply" && condition_type === "intent" ? raw.intent_text || raw.classificationPrompt || "" : undefined,
    keywords: trigger_type === "template_reply" && condition_type === "keywords" ? raw.keywords || raw.keywordsFilter?.contains || "" : undefined,
    keyword_match: trigger_type === "template_reply" && condition_type === "keywords" ? raw.keyword_match || "any" : undefined,

    agent_prompt,
    use_kb: Boolean(raw.use_kb),
    send_mode,

    handoff_enabled,
    handoff_conditions,
    handoff_condition_prompt,
    handoff_assignee_id,
    handoff_assignee_name,
    handoff_message,

    create_contact_enabled,
    contact_category_id,
    contact_category_name,

    workflow_id: raw.workflow_id || (raw.processId && raw.processId !== "none" ? raw.processId : undefined),
    workflow_name: raw.workflow_name || raw.processName,

    resolve_mode,
    resolve_condition_prompt: resolve_mode === "condition" ? resolve_condition_prompt : undefined,
    resolve_after_hours: resolve_mode === "inactivity" ? resolve_after_hours : undefined,

    direction: deriveRuleDirection(trigger_type),
    createdAt: raw.createdAt || new Date().toISOString().substring(0, 10),
    updatedAt: new Date().toISOString().substring(0, 10),

    // Maintain legacy compatibility
    templateId: raw.templateId || templates[0] || "tpl-1",
    templateName: raw.templateName || (templates[0] ? "Appointment Reminder" : "All Templates"),
    responsePrompt: agent_prompt,
    instructions: agent_prompt,
    fixedResponseText: agent_prompt,
    responseType: send_mode === "draft" ? "ai_draft_only" : "ai_prompt",
  };
}

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

    // Normalize and ensure fallback is pinned to bottom
    const normalized = parsed.map((item, idx) => normalizeRule(item, idx));
    const nonFallback = normalized
      .filter((r) => r.condition_type !== "fallback")
      .sort((a, b) => a.priority - b.priority);
    const fallback = normalized.filter((r) => r.condition_type === "fallback");

    const sorted = [...nonFallback, ...fallback].map((r, i) => ({
      ...r,
      priority: i + 1,
    }));

    return sorted;
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

    // Derived direction
    const cleanRule: WhatsAppAgentRule = {
      ...rule,
      direction: deriveRuleDirection(rule.trigger_type),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    let next: WhatsAppAgentRule[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = cleanRule;
    } else {
      cleanRule.id = cleanRule.id || `wa-rule-${Date.now()}`;
      cleanRule.createdAt = new Date().toISOString().substring(0, 10);
      if (cleanRule.condition_type === "fallback") {
        next = [...current, cleanRule];
      } else {
        const fallbacks = current.filter((r) => r.condition_type === "fallback");
        const nonFallbacks = current.filter((r) => r.condition_type !== "fallback");
        next = [...nonFallbacks, cleanRule, ...fallbacks];
      }
    }

    // Re-index priorities: non-fallbacks 1..N, fallbacks at end
    const nonFallbacks = next.filter((r) => r.condition_type !== "fallback");
    const fallbacks = next.filter((r) => r.condition_type === "fallback");
    const finalOrdered = [...nonFallbacks, ...fallbacks].map((r, i) => ({
      ...r,
      priority: i + 1,
    }));

    saveStoredWhatsAppRules(finalOrdered);
    setRules(finalOrdered);
  };

  const deleteRule = (ruleId: string) => {
    const current = getStoredWhatsAppRules();
    const filtered = current.filter((r) => r.id !== ruleId);
    const nonFallbacks = filtered.filter((r) => r.condition_type !== "fallback");
    const fallbacks = filtered.filter((r) => r.condition_type === "fallback");
    const finalOrdered = [...nonFallbacks, ...fallbacks].map((r, i) => ({
      ...r,
      priority: i + 1,
    }));
    saveStoredWhatsAppRules(finalOrdered);
    setRules(finalOrdered);
  };

  const reorderRules = (fromOrList: number | WhatsAppAgentRule[], to?: number) => {
    const current = getStoredWhatsAppRules();
    let reordered: WhatsAppAgentRule[];

    if (Array.isArray(fromOrList)) {
      reordered = fromOrList;
    } else if (typeof fromOrList === "number" && typeof to === "number") {
      const nonFallbacks = current.filter((r) => r.condition_type !== "fallback");
      const fallbacks = current.filter((r) => r.condition_type === "fallback");
      if (fromOrList < 0 || fromOrList >= nonFallbacks.length || to < 0 || to >= nonFallbacks.length) {
        return;
      }
      const item = nonFallbacks.splice(fromOrList, 1)[0];
      nonFallbacks.splice(to, 0, item);
      reordered = [...nonFallbacks, ...fallbacks];
    } else {
      return;
    }

    const nonFallbacks = reordered.filter((r) => r.condition_type !== "fallback");
    const fallbacks = reordered.filter((r) => r.condition_type === "fallback");
    const finalOrdered = [...nonFallbacks, ...fallbacks].map((r, i) => ({
      ...r,
      priority: i + 1,
    }));
    saveStoredWhatsAppRules(finalOrdered);
    setRules(finalOrdered);
  };

  const moveRulePriority = (ruleId: string, direction: "up" | "down") => {
    const current = getStoredWhatsAppRules();
    const nonFallbacks = current.filter((r) => r.condition_type !== "fallback");
    const fallbacks = current.filter((r) => r.condition_type === "fallback");
    const idx = nonFallbacks.findIndex((r) => r.id === ruleId);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const temp = nonFallbacks[idx - 1];
      nonFallbacks[idx - 1] = nonFallbacks[idx];
      nonFallbacks[idx] = temp;
    } else if (direction === "down" && idx < nonFallbacks.length - 1) {
      const temp = nonFallbacks[idx + 1];
      nonFallbacks[idx + 1] = nonFallbacks[idx];
      nonFallbacks[idx] = temp;
    } else {
      return;
    }

    const finalOrdered = [...nonFallbacks, ...fallbacks].map((r, i) => ({
      ...r,
      priority: i + 1,
    }));
    saveStoredWhatsAppRules(finalOrdered);
    setRules(finalOrdered);
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

  const toggleRuleEnabled = (ruleId: string) => {
    const current = getStoredWhatsAppRules();
    const next = current.map((r) =>
      r.id === ruleId ? { ...r, is_active: !r.is_active, enabled: !r.is_active } : r
    );
    saveStoredWhatsAppRules(next);
    setRules(next);
  };

  return {
    rules,
    saveRule,
    deleteRule,
    reorderRules,
    moveRulePriority,
    duplicateRule,
    toggleRuleEnabled,
  };
}
