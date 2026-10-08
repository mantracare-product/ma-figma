import type { ScopingRule } from "../app/context/FieldRegistryContext";

export type { ScopingRule };
export type TemplateEntity = "client" | "process" | "appointment" | "invoice";

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
  rawDocxBase64?: string;
  htmlPreviewTemplate?: string;
  // Scoping & Entity Support
  entities?: TemplateEntity[]; // e.g. ["client", "process", "appointment", "invoice"]
  scopingRules?: ScopingRule[];
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
    entities: ["appointment", "client"],
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
    entities: ["appointment", "process"],
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
    entities: ["client", "process"],
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
    entities: ["client", "process"],
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
    entities: ["client"],
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
    entities: ["client", "process"],
    createdAt: "2024-05-10 14:30",
    createdBy: "Legal Dept",
  },
  {
    id: "tpl-inv-1",
    name: "Tax Invoice & Billing Statement",
    category: "General",
    fileName: "tax_invoice_statement.docx",
    templateText: `OFFICIAL TAX INVOICE & BILLING STATEMENT

Invoice Number: {invoice_number}
Invoice Date: {current_date}
Due Date: {due_date}
Total Amount: {total_amount}

Billed To:
Client Name: {client_name}
Email: {email}
Phone: {phone}
Address: {location}

Service Breakdown & Itemized Charges:
{items}

Tax & Totals:
Subtotal: {subtotal}
Tax: {tax_amount}
Total Due: {total_amount}
Payment Status: {payment_status}

Issued By: {responsible}
Organization: MantraCare Healthcare Services`,
    extractedFields: ["invoice_number", "current_date", "due_date", "total_amount", "client_name", "email", "phone", "location", "items", "subtotal", "tax_amount", "payment_status", "responsible"],
    fieldMappings: [
      { templateField: "invoice_number", mappedFieldKey: "invoice_number", label: "Invoice Number" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Invoice Date" },
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "total_amount", mappedFieldKey: "total_amount", label: "Total Amount" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Billing Officer" },
    ],
    entities: ["invoice"],
    createdAt: "2024-05-20 16:00",
    createdBy: "Finance Dept",
  },
  {
    id: "tpl-inv-receipt",
    name: "Payment Receipt & Proof of Payment",
    category: "General",
    fileName: "payment_receipt.docx",
    templateText: `PAYMENT RECEIPT & ACKNOWLEDGMENT

Receipt Number: {receipt_number}
Date of Payment: {current_date}
Payment Method: {payment_method}
Amount Paid: {amount_paid}

Received From:
Client Name: {client_name}
Email: {email}
Phone: {phone}

Transaction Summary:
Transaction Reference: {transaction_ref}
Associated Invoice: {invoice_number}
Balance Remaining: {balance_remaining}

Status: CONFIRMED & SETTLED
Cashier / Officer: {responsible}`,
    extractedFields: ["receipt_number", "current_date", "payment_method", "amount_paid", "client_name", "email", "phone", "transaction_ref", "invoice_number", "balance_remaining", "responsible"],
    fieldMappings: [
      { templateField: "receipt_number", mappedFieldKey: "receipt_number", label: "Receipt Number" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Receipt Date" },
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "amount_paid", mappedFieldKey: "total_amount", label: "Amount Paid" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Billing Officer" },
    ],
    entities: ["invoice"],
    createdAt: "2024-05-21 11:00",
    createdBy: "Finance Dept",
  },
  {
    id: "tpl-proc-sop",
    name: "Process SOP & Stage Execution Checklist",
    category: "General",
    fileName: "stage_sop_checklist.docx",
    templateText: `PROCESS SOP & STAGE EXECUTION PROTOCOL

Process Name: {process_name}
Current Stage: {stage_name}
Responsible Specialist: {responsible}
Execution Date: {current_date}

Client Information:
Client Name: {client_name}
Location: {location}
Phone: {phone}

Stage Checklist:
1. [ ] Verification of client profile and contact validity
2. [ ] Mandatory intake documentation completed and archived
3. [ ] Stakeholder communication sent via preferred channel
4. [ ] Stage milestone review signed off

Stage Handover Status: {status}
Sign-off: {responsible}`,
    extractedFields: ["process_name", "stage_name", "responsible", "current_date", "client_name", "location", "phone", "status"],
    fieldMappings: [
      { templateField: "process_name", mappedFieldKey: "process_name", label: "Process Name" },
      { templateField: "stage_name", mappedFieldKey: "stage_name", label: "Stage Name" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Responsible Specialist" },
      { templateField: "current_date", mappedFieldKey: "date", label: "Current Date" },
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Name" },
      { templateField: "location", mappedFieldKey: "location", label: "Location" },
    ],
    entities: ["process"],
    createdAt: "2024-05-22 14:15",
    createdBy: "Operations Dept",
  },
  {
    id: "tpl-appt-confirm",
    name: "Appointment Confirmation & Preparation Guide",
    category: "General",
    fileName: "appointment_confirmation.docx",
    templateText: `APPOINTMENT CONFIRMATION & PREPARATION GUIDE

Dear {client_name},

Your appointment has been confirmed. Below are your consultation details:

Appointment Date & Time: {appointment_date} at {appointment_time}
Provider / Specialist: {responsible}
Clinic / Location: {location}
Service Type: {service_name}

Important Preparation Guidelines:
- Please arrive 10 minutes prior to your scheduled time.
- Bring any relevant identification and medical records.
- If you need to reschedule, notify us at least 24 hours in advance.

Contact: {phone} | {email}
Issued By: MantraCare Scheduling Center`,
    extractedFields: ["client_name", "appointment_date", "appointment_time", "responsible", "location", "service_name", "phone", "email"],
    fieldMappings: [
      { templateField: "client_name", mappedFieldKey: "name", label: "Client Full Name" },
      { templateField: "appointment_date", mappedFieldKey: "date", label: "Appointment Date" },
      { templateField: "appointment_time", mappedFieldKey: "time", label: "Appointment Time" },
      { templateField: "responsible", mappedFieldKey: "responsible", label: "Provider Name" },
      { templateField: "location", mappedFieldKey: "location", label: "Clinic Location" },
    ],
    entities: ["appointment"],
    createdAt: "2024-05-23 09:45",
    createdBy: "Front Desk",
  },
];

/** Helper to filter document templates against entity and admin scope rules */
export function isDocumentTemplateMatchingScope(
  template: DocumentTemplate,
  scope: { category?: string; industry?: string; location?: string; entity?: string }
): boolean {
  // Check entity match
  if (scope.entity && scope.entity !== "all" && scope.entity !== "All") {
    const templateEntities = template.entities || ["client", "process", "appointment", "invoice"];
    if (templateEntities.length > 0 && !templateEntities.includes(scope.entity as TemplateEntity)) {
      return false;
    }
  }

  // Check scoping rules
  if (!template.scopingRules || template.scopingRules.length === 0) {
    return true; // No scoping restrictions = global
  }

  const { category = "All", industry = "All", location = "All" } = scope;
  if (category === "All" && industry === "All" && location === "All") {
    return true;
  }

  return template.scopingRules.some((rule) => {
    // 1. Industry Category
    if (category !== "All" && category !== "All Categories" && rule.industryCategory && rule.industryCategory !== "All" && rule.industryCategory !== "All Categories") {
      if (rule.industryCategory.trim().toLowerCase() !== category.trim().toLowerCase()) {
        return false;
      }
    }

    // 2. Industries
    if (industry !== "All" && industry !== "All Industries" && rule.industries && rule.industries.length > 0) {
      const hasInd = rule.industries.some(
        (i) => i.trim().toLowerCase() === industry.trim().toLowerCase()
      );
      if (!hasInd) return false;
    }

    // 3. Locations
    if (location !== "All" && location !== "All Locations" && rule.locations && rule.locations.length > 0) {
      const hasLoc = rule.locations.some(
        (l) => l.trim().toLowerCase() === location.trim().toLowerCase()
      );
      if (!hasLoc) return false;
    }

    return true;
  });
}

/** Robust scope rule matching for automations that take ScopingRule[] */
export function isDocumentTemplateMatchingScopeRules(
  template: DocumentTemplate,
  stepRules: ScopingRule[] = [],
  entity?: TemplateEntity
): boolean {
  // 1. Check entity match
  if (entity && entity !== "all" as any) {
    const templateEntities = template.entities || ["client", "process", "appointment", "invoice"];
    if (templateEntities.length > 0 && !templateEntities.includes(entity)) {
      return false;
    }
  }

  // 2. Filter stepRules to only active/specific rules
  const activeStepRules = (stepRules || []).filter((r) => {
    const hasCategory = r.industryCategory && r.industryCategory !== "All" && r.industryCategory !== "All Categories";
    const hasInd = r.industries && r.industries.length > 0 && !r.industries.includes("All") && !r.industries.includes("All Industries");
    const hasLoc = r.locations && r.locations.length > 0 && !r.locations.includes("All") && !r.locations.includes("All Locations");
    return hasCategory || hasInd || hasLoc;
  });

  // If automation step has no specific scope rules, all templates for this entity match
  if (activeStepRules.length === 0) {
    return true;
  }

  // If the template has no scoping rules, it is global and available across all scopes!
  if (!template.scopingRules || template.scopingRules.length === 0) {
    return true;
  }

  // 3. Check if at least one active step rule overlaps with at least one template scoping rule
  return activeStepRules.some((stepRule) => {
    return template.scopingRules!.some((tplRule) => {
      // Industry Category check
      if (
        stepRule.industryCategory &&
        tplRule.industryCategory &&
        stepRule.industryCategory !== "All" &&
        stepRule.industryCategory !== "All Categories" &&
        tplRule.industryCategory !== "All" &&
        tplRule.industryCategory !== "All Categories"
      ) {
        if (stepRule.industryCategory.trim().toLowerCase() !== tplRule.industryCategory.trim().toLowerCase()) {
          return false;
        }
      }

      // Industries check
      const stepInds = (stepRule.industries || []).filter((i) => i !== "All" && i !== "All Industries");
      const tplInds = (tplRule.industries || []).filter((i) => i !== "All" && i !== "All Industries");
      if (stepInds.length > 0 && tplInds.length > 0) {
        const hasCommonInd = stepInds.some((si) =>
          tplInds.some((ti) => ti.trim().toLowerCase() === si.trim().toLowerCase())
        );
        if (!hasCommonInd) return false;
      }

      // Locations check
      const stepLocs = (stepRule.locations || []).filter((l) => l !== "All" && l !== "All Locations");
      const tplLocs = (tplRule.locations || []).filter((l) => l !== "All" && l !== "All Locations");
      if (stepLocs.length > 0 && tplLocs.length > 0) {
        const hasCommonLoc = stepLocs.some((sl) =>
          tplLocs.some((tl) => tl.trim().toLowerCase() === sl.trim().toLowerCase())
        );
        if (!hasCommonLoc) return false;
      }

      return true;
    });
  });
}

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

/** Helper to extract unique variables inside {}, {{}}, «», or [] from template text */
export function extractTemplateFields(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();

  // 1. Double curly: {{ field }}
  const doubleCurlyRegex = /\{\{\s*([a-zA-Z0-9_\- ]+?)\s*\}\}/g;
  let m;
  while ((m = doubleCurlyRegex.exec(text)) !== null) {
    if (m[1] && m[1].trim()) matches.add(m[1].trim());
  }

  // 2. Single curly: { field }
  const singleCurlyRegex = /\{\s*([a-zA-Z0-9_\- ]+?)\s*\}/g;
  while ((m = singleCurlyRegex.exec(text)) !== null) {
    if (m[1] && m[1].trim()) matches.add(m[1].trim());
  }

  // 3. Guillemets: «field»
  const guillemetsRegex = /«\s*([a-zA-Z0-9_\- ]+?)\s*»/g;
  while ((m = guillemetsRegex.exec(text)) !== null) {
    if (m[1] && m[1].trim()) matches.add(m[1].trim());
  }

  // 4. Square brackets: [DocumentNumber], [PatientName] (at least 2 chars, letters/numbers/underscore)
  const squareBracketRegex = /\[\s*([a-zA-Z0-9_]{2,})\s*\]/g;
  while ((m = squareBracketRegex.exec(text)) !== null) {
    if (m[1] && m[1].trim()) matches.add(m[1].trim());
  }

  return Array.from(matches);
}
