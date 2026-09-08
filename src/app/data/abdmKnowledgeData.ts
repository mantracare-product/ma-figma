export interface GlossaryTerm {
  id: string;
  term: string;
  fullName: string;
  description: string;
}

export const ABDM_GLOSSARY: GlossaryTerm[] = [
  {
    id: "abha",
    term: "ABHA",
    fullName: "Ayushman Bharat Health Account",
    description: "A patient's 14-digit digital health ID that can be used to associate health records with their identity.",
  },
  {
    id: "abdm",
    term: "ABDM",
    fullName: "Ayushman Bharat Digital Mission",
    description: "India's digital health ecosystem connecting patients, healthcare professionals, facilities and health information.",
  },
  {
    id: "hfr",
    term: "HFR",
    fullName: "Health Facility Registry",
    description: "A national registry of healthcare facilities such as hospitals, clinics, diagnostic labs and healthcare institutions.",
  },
  {
    id: "hpr",
    term: "HPR",
    fullName: "Healthcare Professionals Registry",
    description: "A registry of verified healthcare professionals participating in the national digital health ecosystem.",
  },
  {
    id: "nha",
    term: "NHA",
    fullName: "National Health Authority",
    description: "The government body responsible for implementing and overseeing key digital health initiatives including ABDM.",
  },
  {
    id: "dhis",
    term: "DHIS",
    fullName: "Digital Health Incentive Scheme",
    description: "An incentive mechanism supporting eligible digital health ecosystem participants for qualifying ABDM-linked activities.",
  },
  {
    id: "kyc",
    term: "KYC",
    fullName: "Know Your Customer",
    description: "The identity verification process used to establish and verify a patient's identity via Aadhaar or biometric authentication.",
  },
  {
    id: "consent",
    term: "Consent",
    fullName: "Patient Consent",
    description: "The patient's explicit electronic permission allowing their health information to be accessed or shared through the ABDM ecosystem.",
  },
  {
    id: "hip",
    term: "HIP",
    fullName: "Health Information Provider",
    description: "A healthcare entity or clinic system that creates, stores or makes a patient's health records available for secure sharing.",
  },
  {
    id: "hiu",
    term: "HIU",
    fullName: "Health Information User",
    description: "A healthcare entity or doctor that requests access to a patient's longitudinal health records with verified patient consent.",
  },
];

export interface FaqItemData {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export const ABDM_FAQS: FaqItemData[] = [
  {
    id: "faq-1",
    question: "What is ABHA and why do I need it?",
    answer: "ABHA (Ayushman Bharat Health Account) provides a 14-digit digital health identity that allows eligible health records, lab reports, and prescriptions to be associated with the same patient identity across participating healthcare providers and clinics nationwide.",
    keywords: ["abha", "identity", "what is", "health account", "need", "records"],
  },
  {
    id: "faq-2",
    question: "What is the difference between ABDM and ABHA?",
    answer: "ABDM is the national digital health ecosystem and mission framework created by the National Health Authority (NHA). ABHA is the individual patient's unique digital health account and identifier within that ecosystem.",
    keywords: ["difference", "abdm", "abha", "national", "ecosystem", "identifier"],
  },
  {
    id: "faq-3",
    question: "What happens in M1 — Create ABHA?",
    answer: "In Milestone 1 (M1), the clinic creates or verifies the patient's ABHA identity using Aadhaar or mobile OTP verification. This establishes a verified digital health account so subsequent consultations, diagnoses, and reports can link to one unified identity.",
    keywords: ["m1", "create", "abha", "aadhaar", "otp", "identity", "milestone 1"],
  },
  {
    id: "faq-4",
    question: "What happens in M2 — Link Records?",
    answer: "In Milestone 2 (M2), the clinic acts as a Health Information Provider (HIP) and connects eligible patient records—such as prescription summaries, diagnostic reports, and discharge notes—as Care Contexts to the patient's ABHA.",
    keywords: ["m2", "link", "records", "hip", "care context", "prescription", "reports", "milestone 2"],
  },
  {
    id: "faq-5",
    question: "What happens in M3 — Fetch Records?",
    answer: "In Milestone 3 (M3), the clinic acts as a Health Information User (HIU) to request and fetch health information and past medical history shared by other participating healthcare facilities, subject to explicit patient consent.",
    keywords: ["m3", "fetch", "records", "hiu", "medical history", "past history", "consent", "milestone 3"],
  },
  {
    id: "faq-6",
    question: "Why do I need patient consent before fetching records?",
    answer: "Under ABDM security architecture, health information is strictly private and citizen-centric. Clinicians can only access past records through an electronic consent artefact approved by the patient via their ABHA PHR application.",
    keywords: ["consent", "privacy", "security", "permission", "artefact", "patient"],
  },
  {
    id: "faq-7",
    question: "Why are some records linked while others are not?",
    answer: "Record availability depends on whether the treating facility is ABDM-integrated, whether the patient's ABHA was presented at the time of care, whether care contexts were linked, and whether qualifying criteria were met.",
    keywords: ["linked", "availability", "unlinked", "facilities", "status"],
  },
  {
    id: "faq-8",
    question: "What is the difference between HFR and HPR?",
    answer: "HFR (Health Facility Registry) is the national directory of verified healthcare institutions like hospitals, clinics, and labs. HPR (Healthcare Professionals Registry) is the national directory of licensed doctors, practitioners, and medical specialists.",
    keywords: ["hfr", "hpr", "facility", "professionals", "registry", "doctors", "clinics"],
  },
  {
    id: "faq-9",
    question: "What is KYC and why is it required?",
    answer: "KYC (Know Your Customer) verifies the patient's identity via government-backed verification (such as Aadhaar OTP or demographic checks). It ensures that medical records are bound securely to the authentic citizen and avoids misattributed clinical histories.",
    keywords: ["kyc", "aadhaar", "verification", "identity", "otp"],
  },
  {
    id: "faq-10",
    question: "How does the ABDM incentive (DHIS) work?",
    answer: "The Digital Health Incentive Scheme (DHIS) provides financial incentives to healthcare facilities and providers for qualifying digital transactions—such as creating ABHAs and linking digital health records—subject to meeting NHA minimum transaction volume thresholds.",
    keywords: ["incentive", "dhis", "money", "earn", "payout", "rewards"],
  },
  {
    id: "faq-11",
    question: "Can I fetch a patient's old records from another facility?",
    answer: "Yes, provided that the other facility is ABDM-enabled and the patient grants consent to your facility through their ABHA app. Once approved, past consultation notes, lab results, and discharge summaries can be securely pulled into the timeline.",
    keywords: ["fetch", "old records", "past", "history", "other facility", "hospital"],
  },
  {
    id: "faq-12",
    question: "Does creating an ABHA automatically give me access to all patient records?",
    answer: "No. Creating an ABHA only establishes the patient's digital health identity. Accessing past medical records and diagnostic files requires a separate, explicit consent-request flow approved by the patient.",
    keywords: ["automatic", "access", "all records", "permission", "consent"],
  },
];
