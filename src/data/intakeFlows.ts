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
}

export const INITIAL_FLOWS: IntakeFlow[] = [
  {
    id: 1,
    name: "New Patient Onboarding",
    groups: ["New Leads"],
    steps: [
      { formId: 1, required: true },
      { formId: 5, required: true },
    ],
    welcomeMessage: "Welcome to our practice! We're excited to have you. Please take a moment to complete the following forms before your first appointment.",
    thankYouMessage: "Thank you for submitting! We'll be in touch shortly.",
    senderName: "Dr. Sarah Kim",
    hasActiveClients: true,
    createdAt: "Jun 1, 2026",
  },
  {
    id: 2,
    name: "Demo Request Flow",
    groups: ["New Leads", "Returning Clients"],
    steps: [
      { formId: 2, required: true },
    ],
    welcomeMessage: "Hi! Thank you for your interest in booking a demo. Please fill out the form below and we'll be in touch shortly.",
    thankYouMessage: "Thank you for submitting! We'll be in touch shortly.",
    senderName: "The Sales Team",
    hasActiveClients: false,
    createdAt: "May 15, 2026",
  },
  {
    id: 3,
    name: "General Inquiry Flow",
    groups: ["New Leads"],
    steps: [
      { formId: 1, required: true }, // Contact Us
      { formId: 4, required: true }, // Newsletter Signup
    ],
    welcomeMessage: "Thanks for reaching out! Please share a few details so we can route your inquiry to the right person.",
    thankYouMessage: "Thanks! We've received your information and will follow up shortly.",
    senderName: "The Support Team",
    hasActiveClients: true,
    createdAt: "May 28, 2026",
  }
];
