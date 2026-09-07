/**
 * industryReferenceData.ts
 * Path: src/data/industryReferenceData.ts
 *
 * Centralized reference catalog for Industry Categories, Industries, and standard Locations.
 * Shared between AdminIndustries, AdminCustomFields, FieldRegistryContext, and OrganizationContext.
 */

export interface IndustryCategory {
  id: string;
  idNumber: number;
  name: string;
  description: string;
  industries: string[];
  isActive: boolean;
}

export interface IndustryItem {
  id: string;
  idNumber: number;
  name: string;
  category: string;
  description: string;
  isSystemRecord: boolean;
  isActive: boolean;
}

export const STANDARD_LOCATIONS: string[] = [
  "California",
  "New York",
  "Texas",
  "Florida",
  "Illinois",
  "Washington",
  "Massachusetts",
  "Colorado",
  "United Kingdom",
  "Canada",
  "Australia",
];

export const INITIAL_CATEGORIES: IndustryCategory[] = [
  {
    id: "cat-1",
    idNumber: 8,
    name: "Automobile",
    description: "Services and workflows tied to buying, maintaining, and servicing vehicles.",
    industries: [
      "Accessory/Customization",
      "Auto Dealership & Service",
      "Electric Vehicle (EV) Specialization",
      "Fleet Maintenance & Servicing",
    ],
    isActive: true,
  },
  {
    id: "cat-2",
    idNumber: 6,
    name: "Coaching & Advisory",
    description: "Professional coaches and advisors guiding clients on personal, financial, or career matters.",
    industries: [
      "Career Coaching",
      "Executive Leadership Mentorship",
      "Life & Wellness Coaching",
    ],
    isActive: true,
  },
  {
    id: "cat-3",
    idNumber: 1,
    name: "Healthcare",
    description: "All healthcare related clinical workflows and patient care specialties.",
    industries: [
      "Cardiologist",
      "Dentist",
      "Dermatologist",
      "Diagnostics",
      "Endocrinologist",
      "ENT Specialist",
      "Fertility/IVF Specialist",
      "Gastroenterologist",
      "General Physician",
      "General Surgery",
      "Gynecologist",
      "Nephrologist",
      "Neurosurgeon",
      "Nutrition",
      "Oncologist",
      "Ophthalmologist",
      "Orthopedic",
      "Pediatrician",
      "Pulmonologist (Lung)",
      "Rheumatologist",
      "Sexologist",
      "Therapist",
      "Psychiatrist",
      "Urologist",
    ],
    isActive: true,
  },
  {
    id: "cat-4",
    idNumber: 7,
    name: "Household Care",
    description: "On-demand visits where a professional comes to client's premises for cleaning or repairs.",
    industries: [
      "Plumbing & Water Systems",
      "Electrical & Smart Home Installation",
      "HVAC & Air Conditioning Repair",
      "Home Deep Cleaning",
    ],
    isActive: true,
  },
  {
    id: "cat-5",
    idNumber: 9,
    name: "IT/Tech",
    description: "Technical software, cloud architecture, automation, and cybersecurity consulting.",
    industries: [
      "AI/ML Strategy/ Model Development",
      "App Development",
      "Automation/Workflow Consultation",
      "Chatbot/Voice Agent Development",
      "Cloud Migration Consultation",
      "Cybersecurity Assessment",
      "Data/Infrastructure Audit",
    ],
    isActive: true,
  },
  {
    id: "cat-6",
    idNumber: 10,
    name: "Real Estate",
    description: "Services covering property buying, selling, renting, and the advisory work around a deal.",
    industries: [
      "Residential Real Estate Brokerage",
      "Commercial Property Leasing",
      "Property Management & HOA",
    ],
    isActive: true,
  },
  {
    id: "cat-7",
    idNumber: 5,
    name: "Wellness & Lifestyle",
    description: "Non-clinical practitioners supporting physical and lifestyle health through nutrition, fitness, yoga, and mindfulness.",
    industries: [
      "Fitness & Personal Training",
      "Holistic Nutrition & Dietetics",
      "Yoga & Mindfulness Studio",
    ],
    isActive: true,
  },
];

