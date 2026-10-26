export const COMPANION_WIDGET_CONFIG_EVENT = "companionWidgetConfig_updated";
const STORAGE_KEY = "companionWidgetConfig";

export interface CompanionRequirementItem {
  id: string;
  label: string;
  processId: string;
}

export interface CompanionWidgetConfig {
  botName: string;
  welcomeMessage: string;
  avatarUrl?: string;
  themeColor: string;
  enableRequirementSelect: boolean;
  requirements: CompanionRequirementItem[];
  defaultProcessId: string;
  autoResponderEnabled: boolean;
  firstResponder: "ai" | "human";
  aiHandoffPhrases: string;
  assignedStaffId?: string;
  portalHeaderTitle: string;
  portalSubtitle: string;
  // Pre-authenticated patient bypass
  requireAuthBypass: boolean;
  updatedAt?: string;
}

export const DEFAULT_COMPANION_REQUIREMENTS: CompanionRequirementItem[] = [
  { id: "req-1", label: "Book an Appointment", processId: "1" },
  { id: "req-2", label: "Billing & Payment Inquiry", processId: "3" },
  { id: "req-3", label: "Medical Intake & Questionnaires", processId: "1" },
  { id: "req-4", label: "Consultation & Care Team Query", processId: "2" },
];

export const DEFAULT_COMPANION_CONFIG: CompanionWidgetConfig = {
  botName: "Care Bot",
  welcomeMessage: "Hi there! How can we help you today?",
  avatarUrl: "",
  themeColor: "#2563EB",
  enableRequirementSelect: true,
  requirements: DEFAULT_COMPANION_REQUIREMENTS,
  defaultProcessId: "1",
  autoResponderEnabled: true,
  firstResponder: "ai",
  aiHandoffPhrases: "talk to doctor, speak to human, reception, emergency, urgent",
  assignedStaffId: "1",
  portalHeaderTitle: "MantraCare Companion",
  portalSubtitle: "Your personal 24/7 clinical assistant",
  requireAuthBypass: true, // Always true: portal clients are pre-authenticated
  updatedAt: new Date().toISOString(),
};

function notifyConfigChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COMPANION_WIDGET_CONFIG_EVENT));
  }
}

export function getCompanionWidgetConfig(): CompanionWidgetConfig {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const fallbackAvatar =
      typeof window !== "undefined"
        ? localStorage.getItem("companion_bot_avatar") ||
          localStorage.getItem("active_bot_avatar") ||
          ""
        : "";
    if (!raw) {
      return {
        ...DEFAULT_COMPANION_CONFIG,
        avatarUrl: fallbackAvatar,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COMPANION_CONFIG,
      ...parsed,
      avatarUrl: parsed.avatarUrl || fallbackAvatar || "",
      enableRequirementSelect: parsed.enableRequirementSelect !== undefined ? parsed.enableRequirementSelect : true,
      requirements: Array.isArray(parsed.requirements) && parsed.requirements.length > 0
        ? parsed.requirements
        : DEFAULT_COMPANION_REQUIREMENTS,
      defaultProcessId: parsed.defaultProcessId || "1",
      requireAuthBypass: true, // Always locked to true
    };
  } catch {
    return DEFAULT_COMPANION_CONFIG;
  }
}

export function saveCompanionWidgetConfig(config: CompanionWidgetConfig): void {
  try {
    if (typeof window !== "undefined") {
      const payload: CompanionWidgetConfig = {
        ...config,
        requireAuthBypass: true,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.warn("Storage quota warning for companionWidgetConfig", err);
      }
      try {
        if (config.avatarUrl) {
          localStorage.setItem("companion_bot_avatar", config.avatarUrl);
        } else {
          localStorage.removeItem("companion_bot_avatar");
        }
      } catch (err) {
        console.warn("Storage quota warning for companion_bot_avatar", err);
      }
      notifyConfigChanged();
      window.dispatchEvent(new CustomEvent("companion_avatar_updated", { detail: config.avatarUrl || "" }));
    }
  } catch (err) {
    console.error("saveCompanionWidgetConfig error:", err);
  }
}
