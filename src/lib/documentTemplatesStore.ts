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

const INITIAL_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-1",
    name: "Client KYC & Identification Verification Form",
    category: "Identification",
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
    category: "Contract",
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
  {
    id: "tpl-3",
    name: "Patient Intake Medical Authorization Form",
    category: "Medical / Intake",
    fileName: "medical_intake_template.docx",
    templateText: `PATIENT INTAKE MEDICAL AUTHORIZATION FORM

Patient Details:
- Full Name: {client_name}
- Contact Phone: {phone}
- Email Address: {email}
- Location: {location}
- Case Manager: {responsible}

Authorization Statement:
I, {client_name}, hereby authorize MantraCare healthcare personnel to process medical intake records for health assessment and CRM workflow management.

Date Authorized: {current_date}
Patient Signature: ______________________`,
    extractedFields: ["client_name", "phone", "email", "location", "responsible", "current_date"],
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
];

export function getStoredDocumentTemplates(): DocumentTemplate[] {
  try {
    const raw = sessionStorage.getItem("clientDocumentTemplates");
    if (raw) return JSON.parse(raw);
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
}

export function deleteDocumentTemplate(id: string): void {
  const current = getStoredDocumentTemplates();
  const updated = current.filter((t) => t.id !== id);
  sessionStorage.setItem("clientDocumentTemplates", JSON.stringify(updated));
  window.dispatchEvent(new Event(DOCUMENT_TEMPLATES_EVENT));
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
