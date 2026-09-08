// ABDM / ABHA Service Layer — Milestone 1, 2 & 3 Extended
// Handles M1 (ABHA Identity), M2 (Health Records Exchange & Consent - HIP), M3 (HIU / Medical History)

export interface ABHAPatientRecord {
  id: string;
  abhaNumber: string; // XX-XXXX-XXXX-XXXX
  abhaAddress: string; // username@abdm
  name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dob: string; // YYYY-MM-DD
  mobile: string;
  aadhaarLast4: string;
  address: string;
  state: string;
  district: string;
  pincode: string;
  photoUrl?: string;
  isExistingPatient: boolean;
  existingClientId?: string;
  status: "VERIFIED" | "LINKED" | "PENDING";
  createdAt: string;
  linkedRecordsCount: number;
  dhisIncentiveEarned?: number; // ₹ per record
}

export interface CareContext {
  id: string;
  patientAbhaAddress: string;
  facilityName: string;
  encounterType: "Consultation" | "Diagnostic Report" | "Prescription" | "Discharge Summary" | "Hospital Visit";
  date: string;
  doctorName?: string;
  summary: string;
  linked: boolean;
}

export interface ConsentRecord {
  id: string; // uuid or CONS-id
  patientName: string;
  abhaAddress: string;
  requesterName: string;
  purpose: string; // e.g. "Clinical Care", "Care Management"
  recordTypes: string[]; // ["Consultation", "Prescription", ...]
  fromDate: string;
  toDate: string;
  datePresetLabel?: string; // "Last 6 months – Today", "Last 3 months", etc.
  expiryDuration?: string; // "6 months", "1 week", "3 months", "12 months"
  requestedOn?: string; // e.g. "08 Sept 26 \n 01:05 pm"
  lastUpdated?: string; // e.g. "08 Sept 26 \n 01:05 pm"
  sharedFor?: string; // e.g. "184 Days"
  expiresIn?: string; // e.g. "180 days \n 08 Mar 27"
  status: "GRANTED" | "PENDING" | "DENIED" | "EXPIRED" | "REVOKED";
  grantedAt?: string;
  expiresAt?: string;
  artefactId?: string;
}

export interface DiscoveredFacility {
  id: string;
  facilityName: string;
  facilityType: "Hospital" | "Diagnostic Center" | "Clinic";
  availableRecordsCount: number;
  careContexts: CareContext[];
}

export interface MedicalHistoryItem {
  id: string;
  date: string;
  category: "Consultation" | "Prescription" | "Diagnostic Report" | "Discharge Summary" | "Hospital Visit";
  facilityName: string;
  doctorName: string;
  diagnosis?: string;
  medications?: { name: string; dosage: string; frequency: string; duration: string }[];
  vitals?: { bp?: string; pulse?: string; temp?: string; weight?: string };
  labResults?: { testName: string; value: string; unit: string; normalRange: string }[];
  summary: string;
}

export interface UploadedRecord {
  id: string;
  title: string;
  recordType: "Discharge Summary" | "Invoice" | "Lab Report" | "Prescription" | "Diagnostic Report" | "Vitals" | "Lab Results";
  dateFormatted: string; // e.g., "28 Feb'26" or "-"
  dateRaw: string; // "2026-09-08" or "2026-02-28"
  monthGroup: string; // "SEP 2026" or "FEB 2026"
  tag?: string; // "No Tag added" or custom tag
  previewUrl?: string; // image or doc preview
  status?: "READY" | "ANALYSING" | "FAILED";
}

// ── Vitals & Lab Results Domain Models (Linkable Medical Records) ──
export interface PatientVitalEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientAbha?: string;
  encounterId?: string;
  providerId?: string;
  recordedAt: string; // e.g. "08 Sep'26, 3:03 PM"
  recordedDateRaw: string; // "2026-09-08T15:03:00"
  vitals: {
    systolicBp?: string; // mmHg
    diastolicBp?: string; // mmHg
    bodyTemp?: string; // °F
    spO2?: string; // %
    pulseRate?: string; // /min
    respiratoryRate?: string; // /min
    bodyHeight?: string; // Cms
    bodyWeight?: string; // Kgs
    bmi?: string; // kg/m²
  };
  calculators?: {
    egfr?: string;
    cvdRisk?: string;
    crCl?: string;
    qrisk3?: string;
    bsa?: string;
  };
  notes?: string;
  createdAt: string;
}

export interface PatientLabTestEntry {
  testId: string;
  testName: string;
  category: string;
  value: string;
  unit: string;
  valueType: "numeric" | "qualitative" | "text";
  referenceRange?: {
    min?: number;
    max?: number;
    text?: string;
  };
  isOutOfRange?: boolean;
}