export const INITIAL_INDUSTRIES: IndustryItem[] = [
  // Healthcare
  { id: "ind-h-1", idNumber: 101, name: "Cardiologist", category: "Healthcare", description: "Cardiovascular health, ECG/Echocardiogram, and cardiology consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-2", idNumber: 102, name: "Dentist", category: "Healthcare", description: "Oral hygiene, restorative dentistry, extractions, and smile design.", isSystemRecord: true, isActive: true },
  { id: "ind-h-3", idNumber: 103, name: "Dermatologist", category: "Healthcare", description: "Skin, hair, nails diagnosis, cosmetic dermatology, and biopsy procedures.", isSystemRecord: true, isActive: true },
  { id: "ind-h-4", idNumber: 104, name: "Diagnostics", category: "Healthcare", description: "Clinical laboratory testing, pathology, ultrasound, and radiology services.", isSystemRecord: true, isActive: true },
  { id: "ind-h-5", idNumber: 105, name: "Endocrinologist", category: "Healthcare", description: "Diabetes management, thyroid disorders, and hormonal metabolic therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-6", idNumber: 106, name: "ENT Specialist", category: "Healthcare", description: "Ear, nose, throat diagnostics, audiology screening, and sinus therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-7", idNumber: 107, name: "Fertility/IVF Specialist", category: "Healthcare", description: "Reproductive endocrinology, IVF cycles, and fertility consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-8", idNumber: 108, name: "Gastroenterologist", category: "Healthcare", description: "Digestive health, endoscopy/colonoscopy, and liver wellness.", isSystemRecord: true, isActive: true },
  { id: "ind-h-9", idNumber: 109, name: "General Physician", category: "Healthcare", description: "Primary care, routine wellness exams, and chronic condition management.", isSystemRecord: true, isActive: true },
  { id: "ind-h-10", idNumber: 110, name: "General Surgery", category: "Healthcare", description: "Pre-op evaluation, laparoscopic surgery, and post-operative recovery.", isSystemRecord: true, isActive: true },
  { id: "ind-h-11", idNumber: 111, name: "Gynecologist", category: "Healthcare", description: "Women's wellness, obstetric care, prenatal visits, and pelvic exams.", isSystemRecord: true, isActive: true },
  { id: "ind-h-12", idNumber: 112, name: "Nephrologist", category: "Healthcare", description: "Kidney disease management, hypertension care, and dialysis oversight.", isSystemRecord: true, isActive: true },
  { id: "ind-h-13", idNumber: 113, name: "Neurosurgeon", category: "Healthcare", description: "Brain and spine surgical evaluations, trauma care, and nerve decompression.", isSystemRecord: true, isActive: true },
  { id: "ind-h-14", idNumber: 114, name: "Nutrition", category: "Healthcare", description: "Clinical dietary therapy, meal planning, and metabolic weight guidance.", isSystemRecord: true, isActive: true },
  { id: "ind-h-15", idNumber: 115, name: "Oncologist", category: "Healthcare", description: "Cancer screening, chemotherapy planning, and oncology consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-16", idNumber: 116, name: "Ophthalmologist", category: "Healthcare", description: "Vision health, cataract/refractive surgery, and retinal exams.", isSystemRecord: true, isActive: true },
  { id: "ind-h-17", idNumber: 117, name: "Orthopedic", category: "Healthcare", description: "Joint, bone, sports injury consultations, and physical rehabilitation.", isSystemRecord: true, isActive: true },
  { id: "ind-h-18", idNumber: 118, name: "Pediatrician", category: "Healthcare", description: "Infant, child, and adolescent healthcare and developmental milestones.", isSystemRecord: true, isActive: true },
  { id: "ind-h-19", idNumber: 119, name: "Pulmonologist (Lung)", category: "Healthcare", description: "Respiratory health, asthma, COPD, and pulmonary function testing.", isSystemRecord: true, isActive: true },
  { id: "ind-h-20", idNumber: 120, name: "Rheumatologist", category: "Healthcare", description: "Arthritis, autoimmune disease treatment, and joint pain therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-21", idNumber: 121, name: "Sexologist", category: "Healthcare", description: "Sexual health counseling, intimacy therapy, and reproductive wellness.", isSystemRecord: true, isActive: true },
  { id: "ind-h-22", idNumber: 122, name: "Therapist", category: "Healthcare", description: "Mental health counseling, cognitive behavioral therapy, and emotional support.", isSystemRecord: true, isActive: true },
  { id: "ind-h-23", idNumber: 123, name: "Psychiatrist", category: "Healthcare", description: "Psychiatric evaluation, medication management, and clinical mental care.", isSystemRecord: true, isActive: true },
  { id: "ind-h-24", idNumber: 124, name: "Urologist", category: "Healthcare", description: "Urinary tract, bladder, kidney stones, and prostate health.", isSystemRecord: true, isActive: true },

  // Automobile
  { id: "ind-a-1", idNumber: 201, name: "Accessory/Customization", category: "Automobile", description: "Discussing add-ons or modifications.", isSystemRecord: true, isActive: true },
  { id: "ind-a-2", idNumber: 202, name: "Auto Dealership & Service", category: "Automobile", description: "Vehicle maintenance, diagnostics, and repairs workflow.", isSystemRecord: true, isActive: true },
  { id: "ind-a-3", idNumber: 203, name: "Electric Vehicle (EV) Specialization", category: "Automobile", description: "EV battery health, charging systems, and diagnostics.", isSystemRecord: true, isActive: true },
  { id: "ind-a-4", idNumber: 204, name: "Fleet Maintenance & Servicing", category: "Automobile", description: "Commercial fleet scheduling and maintenance log tracking.", isSystemRecord: true, isActive: true },

  // Coaching & Advisory
  { id: "ind-c-1", idNumber: 301, name: "Career Coaching", category: "Coaching & Advisory", description: "Guidance on job search, transitions, or career strategy.", isSystemRecord: true, isActive: true },
  { id: "ind-c-2", idNumber: 302, name: "Executive Leadership Mentorship", category: "Coaching & Advisory", description: "Executive mentorship, boardroom leadership, and scaling.", isSystemRecord: true, isActive: true },
  { id: "ind-c-3", idNumber: 303, name: "Life & Wellness Coaching", category: "Coaching & Advisory", description: "Personal development, habit transformation, and work-life balance.", isSystemRecord: true, isActive: true },

  // Household Care
  { id: "ind-hc-1", idNumber: 401, name: "Plumbing & Water Systems", category: "Household Care", description: "Pipe diagnostics, water heaters, and emergency leak response.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-2", idNumber: 402, name: "Electrical & Smart Home Installation", category: "Household Care", description: "Wiring, circuit breakers, EV chargers, and smart automation.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-3", idNumber: 403, name: "HVAC & Air Conditioning Repair", category: "Household Care", description: "Heating, cooling, ventilation repair, and seasonal tune-ups.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-4", idNumber: 404, name: "Home Deep Cleaning", category: "Household Care", description: "Residential sanitation, move-in/out, and carpet care.", isSystemRecord: true, isActive: true },

  // IT/Tech
  { id: "ind-t-1", idNumber: 501, name: "AI/ML Strategy/ Model Development", category: "IT/Tech", description: "Scoping a custom AI or machine learning solution.", isSystemRecord: true, isActive: true },
  { id: "ind-t-2", idNumber: 502, name: "App Development", category: "IT/Tech", description: "Scoping mobile and web app builds.", isSystemRecord: true, isActive: true },
  { id: "ind-t-3", idNumber: 503, name: "Automation/Workflow Consultation", category: "IT/Tech", description: "Scoping AI-driven automation for business workflows.", isSystemRecord: true, isActive: true },
  { id: "ind-t-4", idNumber: 504, name: "Chatbot/Voice Agent Development", category: "IT/Tech", description: "Scoping conversational AI and voice agent implementations.", isSystemRecord: true, isActive: true },
  { id: "ind-t-5", idNumber: 505, name: "Cloud Migration Consultation", category: "IT/Tech", description: "Cloud infrastructure architecture and DevOps planning.", isSystemRecord: true, isActive: true },
  { id: "ind-t-6", idNumber: 506, name: "Cybersecurity Assessment", category: "IT/Tech", description: "Security posture reviews, pen-testing, and compliance.", isSystemRecord: true, isActive: true },
  { id: "ind-t-7", idNumber: 507, name: "Data/Infrastructure Audit", category: "IT/Tech", description: "Data warehousing, pipelines, and schema optimization.", isSystemRecord: true, isActive: true },

  // Real Estate
  { id: "ind-re-1", idNumber: 601, name: "Residential Real Estate Brokerage", category: "Real Estate", description: "Buyer/seller representation and property showings.", isSystemRecord: true, isActive: true },
  { id: "ind-re-2", idNumber: 602, name: "Commercial Property Leasing", category: "Real Estate", description: "Commercial lease negotiations, retail, and office spaces.", isSystemRecord: true, isActive: true },
  { id: "ind-re-3", idNumber: 603, name: "Property Management & HOA", category: "Real Estate", description: "Tenant screening, maintenance dispatch, and HOA administration.", isSystemRecord: true, isActive: true },

  // Wellness & Lifestyle
  { id: "ind-w-1", idNumber: 701, name: "Fitness & Personal Training", category: "Wellness & Lifestyle", description: "Strength coaching, body composition assessments, and gym memberships.", isSystemRecord: true, isActive: true },
  { id: "ind-w-2", idNumber: 702, name: "Holistic Nutrition & Dietetics", category: "Wellness & Lifestyle", description: "Nutritional guidance, meal plans, and metabolic coaching.", isSystemRecord: true, isActive: true },
  { id: "ind-w-3", idNumber: 703, name: "Yoga & Mindfulness Studio", category: "Wellness & Lifestyle", description: "Vinyasa yoga, meditation sessions, and breathwork workshops.", isSystemRecord: true, isActive: true },
];

export function getIndustriesForCategory(categoryName: string): string[] {
  if (!categoryName || categoryName === "All") {
    return INITIAL_INDUSTRIES.map((i) => i.name);
  }
  const matched = INITIAL_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (matched) return matched.industries;
  return INITIAL_INDUSTRIES.filter(
    (i) => i.category.toLowerCase() === categoryName.toLowerCase()
  ).map((i) => i.name);
}
