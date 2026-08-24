import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type FieldModule = "client" | "process" | "appointment" | "call" | "service" | "organization" | "deal" | "teamMember" | "scribe";

export const ALL_MODULES: Exclude<FieldModule, "deal">[] = [
  "client",
  "process",
  "appointment",
  "call",
  "service",
  "organization",
  "teamMember",
  "scribe"
];

export const MODULE_NOUN: Record<Exclude<FieldModule, "deal">, { singular: string; plural: string }> = {
  client: { singular: "client", plural: "clients" },
  process: { singular: "process", plural: "processes" },
  appointment: { singular: "appointment", plural: "appointments" },
  call: { singular: "call", plural: "calls" },
  service: { singular: "service", plural: "services" },
  organization: { singular: "organization", plural: "organizations" },
  teamMember: { singular: "team member", plural: "team members" },
  scribe: { singular: "AI Scribe field", plural: "AI Scribe fields" },
};

export type FieldInputType = "text" | "email" | "tel" | "select" | "multiselect" | "textarea" | "date"
  | "date_time" | "number" | "money" | "link" | "whatsapp_link" | "yes_no";

export interface FieldOption { id: number; label: string; value: string; }

export interface FieldDefinition {
  id: number;               // stable numeric/uuid id
  key: string;               // stable machine key, used in {{key}} variables
  label: string;              // display name
  module: FieldModule;        // which entity this field belongs to
  source: "system" | "custom";
  inputType: FieldInputType;
  placeholder?: string;
  validation?: string;
  options?: FieldOption[];    // for select/dropdown types
  required?: boolean;
  showAlways?: boolean;       // legacy — kept for backward compat, do not write for new fields
  /** Record IDs this field is auto-shown on. If empty or undefined, it defaults to showing for all records. */
  visibleToRecordIds?: string[];
  sourceFormId?: number;      // if created via a WebForm field, provenance
  createdAt: number;
}

/**
 * Resolve the effective auto-display visibility of a field.
 * - If visibleToRecordIds has one or more IDs, visibility is "specific".
 * - Otherwise, it is "all" (auto-shows on every record).
 */
export function resolveVisibility(f: FieldDefinition): "none" | "all" | "specific" {
  if (f.visibleToRecordIds && f.visibleToRecordIds.length > 0) {
    return "specific";
  }
  return "all";
}

