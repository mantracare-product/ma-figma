export const WEBSITE_WIDGET_CONFIG_EVENT = "websiteWidgetConfig_updated";
const STORAGE_KEY = "websiteWidgetConfig";

export interface WebsiteWidgetConfig {
  themeColor: string;
  themeMode: "light" | "dark";
  botName: string;
  welcomeMessage: string;
  enablePreChatForm: boolean;
  formFields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    processSelect: boolean;
  };
  defaultProcessId: string;
  processLabelMap: Record<string, string>;
}

const DEFAULT_WIDGET_CONFIG: WebsiteWidgetConfig = {
  themeColor: "#1E88E5",
  themeMode: "light",
  botName: "MantraAssist Care Bot",
  welcomeMessage: "Hello! Welcome to Mantra Health. How can we assist you today?",
  enablePreChatForm: true,
  formFields: {
    name: true,
    email: true,
    phone: true,
    processSelect: true,
  },
  defaultProcessId: "1", // Patient Intake
  processLabelMap: {
    "1": "Book an Intake Appointment",
    "2": "Insurance Verification & Coverage",
    "3": "Billing & Payment Inquiry",
    "4": "Schedule Follow-up Consultation",
  },
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
      processLabelMap: { ...DEFAULT_WIDGET_CONFIG.processLabelMap, ...(parsed.processLabelMap || {}) },
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