export interface PatientLabResultRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAbha?: string;
  encounterId?: string;
  providerId?: string;
  recordedDate: string; // e.g. "08 Sep'26"
  recordedDateRaw: string; // "2026-09-08"
  tests: PatientLabTestEntry[];
  totalFilled: number;
  totalOutOfRange: number;
  createdAt: string;
}

export interface M2Activity {
  id: string;
  type: "LINK" | "CONSENT" | "DISCOVER" | "SHARE" | "REQUEST" | "VITALS" | "LAB";
  title: string;
  timestamp: string;
  patientName: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
}

const STORAGE_KEY = "abdm_patient_records";
const CONSENTS_KEY = "abdm_consents";
const CARE_CONTEXTS_KEY = "abdm_care_contexts";
const ACTIVITIES_KEY = "abdm_activities";
const UNLOCKED_KEY = "abdm_module_unlocked";
const AUTH_KEY = "abdm_hpr_authenticated";
const ABHA_VERIFIED_KEY = "abdm_abha_verified";
const ACTIVE_PATIENT_KEY = "abdm_active_patient";
const VITALS_STORAGE_KEY = "abdm_patient_vitals";
const LAB_RESULTS_STORAGE_KEY = "abdm_patient_lab_results";

// Initial Seed Data
const INITIAL_RECORDS: ABHAPatientRecord[] = [
  {
    id: "ABDM-001",
    abhaNumber: "91-4821-9034-1182",
    abhaAddress: "priya.sharma@abdm",
    name: "Priya Sharma",
    gender: "FEMALE",
    dob: "1992-05-14",
    mobile: "+91 9820172818",
    aadhaarLast4: "4821",
    address: "B-402, Sea Green Apts, Worli",
    state: "Maharashtra",
    district: "Mumbai",
    pincode: "400018",
    isExistingPatient: true,
    existingClientId: "CL-013",
    status: "LINKED",
    createdAt: "2026-08-10",
    linkedRecordsCount: 5,
    dhisIncentiveEarned: 100,
  },
  {
    id: "ABDM-002",
    abhaNumber: "14-3829-1094-5521",
    abhaAddress: "rahul.patel@abdm",
    name: "Rahul Patel",
    gender: "MALE",
    dob: "1988-11-23",
    mobile: "+91 9876543210",
    aadhaarLast4: "5521",
    address: "12, Navrangpura",
    state: "Gujarat",
    district: "Ahmedabad",
    pincode: "380009",
    isExistingPatient: true,
    existingClientId: "CL-014",
    status: "LINKED",
    createdAt: "2026-08-15",
    linkedRecordsCount: 3,
    dhisIncentiveEarned: 60,
  },
  {
    id: "ABDM-003",
    abhaNumber: "88-1920-4756-3390",
    abhaAddress: "ananya.reddy@abdm",
    name: "Ananya Reddy",
    gender: "FEMALE",
    dob: "1995-03-08",
    mobile: "+91 9123456789",
    aadhaarLast4: "3390",
    address: "Flat 201, Jubilee Hills",
    state: "Telangana",
    district: "Hyderabad",
    pincode: "500033",
    isExistingPatient: true,
    existingClientId: "CL-015",
    status: "VERIFIED",
    createdAt: "2026-08-20",
    linkedRecordsCount: 2,
    dhisIncentiveEarned: 40,
  },
  {
    id: "ABDM-004",
    abhaNumber: "55-9012-3847-1928",
    abhaAddress: "vikram.singh@abdm",
    name: "Vikram Singh",
    gender: "MALE",
    dob: "1984-07-19",
    mobile: "+91 9234567890",
    aadhaarLast4: "1928",
    address: "D-14, Hauz Khas",
    state: "Delhi",
    district: "New Delhi",
    pincode: "110016",
    isExistingPatient: true,
    existingClientId: "CL-016",
    status: "LINKED",
    createdAt: "2026-08-28",
    linkedRecordsCount: 4,
    dhisIncentiveEarned: 80,
  },
];

