export const COMPANION_WIDGET_CONFIG_EVENT = "companionWidgetConfig_updated";
const STORAGE_KEY = "companionWidgetConfig";

export interface CompanionIntentPrompt {
  id: string;
  label: string;
  intent: "book" | "bills" | "forms" | "checkin" | "consult" | "support";
  description: string;
  botReply: string;
  actionRoute?: string;
  actionLabel?: string;
  enabled: boolean;
}

export interface CompanionWidgetConfig {
  botName: string;
  welcomeMessage: string;
  avatarUrl?: string;
  themeColor: string;
  showIntentChips: boolean;
  intents: CompanionIntentPrompt[];
  autoResponderEnabled: boolean;
  firstResponder: "ai" | "human";
  aiHandoffPhrases: string;
  assignedStaffId?: string;
  portalHeaderTitle: string;
  portalSubtitle: string;
  // Explicitly note that contact info is bypassed for authenticated clients
  requireAuthBypass: boolean;
  updatedAt?: string;
}

export const DEFAULT_COMPANION_INTENTS: CompanionIntentPrompt[] = [
  {
    id: "intent-1",
    label: "📅 Book an Appointment",
    intent: "book",
    description: "Find an open slot with our doctors or specialists",
    botReply: "I can help you schedule an appointment with our specialist care team right away. Click below to view available services and booking slots:",
    actionRoute: "/patient/book",
    actionLabel: "Open Booking Screen",
    enabled: true,
  },
  {
    id: "intent-2",
    label: "💳 View & Pay Invoices",
    intent: "bills",
    description: "Check your current balance and download statements",
    botReply: "Here is your billing statement and outstanding balance. You can review your itemized charges and complete payment securely:",
    actionRoute: "/patient/bill",
    actionLabel: "View Invoices & Pay",
    enabled: true,
  },
  {
    id: "intent-3",
    label: "📋 Complete Intake Forms",
    intent: "forms",
    description: "Submit medical questionnaires before your visit",
    botReply: "Please fill out your pending medical questionnaire so our care team can review your medical history ahead of your visit:",
    actionRoute: "/patient/forms",
    actionLabel: "Open Intake Forms",
    enabled: true,
  },
  {
    id: "intent-4",
    label: "📍 Check-in for Visit",
    intent: "checkin",
    description: "Notify the clinic front desk that you have arrived",
    botReply: "Welcome to the clinic! I have notified the front desk and your care team that you are on-site.",
    actionRoute: "/patient/book",
    actionLabel: "View Visit Status",
    enabled: true,
  },
  {
    id: "intent-5",
    label: "🩺 Ask Care Team",
    intent: "consult",
    description: "Send a direct query to your practitioner",
    botReply: "I've flagged your question for your care team. A nurse or physician will reply to you directly here in Companion shortly.",
    enabled: true,
  },
];

export const DEFAULT_COMPANION_CONFIG: CompanionWidgetConfig = {
  botName: "Care Bot",
  welcomeMessage: "Hi there! How can we help you today?",
  avatarUrl: "",
  themeColor: "#2563EB",
  showIntentChips: true,
  intents: DEFAULT_COMPANION_INTENTS,
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
    if (!raw) return DEFAULT_COMPANION_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_COMPANION_CONFIG,
      ...parsed,
      intents: Array.isArray(parsed.intents) && parsed.intents.length > 0
        ? parsed.intents
        : DEFAULT_COMPANION_INTENTS,
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      notifyConfigChanged();
    }
  } catch {}
}
