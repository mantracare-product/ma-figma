import { useState, useEffect } from "react";

export const WEBSITE_WIDGET_CONFIG_EVENT = "websiteWidgetConfig_updated";
export const WEBSITE_CHANNELS_EVENT = "websiteChannels_updated";
const STORAGE_KEY = "websiteWidgetConfig";
const CHANNELS_STORAGE_KEY = "mantra_website_channels_v1";
const ACTIVE_CHANNEL_STORAGE_KEY = "mantra_active_website_channel_v1";

export interface RequirementItem {
  id: string;
  label: string;
  entityType?: string;
  processId?: string;
  stageId?: string;
}

export interface WebsiteWidgetConfig {
  themeColor: string;
  themeMode: "light" | "dark";
  botName: string;
  botSubtitle?: string;
  botAvatar?: string;
  launcherIcon?: string;
  welcomeMessage: string;
  removeSignature: boolean;
  position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

  // Working time preferences (inside Responsible Settings)
  workHoursEnabled: boolean;
  selectedLocationId?: string;
  selectedLocation?: string;
  timezone?: string;
  workHoursFrom?: string;
  workHoursTo?: string;
  workDays?: string[];

  // Widget display page targeting rules
  displayRuleType: "all_except" | "selected_only";
  excludePages: string[];
  includePages: string[];

  // Pre-chat form & requirement labels
  enablePreChatForm: boolean;
  preChatTiming?: "before_chat" | "after_first_message";
  showOnlineMembers?: boolean;
  formFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    requirement: boolean;
    processSelect?: boolean;
  };
  requirements: RequirementItem[];
  defaultProcessId?: string;
  processLabelMap?: Record<string, string>;

  // Auto Create Contact
  autoCreateClientEnabled: boolean;
  autoCreateContactCategory?: string;
  autoCreateEntity?: string;
  autoCreateProcessId?: string;
  autoCreateStage: string;

  // Responsible Settings
  firstResponder: "ai" | "human";
  aiTransferPhrases: string;
  agentQueue: string[];
  distribution: "To everybody" | "Evenly" | "Exactly as enqueued";
  agentDisplay: "user" | "custom" | "hide";
  customProfiles: Record<string, { name?: string; position?: string; image?: string }>;
}

export interface WebsiteChannel extends WebsiteWidgetConfig {
  id: string;
  name: string;
  description?: string;
  scriptKey: string;
  allowedWebsites: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_REQUIREMENTS: RequirementItem[] = [
  {
    id: "req-1",
    label: "Book an Appointment",
    entityType: "appointment",
    processId: "process-appointment-default",
    stageId: "appt-1",
  },
  {
    id: "req-2",
    label: "Insurance & Coverage Inquiry",
    entityType: "insurance",
    processId: "process-insurance-default",
    stageId: "ins-1",
  },
  {
    id: "req-3",
    label: "Billing & Invoices",
    entityType: "invoice",
    processId: "process-invoice-default",
    stageId: "inv-inv-draft",
  },
  {
    id: "req-4",
    label: "General Health Consultation",
    entityType: "client",
    processId: "1",
    stageId: "1-1",
  },
];

export const DEFAULT_WIDGET_CONFIG: WebsiteWidgetConfig = {
  themeColor: "#1456f0",
  themeMode: "light",
  botName: "MantraAssist Care Bot",
  botSubtitle: "Online · Ready to help",
  botAvatar: "",
  launcherIcon: "chat",
  welcomeMessage: "Hello! Welcome to Mantra Health. How can we assist you today?",
  removeSignature: false,
  position: "bottom-right",

  workHoursEnabled: false,
  selectedLocationId: "",
  selectedLocation: "",
  timezone: "(UTC-05:00) Eastern Time (US & Canada)",
  workHoursFrom: "09:00",
  workHoursTo: "17:00",
  workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],

  displayRuleType: "all_except",
  excludePages: ["/checkout/success", "/admin/*"],
  includePages: ["/pricing", "/contact", "/services/*"],

  enablePreChatForm: true,
  preChatTiming: "after_first_message",
  showOnlineMembers: true,
  formFields: {
    name: true,
    email: true,
    phone: true,
    requirement: true,
    processSelect: false,
  },
  requirements: DEFAULT_REQUIREMENTS,

  firstResponder: "ai",
  aiTransferPhrases: "talk to human, agent, support, representative",
  agentQueue: [],
  autoCreateClientEnabled: false,
  autoCreateContactCategory: "",
  autoCreateEntity: "",
  autoCreateProcessId: "",
  autoCreateStage: "",
  distribution: "Evenly",
  agentDisplay: "user",
  customProfiles: {},
};

export function generateWebsiteScriptKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 24; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `wk_${suffix}`;
}

