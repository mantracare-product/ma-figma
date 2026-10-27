/**
 * emailAgentStore.ts
 * Path: src/lib/emailAgentStore.ts
 *
 * Dedicated reactive state store for Email Agent settings & workflow pipeline:
 * - Step 1: Labels & Categories (custom labels + predefined classification labels)
 * - Step 2: Drafting Instructions & Signature
 * - Step 3: Action automations (Tickets, Forwarding rules, CRM leads qualification)
 * - Step 4: Notification loop switches & Team inboxes
 * - Mailbox connection & monitoring toggles + real-time KPIs
 */

import { useState, useEffect } from "react";

export interface EmailLabel {
  id: string;
  name: string;
  description: string;
  color: "blue" | "amber" | "purple" | "cyan" | "rose" | "orange" | "emerald" | "slate";
  enabled: boolean;
  isPredefined?: boolean;
}

export interface ForwardingRule {
  id: string;
  name: string;
  conditionField: "from" | "subject" | "body" | "domain";
  conditionOperator: "contains" | "equals" | "ends_with";
  conditionValue: string;
  forwardTo: string;
  enabled: boolean;
}

export interface TeamInboxMember {
  id: string;
  name: string;
  email: string;
  role: string;
  connected: boolean;
  lastSynced?: string;
}

export interface EmailAgentConfig {
  mailbox: {
    provider: "gmail" | "outlook" | "imap";
    email: string;
    isConnected: boolean;
    monitoringEnabled: boolean;
    aiLabellingEnabled: boolean;
    aiDraftsEnabled: boolean;
    stats: {
      emailsProcessed: number;
      draftsCreated: number;
    };
  };
  step1Labels: {
    customLabels: EmailLabel[];
    predefinedLabels: EmailLabel[];
  };
  step2Drafting: {
    instructions: string;
    signature: {
      isSetUp: boolean;
      title: string;
      body: string;
    };
  };
  step3Actions: {
    tickets: {
      enabled: boolean;
      isSetUp: boolean;
      pipelineName: string;
    };
    forwarding: {
      enabled: boolean;
      rules: ForwardingRule[];
    };
    crmLeads: {
      enabled: boolean;
      qualificationPrompt: string;
    };
  };
  step4Notifications: {
    crmLeadEmail: boolean;
    meetingRequest: boolean;
    calendarReminder: boolean;
    teamInboxes: TeamInboxMember[];
  };
}

export const EMAIL_AGENT_STORAGE_KEY = "mantra_email_agent_config";
export const EMAIL_AGENT_EVENT = "mantra_email_agent_updated";

export const DEFAULT_PREDEFINED_LABELS: EmailLabel[] = [
  {
    id: "awaiting-reply",
    name: "Awaiting Reply",
    color: "blue",
    description: "Emails where we have already sent a response and are waiting on client or partner feedback.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "fyi",
    name: "FYI",
    color: "amber",
    description: "Informational newsletters, notifications, or receipts that do not require any active reply.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "marketing",
    name: "Marketing",
    color: "purple",
    description: "Cold outreach, marketing inquiries, product pitches, or newsletter broadcasts.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "meeting-update",
    name: "Meeting Update",
    color: "cyan",
    description: "Calendar invitations, reschedule requests, cancellations, and meeting confirmations.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "needs-reply",
    name: "Needs Reply",
    color: "rose",
    description: "Urgent questions, patient queries, or client concerns that require immediate human or AI answer.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "notification",
    name: "Notification",
    color: "orange",
    description: "Automated service alerts, server updates, system transactional messages, and security notices.",
    enabled: true,
    isPredefined: true,
  },
  {
    id: "resolved",
    name: "Resolved",
    color: "emerald",
    description: "Tickets, conversations, or issues marked closed or completed with no pending action items.",
    enabled: true,
    isPredefined: true,
  },
];