const INITIAL_CONSENTS: ConsentRecord[] = [
  {
    id: "c462ac38-784a-427d-9f6b-9addd570bd7c",
    patientName: "Priya Sharma",
    abhaAddress: "priya.sharma@abdm",
    requesterName: "MantraAssist Health Center (HIU)",
    purpose: "Care management",
    recordTypes: ["OPConsultation", "Prescription", "DiagnosticReport"],
    fromDate: "2026-03-08",
    toDate: "2026-09-08",
    datePresetLabel: "Last 6 months – Today",
    expiryDuration: "6 months",
    requestedOn: "08 Sept 26\n01:05 pm",
    lastUpdated: "08 Sept 26\n01:05 pm",
    sharedFor: "184 Days",
    expiresIn: "180 days\n08 Mar 27",
    status: "PENDING",
  },
  {
    id: "1a8d8a66-7b8b-4149-8d8d-301cc43612ab",
    patientName: "Rahul Patel",
    abhaAddress: "rahul.patel@abdm",
    requesterName: "MantraAssist Health Center (HIU)",
    purpose: "Care management",
    recordTypes: ["OPConsultation", "DiagnosticReport"],
    fromDate: "2026-03-08",
    toDate: "2026-09-08",
    datePresetLabel: "Last 6 months – Today",
    expiryDuration: "6 months",
    requestedOn: "08 Sept 26\n12:29 pm",
    lastUpdated: "08 Sept 26\n12:29 pm",
    sharedFor: "184 Days",
    expiresIn: "180 days\n08 Mar 27",
    status: "PENDING",
  },
  {
    id: "f68f5a98-9ed7-4bd0-a676-300386d2c166",
    patientName: "Ananya Reddy",
    abhaAddress: "ananya.reddy@abdm",
    requesterName: "MantraAssist Health Center (HIU)",
    purpose: "Care management",
    recordTypes: ["OPConsultation", "DischargeSummary"],
    fromDate: "2026-03-08",
    toDate: "2026-09-08",
    datePresetLabel: "Last 6 months – Today",
    expiryDuration: "6 months",
    requestedOn: "08 Sept 26\n12:29 pm",
    lastUpdated: "08 Sept 26\n12:29 pm",
    sharedFor: "184 Days",
    expiresIn: "180 days\n08 Mar 27",
    status: "GRANTED",
    grantedAt: "08 Sept 26 12:35 pm",
    expiresAt: "08 Mar 27",
    artefactId: "ARTF-883920",
  },
  {
    id: "44ea07dc-3504-4635-b554-4c0535f76722",
    patientName: "Vikram Singh",
    abhaAddress: "vikram.singh@abdm",
    requesterName: "MantraAssist Health Center (HIU)",
    purpose: "Care management",
    recordTypes: ["OPConsultation", "Prescription", "DiagnosticReport"],
    fromDate: "2026-03-08",
    toDate: "2026-09-08",
    datePresetLabel: "Last 6 months – Today",
    expiryDuration: "6 months",
    requestedOn: "08 Sept 26\n12:28 pm",
    lastUpdated: "08 Sept 26\n12:28 pm",
    sharedFor: "184 Days",
    expiresIn: "180 days\n08 Mar 27",
    status: "PENDING",
  },
];

const INITIAL_CARE_CONTEXTS: CareContext[] = [
  {
    id: "CC-101",
    patientAbhaAddress: "priya.sharma@abdm",
    facilityName: "MantraCare OPD Clinic",
    encounterType: "Consultation",
    date: "07 Sep 2026",
    doctorName: "Dr. A. K. Sharma",
    summary: "General consultation for seasonal fever & cough. Prescribed medication.",
    linked: true,
  },
  {
    id: "CC-102",
    patientAbhaAddress: "priya.sharma@abdm",
    facilityName: "Metropolis Diagnostics",
    encounterType: "Diagnostic Report",
    date: "04 Sep 2026",
    doctorName: "Dr. Mehta (Pathologist)",
    summary: "Complete Blood Count (CBC) & Lipid Profile Test Report.",
    linked: true,
  },
  {
    id: "CC-103",
    patientAbhaAddress: "rahul.patel@abdm",
    facilityName: "Sterling Hospital",
    encounterType: "Discharge Summary",
    date: "28 Aug 2026",
    doctorName: "Dr. R. V. Patel",
    summary: "Discharge summary following minor orthopaedic procedure.",
    linked: true,
  },
  {
    id: "CC-104",
    patientAbhaAddress: "ananya.reddy@abdm",
    facilityName: "Care Super Speciality",
    encounterType: "Prescription",
    date: "02 Sep 2026",
    doctorName: "Dr. N. Reddy",
    summary: "Cardiology routine check-up & refill prescription.",
    linked: false,
  },
];

const INITIAL_ACTIVITIES: M2Activity[] = [
  {
    id: "ACT-01",
    type: "LINK",
    title: "Health record care context linked to priya.sharma@abdm",
    timestamp: "Today · 10:42 AM",
    patientName: "Priya Sharma",
    status: "SUCCESS",
  },
  {
    id: "ACT-02",
    type: "CONSENT",
    title: "Patient consent granted for MantraAssist Health Center",
    timestamp: "Today · 10:35 AM",
    patientName: "Priya Sharma",
    status: "SUCCESS",
  },
  {
    id: "ACT-03",
    type: "DISCOVER",
    title: "Health records discovered across 2 connected facilities",
    timestamp: "Yesterday · 04:20 PM",
    patientName: "Rahul Patel",
    status: "SUCCESS",
  },
  {
    id: "ACT-04",
    type: "SHARE",
    title: "Encrypted FHIR health records package shared securely",
    timestamp: "Yesterday · 03:15 PM",
    patientName: "Priya Sharma",
    status: "SUCCESS",
  },
];

