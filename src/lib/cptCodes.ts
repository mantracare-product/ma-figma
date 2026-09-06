export interface CPTCodeOption {
  code: string;
  category: "Therapy & Mental Health" | "Evaluation & Management" | "Telehealth" | "Physical & Rehab" | "Dental" | "Diagnostics & Labs";
  description: string;
  typicalDuration?: number;
}

export const COMMON_CPT_CODES: CPTCodeOption[] = [
  // Therapy & Mental Health
  { code: "90834", category: "Therapy & Mental Health", description: "Psychotherapy, 45 minutes", typicalDuration: 45 },
  { code: "90837", category: "Therapy & Mental Health", description: "Psychotherapy, 60 minutes", typicalDuration: 60 },
  { code: "90832", category: "Therapy & Mental Health", description: "Psychotherapy, 30 minutes", typicalDuration: 30 },
  { code: "90791", category: "Therapy & Mental Health", description: "Psychiatric Diagnostic Evaluation (Intake)", typicalDuration: 60 },
  { code: "90792", category: "Therapy & Mental Health", description: "Psychiatric Diagnostic Eval with Medical Services", typicalDuration: 60 },
  { code: "90847", category: "Therapy & Mental Health", description: "Family Psychotherapy (conjoint with patient)", typicalDuration: 50 },
  { code: "90846", category: "Therapy & Mental Health", description: "Family Psychotherapy (without patient present)", typicalDuration: 50 },
  { code: "90853", category: "Therapy & Mental Health", description: "Group Psychotherapy", typicalDuration: 60 },
  { code: "90839", category: "Therapy & Mental Health", description: "Psychotherapy for Crisis, first 60 minutes", typicalDuration: 60 },
  { code: "90840", category: "Therapy & Mental Health", description: "Psychotherapy for Crisis, additional 30 minutes", typicalDuration: 30 },

  // Evaluation & Management (E/M Consultations)
  { code: "99202", category: "Evaluation & Management", description: "Office Outpatient Visit, New Patient (15-29 min)", typicalDuration: 20 },
  { code: "99203", category: "Evaluation & Management", description: "Office Outpatient Visit, New Patient (30-44 min)", typicalDuration: 30 },
  { code: "99204", category: "Evaluation & Management", description: "Office Outpatient Visit, New Patient (45-59 min)", typicalDuration: 45 },
  { code: "99205", category: "Evaluation & Management", description: "Office Outpatient Visit, New Patient (60-74 min)", typicalDuration: 60 },
  { code: "99212", category: "Evaluation & Management", description: "Office Outpatient Visit, Established (10-19 min)", typicalDuration: 15 },
  { code: "99213", category: "Evaluation & Management", description: "Office Outpatient Visit, Established (20-29 min)", typicalDuration: 25 },
  { code: "99214", category: "Evaluation & Management", description: "Office Outpatient Visit, Established (30-39 min)", typicalDuration: 35 },
  { code: "99215", category: "Evaluation & Management", description: "Office Outpatient Visit, Established (40-54 min)", typicalDuration: 45 },

  // Telehealth & Assessments
  { code: "99441", category: "Telehealth", description: "Telephone E/M Discussion (5-10 min)", typicalDuration: 10 },
  { code: "99442", category: "Telehealth", description: "Telephone E/M Discussion (11-20 min)", typicalDuration: 15 },
  { code: "99443", category: "Telehealth", description: "Telephone E/M Discussion (21-30 min)", typicalDuration: 30 },
  { code: "96127", category: "Telehealth", description: "Brief Emotional / Behavioral Assessment (PHQ-9 / GAD-7)" },
  { code: "96130", category: "Telehealth", description: "Psychological Testing Evaluation, 1st hour", typicalDuration: 60 },

  // Physical & Rehab
  { code: "97110", category: "Physical & Rehab", description: "Therapeutic Procedure / Exercise (15 min)", typicalDuration: 15 },
  { code: "97140", category: "Physical & Rehab", description: "Manual Therapy Techniques (15 min)", typicalDuration: 15 },
  { code: "97161", category: "Physical & Rehab", description: "Physical Therapy Evaluation: Low Complexity", typicalDuration: 30 },
  { code: "97162", category: "Physical & Rehab", description: "Physical Therapy Evaluation: Moderate Complexity", typicalDuration: 45 },
  { code: "97530", category: "Physical & Rehab", description: "Therapeutic Activities, Direct 1-on-1 (15 min)", typicalDuration: 15 },

  // Dental
  { code: "D0120", category: "Dental", description: "Periodic Oral Evaluation - Established Patient", typicalDuration: 30 },
  { code: "D0150", category: "Dental", description: "Comprehensive Oral Evaluation - New Patient", typicalDuration: 45 },
  { code: "D1110", category: "Dental", description: "Prophylaxis - Adult (Dental Cleaning)", typicalDuration: 45 },
  { code: "D0210", category: "Dental", description: "Intraoral - Complete Series Radiographic Images", typicalDuration: 20 },

  // Diagnostics & Labs
  { code: "70450", category: "Diagnostics & Labs", description: "CT Head / Brain without Contrast", typicalDuration: 20 },
  { code: "71045", category: "Diagnostics & Labs", description: "Radiologic Examination, Chest; Single View", typicalDuration: 15 },
  { code: "80053", category: "Diagnostics & Labs", description: "Comprehensive Metabolic Panel (CMP)", typicalDuration: 15 },
  { code: "85025", category: "Diagnostics & Labs", description: "Complete Blood Count (CBC) with Automated Differential", typicalDuration: 15 },
];

export function searchCPTCodes(query: string): CPTCodeOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_CPT_CODES.slice(0, 10);
  return COMMON_CPT_CODES.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}

export function getCPTCodeOption(code: string): CPTCodeOption | undefined {
  const norm = code.trim().toUpperCase();
  return COMMON_CPT_CODES.find((i) => i.code.toUpperCase() === norm);
}