export const DEFAULT_EMAIL_AGENT_CONFIG: EmailAgentConfig = {
  mailbox: {
    provider: "gmail",
    email: "himanshu@mantra.care",
    isConnected: true,
    monitoringEnabled: true,
    aiLabellingEnabled: true,
    aiDraftsEnabled: true,
    stats: {
      emailsProcessed: 48,
      draftsCreated: 1,
    },
  },
  step1Labels: {
    customLabels: [],
    predefinedLabels: DEFAULT_PREDEFINED_LABELS,
  },
  step2Drafting: {
    instructions: "",
    signature: {
      isSetUp: false,
      title: "Mantra Care Team",
      body: "Best regards,\nMantra Care Team\nsupport@mantra.care",
    },
  },
  step3Actions: {
    tickets: {
      enabled: false,
      isSetUp: false,
      pipelineName: "Support Desk",
    },
    forwarding: {
      enabled: true,
      rules: [],
    },
    crmLeads: {
      enabled: true,
      qualificationPrompt: "",
    },
  },
  step4Notifications: {
    crmLeadEmail: true,
    meetingRequest: true,
    calendarReminder: true,
    teamInboxes: [
      { id: "tm-1", name: "Himanshu", email: "himanshu@mantra.care", role: "Owner", connected: true, lastSynced: "Just now" },
      { id: "tm-2", name: "Sarah Johnson", email: "sarah.j@mantra.care", role: "Care Specialist", connected: true, lastSynced: "10m ago" },
      { id: "tm-3", name: "Navodya Jain", email: "navodya@mantra.care", role: "Product Ops", connected: false },
    ],
  },
};

export function getStoredEmailAgentConfig(): EmailAgentConfig {
  try {
    const raw = localStorage.getItem(EMAIL_AGENT_STORAGE_KEY);
    if (!raw) return DEFAULT_EMAIL_AGENT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EMAIL_AGENT_CONFIG,
      ...parsed,
      mailbox: {
        ...DEFAULT_EMAIL_AGENT_CONFIG.mailbox,
        ...(parsed.mailbox || {}),
        stats: {
          ...DEFAULT_EMAIL_AGENT_CONFIG.mailbox.stats,
          ...(parsed.mailbox?.stats || {}),
        },
      },
      step1Labels: {
        customLabels: parsed.step1Labels?.customLabels || [],
        predefinedLabels: parsed.step1Labels?.predefinedLabels || DEFAULT_PREDEFINED_LABELS,
      },
      step2Drafting: {
        ...DEFAULT_EMAIL_AGENT_CONFIG.step2Drafting,
        ...(parsed.step2Drafting || {}),
      },
      step3Actions: {
        ...DEFAULT_EMAIL_AGENT_CONFIG.step3Actions,
        ...(parsed.step3Actions || {}),
        forwarding: {
          ...DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.forwarding,
          ...(parsed.step3Actions?.forwarding || {}),
          rules: parsed.step3Actions?.forwarding?.rules || [],
        },
        crmLeads: {
          ...DEFAULT_EMAIL_AGENT_CONFIG.step3Actions.crmLeads,
          ...(parsed.step3Actions?.crmLeads || {}),
        },
      },
      step4Notifications: {
        ...DEFAULT_EMAIL_AGENT_CONFIG.step4Notifications,
        ...(parsed.step4Notifications || {}),
        teamInboxes: parsed.step4Notifications?.teamInboxes || DEFAULT_EMAIL_AGENT_CONFIG.step4Notifications.teamInboxes,
      },
    };
  } catch {
    return DEFAULT_EMAIL_AGENT_CONFIG;
  }
}

export function saveEmailAgentConfig(config: EmailAgentConfig) {
  try {
    localStorage.setItem(EMAIL_AGENT_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EMAIL_AGENT_EVENT, { detail: config }));
  } catch (err) {
    console.error("Failed to save email agent config", err);
  }
}

export function useEmailAgentStore() {
  const [config, setConfig] = useState<EmailAgentConfig>(() => getStoredEmailAgentConfig());

  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getStoredEmailAgentConfig());
    };
    window.addEventListener(EMAIL_AGENT_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EMAIL_AGENT_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const updateConfig = (updater: (prev: EmailAgentConfig) => EmailAgentConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveEmailAgentConfig(next);
      return next;
    });
  };

  return {
    config,
    updateConfig,
    resetToDefault: () => {
      saveEmailAgentConfig(DEFAULT_EMAIL_AGENT_CONFIG);
      setConfig(DEFAULT_EMAIL_AGENT_CONFIG);
    },
  };
}
