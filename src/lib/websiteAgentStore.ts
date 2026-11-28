/**
 * websiteAgentStore.ts
 * Path: src/lib/websiteAgentStore.ts
 *
 * Dedicated reactive state store for Website Agent automation rules,
 * mirroring whatsappAgentStore while tying rules to configured Website Channels.
 */

import { useState, useEffect } from "react";
import { HandoffCondition, RuleDirection } from "./whatsappAgentStore";

export type WebsiteTriggerType = "new_message" | "requirement_selected" | "page_url";

export interface WebsiteAgentRule {
  id: string;
  name: string;
  description?: string;
  connected_channel?: string; // WebsiteChannel id or "all"
  connected_channel_name?: string;
  is_active: boolean;
  enabled: boolean;
  priority: number;

  // Step 2: When it runs
  trigger_type: WebsiteTriggerType;
  trigger_prompt?: string; // For new_message
  requirement_ids?: string[]; // For requirement_selected
  requirement_names?: string[];
  page_url_pattern?: string; // For page_url
  condition_type?: "any" | "intent" | "keywords";
  intent_text?: string;
  keywords?: string;
  keyword_match?: "any" | "all";

  // Step 3: Agent replies
  reply_mode?: "ai_prompt" | "canned_message";
  canned_reply_text?: string;
  agent_prompt: string;
  use_kb?: boolean;
  send_mode: "auto" | "draft";

  // Step 4: Hand off
  handoff_enabled: boolean;
  handoff_conditions?: HandoffCondition[];
  handoff_condition_prompt?: string;
  handoff_assignee_id?: string | number;
  handoff_assignee_name?: string;
  handoff_message?: string;

  // Step 5: After replying (Advanced)
  create_contact_enabled: boolean;
  contact_category_id?: string;
  contact_category_name?: string;
  workflow_id?: string;
  workflow_name?: string;
  resolve_mode: "condition" | "inactivity" | "transferred_to_team";
  resolve_condition_prompt?: string;
  resolve_after_hours?: number;

  direction: RuleDirection;
  createdAt?: string;
  updatedAt?: string;
}

export const WEBSITE_AGENT_STORAGE_KEY = "mantra_website_agent_rules_v1";
export const WEBSITE_AGENT_EVENT = "website_agent_rules_updated";

export const DEFAULT_WEBSITE_AGENT_RULES: WebsiteAgentRule[] = [
  {
    id: "web-rule-1",
    name: "Appointment Booking & Walk-In Concierge",
    description: "Handles visitors asking about walk-in availability, clinic hours, and new appointment scheduling.",
    connected_channel: "web-ch-1",
    connected_channel_name: "Main Clinic Website",
    is_active: true,
    enabled: true,
    priority: 1,
    trigger_type: "new_message",
    trigger_prompt: "Visitor asks about booking an appointment, walk-in hours, or provider availability.",
    condition_type: "any",
    reply_mode: "ai_prompt",
    agent_prompt:
      "Greet {{contact_name}} warmly and answer their scheduling or walk-in inquiry clearly. Share clinic hours and offer the earliest available consultation slots.",
    use_kb: true,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "web-cond-1",
        title: "Urgent Clinical Symptoms or Complex Scheduling",
        prompt: "Visitor describes urgent medical symptoms or requests a custom multi-specialist visit",
        assigneeLevel: "user",
        assigneeId: 2,
        assigneeName: "Akshita Sharma",
        assignees: [
          {
            id: 2,
            type: "user",
            name: "Akshita Sharma",
            roleOrDept: "Clinical Triage",
          },
        ],
        handoffMessage: "Thanks {{contact_name}}, I am connecting you with our clinic coordinator right now.",
      },
    ],
    handoff_condition_prompt: "Visitor describes urgent medical symptoms or requests a custom multi-specialist visit",
    handoff_assignee_id: 2,
    handoff_assignee_name: "Akshita Sharma",
    handoff_message: "Thanks {{contact_name}}, I am connecting you with our clinic coordinator right now.",
    create_contact_enabled: true,
    contact_category_id: "Lead",
    contact_category_name: "Lead",
    resolve_mode: "condition",
    resolve_condition_prompt: "Visitor confirmed appointment preference or has no further questions",
    direction: "inbound",
    createdAt: "2026-11-22",
    updatedAt: "2026-11-28",
  },
  {
    id: "web-rule-2",
    name: "Insurance & Eligibility Pre-Check",
    description: "Guides portal visitors through accepted insurance plans and coverage verification requirements.",
    connected_channel: "web-ch-2",
    connected_channel_name: "Patient Intake Portal",
    is_active: true,
    enabled: true,
    priority: 2,
    trigger_type: "requirement_selected",
    requirement_ids: ["req-2"],
    requirement_names: ["Insurance & Coverage Inquiry"],
    condition_type: "any",
    reply_mode: "ai_prompt",
    agent_prompt:
      "Ask {{contact_name}} for their insurance carrier and member ID so we can verify eligibility quickly before their visit.",
    use_kb: true,
    send_mode: "auto",
    handoff_enabled: true,
    handoff_conditions: [
      {
        id: "web-cond-2",
        title: "Billing Dispute or Out-of-Network Exception",
        prompt: "Visitor asks about an out-of-network appeal, reimbursement exception, or denied claim",
        assigneeLevel: "department",
        assigneeId: "dept_1",
        assigneeName: "Billing & Insurance",
        assignees: [
          {
            id: "dept_1",
            type: "department",
            name: "Billing & Insurance",
            roleOrDept: "Department",
          },
        ],
        handoffMessage: "I'm routing your coverage question to our insurance specialists who will assist shortly.",
      },
    ],
    create_contact_enabled: true,
    contact_category_id: "Patient",
    contact_category_name: "Patient",
    resolve_mode: "transferred_to_team",
    direction: "inbound",
    createdAt: "2026-11-24",
    updatedAt: "2026-11-28",
  },
];