const INITIAL_MEDICAL_HISTORY: Record<string, MedicalHistoryItem[]> = {
  "priya.sharma@abdm": [
    {
      id: "MH-101",
      date: "07 Sep 2026",
      category: "Consultation",
      facilityName: "MantraCare OPD Clinic",
      doctorName: "Dr. A. K. Sharma (General Medicine)",
      diagnosis: "Acute Viral Upper Respiratory Infection",
      medications: [
        { name: "Paracetamol 650mg", dosage: "1 Tablet", frequency: "TID (Thrice a day)", duration: "5 Days" },
        { name: "Cetirizine 10mg", dosage: "1 Tablet", frequency: "HS (At Bedtime)", duration: "5 Days" },
        { name: "Vitamin C 500mg", dosage: "1 Tablet", frequency: "OD (Once a day)", duration: "10 Days" },
      ],
      vitals: { bp: "120/80 mmHg", pulse: "76 bpm", temp: "99.1 °F", weight: "58 kg" },
      summary: "Patient presented with 2-day history of mild fever and dry cough. Lungs clear.",
    },
    {
      id: "MH-102",
      date: "04 Sep 2026",
      category: "Diagnostic Report",
      facilityName: "Metropolis Diagnostics",
      doctorName: "Dr. Mehta (Pathologist)",
      labResults: [
        { testName: "Hemoglobin (Hb)", value: "13.2", unit: "g/dL", normalRange: "12.0 - 15.5" },
        { testName: "Total Leukocyte Count (TLC)", value: "7,800", unit: "/cumm", normalRange: "4,000 - 11,000" },
        { testName: "Platelet Count", value: "2.4", unit: "Lakh/cumm", normalRange: "1.5 - 4.5" },
        { testName: "Fasting Blood Sugar", value: "94", unit: "mg/dL", normalRange: "70 - 100" },
      ],
      summary: "Routine Blood Investigation - All values within normal physiological limits.",
    },
    {
      id: "MH-103",
      date: "18 Aug 2026",
      category: "Hospital Visit",
      facilityName: "Apollo Hospitals, Mumbai",
      doctorName: "Dr. S. K. Nambiar (Gastroenterologist)",
      diagnosis: "Mild Gastritis",
      medications: [
        { name: "Pantoprazole 40mg", dosage: "1 Capsule", frequency: "BBF (Before Food)", duration: "14 Days" },
      ],
      vitals: { bp: "118/78 mmHg", pulse: "72 bpm", temp: "98.4 °F", weight: "58.5 kg" },
      summary: "Outpatient visit for epigastric discomfort. Dietary counseling advised.",
    },
  ],
  "rahul.patel@abdm": [
    {
      id: "MH-201",
      date: "28 Aug 2026",
      category: "Discharge Summary",
      facilityName: "Sterling Hospital, Ahmedabad",
      doctorName: "Dr. R. V. Patel (Orthopedic Surgeon)",
      diagnosis: "Right Ankle Sprain (Grade II)",
      summary: "Patient admitted for minor ankle immobilisation. Cast applied. Advised 2 weeks bed rest.",
    },
    {
      id: "MH-202",
      date: "15 Aug 2026",
      category: "Consultation",
      facilityName: "Patel Clinic",
      doctorName: "Dr. H. Patel",
      diagnosis: "Right Ankle Pain",
      summary: "Initial consultation following sports injury.",
    },
  ],
};

class ABDMService {
  // --- M1 Core Records ---
  getRecords(): ABHAPatientRecord[] {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_RECORDS;
  }

  private saveRecords(records: ABHAPatientRecord[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      window.dispatchEvent(new CustomEvent("abdm_records_updated", { detail: records }));
    } catch {}
  }

  isUnlocked(): boolean {
    return sessionStorage.getItem(UNLOCKED_KEY) === "true";
  }

  setUnlocked(unlocked: boolean): void {
    sessionStorage.setItem(UNLOCKED_KEY, unlocked ? "true" : "false");
  }

  isAbhaVerified(): boolean {
    return sessionStorage.getItem(ABHA_VERIFIED_KEY) === "true";
  }

  setAbhaVerified(verified: boolean, activePatient?: ABHAPatientRecord): void {
    sessionStorage.setItem(ABHA_VERIFIED_KEY, verified ? "true" : "false");
    if (activePatient) {
      sessionStorage.setItem(ACTIVE_PATIENT_KEY, JSON.stringify(activePatient));
    } else if (!verified) {
      sessionStorage.removeItem(ACTIVE_PATIENT_KEY);
    }
    window.dispatchEvent(new CustomEvent("abdm_verification_updated", { detail: { verified, activePatient } }));
  }

