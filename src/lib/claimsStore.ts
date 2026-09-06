export type ClaimStatus =
  | "Draft"
  | "Ready to Submit"
  | "Submitted"
  | "Accepted"
  | "Under Review"
  | "Paid"
  | "Rejected";

export interface ClaimPayer {
  id: string;
  name: string;
  payerId: string; // EDI Payer ID (5-digit or alphanumeric)
  type: "Commercial" | "Medicare" | "Medicaid" | "Private";
  address?: string;
  contactPhone?: string;
}

export interface ClaimServiceLine {
  id: string;
  serviceDate: string;
  cptCode: string;
  description: string;
  modifier?: string;
  diagnosisPointer: string; // e.g. "A" or "A, B"
  units: number;
  chargeAmount: number; // rate per unit * units
}

export interface ClaimDiagnosisCode {
  pointer: "A" | "B" | "C" | "D";
  code: string;
  description: string;
}

export interface Claim {
  id: string;
  claimNumber: string; // e.g. CLM-84920
  patientId: string;
  patientName: string;
  patientDob: string;
  patientGender: "Male" | "Female" | "Other";
  patientAddress: string;
  patientPhone: string;
  insuredId: string; // Member / Policy ID
  groupNumber?: string;
  payer: ClaimPayer;
  
  // Linkages to existing Mantra modules
  appointmentId?: string;
  scribeSessionId?: string;
  serviceId?: string;

  // Clinical & Billing Provider Info (CMS-1500 Box 24J, 31, 32, 33)
  renderingProviderName: string;
  renderingProviderNpi: string;
  billingProviderName: string;
  billingProviderNpi: string;
  billingProviderTaxId: string; // EIN/SSN
  billingProviderAddress: string;
  placeOfService: string; // e.g. "11 - Office", "02 - Telehealth"

  // Medical coding
  serviceDate: string;
  diagnosisCodes: ClaimDiagnosisCode[];
  lines: ClaimServiceLine[];

  // Financials
  totalCharge: number;
  amountPaid: number;
  patientResponsibility?: number;
  contractualAdjustment?: number;

  // Lifecycle
  status: ClaimStatus;
  submissionMethod?: "clearinghouse" | "manual_cms1500";
  clearinghouseTrackingId?: string;
  clearinghouseBatchId?: string;
  clearinghouseResponseDate?: string;
  clearinghouseNotes?: string;
  rejectionReason?: string;
  ediControlNumber?: string;

  createdAt: string;
  submittedAt?: string;
  updatedAt: string;
}

export const POPULAR_PAYERS: ClaimPayer[] = [
  { id: "payer-bcbs", name: "Blue Cross Blue Shield", payerId: "00060", type: "Commercial", address: "PO Box 2624, Chicago, IL 60690", contactPhone: "1-800-262-2583" },
  { id: "payer-aetna", name: "Aetna Health Plans", payerId: "60054", type: "Commercial", address: "PO Box 14079, Lexington, KY 40512", contactPhone: "1-800-872-3862" },
  { id: "payer-uhc", name: "UnitedHealthcare (Optum)", payerId: "87726", type: "Commercial", address: "PO Box 30555, Salt Lake City, UT 84130", contactPhone: "1-877-842-3210" },
  { id: "payer-cigna", name: "Cigna Healthcare", payerId: "62308", type: "Commercial", address: "PO Box 182223, Chattanooga, TN 37422", contactPhone: "1-800-882-4462" },
  { id: "payer-medicare", name: "Medicare Part B (Noridian/Novitas)", payerId: "00400", type: "Medicare", address: "PO Box 6740, Fargo, ND 58108", contactPhone: "1-800-633-4227" },
  { id: "payer-medicaid", name: "State Medicaid Direct", payerId: "MCD01", type: "Medicaid", address: "PO Box 8800, Capital City, NY 12201", contactPhone: "1-800-541-2831" },
  { id: "payer-humana", name: "Humana Choice", payerId: "61101", type: "Commercial", address: "PO Box 14601, Lexington, KY 40512", contactPhone: "1-800-448-6262" },
];

