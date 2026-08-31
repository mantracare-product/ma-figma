export interface DocumentTemplateFieldMapping {
  templateField: string;    // e.g. "client_name" or "email" (extracted from {client_name})
  mappedFieldKey: string;   // e.g. "name", "email", "phone", "companyName", "location", "responsible", "status"
  label: string;            // display label e.g. "Client Name"
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category?: string;
  fileName?: string;
  templateText: string;
  extractedFields: string[];
  fieldMappings: DocumentTemplateFieldMapping[];
  createdAt: string;
  createdBy: string;
}

export const DOCUMENT_TEMPLATES_EVENT = "documentTemplates_updated";
export const DOCUMENT_CATEGORIES_EVENT = "documentCategories_updated";

export const DEFAULT_TEMPLATE_CATEGORIES: string[] = [
  "Prescription",
  "Session Notes",
  "Consent forms",
  "Patient Intake form",
  "General",
];

const INITIAL_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-rx-1",
    name: "Prescription & Medication Order",
    category: "Prescription",
    fileName: "rx_medication_order.docx",
    templateText: `PRESCRIPTION & CLINICAL MEDICATION ORDER

Patient Name: {client_name}
Date of Birth / Age: {age}
Date Issued: {current_date}
Attending Physician: {responsible}

Diagnosis: {diagnosis}
Chief Complaint: {chief_complaint}

Rx Prescribed Medications:
{medications}

Instructions & Advice:
{advice}

Follow-up Consultation: {follow_up_date}
Doctor Signature: {responsible} (License #MC-88219)`,
    extractedFields: ["client_name", "age", "current_date", "responsible", "diagnosis", "chief_complaint", "medications", "advice", "follow_up_date"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Attending Doctor" },
    ],
    createdAt: "2024-05-18 11:20",
    createdBy: "Clinical Desk",
  },
  {
    id: "tpl-sn-1",
    name: "Clinical Consultation & Session Notes",
    category: "Session Notes",
    fileName: "session_notes.docx",
    templateText: `CLINICAL CONSULTATION & SESSION NOTES

Patient: {client_name}
Consultation Date: {current_date}
Specialist / Provider: {responsible}

Vitals:
{vitals}

Subjective / Chief Complaint:
{chief_complaint}

Objective & Clinical Findings:
{medical_notes}

Assessment & Diagnosis:
{diagnosis} (ICD-10: {icd10_code})

Plan of Care:
1. Prescribed: {medications}
2. Follow-up: {follow_up_date}
3. Recommended Investigations: {investigations}

Provider Signature: {responsible}`,
    extractedFields: ["client_name", "current_date", "responsible", "vitals", "chief_complaint", "medical_notes", "diagnosis", "icd10_code", "medications", "follow_up_date", "investigations"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Specialist" },
    ],
    createdAt: "2024-05-17 14:00",
    createdBy: "Clinical Desk",
  },
  {
    id: "tpl-cf-1",
    name: "General Medical & Treatment Consent Form",
    category: "Consent forms",
    fileName: "treatment_consent_form.docx",
    templateText: `GENERAL MEDICAL & TREATMENT CONSENT FORM

I, {client_name}, residing at {location}, contact number {phone}, hereby give informed consent for diagnostic evaluation, therapy, and treatment procedures as recommended by {responsible}.

Declaration:
1. I have been informed of the nature of the consultation and potential treatments.
2. I understand that I may ask questions at any stage of the care process.
3. I consent to electronic record keeping in compliance with healthcare privacy protocols.

Emergency Contact: {emergency_contact}
Date of Consent: {current_date}

Patient Signature: {consent_signature}
Witness / Staff: {responsible}`,
    extractedFields: ["client_name", "location", "phone", "responsible", "emergency_contact", "current_date", "consent_signature"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "location", mappedFieldKey: "location", label: "Location" },
      { templateField: "phone", mappedFieldKey: "phone", label: "Phone Number" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Staff Member" },
      { templateField: "consent_signature", mappedFieldKey: "consent_signature", label: "Consent Signature" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
    ],
    createdAt: "2024-05-16 09:30",
    createdBy: "Legal Dept",
  },
  {
    id: "tpl-3",
    name: "Patient Intake Medical Authorization Form",
    category: "Patient Intake form",
    fileName: "medical_intake_template.docx",
    templateText: `PATIENT INTAKE MEDICAL AUTHORIZATION FORM

Patient Details:
- Full Name: {client_name}
- Contact Phone: {phone}
- Email Address: {email}
- Location: {location}
- Case Manager: {responsible}

Clinical History & Disclosures:
- Reported Allergies: {allergies}
- Medical History: {medical_notes}
- Emergency Contact: {emergency_contact}

Authorization Statement:
I, {client_name}, hereby authorize MantraCare healthcare personnel to process medical intake records for health assessment and CRM workflow management.

Date Authorized: {current_date}
Patient Signature: ______________________`,
    extractedFields: ["client_name", "phone", "email", "location", "responsible", "allergies", "medical_notes", "emergency_contact", "current_date"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Name" },
      { templateField: "phone", mappedFieldKey: "phone", label: "Phone" },
      { templateField: "email", mappedFieldKey: "email", label: "Email" },
      { templateField: "location", mappedFieldKey: "location", label: "Location" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Responsible Officer" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Date" },
    ],
    createdAt: "2024-05-15 09:00",
    createdBy: "Medical Desk",
  },
  {
    id: "tpl-1",
    name: "Client KYC & Identification Verification Form",
    category: "General",
    fileName: "kyc_verification_template.docx",
    templateText: `CLIENT IDENTIFICATION & KYC VERIFICATION FORM

Client Details:
Full Name: {client_name}
Email Address: {email}
Phone Number: {phone}
Company / Organization: {company_name}
Job Title / Position: {job_position}
Location / Address: {location}
Assigned Staff Member: {responsible}
Verification Date: {current_date}

Agreement & Declaration:
I hereby verify that all identification details supplied by {client_name} have been checked and verified in accordance with organizational compliance requirements.

Client Signature: ______________________
Verification Officer Signature: {responsible}`,
    extractedFields: ["client_name", "email", "phone", "company_name", "job_position", "location", "responsible", "current_date"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "email", mappedFieldKey: "email", label: "Email Address" },
      { templateField: "phone", mappedFieldKey: "phone", label: "Phone Number" },
      { templateField: "company_name", mappedFieldKey: "companyName", label: "Company Name" },
      { templateField: "job_position", mappedFieldKey: "jobPosition", label: "Job Position" },
      { templateField: "location", mappedFieldKey: "location", label: "Location" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Responsible Staff" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
    ],
    createdAt: "2024-05-01 10:00",
    createdBy: "System Admin",
  },
  {
    id: "tpl-2",
    name: "Standard Client Service Contract",
    category: "Consent forms",
    fileName: "service_contract_template.docx",
    templateText: `STANDARD CLIENT SERVICE CONTRACT AGREEMENT

This Service Agreement is executed on {current_date} between MantraCare Inc. and {client_name} representing {company_name}.

1. Client Profile & Primary Contact:
- Client Name: {client_name}
- Email: {email}
- Phone: {phone}
- Designation: {job_position}
- Region: {location}

2. Operations & Service Scope:
Services will be executed under the assigned process management track by representative {responsible}.

Status: {status}

Signatures:
Client: {client_name} ____________________
Account Manager: {responsible}`,
    extractedFields: ["current_date", "client_name", "company_name", "email", "phone", "job_position", "location", "responsible", "status"],
    fieldMappings: [
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Name" },
      { templateField: "company_name", mappedFieldKey: "companyName", label: "Company Name" },
      { templateField: "email", mappedFieldKey: "email", label: "Email" },
      { templateField: "phone", mappedFieldKey: "phone", label: "Phone" },
      { templateField: "job_position", mappedFieldKey: "jobPosition", label: "Job Position" },
      { templateField: "location", mappedFieldKey: "location", label: "Location" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Responsible Staff" },
      { templateField: "status", mappedFieldKey: "status", label: "Status" },
    ],
    createdAt: "2024-05-10 14:30",
    createdBy: "Legal Dept",
  },
];

export function getStoredDocumentTemplates(): DocumentTemplate[] {
  try {
    const raw = sessionStorage.getItem("clientDocumentTemplates");
    if (raw) {
      const parsed: DocumentTemplate[] = JSON.parse(raw);
      return parsed.map((t) => {
        if (t.category?.toLowerCase() === "identification") return { ...t, category: "General" };
        if (t.category?.toLowerCase() === "contract") return { ...t, category: "Consent forms" };
        if (t.category?.toLowerCase() === "financial") return { ...t, category: "General" };
        return t;
      });
    }
  } catch {}
  return INITIAL_DOCUMENT_TEMPLATES;
}

export function saveDocumentTemplate(template: DocumentTemplate): void {
  const current = getStoredDocumentTemplates();
  const existingIdx = current.findIndex((t) => t.id === template.id);
  let updated: DocumentTemplate[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = template;
  } else {
    updated = [template, ...current];
  }
  sessionStorage.setItem("clientDocumentTemplates", JSON.stringify(updated));
  window.dispatchEvent(new Event(DOCUMENT_TEMPLATES_EVENT));

  if (template.category) {
    saveTemplateCategory(template.category);
  }
}

export function deleteDocumentTemplate(id: string): void {
  const current = getStoredDocumentTemplates();
  const updated = current.filter((t) => t.id !== id);
  sessionStorage.setItem("clientDocumentTemplates", JSON.stringify(updated));
  window.dispatchEvent(new Event(DOCUMENT_TEMPLATES_EVENT));
}

export function getStoredTemplateCategories(): string[] {
  try {
    const raw = sessionStorage.getItem("clientTemplateCategories");
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      const legacyToExclude = new Set(["identification", "contract", "financial"]);
      const filtered = parsed.filter((c) => !legacyToExclude.has(c.toLowerCase()));
      const combined = Array.from(new Set([...DEFAULT_TEMPLATE_CATEGORIES, ...filtered]));
      return combined;
    }
  } catch {}
  return DEFAULT_TEMPLATE_CATEGORIES;
}

export function saveTemplateCategory(category: string): void {
  const trimmed = category.trim();
  if (!trimmed) return;
  const current = getStoredTemplateCategories();
  if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    sessionStorage.setItem("clientTemplateCategories", JSON.stringify(updated));
    window.dispatchEvent(new Event(DOCUMENT_CATEGORIES_EVENT));
  }
}

/** Helper to extract unique variables inside {} from template text */
export function extractTemplateFields(text: string): string[] {
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.add(match[1].trim());
  }
  return Array.from(matches);
}