  getActivePatient(): ABHAPatientRecord | null {
    try {
      const saved = sessionStorage.getItem(ACTIVE_PATIENT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }

  // --- M2 Health Records & Care Contexts ---
  getCareContexts(): CareContext[] {
    try {
      const saved = sessionStorage.getItem(CARE_CONTEXTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CARE_CONTEXTS;
  }

  async linkCareContext(patientAbhaAddress: string, contextIds: string[]): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const contexts = this.getCareContexts();
    const updated = contexts.map((c) =>
      contextIds.includes(c.id) ? { ...c, linked: true } : c
    );
    sessionStorage.setItem(CARE_CONTEXTS_KEY, JSON.stringify(updated));

    this.addActivity({
      type: "LINK",
      title: `Linked ${contextIds.length} care context(s) to ${patientAbhaAddress}`,
      patientName: patientAbhaAddress.split("@")[0],
      status: "SUCCESS",
    });

    return true;
  }

  async sendLinkingNotification(patientAbhaAddress: string): Promise<{ success: boolean; txnId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return {
      success: true,
      txnId: `NOTIF-${Date.now()}`,
    };
  }

  async discoverHealthRecords(patientAbhaAddress: string): Promise<DiscoveredFacility[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const allContexts = this.getCareContexts().filter(
      (c) => c.patientAbhaAddress.toLowerCase() === patientAbhaAddress.toLowerCase()
    );

    this.addActivity({
      type: "DISCOVER",
      title: `Discovered health records across connected facilities for ${patientAbhaAddress}`,
      patientName: patientAbhaAddress.split("@")[0],
      status: "SUCCESS",
    });

    return [
      {
        id: "FAC-01",
        facilityName: "MantraCare OPD Clinic",
        facilityType: "Clinic",
        availableRecordsCount: 2,
        careContexts: allContexts.slice(0, 2),
      },
      {
        id: "FAC-02",
        facilityName: "Metropolis Diagnostics Center",
        facilityType: "Diagnostic Center",
        availableRecordsCount: 1,
        careContexts: allContexts.slice(1, 2),
      },
      {
        id: "FAC-03",
        facilityName: "City General Hospital",
        facilityType: "Hospital",
        availableRecordsCount: 1,
        careContexts: [
          {
            id: "CC-99",
            patientAbhaAddress,
            facilityName: "City General Hospital",
            encounterType: "Hospital Visit",
            date: "12 Aug 2026",
            doctorName: "Dr. S. Nambiar",
            summary: "Outpatient clinical consultation & vitals record.",
            linked: false,
          },
        ],
      },
    ];
  }

  // --- M2 Consents ---
  getConsents(): ConsentRecord[] {
    try {
      const saved = sessionStorage.getItem(CONSENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CONSENTS;
  }

  private saveConsents(consents: ConsentRecord[]): void {
    try {
      sessionStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
      window.dispatchEvent(new CustomEvent("abdm_consents_updated", { detail: consents }));
    } catch {}
  }

  async createConsentRequest(params: Omit<ConsentRecord, "id" | "status">): Promise<ConsentRecord> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, "0")} Sept 26\n${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    
    // Generate UUID like in reference
    const uuid = "c" + Math.random().toString(36).substring(2, 9) + "-" + Math.random().toString(36).substring(2, 6) + "-427d-9f6b-" + Date.now().toString(36);

    const newConsent: ConsentRecord = {
      ...params,
      id: uuid,
      status: "PENDING", // Real pending state
      requestedOn: formattedDate,
      lastUpdated: formattedDate,
      sharedFor: "184 Days",
      expiresIn: "180 days\n08 Mar 27",
    };

    const consents = [newConsent, ...this.getConsents()];
    this.saveConsents(consents);

    this.addActivity({
      type: "CONSENT",
      title: `Consent request initiated for ${params.patientName} (${params.purpose})`,
      patientName: params.patientName,
      status: "PENDING",
    });

    return newConsent;
  }

  async approveConsent(consentId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const consents = this.getConsents().map((c) =>
      c.id === consentId
        ? {
            ...c,
            status: "GRANTED" as const,
            grantedAt: `${new Date().toISOString().split("T")[0]} 12:00 PM`,
            expiresAt: "2027-03-08",
            artefactId: `ARTF-${Math.floor(100000 + Math.random() * 900000)}`,
          }
        : c
    );
    this.saveConsents(consents);
    return true;
  }

  async revokeConsent(consentId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const consents = this.getConsents().map((c) =>
      c.id === consentId ? { ...c, status: "REVOKED" as const } : c
    );
    this.saveConsents(consents);
    return true;
  }

  verifyConsentStatus(patientAbhaAddress: string, purpose?: string): { valid: boolean; consent?: ConsentRecord; reason?: string } {
    const consents = this.getConsents();
    const match = consents.find(
      (c) =>
        c.abhaAddress.toLowerCase() === patientAbhaAddress.toLowerCase() &&
        c.status === "GRANTED"
    );

    if (!match) {
      return {
        valid: false,
        reason: "No valid or granted consent found for this patient. Patient authorization is required.",
      };
    }

    return {
      valid: true,
      consent: match,
    };
  }

  // --- M2 Data Transfer & Packaging ---
  async packageHealthData(recordIds: string[]): Promise<{ packageId: string; format: "FHIR R4"; recordsCount: number }> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return {
      packageId: `FHIR-PKG-${Date.now()}`,
      format: "FHIR R4",
      recordsCount: recordIds.length || 2,
    };
  }

  async transferHealthData(packageId: string, recipientName: string, patientAbhaAddress: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.addActivity({
      type: "SHARE",
      title: `Transferred encrypted FHIR package to ${recipientName}`,
      patientName: patientAbhaAddress.split("@")[0],
      status: "SUCCESS",
    });
    return true;
  }

  // --- M3 Medical History & HIU ---
  async getPatientMedicalHistory(patientAbhaAddress: string): Promise<MedicalHistoryItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const cleanAddr = patientAbhaAddress.toLowerCase();
    if (INITIAL_MEDICAL_HISTORY[cleanAddr]) {
      return INITIAL_MEDICAL_HISTORY[cleanAddr];
    }
    // Dynamic history fallback
    return [
      {
        id: `MH-DYN-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        category: "Consultation",
        facilityName: "Primary Health Center",
        doctorName: "Dr. Swati Kulkarni",
        diagnosis: "General Wellness & Vitals Check",
        summary: "Patient health records retrieved via authorized ABDM HIU gateway.",
      },
    ];
  }

  // --- Activities Audit Log ---
  getActivities(): M2Activity[] {
    try {
      const saved = sessionStorage.getItem(ACTIVITIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_ACTIVITIES;
  }

  addActivity(act: Omit<M2Activity, "id" | "timestamp"> & { timestamp?: string }): void {
    const newAct: M2Activity = {
      ...act,
      id: `ACT-${Date.now()}`,
      timestamp: act.timestamp || `Today · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };
    const current = this.getActivities();
    sessionStorage.setItem(ACTIVITIES_KEY, JSON.stringify([newAct, ...current]));
  }

  // --- Standard M1 API Pass-throughs ---
  async sendAadhaarOtp(aadhaarNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, "");
    if (cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
      throw new Error("Please enter a valid 12-digit Aadhaar number");
    }
    return {
      success: true,
      txnId: `TXN-${Date.now()}`,
      maskedMobile: "XXXXXX" + cleanAadhaar.slice(-4),
      message: "OTP sent successfully",
    };
  }

  async verifyAadhaarOtp(txnId: string, otp: string, aadhaarNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (otp !== "123456" && otp.length !== 6) {
      throw new Error("Invalid OTP (Demo code: 123456)");
    }
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, "");
    const last4 = cleanAadhaar.slice(-4) || "8899";
    return {
      success: true,
      tempToken: `TOKEN-${Date.now()}`,
      suggestedAbhaNumber: `91-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}-${last4}`,
      patientData: {
        name: "Devendra Verma",
        gender: "MALE" as const,
        dob: "1990-08-15",
        mobile: "+91 9811234567",
        aadhaarLast4: last4,
        state: "Maharashtra",
        district: "Mumbai Suburban",
        pincode: "400053",
        address: "Flat 402, Sunrise Residency, Andheri West",
      },
    };
  }