export function buildWebsiteEmbedScript(scriptKey: string): string {
  return `<script src="https://wwchat.mantraassist.com/website-chat.js" data-key="${scriptKey}" async></script>`;
}

export const DEFAULT_WEBSITE_CHANNELS: WebsiteChannel[] = [
  {
    ...DEFAULT_WIDGET_CONFIG,
    id: "web-ch-1",
    name: "Main Clinic Website",
    description: "Primary website chat widget embedded across clinic booking and service pages.",
    scriptKey: "wk_38go25p7JGrVmndXVS00ACjB",
    allowedWebsites: [
      "https://widget-test-lyart-beta.vercel.app",
      "https://widget-test-4h2cfeda3-mantra-care-mantra-assist.vercel.app",
    ],
    isActive: true,
    createdAt: "2026-11-18",
    updatedAt: "2026-11-28",
  },
  {
    ...DEFAULT_WIDGET_CONFIG,
    id: "web-ch-2",
    name: "Patient Intake Portal",
    description: "Dedicated pre-visit intake and insurance verification widget.",
    themeColor: "#0EA5E9",
    botName: "Intake Concierge",
    botSubtitle: "Online · Insurance & Booking",
    welcomeMessage: "Hi! Need help completing intake or verifying insurance coverage?",
    position: "bottom-right",
    scriptKey: "wk_92kp47m3LQzTrxwYNP14BDmK",
    allowedWebsites: ["https://intake.mantraassist.com"],
    isActive: true,
    createdAt: "2026-11-20",
    updatedAt: "2026-11-26",
  },
];

function notifyConfigChanged() {
  window.dispatchEvent(new Event(WEBSITE_WIDGET_CONFIG_EVENT));
}

function notifyChannelsChanged() {
  window.dispatchEvent(new Event(WEBSITE_CHANNELS_EVENT));
  window.dispatchEvent(new Event(WEBSITE_WIDGET_CONFIG_EVENT));
}

function normalizeWidgetFields(parsed: any): WebsiteWidgetConfig {
  return {
    ...DEFAULT_WIDGET_CONFIG,
    ...parsed,
    formFields: {
      ...DEFAULT_WIDGET_CONFIG.formFields,
      ...(parsed?.formFields || {}),
      requirement: parsed?.formFields?.requirement !== undefined ? parsed.formFields.requirement : true,
    },
    requirements:
      Array.isArray(parsed?.requirements) && parsed.requirements.length > 0
        ? parsed.requirements.map((r: any, idx: number) => {
            const fallbackDefault =
              DEFAULT_REQUIREMENTS.find((d) => d.id === r.id) || DEFAULT_REQUIREMENTS[idx];
            return {
              id: r.id || `req-${Math.random()}`,
              label: r.label || "",
              entityType: r.entityType ?? fallbackDefault?.entityType ?? "client",
              processId: r.processId ?? fallbackDefault?.processId ?? "",
              stageId: r.stageId ?? fallbackDefault?.stageId ?? "",
            };
          })
        : DEFAULT_REQUIREMENTS,
    workDays: parsed?.workDays || DEFAULT_WIDGET_CONFIG.workDays,
    excludePages: parsed?.excludePages || DEFAULT_WIDGET_CONFIG.excludePages,
    includePages: parsed?.includePages || DEFAULT_WIDGET_CONFIG.includePages,
    agentQueue: Array.isArray(parsed?.agentQueue) ? parsed.agentQueue : DEFAULT_WIDGET_CONFIG.agentQueue,
    customProfiles: parsed?.customProfiles || DEFAULT_WIDGET_CONFIG.customProfiles,
    autoCreateContactCategory: parsed?.autoCreateContactCategory || "",
    autoCreateEntity: parsed?.autoCreateEntity || "",
    autoCreateStage: parsed?.autoCreateStage || "",
  };
}

export function getStoredWebsiteChannels(): WebsiteChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_STORAGE_KEY);
    if (!raw) {
      // Seed using legacy websiteWidgetConfig if present for smooth migration
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        const legacy = normalizeWidgetFields(JSON.parse(legacyRaw));
        const migrated: WebsiteChannel[] = [
          {
            ...DEFAULT_WEBSITE_CHANNELS[0],
            ...legacy,
            id: DEFAULT_WEBSITE_CHANNELS[0].id,
            name: DEFAULT_WEBSITE_CHANNELS[0].name,
            description: DEFAULT_WEBSITE_CHANNELS[0].description,
            scriptKey: DEFAULT_WEBSITE_CHANNELS[0].scriptKey,
            allowedWebsites: DEFAULT_WEBSITE_CHANNELS[0].allowedWebsites,
          },
          ...DEFAULT_WEBSITE_CHANNELS.slice(1),
        ];
        localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(DEFAULT_WEBSITE_CHANNELS));
      return DEFAULT_WEBSITE_CHANNELS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(DEFAULT_WEBSITE_CHANNELS));
      return DEFAULT_WEBSITE_CHANNELS;
    }
    return parsed.map((ch: any, idx: number) => ({
      ...normalizeWidgetFields(ch),
      id: ch.id || `web-ch-${idx + 1}`,
      name: ch.name || `Website Channel ${idx + 1}`,
      description: ch.description || "",
      scriptKey: ch.scriptKey || generateWebsiteScriptKey(),
      allowedWebsites: Array.isArray(ch.allowedWebsites) ? ch.allowedWebsites : [],
      isActive: ch.isActive !== undefined ? Boolean(ch.isActive) : true,
      createdAt: ch.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: ch.updatedAt || new Date().toISOString().substring(0, 10),
    }));
  } catch {
    return DEFAULT_WEBSITE_CHANNELS;
  }
}

