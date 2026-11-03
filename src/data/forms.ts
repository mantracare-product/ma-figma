import type { ScopingRule } from "../app/context/FieldRegistryContext";

export type { ScopingRule };

export type FieldDef = {
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "number" | "url" | "select" | "multiselect" | "checkbox" | "radio" | "date" | "time" | "toggle" | "signature" | "drawing" | "file" | "rating" | "password";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  module?: string;
  sourceType?: "system" | "custom";
  sourceFieldKey?: string;
};

export type FormPermissions = {
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
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

  // Admin Scope & Role Permissions
  category?: string;
  industry?: string;
  scopingRules?: ScopingRule[];
  roles?: string[]; // e.g. ["admin", "manager", "reception", "staff", "client"]
  permissions?: FormPermissions;
  entity?: "client" | "process" | "appointment" | "invoice" | "general";
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
    category: "General",
    roles: ["admin", "manager", "reception"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "Healthcare",
    roles: ["admin", "manager"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "General",
    roles: ["admin", "manager", "reception"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "Marketing",
    roles: ["admin", "manager"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "Healthcare",
    scopingRules: [
      {
        id: "sr-1",
        industryCategory: "Healthcare",
        industries: ["Dental Clinic", "Medical Spa", "Chiropractic"],
        locations: ["All"],
      },
    ],
    roles: ["admin", "manager", "reception", "staff"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "Healthcare",
    roles: ["admin", "manager"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
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
    category: "Healthcare",
    roles: ["admin", "manager"],
    permissions: { canView: true, canEdit: true, canDelete: false, canShare: true },
  },
];

// ─── Storage & Scope Utilities ───────────────────────────────────────────────

export const WEB_FORMS_KEY = "webForms";
export const WEB_FORMS_EVENT = "ma_web_forms_updated";

export function getStoredForms(): Form[] {
  try {
    const saved = sessionStorage.getItem(WEB_FORMS_KEY) || localStorage.getItem(WEB_FORMS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load forms from storage", e);
  }
  return INITIAL_FORMS;
}

export function saveStoredForms(forms: Form[]): void {
  try {
    sessionStorage.setItem(WEB_FORMS_KEY, JSON.stringify(forms));
    localStorage.setItem(WEB_FORMS_KEY, JSON.stringify(forms));
    window.dispatchEvent(new CustomEvent(WEB_FORMS_EVENT, { detail: forms }));
  } catch (e) {
    console.error("Failed to save forms to storage", e);
  }
}

export function saveForm(form: Form): void {
  const forms = getStoredForms();
  const index = forms.findIndex((f) => f.id === form.id);
  let updated: Form[];
  if (index >= 0) {
    updated = [...forms];
    updated[index] = { ...form, lastUpdated: new Date().toISOString() };
  } else {
    updated = [{ ...form, lastUpdated: new Date().toISOString() }, ...forms];
  }
  saveStoredForms(updated);
}

export function deleteForm(formId: number): void {
  const forms = getStoredForms();
  const updated = forms.filter((f) => f.id !== formId);
  saveStoredForms(updated);
}

export function isFormMatchingScope(
  form: Form,
  scope: { category?: string; industry?: string; location?: string }
): boolean {
  if (!form.scopingRules || form.scopingRules.length === 0) {
    if (scope.category && scope.category !== "All" && form.category) {
      if (form.category.toLowerCase() !== scope.category.toLowerCase()) return false;
    }
    return true;
  }

  const { category = "All", industry = "All", location = "All" } = scope;
  if (category === "All" && industry === "All" && location === "All") {
    return true;
  }

  return form.scopingRules.some((rule) => {
    if (category !== "All" && rule.industryCategory && rule.industryCategory !== "All") {
      if (rule.industryCategory.trim().toLowerCase() !== category.trim().toLowerCase()) {
        return false;
      }
    }
    if (industry !== "All" && rule.industries && rule.industries.length > 0) {
      const hasInd = rule.industries.some(
        (i) => i.trim().toLowerCase() === industry.trim().toLowerCase()
      );
      if (!hasInd) return false;
    }
    if (location !== "All" && rule.locations && rule.locations.length > 0) {
      const hasLoc = rule.locations.some(
        (l) => l.trim().toLowerCase() === location.trim().toLowerCase()
      );
      if (!hasLoc) return false;
    }
    return true;
  });
}