  async checkAbhaAddressAvailability(address: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const cleanAddress = address.toLowerCase().replace(/@abdm$/, "").trim();
    const existingRecords = this.getRecords();
    const isTaken = existingRecords.some((r) => r.abhaAddress.toLowerCase() === `${cleanAddress}@abdm`);
    return {
      available: !isTaken,
      suggestions: [`${cleanAddress}12@abdm`, `${cleanAddress}.health@abdm`, `${cleanAddress}99@abdm`],
    };
  }

  async createAbhaRecord(params: any): Promise<ABHAPatientRecord> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const fullAddress = params.abhaAddress.includes("@") ? params.abhaAddress : `${params.abhaAddress}@abdm`;
    const newRecord: ABHAPatientRecord = {
      id: `ABDM-${Date.now().toString().slice(-4)}`,
      abhaNumber: params.abhaNumber,
      abhaAddress: fullAddress,
      name: params.patientData.name,
      gender: params.patientData.gender,
      dob: params.patientData.dob,
      mobile: params.patientData.mobile,
      aadhaarLast4: params.patientData.aadhaarLast4,
      address: params.patientData.address,
      state: params.patientData.state,
      district: params.patientData.district,
      pincode: params.patientData.pincode,
      isExistingPatient: false,
      status: "LINKED",
      createdAt: new Date().toISOString().split("T")[0],
      linkedRecordsCount: 1,
      dhisIncentiveEarned: 20,
    };
    const records = [newRecord, ...this.getRecords()];
    this.saveRecords(records);
    return newRecord;
  }

  async verifyByAbhaNumber(abhaNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const cleanNumber = abhaNumber.replace(/[-\s]/g, "");
    const records = this.getRecords();
    const match = records.find((r) => r.abhaNumber.replace(/[-\s]/g, "") === cleanNumber);
    if (match) {
      return { found: true, patient: match, isExistingPatient: match.isExistingPatient, message: "Verified ABHA Record Found" };
    }
    const mock: ABHAPatientRecord = {
      id: `ABDM-VER-${Date.now().toString().slice(-4)}`,
      abhaNumber: abhaNumber,
      abhaAddress: `patient.${cleanNumber.slice(-4)}@abdm`,
      name: "Sunita Deshmukh",
      gender: "FEMALE",
      dob: "1989-04-12",
      mobile: "+91 9871122334",
      aadhaarLast4: cleanNumber.slice(-4),
      address: "204, Blossom Towers, Pune",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411001",
      isExistingPatient: false,
      status: "VERIFIED",
      createdAt: new Date().toISOString().split("T")[0],
      linkedRecordsCount: 0,
    };
    return { found: true, patient: mock, isExistingPatient: false, message: "Verified ABHA Profile Found" };
  }

  async verifyByAbhaAddress(abhaAddress: string) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const records = this.getRecords();
    const fullAddress = abhaAddress.includes("@") ? abhaAddress : `${abhaAddress}@abdm`;
    const match = records.find((r) => r.abhaAddress.toLowerCase() === fullAddress.toLowerCase());
    if (match) {
      return { found: true, patient: match, isExistingPatient: match.isExistingPatient, message: "ABHA Address Verified" };
    }
    const mock: ABHAPatientRecord = {
      id: `ABDM-VER-${Date.now().toString().slice(-4)}`,
      abhaNumber: "77-4819-2093-4412",
      abhaAddress: fullAddress,
      name: fullAddress.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      gender: "MALE",
      dob: "1993-06-25",
      mobile: "+91 9845112233",
      aadhaarLast4: "4412",
      address: "105, Green Glen Layout, Bengaluru",
      state: "Karnataka",
      district: "Bengaluru Urban",
      pincode: "560103",
      isExistingPatient: false,
      status: "VERIFIED",
      createdAt: new Date().toISOString().split("T")[0],
      linkedRecordsCount: 0,
    };
    return { found: true, patient: mock, isExistingPatient: false, message: "ABHA Address Verified" };
  }

  async sendMobileVerificationOtp(mobileNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { success: true, txnId: `TXN-MOB-${Date.now()}` };
  }

  async verifyMobileOtp(txnId: string, otp: string, mobileNumber: string) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const records = this.getRecords();
    const clean = mobileNumber.replace(/\D/g, "").slice(-10);
    const match = records.find((r) => r.mobile.replace(/\D/g, "").endsWith(clean));
    if (match) return { found: true, patient: match, isExistingPatient: match.isExistingPatient };
    const mock: ABHAPatientRecord = {
      id: `ABDM-VER-${Date.now().toString().slice(-4)}`,
      abhaNumber: "62-8391-4472-1920",
      abhaAddress: `patient.${clean.slice(-4)}@abdm`,
      name: "Ramesh Kulkarni",
      gender: "MALE",
      dob: "1982-01-10",
      mobile: `+91 ${clean}`,
      aadhaarLast4: "1920",
      address: "Plot 88, Kothrud",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411038",
      isExistingPatient: false,
      status: "VERIFIED",
      createdAt: new Date().toISOString().split("T")[0],
      linkedRecordsCount: 0,
    };
    return { found: true, patient: mock, isExistingPatient: false };
  }

  // --- My Records: Uploaded Medical Records Storage ---
  getUploadedRecords(): UploadedRecord[] {
    try {
      const saved = sessionStorage.getItem("abdm_uploaded_records");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "REC-001",
        title: "Discharge Summary",
        recordType: "Discharge Summary",
        dateFormatted: "-",
        dateRaw: "2026-09-08",
        monthGroup: "SEP 2026",
        tag: "No Tag added",
        status: "ANALYSING",
        previewUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "REC-002",
        title: "Invoice",
        recordType: "Invoice",
        dateFormatted: "-",
        dateRaw: "2026-09-08",
        monthGroup: "SEP 2026",
        tag: "No Tag added",
        status: "READY",
        previewUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80",
      },
      {
        id: "REC-003",
        title: "Lab Report",
        recordType: "Lab Report",
        dateFormatted: "28 Feb'26",
        dateRaw: "2026-02-28",
        monthGroup: "FEB 2026",
        tag: "No Tag added",
        status: "READY",
        previewUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80",
      },
    ];
  }

  saveUploadedRecords(records: UploadedRecord[]): void {
    try {
      sessionStorage.setItem("abdm_uploaded_records", JSON.stringify(records));
      window.dispatchEvent(new CustomEvent("abdm_uploaded_records_updated", { detail: records }));
    } catch {}
  }

  async addUploadedRecord(record: Omit<UploadedRecord, "id">): Promise<UploadedRecord> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const newRecord: UploadedRecord = {
      ...record,
      id: `REC-${Date.now().toString().slice(-4)}`,
    };
    const updated = [newRecord, ...this.getUploadedRecords()];
    this.saveUploadedRecords(updated);
    return newRecord;
  }

  async deleteUploadedRecord(id: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const updated = this.getUploadedRecords().filter((r) => r.id !== id);
    this.saveUploadedRecords(updated);
    return true;
  }

  // ═════════════════════════════════════════════════════════════════
  // ── VITALS & LAB RESULTS SERVICE LAYER (API-READY ABSTRACTION) ──
  // ═════════════════════════════════════════════════════════════════

  getPatientVitals(patientId?: string): PatientVitalEntry[] {
    try {
      const saved = sessionStorage.getItem(VITALS_STORAGE_KEY);
      if (saved) {
        const all: PatientVitalEntry[] = JSON.parse(saved);
        if (patientId) {
          return all.filter((v) => v.patientId === patientId || v.patientAbha === patientId);
        }
        return all;
      }
    } catch {}
    return [];
  }

  async saveVitals(payload: Omit<PatientVitalEntry, "id" | "createdAt">): Promise<PatientVitalEntry> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const newEntry: PatientVitalEntry = {
      ...payload,
      id: `VIT-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    const current = this.getPatientVitals();
    const updated = [newEntry, ...current];
    sessionStorage.setItem(VITALS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("abdm_vitals_updated", { detail: updated }));

    // Link into medical records stream as a typed record
    this.addUploadedRecord({
      title: `Vitals (${payload.recordedAt})`,
      recordType: "Diagnostic Report",
      dateFormatted: payload.recordedAt.split(",")[0] || "08 Sep'26",
      dateRaw: payload.recordedDateRaw?.split("T")[0] || "2026-09-08",
      monthGroup: "SEP 2026",
      tag: "Vitals Recorded",
      status: "READY",
      previewUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80",
    });

    this.addActivity({
      type: "VITALS",
      title: `Clinical vitals recorded (${newEntry.id}) for ${payload.patientName}`,
      patientName: payload.patientName,
      status: "SUCCESS",
    });

    return newEntry;
  }

  getPatientLabResults(patientId?: string): PatientLabResultRecord[] {
    try {
      const saved = sessionStorage.getItem(LAB_RESULTS_STORAGE_KEY);
      if (saved) {
        const all: PatientLabResultRecord[] = JSON.parse(saved);
        if (patientId) {
          return all.filter((l) => l.patientId === patientId || l.patientAbha === patientId);
        }
        return all;
      }
    } catch {}
    return [];
  }

  async saveLabResults(payload: Omit<PatientLabResultRecord, "id" | "createdAt">): Promise<PatientLabResultRecord> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const newEntry: PatientLabResultRecord = {
      ...payload,
      id: `LAB-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    const current = this.getPatientLabResults();
    const updated = [newEntry, ...current];
    sessionStorage.setItem(LAB_RESULTS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("abdm_labs_updated", { detail: updated }));

    // Link into medical records stream as a typed record
    this.addUploadedRecord({
      title: `Lab Results (${payload.totalFilled} tests, ${payload.recordedDate})`,
      recordType: "Lab Report",
      dateFormatted: payload.recordedDate || "08 Sep'26",
      dateRaw: payload.recordedDateRaw || "2026-09-08",
      monthGroup: "SEP 2026",
      tag: payload.totalOutOfRange > 0 ? `${payload.totalOutOfRange} Out of Range` : "All Normal",
      status: "READY",
      previewUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=400&q=80",
    });

    this.addActivity({
      type: "LAB",
      title: `Lab results recorded (${payload.totalFilled} tests) for ${payload.patientName}`,
      patientName: payload.patientName,
      status: "SUCCESS",
    });

    return newEntry;
  }
}

export const abdmService = new ABDMService();