export const INITIAL_SCRIBE_CUSTOM_FIELDS: FieldDefinition[] = [
  // ── 1. Patient Information ────────────────────────────────
  {
    id: 901,
    key: "patient_name",
    label: "Patient Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Rahul Sharma",
    required: true,
    showAlways: true,
    createdAt: 1700000000001,
  },
  {
    id: 902,
    key: "patient_age_sex",
    label: "Age / Sex",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 32 years / Male",
    required: true,
    showAlways: true,
    createdAt: 1700000000002,
  },
  {
    id: 903,
    key: "consultation_date",
    label: "Consultation Date",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 24 August 2026",
    required: true,
    showAlways: true,
    createdAt: 1700000000003,
  },
  {
    id: 904,
    key: "patient_id",
    label: "Patient ID",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. PT-10245",
    required: false,
    showAlways: true,
    createdAt: 1700000000004,
  },

  // ── 2. Chief Complaint ────────────────────────────────────
  {
    id: 905,
    key: "symptoms",
    label: "Symptoms / Complaints",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "Add symptoms (e.g. Fever, Sore throat, Dry cough)",
    required: true,
    showAlways: true,
    createdAt: 1700000000005,
  },
  {
    id: 906,
    key: "complaint_duration",
    label: "Duration of Symptoms",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select duration",
    options: [
      { id: 1, label: "Symptoms for 1–2 days", value: "Symptoms for 1–2 days" },
      { id: 2, label: "Symptoms for 3 days", value: "Symptoms for 3 days" },
      { id: 3, label: "Symptoms for 5–7 days", value: "Symptoms for 5–7 days" },
      { id: 4, label: "Symptoms for 2 weeks", value: "Symptoms for 2 weeks" },
      { id: 5, label: "Symptoms for 1 month", value: "Symptoms for 1 month" },
      { id: 6, label: "Chronic (> 3 months)", value: "Chronic (> 3 months)" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000006,
  },

  // ── 3. Diagnosis ──────────────────────────────────────────
  {
    id: 907,
    key: "primary_diagnosis",
    label: "Primary Diagnosis",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select or enter primary diagnosis",
    options: [
      { id: 1, label: "Acute upper respiratory tract infection", value: "Acute upper respiratory tract infection" },
      { id: 2, label: "Acute gastritis", value: "Acute gastritis" },
      { id: 3, label: "Viral fever / Influenza", value: "Viral fever / Influenza" },
      { id: 4, label: "Type 2 diabetes mellitus", value: "Type 2 diabetes mellitus" },
      { id: 5, label: "Essential hypertension", value: "Essential hypertension" },
      { id: 6, label: "Age-related nuclear cataract", value: "Age-related nuclear cataract" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000007,
  },
  {
    id: 908,
    key: "icd_code",
    label: "ICD-10 Code",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select ICD-10 code",
    options: [
      { id: 1, label: "J06.9 - Acute upper respiratory infection, unspecified", value: "J06.9" },
      { id: 2, label: "K29.0 - Acute gastritis without bleeding", value: "K29.0" },
      { id: 3, label: "B34.9 - Viral infection, unspecified", value: "B34.9" },
      { id: 4, label: "E11.9 - Type 2 diabetes mellitus without complications", value: "E11.9" },
      { id: 5, label: "I10 - Essential (primary) hypertension", value: "I10" },
      { id: 6, label: "H25.10 - Age-related nuclear cataract", value: "H25.10" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000008,
  },
  {
    id: 909,
    key: "diagnosis_type",
    label: "Diagnosis Type / Status",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select type",
    options: [
      { id: 1, label: "Acute", value: "Acute" },
      { id: 2, label: "Chronic", value: "Chronic" },
      { id: 3, label: "Provisional diagnosis", value: "Provisional diagnosis" },
      { id: 4, label: "Differential diagnosis", value: "Differential diagnosis" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000009,
  },
  {
    id: 910,
    key: "clinical_findings",
    label: "Clinical Findings / Examination",
    module: "scribe",
    source: "custom",
    inputType: "textarea",
    placeholder: "e.g. Mild fever, congested throat, no breathing difficulty, chest clear",
    required: false,
    showAlways: true,
    createdAt: 1700000000010,
  },

  // ── 4. Medication Common Fields ──────────────────────────
  {
    id: 911,
    key: "med_name",
    label: "Medicine Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Paracetamol, Cetirizine",
    required: true,
    showAlways: true,
    createdAt: 1700000000011,
  },
  {
    id: 912,
    key: "med_strength",
    label: "Strength",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 500 mg, 10 mg",
    required: false,
    showAlways: true,
    createdAt: 1700000000012,
  },
  {
    id: 913,
    key: "med_form",
    label: "Form",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select form",
    options: [
      { id: 1, label: "Tablet", value: "Tablet" },
      { id: 2, label: "Syrup", value: "Syrup" },
      { id: 3, label: "Capsule", value: "Capsule" },
      { id: 4, label: "Eye Drops", value: "Eye Drops" },
      { id: 5, label: "Ointment / Gel", value: "Ointment" },
      { id: 6, label: "Injection", value: "Injection" },
      { id: 7, label: "Inhalation", value: "Inhalation" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000013,
  },
  {
    id: 914,
    key: "med_dosage",
    label: "Dosage",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 1 tablet, 5 mL",
    required: false,
    showAlways: true,
    createdAt: 1700000000014,
  },
  {
    id: 915,
    key: "med_frequency",
    label: "Frequency",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select frequency",
    options: [
      { id: 1, label: "Once daily (OD)", value: "Once daily" },
      { id: 2, label: "Twice daily (BD)", value: "Twice daily" },
      { id: 3, label: "3 times/day (TDS)", value: "3 times/day" },
      { id: 4, label: "4 times/day (QID)", value: "4 times/day" },
      { id: 5, label: "Up to 3 times/day as needed (SOS)", value: "Up to 3 times/day as needed" },
      { id: 6, label: "At bedtime (HS)", value: "At bedtime (HS)" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000015,
  },
  {
    id: 916,
    key: "med_duration",
    label: "Course / Duration",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 3 days, 5 days",
    required: false,
    showAlways: true,
    createdAt: 1700000000016,
  },
  {
    id: 917,
    key: "med_route",
    label: "Route",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select route",
    options: [
      { id: 1, label: "Oral (PO)", value: "Oral" },
      { id: 2, label: "Topical", value: "Topical" },
      { id: 3, label: "Eye Drop", value: "Eye Drop" },
      { id: 4, label: "Inhalation", value: "Inhalation" },
      { id: 5, label: "Intravenous (IV)", value: "Intravenous" },
      { id: 6, label: "Intramuscular (IM)", value: "Intramuscular" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000017,
  },

  // ── 5. Instructions ───────────────────────────────────────
  {
    id: 913,
    key: "patient_instructions",
    label: "Patient Instructions",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "+ Type instruction and press Enter...",
    required: false,
    showAlways: true,
    createdAt: 1700000000013,
  },

  // ── 6. Precautions ────────────────────────────────────────
  {
    id: 914,
    key: "patient_precautions",
    label: "Precautions & Warnings",
    module: "scribe",
    source: "custom",
    inputType: "multiselect",
    placeholder: "+ Type precaution and press Enter...",
    required: false,
    showAlways: true,
    createdAt: 1700000000014,
  },

  // ── 7. Prognosis ──────────────────────────────────────────
  {
    id: 915,
    key: "prognosis_status",
    label: "Prognosis",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select prognosis",
    options: [
      { id: 1, label: "Good", value: "Good" },
      { id: 2, label: "Fair", value: "Fair" },
      { id: 3, label: "Guarded", value: "Guarded" },
      { id: 4, label: "Poor", value: "Poor" },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000015,
  },
  {
    id: 916,
    key: "expected_course",
    label: "Expected Course / Recovery",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select recovery course",
    options: [
      { id: 1, label: "Symptoms expected to improve within 5–7 days.", value: "Symptoms expected to improve within 5–7 days." },
      { id: 2, label: "Expected resolution within 2–3 days with rest.", value: "Expected resolution within 2–3 days with rest." },
      { id: 3, label: "Gradual improvement over 2–4 weeks.", value: "Gradual improvement over 2–4 weeks." },
      { id: 4, label: "Chronic management required.", value: "Chronic management required." },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000016,
  },
  {
    id: 917,
    key: "complication_risk",
    label: "Complication Risk",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select risk level",
    options: [
      { id: 1, label: "Low", value: "Low" },
      { id: 2, label: "Moderate", value: "Moderate" },
      { id: 3, label: "High", value: "High" },
    ],
    required: false,
    showAlways: true,
    createdAt: 1700000000017,
  },

  // ── 8. Follow-up ──────────────────────────────────────────
  {
    id: 918,
    key: "follow_up_review",
    label: "Review Timeline",
    module: "scribe",
    source: "custom",
    inputType: "select",
    placeholder: "Select follow-up schedule",
    options: [
      { id: 1, label: "Review after: 5–7 days or earlier if symptoms worsen.", value: "Review after: 5–7 days or earlier if symptoms worsen." },
      { id: 2, label: "Review after: 3 days if fever persists.", value: "Review after: 3 days if fever persists." },
      { id: 3, label: "Review after: 14 days (2 weeks).", value: "Review after: 14 days (2 weeks)." },
      { id: 4, label: "Review after: 1 month.", value: "Review after: 1 month." },
      { id: 5, label: "SOS / Only if symptoms recur.", value: "SOS / Only if symptoms recur." },
    ],
    required: true,
    showAlways: true,
    createdAt: 1700000000018,
  },
  {
    id: 919,
    key: "follow_up_criteria",
    label: "Follow-up Conditions",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. If symptoms worsen or do not improve within 5 days",
    required: false,
    showAlways: true,
    createdAt: 1700000000019,
  },

  // ── 9. Doctor Information ─────────────────────────────────
  {
    id: 920,
    key: "doctor_name",
    label: "Doctor Name",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. Dr. Ankit Mehra",
    required: true,
    showAlways: true,
    createdAt: 1700000000020,
  },
  {
    id: 921,
    key: "doctor_qualification",
    label: "Qualification",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. MBBS, MD",
    required: false,
    showAlways: true,
    createdAt: 1700000000021,
  },
  {
    id: 922,
    key: "registration_no",
    label: "Registration No.",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. MCI-482910",
    required: false,
    showAlways: true,
    createdAt: 1700000000022,
  },
  {
    id: 923,
    key: "doctor_signature_date",
    label: "Signature Date",
    module: "scribe",
    source: "custom",
    inputType: "text",
    placeholder: "e.g. 24 August 2026",
    required: false,
    showAlways: true,
    createdAt: 1700000000023,
  },
];

export const SYSTEM_SEEDS: Record<Exclude<FieldModule, "deal">, Omit<FieldDefinition, "id" | "source" | "createdAt">[]> = {
  client: [
    { key: "name", label: "Name", module: "client", inputType: "text", placeholder: "Full name", showAlways: true },
    {
      key: "status", label: "Status", module: "client", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Active", value: "active" },
        { id: 2, label: "Inactive", value: "inactive" },
        { id: 3, label: "Pending", value: "pending" },
      ]
    },
    {
      key: "processes", label: "Processes", module: "client", inputType: "select", placeholder: "Assign process", showAlways: true,
      options: [
        { id: 1, label: "Patient Intake", value: "Patient Intake" },
        { id: 2, label: "Follow-up Calls", value: "Follow-up Calls" },
        { id: 3, label: "Billing Support", value: "Billing Support" },
        { id: 4, label: "Appointment Scheduling", value: "Appointment Scheduling" },
        { id: 5, label: "Insurance Verification", value: "Insurance Verification" },
      ]
    },
    { key: "email", label: "Email", module: "client", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "client", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "location", label: "Location", module: "client", inputType: "text", placeholder: "City, State or Address", showAlways: true },
    { key: "company", label: "Company", module: "client", inputType: "text", placeholder: "Company name", showAlways: true },
    { key: "role", label: "Role", module: "client", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "language", label: "Language", module: "client", inputType: "text", placeholder: "e.g. English", showAlways: true },
    { key: "country", label: "Country", module: "client", inputType: "text", placeholder: "e.g. United States", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "client", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  process: [
    { key: "process_name", label: "Process Name", module: "process", inputType: "text", placeholder: "Process name", showAlways: true },
    { key: "stage", label: "Stage", module: "process", inputType: "text", placeholder: "Stage", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "process", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  appointment: [
    { key: "appointment_date", label: "Appointment Date", module: "appointment", inputType: "date", showAlways: true },
    { key: "appointment_time", label: "Appointment Time", module: "appointment", inputType: "text", placeholder: "HH:MM", showAlways: true },
    {
      key: "appointment_type", label: "Appointment Type", module: "appointment", inputType: "select", placeholder: "Select type", showAlways: true,
      options: [
        { id: 1, label: "Video Call", value: "video" },
        { id: 2, label: "In-Person", value: "in-person" },
      ]
    },
    {
      key: "status", label: "Status", module: "appointment", inputType: "select", placeholder: "Select status", showAlways: true,
      options: [
        { id: 1, label: "Scheduled", value: "scheduled" },
        { id: 2, label: "Completed", value: "completed" },
        { id: 3, label: "Cancelled", value: "cancelled" },
        { id: 4, label: "No-Show", value: "no-show" },
        { id: 5, label: "Pending Accept", value: "pending-accept" },
      ]
    },
    { key: "provider", label: "Provider", module: "appointment", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  call: [
    { key: "status", label: "Call Status", module: "call", inputType: "text", placeholder: "Completed/Missed", showAlways: true },
    { key: "duration", label: "Duration", module: "call", inputType: "text", placeholder: "Duration", showAlways: true },
    { key: "call_sentiment", label: "Sentiment", module: "call", inputType: "text", placeholder: "Sentiment", showAlways: true },
    { key: "responsible", label: "Responsible Person", module: "call", inputType: "select", placeholder: "Unassigned", showAlways: true },
  ],
  service: [
    { key: "service_name", label: "Service Name", module: "service", inputType: "text", placeholder: "Service name", showAlways: true },
    { key: "price", label: "Price", module: "service", inputType: "number", placeholder: "Price", showAlways: true },
  ],
  organization: [
    { key: "org_name", label: "Organization Name", module: "organization", inputType: "text", placeholder: "Org Name", showAlways: true },
    { key: "industry", label: "Industry", module: "organization", inputType: "text", placeholder: "Industry", showAlways: true },
  ],
  teamMember: [
    { key: "name", label: "Name", module: "teamMember", inputType: "text", placeholder: "Full name", showAlways: true },
    { key: "status", label: "Status", module: "teamMember", inputType: "text", placeholder: "Active / Inactive", showAlways: true },
    { key: "email", label: "Email", module: "teamMember", inputType: "email", placeholder: "email@example.com", validation: "email", showAlways: true },
    { key: "phone", label: "Phone", module: "teamMember", inputType: "tel", placeholder: "+1 (555) 000-0000", validation: "phone", showAlways: true },
    { key: "location", label: "Location", module: "teamMember", inputType: "text", placeholder: "Location", showAlways: true },
    { key: "company", label: "Company", module: "teamMember", inputType: "text", placeholder: "Company name", showAlways: true },
    { key: "role", label: "Role", module: "teamMember", inputType: "text", placeholder: "Job title or role", showAlways: true },
    { key: "company_size", label: "Company Size", module: "teamMember", inputType: "text", placeholder: "10-50", showAlways: true },
    { key: "process", label: "Process", module: "teamMember", inputType: "text", placeholder: "Process", showAlways: true },
    { key: "gender", label: "Gender", module: "teamMember", inputType: "text", placeholder: "Gender", showAlways: true },
    { key: "date_of_birth", label: "Date of Birth", module: "teamMember", inputType: "date", placeholder: "DOB", showAlways: true },
    { key: "language", label: "Language", module: "teamMember", inputType: "text", placeholder: "Language", showAlways: true },
    { key: "country", label: "Country", module: "teamMember", inputType: "text", placeholder: "Country", showAlways: true },
    { key: "timezone", label: "Timezone", module: "teamMember", inputType: "text", placeholder: "Timezone", showAlways: true },
    { key: "assigned_service", label: "Assigned Service", module: "teamMember", inputType: "text", placeholder: "Assigned service", showAlways: true },
    { key: "next_available_slot", label: "Next Available Slot", module: "teamMember", inputType: "text", placeholder: "Next slot", showAlways: true },
  ],
  scribe: [
    { key: "session_notes", label: "Session Clinical Notes", module: "scribe", inputType: "textarea", placeholder: "Clinical dialogue notes", showAlways: true },
  ],
};

export function getLiveTeamMembers() {
  const list = new Set<string>();
  
  // Try loading from settings_allUsers
  try {
    const raw = sessionStorage.getItem("settings_allUsers");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Try loading from userManagement_users
  try {
    const raw = sessionStorage.getItem("userManagement_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((u: any) => {
          if (u.name) list.add(u.name);
        });
      }
    }
  } catch {}

  // Fallbacks
  const fallbacks = [
    "John Smith",
    "Sarah Johnson",
    "Emily Davis",
    "Dr. Robert Martinez",
    "Lisa Anderson",
    "Admin User",
    "Sarah Manager",
    "John Agent"
  ];
  fallbacks.forEach(name => list.add(name));

  return Array.from(list).map((name, idx) => ({
    id: idx + 1,
    label: name,
    value: name
  }));
}

interface FieldRegistryContextValue {
  getSystemFields: (module: FieldModule) => FieldDefinition[];
  getCustomFields: (module: FieldModule) => FieldDefinition[];
  getAllFields: (module: FieldModule) => FieldDefinition[];
  addCustomField: (module: FieldModule, field: Omit<FieldDefinition, "id" | "source" | "createdAt">) => FieldDefinition;
  updateCustomField: (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => void;
  deleteCustomField: (module: FieldModule, id: number) => void;
}

const FieldRegistryContext = createContext<FieldRegistryContextValue | null>(null);

export function FieldRegistryProvider({ children }: { children: ReactNode }) {
  const [customFields, setCustomFields] = useState<Record<Exclude<FieldModule, "deal">, FieldDefinition[]>>(() => {
    const saved = sessionStorage.getItem("fieldRegistry_v2") || sessionStorage.getItem("fieldRegistry_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize any old "deal" custom fields to "process" if present
        if (parsed.deal && !parsed.process) {
          parsed.process = parsed.deal;
          delete parsed.deal;
        }
        // Always load latest comprehensive scribe fields
        parsed.scribe = INITIAL_SCRIBE_CUSTOM_FIELDS;
        return parsed;
      } catch (e) {
        console.error("Error parsing fieldRegistry", e);
      }
    }
    
    // Migration from clientCustomFields
    const oldClientFieldsRaw = sessionStorage.getItem("clientCustomFields");
    let initialClientCustom: FieldDefinition[] = [];
    if (oldClientFieldsRaw) {
      try {
        const parsed = JSON.parse(oldClientFieldsRaw);
        initialClientCustom = parsed.map((f: any) => ({
          id: f.id || Date.now(),
          key: f.key || f.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          label: f.label,
          module: "client",
          source: "custom",
          inputType: (f.type ? f.type.toLowerCase() : "text") as FieldInputType,
          required: f.required || false,
          showAlways: f.showAlways !== false,
          sourceFormId: f.sourceFormId,
          createdAt: f.id || Date.now(),
        }));
      } catch {
        // noop
      }
    }
    return {
      client: initialClientCustom,
      process: [],
      appointment: [],
      call: [],
      service: [],
      organization: [],
      teamMember: [],
      scribe: INITIAL_SCRIBE_CUSTOM_FIELDS,
    };
  });

  useEffect(() => {
    sessionStorage.setItem("fieldRegistry_v1", JSON.stringify(customFields));
  }, [customFields]);

  const normalizeModule = (module: FieldModule): Exclude<FieldModule, "deal"> => {
    return module === "deal" ? "process" : module;
  };

  const getSystemFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    const seeds = SYSTEM_SEEDS[norm] || [];
    const teamOptions = getLiveTeamMembers();

    return seeds.map((f, index) => {
      // Sourced live team options for "responsible" or "provider" select inputs
      const isTeamSelect = f.key === "responsible" || f.key === "provider";
      return {
        ...f,
        id: -(index + 1), // system fields have negative ids
        source: "system",
        createdAt: 0,
        options: isTeamSelect ? teamOptions : f.options,
      };
    }) as FieldDefinition[];
  };

  const getCustomFields = (module: FieldModule): FieldDefinition[] => {
    const norm = normalizeModule(module);
    return customFields[norm] || [];
  };

  const getAllFields = (module: FieldModule): FieldDefinition[] => {
    return [...getSystemFields(module), ...getCustomFields(module)];
  };

  const addCustomField = (
    module: FieldModule,
    fieldData: Omit<FieldDefinition, "id" | "source" | "createdAt">
  ): FieldDefinition => {
    const norm = normalizeModule(module);
    const newField: FieldDefinition = {
      ...fieldData,
      module: norm,
      id: Date.now() + Math.floor(Math.random() * 1000),
      source: "custom",
      createdAt: Date.now(),
    };
    setCustomFields((prev) => ({
      ...prev,
      [norm]: [...(prev[norm] || []), newField],
    }));
    return newField;
  };

  const updateCustomField = (module: FieldModule, id: number, patch: Partial<FieldDefinition>) => {
    const norm = normalizeModule(module);
    setCustomFields((prev) => {
      const updated = (prev[norm] || []).map((f) =>
        f.id === id ? { ...f, ...patch } : f
      );
      return {
        ...prev,
        [norm]: updated,
      };
    });
  };

  const deleteCustomField = (module: FieldModule, id: number) => {
    const norm = normalizeModule(module);
    setCustomFields((prev) => ({
      ...prev,
      [norm]: (prev[norm] || []).filter((f) => f.id !== id),
    }));
  };

  return (
    <FieldRegistryContext.Provider
      value={{
        getSystemFields,
        getCustomFields,
        getAllFields,
        addCustomField,
        updateCustomField,
        deleteCustomField,
      }}
    >
      {children}
    </FieldRegistryContext.Provider>
  );
}

export function useFieldRegistry(): FieldRegistryContextValue {
  const ctx = useContext(FieldRegistryContext);
  if (!ctx) {
    throw new Error("useFieldRegistry must be used within a FieldRegistryProvider");
  }
  return ctx;
}