export const CLAIMS_STORAGE_KEY = "mantra_claims_v1";
export const CLAIMS_CHANGED_EVENT = "mantra_claims_changed";

const SEED_CLAIMS: Claim[] = [
  {
    id: "clm-101",
    claimNumber: "CLM-2026-0041",
    patientId: "CL-001",
    patientName: "Sarah Johnson",
    patientDob: "1992-04-15",
    patientGender: "Female",
    patientAddress: "742 Evergreen Terr, Springfield, IL 62704",
    patientPhone: "+1 (555) 123-4567",
    insuredId: "BCBS-98421003",
    groupNumber: "GRP-8812",
    payer: POPULAR_PAYERS[0], // BCBS
    appointmentId: "apt-101",
    scribeSessionId: "scribe-101",
    renderingProviderName: "Dr. Priya Sharma",
    renderingProviderNpi: "1487920194",
    billingProviderName: "MantraCare Health Center LLC",
    billingProviderNpi: "1932840192",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    placeOfService: "11 - Office",
    serviceDate: "2026-08-24",
    diagnosisCodes: [
      { pointer: "A", code: "H25.11", description: "Age-related nuclear cataract, right eye" },
      { pointer: "B", code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    ],
    lines: [
      {
        id: "line-1",
        serviceDate: "2026-08-24",
        cptCode: "92004",
        description: "Comprehensive eye exam, new patient",
        diagnosisPointer: "A, B",
        units: 1,
        chargeAmount: 220.0,
      },
      {
        id: "line-2",
        serviceDate: "2026-08-24",
        cptCode: "76519",
        description: "Ophthalmic biometry A-scan with IOL calculation",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 185.0,
      },
    ],
    totalCharge: 405.0,
    amountPaid: 324.0,
    contractualAdjustment: 81.0,
    patientResponsibility: 0.0,
    status: "Paid",
    submissionMethod: "clearinghouse",
    clearinghouseTrackingId: "MTR-837P-992418-OK",
    clearinghouseBatchId: "BATCH-20260824-01",
    ediControlNumber: "000049182",
    createdAt: "2026-08-24T11:30:00.000Z",
    submittedAt: "2026-08-24T14:10:00.000Z",
    updatedAt: "2026-08-28T09:20:00.000Z",
  },
  {
    id: "clm-102",
    claimNumber: "CLM-2026-0042",
    patientId: "CL-002",
    patientName: "Michael Chen",
    patientDob: "1984-08-22",
    patientGender: "Male",
    patientAddress: "128 Willow Creek Rd, Naperville, IL 60540",
    patientPhone: "+1 (555) 234-5678",
    insuredId: "AET-44910281",
    groupNumber: "GRP-3310",
    payer: POPULAR_PAYERS[1], // Aetna
    appointmentId: "apt-102",
    scribeSessionId: "scribe-102",
    renderingProviderName: "Dr. Ananya Sen",
    renderingProviderNpi: "1629401923",
    billingProviderName: "MantraCare Health Center LLC",
    billingProviderNpi: "1932840192",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    placeOfService: "11 - Office",
    serviceDate: "2026-08-24",
    diagnosisCodes: [
      { pointer: "A", code: "J20.9", description: "Acute bronchitis, unspecified" },
      { pointer: "B", code: "I10", description: "Essential (primary) hypertension" },
    ],
    lines: [
      {
        id: "line-1",
        serviceDate: "2026-08-24",
        cptCode: "99214",
        description: "Office/outpatient visit, established patient, moderate MDM (30-39 min)",
        diagnosisPointer: "A, B",
        units: 1,
        chargeAmount: 175.0,
      },
      {
        id: "line-2",
        serviceDate: "2026-08-24",
        cptCode: "71046",
        description: "Radiologic examination, chest; 2 views",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 110.0,
      },
    ],
    totalCharge: 285.0,
    amountPaid: 0.0,
    status: "Submitted",
    submissionMethod: "clearinghouse",
    clearinghouseTrackingId: "MTR-837P-992811-PD",
    clearinghouseBatchId: "BATCH-20260824-02",
    ediControlNumber: "000049219",
    createdAt: "2026-08-24T12:00:00.000Z",
    submittedAt: "2026-08-24T15:00:00.000Z",
    updatedAt: "2026-08-24T15:00:00.000Z",
  },
  {
    id: "clm-103",
    claimNumber: "CLM-2026-0043",
    patientId: "CL-003",
    patientName: "Emily Davis",
    patientDob: "1988-11-03",
    patientGender: "Female",
    patientAddress: "510 Elmwood Ave, Oak Park, IL 60301",
    patientPhone: "+1 (555) 345-6789",
    insuredId: "UHC-77192038",
    payer: POPULAR_PAYERS[2], // UnitedHealthcare
    appointmentId: "apt-103",
    scribeSessionId: "scribe-103",
    renderingProviderName: "Dr. Rohan Mehta",
    renderingProviderNpi: "1839201948",
    billingProviderName: "MantraCare Health Center LLC",
    billingProviderNpi: "1932840192",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    placeOfService: "11 - Office",
    serviceDate: "2026-08-23",
    diagnosisCodes: [
      { pointer: "A", code: "M17.0", description: "Bilateral primary osteoarthritis of knee" },
    ],
    lines: [
      {
        id: "line-1",
        serviceDate: "2026-08-23",
        cptCode: "99213",
        description: "Office/outpatient visit, established patient, low MDM (20-29 min)",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 130.0,
      },
      {
        id: "line-2",
        serviceDate: "2026-08-23",
        cptCode: "97110",
        description: "Therapeutic exercises, 1 or more areas, each 15 minutes",
        diagnosisPointer: "A",
        units: 2,
        chargeAmount: 160.0,
      },
    ],
    totalCharge: 290.0,
    amountPaid: 0.0,
    status: "Accepted",
    submissionMethod: "clearinghouse",
    clearinghouseTrackingId: "MTR-837P-991730-AC",
    clearinghouseBatchId: "BATCH-20260823-01",
    ediControlNumber: "000049104",
    clearinghouseNotes: "999 Implementation Ack & 277CA Accepted for adjudication by UHC Payer Engine.",
    createdAt: "2026-08-23T14:20:00.000Z",
    submittedAt: "2026-08-23T16:00:00.000Z",
    updatedAt: "2026-08-24T08:15:00.000Z",
  },
  {
    id: "clm-104",
    claimNumber: "CLM-2026-0044",
    patientId: "CL-004",
    patientName: "Robert Wilson",
    patientDob: "1981-06-19",
    patientGender: "Male",
    patientAddress: "904 Lakewood Blvd, Evanston, IL 60201",
    patientPhone: "+1 (555) 456-7890",
    insuredId: "CIG-38910492",
    payer: POPULAR_PAYERS[3], // Cigna
    renderingProviderName: "Dr. Vikram Malhotra",
    renderingProviderNpi: "1394019283",
    billingProviderName: "MantraCare Health Center LLC",
    billingProviderNpi: "1932840192",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    placeOfService: "11 - Office",
    serviceDate: "2026-08-22",
    diagnosisCodes: [
      { pointer: "A", code: "F41.1", description: "Generalized anxiety disorder" },
    ],
    lines: [
      {
        id: "line-1",
        serviceDate: "2026-08-22",
        cptCode: "90834",
        description: "Psychotherapy, 45 minutes with patient",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 180.0,
      },
    ],
    totalCharge: 180.0,
    amountPaid: 0.0,
    status: "Ready to Submit",
    createdAt: "2026-08-22T10:00:00.000Z",
    updatedAt: "2026-08-22T10:00:00.000Z",
  },
  {
    id: "clm-105",
    claimNumber: "CLM-2026-0045",
    patientId: "CL-005",
    patientName: "Jessica Taylor",
    patientDob: "1995-02-14",
    patientGender: "Female",
    patientAddress: "320 N Michigan Ave, Chicago, IL 60601",
    patientPhone: "+1 (555) 567-8901",
    insuredId: "MC-8840192",
    payer: POPULAR_PAYERS[4], // Medicare
    renderingProviderName: "Dr. Priya Sharma",
    renderingProviderNpi: "1487920194",
    billingProviderName: "MantraCare Health Center LLC",
    billingProviderNpi: "1932840192",
    billingProviderTaxId: "XX-XXX4912",
    billingProviderAddress: "100 Medical Center Way, Suite 400, Chicago, IL 60601",
    placeOfService: "11 - Office",
    serviceDate: "2026-08-21",
    diagnosisCodes: [
      { pointer: "A", code: "H40.1130", description: "Primary open-angle glaucoma, bilateral, unspecified stage" },
    ],
    lines: [
      {
        id: "line-1",
        serviceDate: "2026-08-21",
        cptCode: "92014",
        description: "Comprehensive eye exam, established patient",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 175.0,
      },
      {
        id: "line-2",
        serviceDate: "2026-08-21",
        cptCode: "92083",
        description: "Visual field examination, bilateral, extended",
        diagnosisPointer: "A",
        units: 1,
        chargeAmount: 120.0,
      },
    ],
    totalCharge: 295.0,
    amountPaid: 0.0,
    status: "Draft",
    createdAt: "2026-08-21T15:30:00.000Z",
    updatedAt: "2026-08-21T15:30:00.000Z",
  }
];

export function getStoredClaims(): Claim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(SEED_CLAIMS));
      return SEED_CLAIMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_CLAIMS;
  } catch (e) {
    console.warn("Failed to load claims from localStorage:", e);
    return SEED_CLAIMS;
  }
}

