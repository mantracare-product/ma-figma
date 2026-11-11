export type FlowStep = { formId: number; required: boolean };

export interface IntakeFlow {
  id: number;
  name: string;
  groups: string[];
  steps: FlowStep[];
  welcomeMessage: string;
  thankYouMessage: string;
  senderName: string;
  hasActiveClients: boolean;
  createdAt: string;
  showWelcomeStep?: boolean;
  showThankYouStep?: boolean;
  enabled?: boolean;
  category?: string;
  description?: string;
}

export type FormFlow = IntakeFlow;

export const INITIAL_FLOWS: FormFlow[] = [
  {
    id: 1,
    name: "New Patient Onboarding",
    groups: ["New Leads"],
    category: "Healthcare",
    description: "Complete pre-consultation medical intake sequence and disclosures before first visit.",
    steps: [
      { formId: 1, required: true },
      { formId: 5, required: true },
    ],
    welcomeMessage: "Welcome to our practice! We're excited to have you. Please take a moment to complete the following forms before your first appointment.",
    thankYouMessage: "Thank you for submitting! We'll be in touch shortly.",
    senderName: "Dr. Sarah Kim",
    hasActiveClients: true,
    createdAt: "Jun 1, 2026",
    enabled: true,
  },
  {
    id: 2,
    name: "Demo Request Flow",
    groups: ["New Leads", "Returning Clients"],
    category: "General",
    description: "Standard qualification and discovery questionnaire for prospective clinic partners.",
    steps: [
      { formId: 2, required: true },
    ],
    welcomeMessage: "Hi! Thank you for your interest in booking a demo. Please fill out the form below and we'll be in touch shortly.",
    thankYouMessage: "Thank you for submitting! We'll be in touch shortly.",
    senderName: "The Sales Team",
    hasActiveClients: false,
    createdAt: "May 15, 2026",
    enabled: true,
  },
  {
    id: 3,
    name: "General Inquiry Flow",
    groups: ["New Leads"],
    category: "Consultation",
    description: "Multi-point triage and general interest contact flow.",
    steps: [
      { formId: 1, required: true }, // Contact Us
      { formId: 4, required: true }, // Newsletter Signup
    ],
    welcomeMessage: "Thanks for reaching out! Please share a few details so we can route your inquiry to the right person.",
    thankYouMessage: "Thanks! We've received your information and will follow up shortly.",
    senderName: "The Support Team",
    hasActiveClients: true,
    createdAt: "May 28, 2026",
    enabled: true,
  }
];

export const FORM_FLOWS_STORAGE_KEY = "intakeFlows";
export const FORM_FLOWS_EVENT = "form_flows_updated";

export function getStoredFlows(): FormFlow[] {
  try {
    const raw = sessionStorage.getItem(FORM_FLOWS_STORAGE_KEY) || localStorage.getItem(FORM_FLOWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to parse stored form flows:", e);
  }
  return INITIAL_FLOWS;
}

export function saveStoredFlows(flows: FormFlow[]): void {
  try {
    const json = JSON.stringify(flows);
    sessionStorage.setItem(FORM_FLOWS_STORAGE_KEY, json);
    localStorage.setItem(FORM_FLOWS_STORAGE_KEY, json);
    window.dispatchEvent(new Event(FORM_FLOWS_EVENT));
  } catch (e) {
    console.error("Failed to save form flows:", e);
  }
}

export function saveFlow(flow: FormFlow): void {
  const current = getStoredFlows();
  const index = current.findIndex(f => f.id === flow.id);
  let updated: FormFlow[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = flow;
  } else {
    updated = [flow, ...current];
  }
  saveStoredFlows(updated);
}

export function deleteFlow(flowId: number): void {
  const current = getStoredFlows();
  const updated = current.filter(f => f.id !== flowId);
  saveStoredFlows(updated);
}