export function saveStoredWebsiteChannels(channels: WebsiteChannel[]): void {
  try {
    localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(channels));
    notifyChannelsChanged();
  } catch {}
}

export function getActiveWebsiteChannelId(): string {
  try {
    const id = localStorage.getItem(ACTIVE_CHANNEL_STORAGE_KEY);
    const channels = getStoredWebsiteChannels();
    if (id && channels.some((c) => c.id === id)) return id;
    return channels[0]?.id || DEFAULT_WEBSITE_CHANNELS[0].id;
  } catch {
    return DEFAULT_WEBSITE_CHANNELS[0].id;
  }
}

export function setActiveWebsiteChannelId(channelId: string): void {
  try {
    localStorage.setItem(ACTIVE_CHANNEL_STORAGE_KEY, channelId);
    const channel = getStoredWebsiteChannels().find((c) => c.id === channelId);
    if (channel) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channel));
    }
    notifyChannelsChanged();
  } catch {}
}

export function saveWebsiteChannel(channel: WebsiteChannel): WebsiteChannel[] {
  const existing = getStoredWebsiteChannels();
  const idx = existing.findIndex((c) => c.id === channel.id);
  const updated =
    idx >= 0
      ? existing.map((c, i) => (i === idx ? channel : c))
      : [...existing, channel];
  saveStoredWebsiteChannels(updated);
  if (getActiveWebsiteChannelId() === channel.id || updated.length === 1) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channel));
    } catch {}
  }
  return updated;
}

export function deleteWebsiteChannel(channelId: string): WebsiteChannel[] {
  const existing = getStoredWebsiteChannels();
  const updated = existing.filter((c) => c.id !== channelId);
  saveStoredWebsiteChannels(updated);
  if (getActiveWebsiteChannelId() === channelId && updated[0]) {
    setActiveWebsiteChannelId(updated[0].id);
  }
  return updated;
}

export function useWebsiteChannels() {
  const [channels, setChannels] = useState<WebsiteChannel[]>(getStoredWebsiteChannels);
  const [activeChannelId, setActiveChannelIdState] = useState<string>(getActiveWebsiteChannelId);

  useEffect(() => {
    const refresh = () => {
      setChannels(getStoredWebsiteChannels());
      setActiveChannelIdState(getActiveWebsiteChannelId());
    };
    window.addEventListener(WEBSITE_CHANNELS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WEBSITE_CHANNELS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selectChannel = (id: string) => {
    setActiveWebsiteChannelId(id);
    setActiveChannelIdState(id);
  };

  const saveChannel = (channel: WebsiteChannel) => {
    const next = saveWebsiteChannel(channel);
    setChannels(next);
  };

  const removeChannel = (id: string) => {
    const next = deleteWebsiteChannel(id);
    setChannels(next);
  };

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) || channels[0] || DEFAULT_WEBSITE_CHANNELS[0];

  return {
    channels,
    activeChannel,
    activeChannelId: activeChannel?.id || activeChannelId,
    selectChannel,
    saveChannel,
    removeChannel,
  };
}

export function getWebsiteWidgetConfig(): WebsiteWidgetConfig {
  try {
    const activeId = getActiveWebsiteChannelId();
    const channels = getStoredWebsiteChannels();
    const active = channels.find((c) => c.id === activeId) || channels[0];
    if (active) return normalizeWidgetFields(active);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_CONFIG;
    return normalizeWidgetFields(JSON.parse(raw));
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

export function saveWebsiteWidgetConfig(config: WebsiteWidgetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    const activeId = getActiveWebsiteChannelId();
    const channels = getStoredWebsiteChannels();
    const idx = channels.findIndex((c) => c.id === activeId);
    if (idx >= 0) {
      const updated = channels.map((c, i) =>
        i === idx
          ? {
              ...c,
              ...config,
              updatedAt: new Date().toISOString().substring(0, 10),
            }
          : c
      );
      localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event(WEBSITE_CHANNELS_EVENT));
    }
    notifyConfigChanged();
  } catch {}
}