export function getStoredWebsiteAgentRules(): WebsiteAgentRule[] {
  try {
    const raw = localStorage.getItem(WEBSITE_AGENT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WEBSITE_AGENT_STORAGE_KEY, JSON.stringify(DEFAULT_WEBSITE_AGENT_RULES));
      return DEFAULT_WEBSITE_AGENT_RULES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_WEBSITE_AGENT_RULES;
    return parsed;
  } catch {
    return DEFAULT_WEBSITE_AGENT_RULES;
  }
}

export function saveStoredWebsiteAgentRules(rules: WebsiteAgentRule[]): void {
  try {
    localStorage.setItem(WEBSITE_AGENT_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event(WEBSITE_AGENT_EVENT));
  } catch {}
}

export function useWebsiteAgentStore() {
  const [rules, setRules] = useState<WebsiteAgentRule[]>(getStoredWebsiteAgentRules);

  useEffect(() => {
    const handleUpdate = () => setRules(getStoredWebsiteAgentRules());
    window.addEventListener(WEBSITE_AGENT_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(WEBSITE_AGENT_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const saveRule = (rule: WebsiteAgentRule) => {
    const current = getStoredWebsiteAgentRules();
    const exists = current.some((r) => r.id === rule.id);
    const updated = exists
      ? current.map((r) => (r.id === rule.id ? rule : r))
      : [...current, { ...rule, priority: current.length + 1 }];
    saveStoredWebsiteAgentRules(updated);
    setRules(updated);
  };

  const deleteRule = (ruleId: string) => {
    const current = getStoredWebsiteAgentRules();
    const updated = current
      .filter((r) => r.id !== ruleId)
      .map((r, idx) => ({ ...r, priority: idx + 1 }));
    saveStoredWebsiteAgentRules(updated);
    setRules(updated);
  };

  const toggleRuleEnabled = (ruleId: string) => {
    const current = getStoredWebsiteAgentRules();
    const updated = current.map((r) =>
      r.id === ruleId
        ? { ...r, is_active: !(r.is_active ?? r.enabled), enabled: !(r.is_active ?? r.enabled) }
        : r
    );
    saveStoredWebsiteAgentRules(updated);
    setRules(updated);
  };

  const duplicateRule = (rule: WebsiteAgentRule) => {
    const current = getStoredWebsiteAgentRules();
    const copy: WebsiteAgentRule = {
      ...rule,
      id: `web-rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      priority: current.length + 1,
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };
    const updated = [...current, copy];
    saveStoredWebsiteAgentRules(updated);
    setRules(updated);
  };

  return {
    rules,
    saveRule,
    deleteRule,
    toggleRuleEnabled,
    duplicateRule,
  };
}
