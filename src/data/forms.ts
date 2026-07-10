export type FieldDef = {
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "number" | "url" | "select" | "radio" | "date" | "time" | "toggle";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  sourceType?: "system" | "custom";
  sourceFieldKey?: string;
};

export type Form = {
  id: number;
  name: string;
  formType: "standard" | "intake" | "meta-ads";
  createdBy: string;
  fieldCount: number;
  fields: FieldDef[];
  status: "live" | "draft";
  submissions: number;
  enabled: boolean;
  description: string;
  createdAt: string;
  lastUpdated?: string;
  autoCreateClient?: boolean;
  autoCreateProcessId?: string;
  autoCreateStageId?: string;
};

export const INITIAL_FORMS: Form[] = [
  {
    id: 1,
    name: "Contact Us",
    formType: "standard",
    createdBy: "Admin User",
    fieldCount: 4,
    fields: [
      { label: "Full Name", type: "text", placeholder: "e.g. Jane Smith", required: true },
      { label: "Email", type: "email", placeholder: "you@company.com", required: true },
      { label: "Phone", type: "tel", placeholder: "+1 (555) 000-0000" },
      { label: "Message", type: "textarea", placeholder: "How can we help you?" },
    ],
    status: "live",
    submissions: 12,
    enabled: true,
    description: "General contact inquiries routed directly into your AI brain.",
    createdAt: "May 3, 2026",
  },
  {
    id: 2,
    name: "Book a Demo",
    formType: "standard",
    createdBy: "Admin User",
    fieldCount: 6,
    fields: [
      { label: "First Name", type: "text", placeholder: "First name", required: true },
      { label: "Last Name", type: "text", placeholder: "Last name", required: true },
      { label: "Work Email", type: "email", placeholder: "you@company.com", required: true },
      { label: "Company", type: "text", placeholder: "Your company name" },
      { label: "Team Size", type: "select", placeholder: "Select team size" },
      { label: "What are you looking for?", type: "textarea", placeholder: "Tell us about your use case" },
    ],
    status: "live",
    submissions: 34,
    enabled: true,
    description: "Qualified demo requests with team context, synced to your pipeline.",
    createdAt: "Apr 18, 2026",
  },
  {
    id: 3,
    name: "Support Request",
    formType: "standard",
    createdBy: "Admin User",
    fieldCount: 5,
    fields: [
      { label: "Full Name", type: "text", placeholder: "Your name", required: true },
      { label: "Email", type: "email", placeholder: "you@company.com", required: true },
      { label: "Subject", type: "text", placeholder: "Brief description of issue" },
      { label: "Priority", type: "select", placeholder: "Low / Medium / High" },
      { label: "Description", type: "textarea", placeholder: "Describe the issue in detail" },
    ],
    status: "draft",
    submissions: 0,
    enabled: false,
    description: "Customer support intake — not yet published.",
    createdAt: "Jun 10, 2026",
  },
  {
    id: 4,
    name: "Newsletter Signup",
    formType: "standard",
    createdBy: "Admin User",
    fieldCount: 2,
    fields: [
      { label: "Name", type: "text", placeholder: "Your name", required: true },
      { label: "Email", type: "email", placeholder: "you@company.com", required: true },
    ],
    status: "live",
    submissions: 89,
    enabled: true,
    description: "One-click newsletter opt-in. Subscribers are tagged and enrolled automatically.",
    createdAt: "Mar 22, 2026",
  },
  {
    id: 5,
    name: "Patient Intake Form",
    formType: "intake",
    createdBy: "Admin User",
    fieldCount: 7,
    fields: [
      { label: "Full Name", type: "text", placeholder: "e.g. Jane Smith", required: true },
      { label: "Date of Birth", type: "text", placeholder: "MM/DD/YYYY", required: true },
      { label: "Email", type: "email", placeholder: "you@example.com", required: true },
      { label: "Phone", type: "tel", placeholder: "+1 (555) 000-0000" },
      { label: "Primary Insurance", type: "text", placeholder: "Insurance provider name" },
      { label: "Medical History", type: "textarea", placeholder: "Please describe any relevant medical history" },
      { label: "Consent to Treatment", type: "select", placeholder: "Yes / No" },
    ],
    status: "live",
    submissions: 23,
    enabled: true,
    description: "New patient onboarding — collects health history, consent, and contact preferences.",
    createdAt: "Jun 1, 2026",
  },
  {
    id: 10,
    name: "Healthcare Campaign Form",
    formType: "meta-ads",
    createdBy: "Admin User",
    fieldCount: 5,
    fields: [
      { label: "Full Name", type: "text", required: true, placeholder: "Your full name" },
      { label: "Phone Number", type: "tel", required: true, placeholder: "+91 XXXXX XXXXX" },
      { label: "Email", type: "email", required: false, placeholder: "your@email.com" },
      { label: "Service Interest", type: "select", required: true, placeholder: "Select a service" },
      { label: "Preferred Call Time", type: "select", required: false, placeholder: "Morning / Afternoon / Evening" },
    ],
    status: "live",
    submissions: 47,
    enabled: true,
    description: "Lead capture form linked to Meta Healthcare Campaign — June 2026",
    createdAt: "Jun 1, 2026",
  },
  {
    id: 11,
    name: "Free Consultation Ad",
    formType: "meta-ads",
    createdBy: "Admin User",
    fieldCount: 4,
    fields: [
      { label: "Full Name", type: "text", required: true, placeholder: "Your full name" },
      { label: "Phone Number", type: "tel", required: true, placeholder: "+91 XXXXX XXXXX" },
      { label: "Email", type: "email", required: false, placeholder: "your@email.com" },
      { label: "What are you looking for?", type: "textarea", required: false, placeholder: "Tell us briefly..." },
    ],
    status: "live",
    submissions: 31,
    enabled: true,
    description: "Lead capture form linked to Free Consultation Meta Ad campaign",
    createdAt: "Jun 5, 2026",
  },
];