export function saveClaim(claim: Claim): void {
  const current = getStoredClaims();
  const index = current.findIndex((c) => c.id === claim.id);
  let updated: Claim[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...claim, updatedAt: new Date().toISOString() };
  } else {
    updated = [claim, ...current];
  }
  try {
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CLAIMS_CHANGED_EVENT, { detail: claim }));
  } catch (e) {
    console.error("Failed to persist claim:", e);
  }
}

export function deleteClaim(claimId: string): void {
  const current = getStoredClaims();
  const updated = current.filter((c) => c.id !== claimId);
  try {
    localStorage.setItem(CLAIMS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CLAIMS_CHANGED_EVENT, { detail: { id: claimId, deleted: true } }));
  } catch (e) {
    console.error("Failed to delete claim:", e);
  }
}

export function generateClaimNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CLM-${year}-${randomSuffix}`;
}

export function submitClaimElectronically(claimId: string): Promise<Claim> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const current = getStoredClaims();
      const claim = current.find((c) => c.id === claimId);
      if (!claim) {
        reject(new Error("Claim not found"));
        return;
      }

      const trackingId = `MTR-837P-${Math.floor(100000 + Math.random() * 900000)}-OK`;
      const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`;
      const ediControl = `0000${Math.floor(10000 + Math.random() * 90000)}`;

      const updated: Claim = {
        ...claim,
        status: "Submitted",
        submissionMethod: "clearinghouse",
        clearinghouseTrackingId: trackingId,
        clearinghouseBatchId: batchId,
        ediControlNumber: ediControl,
        submittedAt: new Date().toISOString(),
        clearinghouseResponseDate: new Date().toISOString(),
        clearinghouseNotes: "Claim accepted by Mantra Clearinghouse Gateway (EDI 837P ANSI ASC X12). 999 Functional Ack generated.",
        updatedAt: new Date().toISOString(),
      };

      saveClaim(updated);
      resolve(updated);
    }, 1200);
  });
}
