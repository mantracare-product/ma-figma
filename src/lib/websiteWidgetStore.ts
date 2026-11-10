export const WEBSITE_WIDGET_CONFIG_EVENT = "websiteWidgetConfig_updated";
const STORAGE_KEY = "websiteWidgetConfig";

export interface RequirementItem {
  id: string;
  label: string;
  processId?: string;
}

export interface WebsiteWidgetConfig {
  themeColor: string;
  themeMode: "light" | "dark";
  botName: string;
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

export const DEFAULT_REQUIREMENTS: RequirementItem[] = [
  { id: "req-1", label: "Book an Appointment" },
  { id: "req-2", label: "Insurance & Coverage Inquiry" },
  { id: "req-3", label: "Billing & Invoices" },
  { id: "req-4", label: "General Health Consultation" },
];

const DEFAULT_WIDGET_CONFIG: WebsiteWidgetConfig = {
  themeColor: "#1456f0",
  themeMode: "light",
  botName: "MantraAssist Care Bot",
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
  autoCreateEntity: "",
  autoCreateProcessId: "",
  autoCreateStage: "",
  distribution: "Evenly",
  agentDisplay: "user",
  customProfiles: {},
};

function notifyConfigChanged() {
  window.dispatchEvent(new Event(WEBSITE_WIDGET_CONFIG_EVENT));
}

export function getWebsiteWidgetConfig(): WebsiteWidgetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WIDGET_CONFIG,
      ...parsed,
      formFields: {
        ...DEFAULT_WIDGET_CONFIG.formFields,
        ...(parsed.formFields || {}),
        requirement: parsed.formFields?.requirement !== undefined ? parsed.formFields.requirement : true,
      },
      requirements: Array.isArray(parsed.requirements) && parsed.requirements.length > 0
        ? parsed.requirements.map((r: any) => ({ id: r.id || `req-${Math.random()}`, label: r.label || "" }))
        : DEFAULT_REQUIREMENTS,
      workDays: parsed.workDays || DEFAULT_WIDGET_CONFIG.workDays,
      excludePages: parsed.excludePages || DEFAULT_WIDGET_CONFIG.excludePages,
      includePages: parsed.includePages || DEFAULT_WIDGET_CONFIG.includePages,
      agentQueue: Array.isArray(parsed.agentQueue) ? parsed.agentQueue : DEFAULT_WIDGET_CONFIG.agentQueue,
      customProfiles: parsed.customProfiles || DEFAULT_WIDGET_CONFIG.customProfiles,
      autoCreateEntity: parsed.autoCreateEntity || "",
      autoCreateStage: parsed.autoCreateStage || "",
    };
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

export function saveWebsiteWidgetConfig(config: WebsiteWidgetConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    notifyConfigChanged();
  } catch {}
}
