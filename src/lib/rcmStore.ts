/**
 * MantraAssist Revenue Cycle Management (RCM) — Lib Store
 * Backed by sessionStorage + RCM_STORE_EVENT event dispatch
 * Modelled on processLogsStore.ts and clientProcessState.ts
 */

import {
  EligibilityCheck,
  EligibilityStatus,
  Encounter,
  Claim,
  DenialClusterGroup,
  RemittanceLine,
  PatientArBalance,
  ScrubRule,
  FeeScheduleItem,
  PriorAuthRecord,
  CredentialingRecord,
  PayerPerformanceRow,
  PostingAction,
} from "../app/types/rcmTypes";

export const RCM_STORE_EVENT = "rcm_store_updated";
const STORAGE_KEY = "mantra_rcm_store_v1";

export interface RcmStoreState {
  eligibilityChecks: EligibilityCheck[];
  encounters: Encounter[];
  claims: Claim[];
  denialClusters: DenialClusterGroup[];
  remittanceLines: RemittanceLine[];
  patientBalances: PatientArBalance[];
  scrubRules: ScrubRule[];
  feeSchedule: FeeScheduleItem[];
  priorAuths: PriorAuthRecord[];
  credentialing: CredentialingRecord[];
  payerPerformance: PayerPerformanceRow[];
}

// ─── Initial Mock Datasets ───────────────────────────────────────────────────

const initialEligibilityChecks: EligibilityCheck[] = [
  {
    id: "ELG-001",
    clientId: "CL-001",
    clientName: "Sarah Johnson",
    appointmentId: "APT-101",
    appointmentDate: "2026-09-04",
    payerName: "Blue Cross Blue Shield",
    memberId: "BCBS-99218274",
    status: "active",
    checkedAt: "2026-09-03T08:00:00Z",
    copayAmount: 25,
    deductibleRemaining: 250,
    source: "auto",
  },
  {
    id: "ELG-002",
    clientId: "CL-002",
    clientName: "Michael Chen",
    appointmentId: "APT-102",
    appointmentDate: "2026-09-04",
    payerName: "Aetna Health",
    memberId: "AET-55421098",
    status: "inconclusive",
    checkedAt: "2026-09-03T08:00:00Z",
    source: "auto",
    inconclusiveReason: "Subscriber DOB mismatch between clinic records and payer registry",
  },
  {
    id: "ELG-003",
    clientId: "CL-003",
    clientName: "Emily Davis",
    appointmentId: "APT-103",
    appointmentDate: "2026-09-04",
    payerName: "UnitedHealthcare",
    memberId: "UHC-10029384",
    status: "active",
    checkedAt: "2026-09-03T08:00:00Z",
    copayAmount: 30,
    deductibleRemaining: 0,
    source: "auto",
  },
  {
    id: "ELG-004",
    clientId: "CL-006",
    clientName: "David Martinez",
    appointmentId: "APT-104",
    appointmentDate: "2026-09-05",
    payerName: "Cigna",
    memberId: "CGN-88129034",
    status: "inactive",
    checkedAt: "2026-09-03T08:00:00Z",
    source: "auto",
    inconclusiveReason: "Coverage terminated on 2026-08-31. Contact patient for updated insurance.",
  },
  {
    id: "ELG-005",
    clientId: "CL-013",
    clientName: "Priya Sharma",
    appointmentId: "APT-105",
    appointmentDate: "2026-09-05",
    payerName: "Medicare Part B",
    memberId: "MED-49102847",
    status: "active",
    checkedAt: "2026-09-03T08:00:00Z",
    copayAmount: 0,
    deductibleRemaining: 45,
    source: "auto",
  },
  {
    id: "ELG-006",
    clientId: "CL-018",
    clientName: "Arjun Desai",
    appointmentId: "APT-106",
    appointmentDate: "2026-09-06",
    payerName: "Self-Pay",
    status: "self_pay",
    checkedAt: "2026-09-03T08:00:00Z",
    source: "auto",
  },
];

const initialEncounters: Encounter[] = [
  {
    id: "ENC-2026-4401",
    clientId: "CL-001",
    clientName: "Sarah Johnson",
    appointmentId: "APT-088",
    appointmentTitle: "Follow-up Consultation",
    providerName: "Dr. Amanda Clark",
    serviceDate: "2026-09-02",
    cptCodes: ["99214", "90834"],
    diagnosisCodes: ["F41.1", "Z73.0"],
    documentationLocked: true,
    documentationSource: "scribe",
    status: "billed",
    totalCharges: 320,
    claimIds: ["CLM-2026-8801"],
  },
  {
    id: "ENC-2026-4402",
    clientId: "CL-002",
    clientName: "Michael Chen",
    appointmentId: "APT-089",
    appointmentTitle: "Physical Therapy Assessment",
    providerName: "Dr. Robert Wilson",
    serviceDate: "2026-09-02",
    cptCodes: ["97110", "97140"],
    diagnosisCodes: ["M54.5"],
    documentationLocked: false,
    documentationSource: "manual",
    status: "pending_documentation",
    totalCharges: 250,
    claimIds: [],
    daysWaitingDocs: 2,
    notes: "Awaiting therapist's final range-of-motion signature",
  },
  {
    id: "ENC-2026-4403",
    clientId: "CL-007",
    clientName: "Lisa Anderson",
    appointmentId: "APT-090",
    appointmentTitle: "Comprehensive Wellness Exam",
    providerName: "Dr. Amanda Clark",
    serviceDate: "2026-09-01",
    cptCodes: ["99395"],
    diagnosisCodes: ["Z00.00"],
    documentationLocked: true,
    documentationSource: "scribe",
    status: "ready_to_bill",
    totalCharges: 275,
    claimIds: ["CLM-2026-8802"],
  },
  {
    id: "ENC-2026-4404",
    clientId: "CL-014",
    clientName: "Rahul Patel",
    appointmentId: "APT-091",
    appointmentTitle: "Medication Review",
    providerName: "Dr. David Martinez",
    serviceDate: "2026-08-30",
    cptCodes: ["99213"],
    diagnosisCodes: ["I10"],
    documentationLocked: false,
    documentationSource: "manual",
    status: "pending_documentation",
    totalCharges: 165,
    claimIds: [],
    daysWaitingDocs: 4,
    notes: "Attending signature missing on paper chart",
  },
  {
    id: "ENC-2026-4405",
    clientId: "CL-021",
    clientName: "Deepika Nair",
    appointmentId: "APT-092",
    appointmentTitle: "Annual Preventive Visit",
    providerName: "Dr. Amanda Clark",
    serviceDate: "2026-08-28",
    cptCodes: ["99392", "99401"],
    diagnosisCodes: ["Z00.129"],
    documentationLocked: true,
    documentationSource: "manual",
    status: "reconciled",
    totalCharges: 310,
    claimIds: ["CLM-2026-8803"],
  },
];

const initialClaims: Claim[] = [
  {
    id: "CLM-2026-8801",
    encounterId: "ENC-2026-4401",
    clientId: "CL-001",
    clientName: "Sarah Johnson",
    payerName: "Blue Cross Blue Shield",
    memberId: "BCBS-99218274",
    providerName: "Dr. Amanda Clark",
    cptCodes: ["99214", "90834"],
    diagnosisCodes: ["F41.1", "Z73.0"],
    serviceDate: "2026-09-02",
    submittedAt: "2026-09-02T16:00:00Z",
    status: "in_adjudication",
    billedAmount: 320,
    allowedAmount: 260,
    timelyFilingDeadline: "2026-12-01",
    timelyDaysRemaining: 89,
    notes: [
      {
        id: "note-1",
        createdAt: "2026-09-02T16:00:00Z",
        author: "System (EDI)",
        content: "Electronic 837P claim package generated and transmitted to clearinghouse.",
      },
      {
        id: "note-2",
        createdAt: "2026-09-02T16:15:00Z",
        author: "Clearinghouse",
        content: "Payer accepted 277 acknowledgement received. Adjudication in progress.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8802",
    encounterId: "ENC-2026-4403",
    clientId: "CL-007",
    clientName: "Lisa Anderson",
    payerName: "Aetna Health",
    memberId: "AET-99321487",
    providerName: "Dr. Amanda Clark",
    cptCodes: ["99395"],
    diagnosisCodes: ["Z00.00"],
    serviceDate: "2026-09-01",
    status: "scrubbing",
    billedAmount: 275,
    timelyFilingDeadline: "2026-11-30",
    timelyDaysRemaining: 88,
    scrubIssues: [
      {
        id: "scrub-1",
        severity: "warning",
        ruleId: "R-002",
        title: "Preventive Visit Frequency Threshold",
        description: "Patient had preventive exam 99395 recorded 11 months ago (12-month interval required by Aetna commercial plan).",
        suggestedAction: "Confirm exact date of previous annual exam or append modifier 25 if distinct E&M problem addressed.",
      },
    ],
    notes: [
      {
        id: "note-3",
        createdAt: "2026-09-01T18:00:00Z",
        author: "AI Rules Engine",
        isAi: true,
        content: "Pre-submission scrub detected 1 warning condition. Human confirmation needed prior to transmission.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8804",
    encounterId: "ENC-2026-4406",
    clientId: "CL-008",
    clientName: "James Taylor",
    payerName: "UnitedHealthcare",
    memberId: "UHC-99211029",
    providerName: "Dr. David Martinez",
    cptCodes: ["99215"],
    diagnosisCodes: ["I25.10"],
    serviceDate: "2026-08-20",
    status: "rejected",
    billedAmount: 285,
    timelyFilingDeadline: "2026-09-19",
    timelyDaysRemaining: 16,
    faultAttribution: "site_action_required",
    rejectionReason: "Clearinghouse 277CA: Rendering Provider NPI 1928374650 not recognized by payer clearinghouse portal. Missing enrollment record.",
    notes: [
      {
        id: "note-4",
        createdAt: "2026-08-21T09:30:00Z",
        author: "Clearinghouse",
        content: "Rejected pre-adjudication. Claim was never delivered to payer adjudication engine.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8805",
    encounterId: "ENC-2026-4407",
    clientId: "CL-011",
    clientName: "Jennifer White",
    payerName: "Cigna",
    memberId: "CGN-33491028",
    providerName: "Dr. Robert Wilson",
    cptCodes: ["99214", "97110"],
    diagnosisCodes: ["M54.2"],
    serviceDate: "2026-08-15",
    status: "rejected",
    billedAmount: 310,
    timelyFilingDeadline: "2026-09-14",
    timelyDaysRemaining: 11,
    faultAttribution: "platform_responsibility",
    rejectionReason: "EDI Formatter Syntax Error: Field 24J segment missing qualifier 1D in clearinghouse outbound batch envelope.",
    notes: [
      {
        id: "note-5",
        createdAt: "2026-08-16T11:00:00Z",
        author: "Clearinghouse",
        content: "Envelope syntax error. Platform engineering ticket auto-filed. SLA escalation timer active.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8806",
    encounterId: "ENC-2026-4408",
    clientId: "CL-003",
    clientName: "Emily Davis",
    payerName: "Blue Cross Blue Shield",
    memberId: "BCBS-44910284",
    providerName: "Dr. Amanda Clark",
    cptCodes: ["99214"],
    diagnosisCodes: ["E11.9"],
    serviceDate: "2026-08-10",
    status: "denied",
    billedAmount: 220,
    allowedAmount: 0,
    paidAmount: 0,
    timelyFilingDeadline: "2026-11-08",
    timelyDaysRemaining: 66,
    denialCarc: "CO-16",
    denialCarcDescription: "Claim lacks information or has submission/billing error which is needed for adjudication.",
    denialRarcs: ["N382", "M127"],
    denialRarcDescriptions: [
      "Missing/incomplete/invalid patient identifier or date of service detail",
      "Missing secondary diagnostic indicator pointer",
    ],
    faultAttribution: "site_action_required",
    notes: [
      {
        id: "note-6",
        createdAt: "2026-08-18T14:20:00Z",
        author: "Remittance 835",
        content: "ERA received: Adjudicated with zero allowance. CARC CO-16 applied.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8807",
    encounterId: "ENC-2026-4409",
    clientId: "CL-009",
    clientName: "Amanda Clark",
    payerName: "Aetna Health",
    memberId: "AET-22194830",
    providerName: "Dr. David Martinez",
    cptCodes: ["90837"],
    diagnosisCodes: ["F32.1"],
    serviceDate: "2026-08-08",
    status: "denied",
    billedAmount: 240,
    allowedAmount: 0,
    paidAmount: 0,
    timelyFilingDeadline: "2026-11-06",
    timelyDaysRemaining: 64,
    denialCarc: "CO-197",
    denialCarcDescription: "Precertification/authorization/notification/pre-treatment absent.",
    faultAttribution: "site_action_required",
    notes: [
      {
        id: "note-7",
        createdAt: "2026-08-16T10:15:00Z",
        author: "Remittance 835",
        content: "Denied for absent prior auth. Check clinical documents for retro-auth eligibility.",
      },
    ],
    source: "native",
  },
  {
    id: "CLM-2026-8803",
    encounterId: "ENC-2026-4405",
    clientId: "CL-021",
    clientName: "Deepika Nair",
    payerName: "Blue Cross Blue Shield",
    memberId: "BCBS-99102834",
    providerName: "Dr. Amanda Clark",
    cptCodes: ["99392", "99401"],
    diagnosisCodes: ["Z00.129"],
    serviceDate: "2026-08-28",
    status: "paid",
    billedAmount: 310,
    allowedAmount: 275,
    paidAmount: 250,
    patientResponsibility: 25,
    timelyFilingDeadline: "2026-11-26",
    timelyDaysRemaining: 84,
    notes: [
      {
        id: "note-8",
        createdAt: "2026-09-01T12:00:00Z",
        author: "Remittance 835",
        content: "Payment of $250.00 posted via ERA Check #CHK-881290. Copay $25.00 shifted to PR.",
      },
    ],
    source: "native",
  },
];

const initialDenialClusters: DenialClusterGroup[] = [
  {
    id: "DCLUST-BCBS-CO16",
    payerName: "Blue Cross Blue Shield",
    carc: {
      code: "CO-16",
      description: "Claim lacks information or has submission/billing error which is needed for adjudication.",
    },
    rarcs: [
      { code: "N382", description: "Missing/incomplete/invalid patient identifier detail" },
      { code: "M127", description: "Missing secondary diagnostic indicator pointer" },
    ],
    totalAmountAtRisk: 1480,
    claimCount: 6,
    priority: "critical",
    suggestedFixSummary: "Payer requires 8-digit member ID formatting and primary diagnosis pointer (Box 24E) linked directly to line item 1.",
    appealDraftTemplate:
      "Dear Blue Cross Blue Shield Claims Adjudication Committee,\n\nWe are submitting corrected billing details for the enclosed cluster of claims denied under CARC CO-16. All patient identifiers and diagnosis pointer linkages have been verified against active policy records.\n\nPlease reprocess for adjudication under standard in-network contract terms.",
    claims: [
      {
        claimId: "CLM-2026-8806",
        clientId: "CL-003",
        clientName: "Emily Davis",
        encounterId: "ENC-2026-4409",
        providerName: "Dr. Amanda Clark",
        serviceDate: "2026-08-10",
        amount: 220,
        timelyFilingDeadline: "2026-11-08",
        timelyDaysRemaining: 66,
        priorityScore: 92,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8790",
        clientId: "CL-015",
        clientName: "Ananya Reddy",
        encounterId: "ENC-2026-4380",
        providerName: "Dr. Amanda Clark",
        serviceDate: "2026-08-05",
        amount: 260,
        timelyFilingDeadline: "2026-11-03",
        timelyDaysRemaining: 61,
        priorityScore: 88,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8785",
        clientId: "CL-019",
        clientName: "Kavya Iyer",
        encounterId: "ENC-2026-4375",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-08-02",
        amount: 250,
        timelyFilingDeadline: "2026-10-31",
        timelyDaysRemaining: 58,
        priorityScore: 85,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8772",
        clientId: "CL-024",
        clientName: "Fatima Hassan",
        encounterId: "ENC-2026-4360",
        providerName: "Dr. Robert Wilson",
        serviceDate: "2026-07-28",
        amount: 250,
        timelyFilingDeadline: "2026-10-26",
        timelyDaysRemaining: 53,
        priorityScore: 80,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8761",
        clientId: "CL-027",
        clientName: "Youssef Said",
        encounterId: "ENC-2026-4351",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-07-25",
        amount: 250,
        timelyFilingDeadline: "2026-10-23",
        timelyDaysRemaining: 50,
        priorityScore: 78,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8750",
        clientId: "CL-029",
        clientName: "Charlotte Evans",
        encounterId: "ENC-2026-4340",
        providerName: "Dr. Amanda Clark",
        serviceDate: "2026-07-20",
        amount: 250,
        timelyFilingDeadline: "2026-10-18",
        timelyDaysRemaining: 45,
        priorityScore: 75,
        status: "denied",
      },
    ],
    status: "denied",
    lastUpdated: "2026-09-02T18:00:00Z",
  },
  {
    id: "DCLUST-AET-CO197",
    payerName: "Aetna Health",
    carc: {
      code: "CO-197",
      description: "Precertification/authorization/notification/pre-treatment absent.",
    },
    rarcs: [
      { code: "N54", description: "Prior authorization number missing or invalid on claim" },
    ],
    totalAmountAtRisk: 720,
    claimCount: 3,
    priority: "high",
    suggestedFixSummary: "Check if retro-authorization was granted within 14 days of service date. If granted, attach authorization reference code.",
    appealDraftTemplate:
      "Dear Aetna Prior Authorization Department,\n\nWe request a retro-authorization review for the attached claims. Medical records demonstrating acute necessity have been appended to this correspondence.\n\nThank you for your prompt reconsideration.",
    claims: [
      {
        claimId: "CLM-2026-8807",
        clientId: "CL-009",
        clientName: "Amanda Clark",
        encounterId: "ENC-2026-4409",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-08-08",
        amount: 240,
        timelyFilingDeadline: "2026-11-06",
        timelyDaysRemaining: 64,
        priorityScore: 84,
        status: "denied",
      },
      {
        claimId: "CLM-2026-8798",
        clientId: "CL-023",
        clientName: "Ahmed Al-Mansoori",
        encounterId: "ENC-2026-4395",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-08-01",
        amount: 240,
        timelyFilingDeadline: "2026-10-30",
        timelyDaysRemaining: 57,
        priorityScore: 80,
        status: "under_review",
      },
      {
        claimId: "CLM-2026-8779",
        clientId: "CL-025",
        clientName: "Omar Al-Rashid",
        encounterId: "ENC-2026-4370",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-07-22",
        amount: 240,
        timelyFilingDeadline: "2026-10-20",
        timelyDaysRemaining: 47,
        priorityScore: 74,
        status: "denied",
      },
    ],
    status: "under_review",
    lastUpdated: "2026-09-01T15:30:00Z",
  },
  {
    id: "DCLUST-UHC-CO97",
    payerName: "UnitedHealthcare",
    carc: {
      code: "CO-97",
      description: "Payment is included in allowance for another service/procedure already adjudicated.",
    },
    rarcs: [
      { code: "M15", description: "Separately identifiable E&M service requires modifier 25" },
    ],
    totalAmountAtRisk: 580,
    claimCount: 4,
    priority: "standard",
    suggestedFixSummary: "Append modifier 25 to E&M CPT code 99213 to certify service was significant and separately identifiable from therapy.",
    appealDraftTemplate:
      "Dear UnitedHealthcare Reprocessing Unit,\n\nWe enclose corrected claims appending modifier 25 to CPT 99213 as documented by distinct SOAP clinical notes attached. Reprocess for separate allowance.",
    claims: [
      {
        claimId: "CLM-2026-8766",
        clientId: "CL-014",
        clientName: "Rahul Patel",
        encounterId: "ENC-2026-4355",
        providerName: "Dr. David Martinez",
        serviceDate: "2026-07-15",
        amount: 145,
        timelyFilingDeadline: "2026-10-13",
        timelyDaysRemaining: 40,
        priorityScore: 70,
        status: "resubmitted",
      },
      {
        claimId: "CLM-2026-8755",
        clientId: "CL-018",
        clientName: "Arjun Desai",
        encounterId: "ENC-2026-4342",
        providerName: "Dr. Robert Wilson",
        serviceDate: "2026-07-10",
        amount: 145,
        timelyFilingDeadline: "2026-10-08",
        timelyDaysRemaining: 35,
        priorityScore: 68,
        status: "resubmitted",
      },
      {
        claimId: "CLM-2026-8742",
        clientId: "CL-008",
        clientName: "James Taylor",
        encounterId: "ENC-2026-4330",
        providerName: "Dr. Amanda Clark",
        serviceDate: "2026-07-02",
        amount: 145,
        timelyFilingDeadline: "2026-09-30",
        timelyDaysRemaining: 27,
        priorityScore: 65,
        status: "reconciled",
      },
      {
        claimId: "CLM-2026-8730",
        clientId: "CL-001",
        clientName: "Sarah Johnson",
        encounterId: "ENC-2026-4318",
        providerName: "Dr. Amanda Clark",
        serviceDate: "2026-06-28",
        amount: 145,
        timelyFilingDeadline: "2026-09-26",
        timelyDaysRemaining: 23,
        priorityScore: 62,
        status: "reconciled",
      },
    ],
    status: "resubmitted",
    lastUpdated: "2026-08-30T11:00:00Z",
  },
];

const initialRemittanceLines: RemittanceLine[] = [
  {
    id: "REM-2026-101",
    claimId: "CLM-2026-8803",
    clientId: "CL-021",
    clientName: "Deepika Nair",
    payerName: "Blue Cross Blue Shield",
    serviceDate: "2026-08-28",
    billedAmount: 310,
    paidAmount: 250,
    patientResponsibilityAmount: 25,
    adjustments: [
      { reasonCode: "CO-45", amount: 35, note: "Contractual fee schedule adjustment" },
    ],
    postingAction: "push_to_pr",
    source: "era_835",
    status: "confirmed",
    receivedAt: "2026-09-01T09:00:00Z",
    postedAt: "2026-09-01T12:00:00Z",
    checkNumber: "CHK-881290",
  },
  {
    id: "REM-2026-102",
    claimId: "CLM-2026-8795",
    clientId: "CL-002",
    clientName: "Michael Chen",
    payerName: "Aetna Health",
    serviceDate: "2026-08-25",
    billedAmount: 290,
    paidAmount: 210,
    patientResponsibilityAmount: 40,
    adjustments: [
      { reasonCode: "CO-45", amount: 40, note: "Fee maximum allowance adjustment" },
    ],
    source: "era_835",
    status: "pending_review",
    receivedAt: "2026-09-02T14:30:00Z",
    checkNumber: "CHK-992144",
  },
  {
    id: "REM-2026-103",
    claimId: "CLM-2026-8780",
    clientId: "CL-006",
    clientName: "David Martinez",
    payerName: "Cigna",
    serviceDate: "2026-08-18",
    billedAmount: 275,
    paidAmount: 275,
    patientResponsibilityAmount: 0,
    adjustments: [],
    postingAction: "write_off_pr",
    source: "manual_eob",
    status: "pending_review",
    receivedAt: "2026-09-02T16:00:00Z",
    checkNumber: "EFT-332190",
  },
  {
    id: "REM-2026-104",
    claimId: "CLM-2026-8770",
    clientId: "CL-013",
    clientName: "Priya Sharma",
    payerName: "Medicare Part B",
    serviceDate: "2026-08-12",
    billedAmount: 210,
    paidAmount: 165,
    patientResponsibilityAmount: 45,
    adjustments: [
      { reasonCode: "CO-45", amount: 0, note: "Unbalanced: Negative remainder ($10) detected" },
    ],
    source: "portal_check",
    status: "pending_review",
    receivedAt: "2026-09-03T10:00:00Z",
    holdReason: "Negative balance detected — manual verification required before posting",
  },
];

const initialPatientBalances: PatientArBalance[] = [
  {
    id: "PBAL-001",
    clientId: "CL-021",
    clientName: "Deepika Nair",
    clientEmail: "deepika.nair@healthcare.com",
    clientPhone: "+1 (555) 234-5678",
    primaryPayer: "Blue Cross Blue Shield",
    invoiceableBalance: 25,
    nonInvoiceableBalance: 0,
    totalBalance: 25,
    hasActiveClawback: false,
    activeDenialCount: 0,
    agingBucket: "0-30",
    lastStatementDate: "2026-09-01",
    statementCount: 1,
    linkedClaimIds: ["CLM-2026-8803"],
    linkedEncounterIds: ["ENC-2026-4405"],
  },
  {
    id: "PBAL-002",
    clientId: "CL-003",
    clientName: "Emily Davis",
    clientEmail: "emily.davis@healthcare.com",
    clientPhone: "+1 (555) 345-6789",
    primaryPayer: "Blue Cross Blue Shield",
    invoiceableBalance: 0,
    nonInvoiceableBalance: 220,
    totalBalance: 220,
    hasActiveClawback: false,
    activeDenialCount: 1,
    agingBucket: "31-60",
    statementCount: 0,
    linkedClaimIds: ["CLM-2026-8806"],
    linkedEncounterIds: ["ENC-2026-4409"],
  },
  {
    id: "PBAL-003",
    clientId: "CL-009",
    clientName: "Amanda Clark",
    clientEmail: "amanda.clark@healthcare.com",
    clientPhone: "+1 (555) 456-7890",
    primaryPayer: "Aetna Health",
    invoiceableBalance: 0,
    nonInvoiceableBalance: 240,
    totalBalance: 240,
    hasActiveClawback: false,
    activeDenialCount: 1,
    agingBucket: "61-90",
    statementCount: 0,
    linkedClaimIds: ["CLM-2026-8807"],
    linkedEncounterIds: ["ENC-2026-4409"],
  },
  {
    id: "PBAL-004",
    clientId: "CL-008",
    clientName: "James Taylor",
    clientEmail: "james.taylor@healthcare.com",
    clientPhone: "+1 (555) 567-8901",
    primaryPayer: "UnitedHealthcare",
    invoiceableBalance: 120,
    nonInvoiceableBalance: 0,
    totalBalance: 120,
    hasActiveClawback: false,
    activeDenialCount: 0,
    agingBucket: "121-180",
    lastStatementDate: "2026-08-01",
    statementCount: 3,
    linkedClaimIds: ["CLM-2026-8742"],
    linkedEncounterIds: ["ENC-2026-4330"],
  },
  {
    id: "PBAL-005",
    clientId: "CL-014",
    clientName: "Rahul Patel",
    clientEmail: "rahul.patel@healthcare.com",
    clientPhone: "+1 (555) 678-9012",
    primaryPayer: "Cigna",
    invoiceableBalance: 85,
    nonInvoiceableBalance: 0,
    totalBalance: 85,
    hasActiveClawback: false,
    activeDenialCount: 0,
    agingBucket: "181-365",
    lastStatementDate: "2026-07-15",
    statementCount: 4,
    linkedClaimIds: ["CLM-2026-8766"],
    linkedEncounterIds: ["ENC-2026-4355"],
  },
];

const initialScrubRules: ScrubRule[] = [
  {
    id: "RULE-001",
    ruleCode: "R-MOD25",
    name: "Modifier 25 Required for Dual Service",
    description: "When an E&M code (99202-99215) is billed alongside a procedure on the same date, modifier 25 must be present.",
    severity: "critical",
    actionOutcome: "hard_block",
    isEnabled: true,
    priorityOrder: 1,
    category: "coding",
  },
  {
    id: "RULE-002",
    ruleCode: "R-TF15",
    name: "Timely Filing Critical Threshold (<= 15 Days)",
    description: "Alert and elevate priority for any unsubmitted or rejected claim within 15 calendar days of payer timely filing deadline.",
    severity: "critical",
    actionOutcome: "hard_block",
    isEnabled: true,
    priorityOrder: 2,
    category: "compliance",
  },
  {
    id: "RULE-003",
    ruleCode: "R-NPI-VAL",
    name: "Rendering Provider NPI Active Check",
    description: "Verify rendering provider 10-digit NPI is non-empty, matches active credentialing record, and matches Box 24J.",
    severity: "critical",
    actionOutcome: "hard_block",
    isEnabled: true,
    priorityOrder: 3,
    category: "payer_specific",
  },
  {
    id: "RULE-004",
    ruleCode: "R-PREV-FREQ",
    name: "Preventive Visit Frequency Threshold (365 Days)",
    description: "Flag warning if routine preventive exam CPT (99381-99397) has been billed within the previous 365 days for the same member.",
    severity: "warning",
    actionOutcome: "skippable_warning",
    isEnabled: true,
    priorityOrder: 4,
    category: "payer_specific",
  },
  {
    id: "RULE-005",
    ruleCode: "R-POS-MISMATCH",
    name: "Place of Service (POS) Validation",
    description: "Verify Place of Service code 11 (Office) vs 02 (Telehealth) matches appointment meeting format.",
    severity: "warning",
    actionOutcome: "skippable_warning",
    isEnabled: true,
    priorityOrder: 5,
    category: "coding",
  },
];

const initialFeeSchedule: FeeScheduleItem[] = [
  {
    id: "FEE-001",
    cptCode: "99213",
    description: "Office/outpatient visit, established patient, 20-29 mins",
    standardFee: 165,
    medicareAllowed: 95.5,
    commercialExpectedAvg: 128,
    category: "Evaluation & Management",
    requiresPriorAuth: false,
  },
  {
    id: "FEE-002",
    cptCode: "99214",
    description: "Office/outpatient visit, established patient, 30-39 mins",
    standardFee: 220,
    medicareAllowed: 135.2,
    commercialExpectedAvg: 185,
    category: "Evaluation & Management",
    requiresPriorAuth: false,
  },
  {
    id: "FEE-003",
    cptCode: "99215",
    description: "Office/outpatient visit, established patient, 40-54 mins",
    standardFee: 285,
    medicareAllowed: 182.0,
    commercialExpectedAvg: 240,
    category: "Evaluation & Management",
    requiresPriorAuth: false,
  },
  {
    id: "FEE-004",
    cptCode: "99395",
    description: "Periodic comprehensive preventive medicine, 18-39 yrs",
    standardFee: 275,
    medicareAllowed: 155.0,
    commercialExpectedAvg: 225,
    category: "Preventive",
    requiresPriorAuth: false,
  },
  {
    id: "FEE-005",
    cptCode: "90834",
    description: "Psychotherapy, 45 minutes with patient",
    standardFee: 200,
    medicareAllowed: 112.5,
    commercialExpectedAvg: 160,
    category: "Behavioral Health",
    requiresPriorAuth: false,
  },
  {
    id: "FEE-006",
    cptCode: "90837",
    description: "Psychotherapy, 60 minutes with patient",
    standardFee: 240,
    medicareAllowed: 145.0,
    commercialExpectedAvg: 195,
    category: "Behavioral Health",
    requiresPriorAuth: true,
  },
  {
    id: "FEE-007",
    cptCode: "97110",
    description: "Therapeutic exercises to develop strength, endurance, range of motion",
    standardFee: 125,
    medicareAllowed: 42.0,
    commercialExpectedAvg: 85,
    category: "Physical Therapy",
    requiresPriorAuth: true,
  },
];

const initialPriorAuths: PriorAuthRecord[] = [
  {
    id: "PA-001",
    authNumber: "PA-2026-88129",
    clientId: "CL-001",
    clientName: "Sarah Johnson",
    payerName: "Blue Cross Blue Shield",
    cptCodes: ["90834"],
    authorizedVisits: 12,
    usedVisits: 4,
    startDate: "2026-06-01",
    expirationDate: "2026-12-31",
    status: "active",
  },
  {
    id: "PA-002",
    authNumber: "PA-2026-77312",
    clientId: "CL-002",
    clientName: "Michael Chen",
    payerName: "Aetna Health",
    cptCodes: ["97110", "97140"],
    authorizedVisits: 8,
    usedVisits: 7,
    startDate: "2026-05-15",
    expirationDate: "2026-09-15",
    status: "expiring_soon",
  },
  {
    id: "PA-003",
    authNumber: "PA-2026-66109",
    clientId: "CL-009",
    clientName: "Amanda Clark",
    payerName: "Aetna Health",
    cptCodes: ["90837"],
    authorizedVisits: 6,
    usedVisits: 6,
    startDate: "2026-03-01",
    expirationDate: "2026-08-30",
    status: "exhausted",
  },
];

const initialCredentialing: CredentialingRecord[] = [
  {
    id: "CRED-001",
    providerId: "TM-001",
    providerName: "Dr. Amanda Clark",
    payerName: "Blue Cross Blue Shield",
    trueCredentialingStatus: "credentialed",
    transactionEnrollmentStatus: "live",
    effectiveDate: "2025-01-01",
    terminationDate: null,
    npi: "1829304192",
    taxId: "84-2910394",
    isServiceDateValid: true,
  },
  {
    id: "CRED-002",
    providerId: "TM-001",
    providerName: "Dr. Amanda Clark",
    payerName: "Aetna Health",
    trueCredentialingStatus: "credentialed",
    transactionEnrollmentStatus: "live",
    effectiveDate: "2025-03-01",
    terminationDate: null,
    npi: "1829304192",
    taxId: "84-2910394",
    isServiceDateValid: true,
  },
  {
    id: "CRED-003",
    providerId: "TM-002",
    providerName: "Dr. David Martinez",
    payerName: "UnitedHealthcare",
    trueCredentialingStatus: "credentialed",
    transactionEnrollmentStatus: "action_required",
    effectiveDate: "2025-06-01",
    terminationDate: null,
    npi: "1928374650",
    taxId: "84-2910394",
    isServiceDateValid: true,
  },
  {
    id: "CRED-004",
    providerId: "TM-003",
    providerName: "Dr. Robert Wilson",
    payerName: "Cigna",
    trueCredentialingStatus: "pending",
    transactionEnrollmentStatus: "enrollment_pending",
    effectiveDate: "2026-07-01",
    terminationDate: null,
    npi: "1482910394",
    taxId: "84-2910394",
    isServiceDateValid: false,
  },
];

const initialPayerPerformance: PayerPerformanceRow[] = [
  {
    payerName: "Blue Cross Blue Shield",
    totalBilled: 142500,
    totalCollected: 126800,
    approvalRate30d: 94.2,
    approvalRateAllTime: 91.8,
    denialRate: 5.8,
    avgDaysToPay: 18.4,
    patientMixPercent: 38.5,
    primaryDenialReason: "CO-16 Lacks info / missing member ID format",
  },
  {
    payerName: "Aetna Health",
    totalBilled: 86400,
    totalCollected: 73200,
    approvalRate30d: 87.5,
    approvalRateAllTime: 84.7,
    denialRate: 12.5,
    avgDaysToPay: 26.1,
    patientMixPercent: 24.2,
    primaryDenialReason: "CO-197 Prior auth absent",
  },
  {
    payerName: "UnitedHealthcare",
    totalBilled: 64200,
    totalCollected: 55400,
    approvalRate30d: 89.1,
    approvalRateAllTime: 86.3,
    denialRate: 10.9,
    avgDaysToPay: 22.8,
    patientMixPercent: 18.1,
    primaryDenialReason: "CO-97 Service included in another allowance",
  },
  {
    payerName: "Medicare Part B",
    totalBilled: 52100,
    totalCollected: 49800,
    approvalRate30d: 96.8,
    approvalRateAllTime: 95.4,
    denialRate: 3.2,
    avgDaysToPay: 14.2,
    patientMixPercent: 12.4,
    primaryDenialReason: "CO-50 Non-covered service",
  },
  {
    payerName: "Cigna",
    totalBilled: 28900,
    totalCollected: 23100,
    approvalRate30d: 82.0,
    approvalRateAllTime: 79.5,
    denialRate: 18.0,
    avgDaysToPay: 31.5,
    patientMixPercent: 6.8,
    primaryDenialReason: "CO-29 Timely filing exceeded",
  },
];

// ─── Store Helper Functions ──────────────────────────────────────────────────

export function getStoredRcmState(): RcmStoreState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to parse RCM store from storage", err);
  }

  const initial: RcmStoreState = {
    eligibilityChecks: initialEligibilityChecks,
    encounters: initialEncounters,
    claims: initialClaims,
    denialClusters: initialDenialClusters,
    remittanceLines: initialRemittanceLines,
    patientBalances: initialPatientBalances,
    scrubRules: initialScrubRules,
    feeSchedule: initialFeeSchedule,
    priorAuths: initialPriorAuths,
    credentialing: initialCredentialing,
    payerPerformance: initialPayerPerformance,
  };
  saveRcmState(initial);
  return initial;
}

export function saveRcmState(state: RcmStoreState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(RCM_STORE_EVENT));
  } catch (err) {
    console.error("Failed to save RCM store to storage", err);
  }
}

// ─── Track A -> Track B Seam: Appointment Completed Trigger ─────────────────

export function createEncounterFromAppointment(
  appointmentId: string | number,
  clientInfo: { id: string; name: string; email?: string; phone?: string },
  documentationLocked = false,
  providerName = "Dr. Amanda Clark"
): Encounter {
  const state = getStoredRcmState();
  const aptIdStr = String(appointmentId);

  // Check if encounter already exists for this appointment
  const existing = state.encounters.find((e) => e.appointmentId === aptIdStr);
  if (existing) {
    return existing;
  }

  const newId = `ENC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const serviceDate = new Date().toISOString().split("T")[0];

  const newEncounter: Encounter = {
    id: newId,
    clientId: clientInfo.id,
    clientName: clientInfo.name,
    appointmentId: aptIdStr,
    providerName,
    serviceDate,
    cptCodes: ["99214"],
    diagnosisCodes: ["Z00.00"],
    documentationLocked,
    documentationSource: documentationLocked ? "scribe" : "manual",
    status: documentationLocked ? "ready_to_bill" : "pending_documentation",
    totalCharges: 220,
    claimIds: [],
    daysWaitingDocs: documentationLocked ? 0 : 0,
    notes: documentationLocked ? "Documentation verified & locked." : "Pending clinician documentation lock.",
  };

  // If documentation is locked right away, also spawn draft claim
  if (documentationLocked) {
    const claimId = `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    newEncounter.claimIds.push(claimId);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 90);

    const newClaim: Claim = {
      id: claimId,
      encounterId: newId,
      clientId: clientInfo.id,
      clientName: clientInfo.name,
      payerName: "Blue Cross Blue Shield",
      providerName,
      cptCodes: ["99214"],
      diagnosisCodes: ["Z00.00"],
      serviceDate,
      status: "draft",
      billedAmount: 220,
      timelyFilingDeadline: deadline.toISOString().split("T")[0],
      timelyDaysRemaining: 90,
      notes: [
        {
          id: `note-${Date.now()}`,
          createdAt: new Date().toISOString(),
          author: "System (Encounter Seam)",
          content: `Claim auto-generated upon verified documentation lock from Appointment #${aptIdStr}.`,
        },
      ],
      source: "native",
    };
    state.claims.unshift(newClaim);
  }

  state.encounters.unshift(newEncounter);
  saveRcmState(state);
  return newEncounter;
}

// ─── Encounter Actions ───────────────────────────────────────────────────────

export function lockEncounterDocumentation(encounterId: string, source: "scribe" | "manual" = "manual"): void {
  const state = getStoredRcmState();
  const encounter = state.encounters.find((e) => e.id === encounterId);
  if (!encounter) return;

  encounter.documentationLocked = true;
  encounter.documentationSource = source;
  encounter.status = "ready_to_bill";
  encounter.daysWaitingDocs = 0;

  // Generate draft claim if none exists
  if (encounter.claimIds.length === 0) {
    const claimId = `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    encounter.claimIds.push(claimId);

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 90);

    const newClaim: Claim = {
      id: claimId,
      encounterId: encounter.id,
      clientId: encounter.clientId,
      clientName: encounter.clientName,
      payerName: "Blue Cross Blue Shield",
      providerName: encounter.providerName,
      cptCodes: encounter.cptCodes,
      diagnosisCodes: encounter.diagnosisCodes,
      serviceDate: encounter.serviceDate,
      status: "draft",
      billedAmount: encounter.totalCharges || 220,
      timelyFilingDeadline: deadline.toISOString().split("T")[0],
      timelyDaysRemaining: 90,
      notes: [
        {
          id: `note-${Date.now()}`,
          createdAt: new Date().toISOString(),
          author: source === "scribe" ? "AI Scribe" : "Staff User",
          content: `Documentation verified & locked (${source}). Claim draft created.`,
        },
      ],
      source: "native",
    };
    state.claims.unshift(newClaim);
  }

  saveRcmState(state);
}

// ─── Claim Actions ───────────────────────────────────────────────────────────

export function submitClaim(claimId: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.status = "awaiting_acknowledgement";
  claim.submittedAt = new Date().toISOString();
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "Biller (Manual)",
    content: "Claim transmitted to clearinghouse. Awaiting 277 acknowledgement.",
  });

  saveRcmState(state);
}

export function resubmitClaim(claimId: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.status = "awaiting_acknowledgement";
  claim.submittedAt = new Date().toISOString();
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "Biller (Resubmission)",
    content: "Corrected claim resubmitted to payer EDI gate.",
  });

  saveRcmState(state);
}

export function voidClaim(claimId: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.status = "void";
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "Biller",
    content: "Claim marked as voided.",
  });

  saveRcmState(state);
}

export function acceptScrubIssue(claimId: string, issueId: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim || !claim.scrubIssues) return;

  const issue = claim.scrubIssues.find((i) => i.id === issueId);
  if (issue) {
    issue.accepted = true;
    claim.notes.unshift({
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: "Biller (AI Assist)",
      content: `Accepted AI scrub suggestion: ${issue.suggestedAction}`,
    });
  }

  saveRcmState(state);
}

export function rejectScrubIssue(claimId: string, issueId: string, reason: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim || !claim.scrubIssues) return;

  const issue = claim.scrubIssues.find((i) => i.id === issueId);
  if (issue) {
    issue.accepted = false;
    issue.rejectedReason = reason;
    claim.notes.unshift({
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
      author: "Biller",
      content: `Dismissed scrub recommendation: "${reason}"`,
    });
  }

  saveRcmState(state);
}

// ─── Denial Cluster Actions ──────────────────────────────────────────────────

export function updateDenialClusterStatus(
  clusterId: string,
  newStatus: "denied" | "under_review" | "resubmitted" | "reconciled"
): void {
  const state = getStoredRcmState();
  const cluster = state.denialClusters.find((c) => c.id === clusterId);
  if (!cluster) return;

  cluster.status = newStatus;
  cluster.lastUpdated = new Date().toISOString();

  // Update constituent claims status
  cluster.claims.forEach((c) => {
    if (newStatus === "resubmitted") c.status = "resubmitted";
    if (newStatus === "reconciled") c.status = "reconciled";
  });

  saveRcmState(state);
}

export function saveAppealDraft(clusterId: string, newDraft: string): void {
  const state = getStoredRcmState();
  const cluster = state.denialClusters.find((c) => c.id === clusterId);
  if (!cluster) return;

  cluster.appealDraftTemplate = newDraft;
  cluster.lastUpdated = new Date().toISOString();
  saveRcmState(state);
}

// ─── Payment Posting Actions ─────────────────────────────────────────────────

export function executePostingAction(
  remittanceId: string,
  action: PostingAction,
  params?: { customNote?: string; adjustmentAmount?: number }
): void {
  const state = getStoredRcmState();
  const rem = state.remittanceLines.find((r) => r.id === remittanceId);
  if (!rem) return;

  rem.postingAction = action;
  rem.status = "confirmed";
  rem.postedAt = new Date().toISOString();

  // If push to PR, ensure patient responsibility is updated
  if (action === "push_to_pr") {
    let pBal = state.patientBalances.find((b) => b.clientId === rem.clientId);
    if (!pBal) {
      pBal = {
        id: `PBAL-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: rem.clientId,
        clientName: rem.clientName,
        primaryPayer: rem.payerName,
        invoiceableBalance: rem.patientResponsibilityAmount,
        nonInvoiceableBalance: 0,
        totalBalance: rem.patientResponsibilityAmount,
        hasActiveClawback: false,
        activeDenialCount: 0,
        agingBucket: "0-30",
        statementCount: 0,
        linkedClaimIds: [rem.claimId],
        linkedEncounterIds: [],
      };
      state.patientBalances.unshift(pBal);
    } else {
      pBal.invoiceableBalance += rem.patientResponsibilityAmount;
      pBal.totalBalance += rem.patientResponsibilityAmount;
      if (!pBal.linkedClaimIds.includes(rem.claimId)) {
        pBal.linkedClaimIds.push(rem.claimId);
      }
    }
  }

  saveRcmState(state);
}

// ─── Eligibility Actions ─────────────────────────────────────────────────────

export function recheckEligibility(checkId: string): void {
  const state = getStoredRcmState();
  const check = state.eligibilityChecks.find((c) => c.id === checkId);
  if (!check) return;

  check.status = "active";
  check.checkedAt = new Date().toISOString();
  check.source = "manual_rerun";
  if (check.copayAmount === undefined && check.deductibleRemaining === undefined && check.coinsurance === undefined) {
    const terms = getEligibilityTermsForService("", undefined, check.payerName);
    check.copayAmount = terms.copayAmount;
    check.deductibleRemaining = terms.deductibleRemaining;
    check.coinsurance = terms.coinsurance;
  }
  check.inconclusiveReason = undefined;

  saveRcmState(state);
}

// ─── Dynamic Eligibility Terms Resolution by Service & Price ────────────────
export function getEligibilityTermsForService(
  serviceName = "",
  servicePrice?: number,
  payerName = "Blue Cross Blue Shield"
): {
  copayAmount: number | undefined;
  deductibleRemaining: number | undefined;
  coinsurance: number | undefined;
  benefitType: string;
} {
  const nameLower = (serviceName || "").toLowerCase();
  const payerLower = (payerName || "").toLowerCase();

  // Self-pay plans have no payer-subsidized copay or deductible
  if (payerLower.includes("self-pay") || payerLower.includes("self pay")) {
    return {
      copayAmount: undefined,
      deductibleRemaining: undefined,
      coinsurance: undefined,
      benefitType: "Self-Pay (100% Patient Responsibility)",
    };
  }

  // 1. Preventive Care (Annual Wellness, Preventive Exam, Checkup, Screening)
  // ACA Mandate: 100% covered in-network ($0 Copay, $0 Deductible, 0% Coinsurance)
  if (
    nameLower.includes("preventive") ||
    nameLower.includes("annual") ||
    nameLower.includes("wellness") ||
    nameLower.includes("checkup") ||
    nameLower.includes("routine") ||
    nameLower.includes("z00")
  ) {
    return {
      copayAmount: 0,
      deductibleRemaining: 0,
      coinsurance: 0,
      benefitType: "Preventive Care (100% In-Network Covered)",
    };
  }

  // Determine effective price
  let price = Number(servicePrice) || 0;
  if (price <= 0) {
    if (nameLower.includes("follow-up") || nameLower.includes("follow up")) price = 75;
    else if (nameLower.includes("dental")) price = 120;
    else if (nameLower.includes("x-ray") || nameLower.includes("imaging")) price = 80;
    else if (nameLower.includes("physio") || nameLower.includes("therapy")) price = 110;
    else if (nameLower.includes("blood") || nameLower.includes("lab")) price = 95;
    else if (nameLower.includes("comprehensive")) price = 275;
    else if (nameLower.includes("consultation")) price = 150;
    else price = 150;
  }

  // 2. Diagnostic & Labs (X-ray, blood test, imaging, lab panels)
  // Subject to deductible + 20% coinsurance without fixed office visit copay
  if (
    nameLower.includes("x-ray") ||
    nameLower.includes("imaging") ||
    nameLower.includes("blood") ||
    nameLower.includes("lab") ||
    nameLower.includes("diagnostic")
  ) {
    return {
      copayAmount: undefined,
      deductibleRemaining: Math.round(Math.min(price, 100)),
      coinsurance: 20,
      benefitType: "Diagnostic / Imaging (Subject to Deductible)",
    };
  }

  // 3. Behavioral Health / Therapy
  if (nameLower.includes("psychotherapy") || nameLower.includes("counseling") || nameLower.includes("mental")) {
    const copay = price > 200 ? 35 : 25;
    return {
      copayAmount: copay,
      deductibleRemaining: Math.round(Math.min(price, 150)),
      coinsurance: 20,
      benefitType: "Behavioral Health Benefit",
    };
  }

  // 4. Physical Therapy / Rehabilitation
  if (nameLower.includes("physio") || nameLower.includes("physical therapy") || nameLower.includes("rehab")) {
    const copay = price > 100 ? 30 : 20;
    return {
      copayAmount: copay,
      deductibleRemaining: Math.round(Math.min(price, 100)),
      coinsurance: 20,
      benefitType: "Physical Rehabilitation Benefit",
    };
  }

  // 5. Clinical Office Visits / E&M Visits dynamically scaled by service price:
  // - Minor / Follow-up (< $100): $15 Copay, $50 Deductible, 15% Coinsurance
  // - Standard Visit ($100 - $199): $25 Copay, $150 Deductible, 20% Coinsurance
  // - Extended / Specialist ($200 - $299): $35 Copay, $200 Deductible, 20% Coinsurance
  // - Complex / High-complexity (>= $300): $50 Copay, $250 Deductible, 25% Coinsurance
  let copay = 25;
  let deductible = 150;
  let coinsurance = 20;

  if (price < 100) {
    copay = 15;
    deductible = Math.min(price, 50);
    coinsurance = 15;
  } else if (price < 200) {
    copay = 25;
    deductible = Math.min(price, 150);
    coinsurance = 20;
  } else if (price < 300) {
    copay = 35;
    deductible = Math.min(price, 200);
    coinsurance = 20;
  } else {
    copay = 50;
    deductible = Math.min(price, 250);
    coinsurance = 25;
  }

  return {
    copayAmount: copay,
    deductibleRemaining: deductible,
    coinsurance,
    benefitType: `Commercial Office Visit (${serviceName || "Clinical Consultation"})`,
  };
}

export function recordAppointmentEligibility(params: {
  appointmentId: string | number;
  clientId: string;
  clientName: string;
  appointmentDate: string;
  status: EligibilityStatus;
  payerName?: string;
  memberId?: string;
  serviceName?: string;
  servicePrice?: number;
  copayAmount?: number;
  deductibleRemaining?: number;
  coinsurance?: number;
  terminationReason?: string;
  inconclusiveReason?: string;
}): void {
  const state = getStoredRcmState();
  const existingIdx = state.eligibilityChecks.findIndex(
    (c) =>
      String(c.appointmentId) === String(params.appointmentId) ||
      c.appointmentId === `APT-${params.appointmentId}`
  );

  const fallbackTerms =
    params.status === "active"
      ? getEligibilityTermsForService(params.serviceName, params.servicePrice, params.payerName)
      : { copayAmount: undefined, deductibleRemaining: undefined, coinsurance: undefined };

  const check: EligibilityCheck = {
    id: existingIdx >= 0 ? state.eligibilityChecks[existingIdx].id : `ELG-${params.appointmentId}`,
    clientId: params.clientId,
    clientName: params.clientName,
    appointmentId: String(params.appointmentId),
    appointmentDate: params.appointmentDate,
    payerName: params.payerName || (params.status === "unable_to_respond" ? "Clearinghouse" : "Blue Cross Blue Shield"),
    memberId: params.memberId || `BCBS-${Math.floor(10000000 + Math.random() * 90000000)}`,
    status: params.status,
    checkedAt: new Date().toISOString(),
    copayAmount: params.copayAmount !== undefined ? params.copayAmount : fallbackTerms.copayAmount,
    deductibleRemaining: params.deductibleRemaining !== undefined ? params.deductibleRemaining : fallbackTerms.deductibleRemaining,
    coinsurance: params.coinsurance !== undefined ? params.coinsurance : fallbackTerms.coinsurance,
    terminationReason: params.terminationReason,
    inconclusiveReason: params.inconclusiveReason,
    source: params.status === "active" ? "manual_rerun" : "auto",
  };

  if (existingIdx >= 0) {
    state.eligibilityChecks[existingIdx] = check;
  } else {
    state.eligibilityChecks.unshift(check);
  }

  saveRcmState(state);
}

// ─── Scrub Rule Toggle ───────────────────────────────────────────────────────

export function toggleScrubRule(ruleId: string): void {
  const state = getStoredRcmState();
  const rule = state.scrubRules.find((r) => r.id === ruleId);
  if (!rule) return;

  rule.isEnabled = !rule.isEnabled;
  saveRcmState(state);
}

// ─── Query Getters for External Contexts ─────────────────────────────────────

export function getStoredClaims(): Claim[] {
  return getStoredRcmState().claims;
}

export function getStoredDenialClusters(): DenialClusterGroup[] {
  return getStoredRcmState().denialClusters;
}

export function getStoredPatientBalances(): PatientArBalance[] {
  return getStoredRcmState().patientBalances;
}

// ─── Estimated Split Calculation (Pure Logic) ────────────────────────────────

export interface EstimatedSplitResult {
  patientResponsibility: number | null;
  insuranceResponsibility: number | null;
  ruleApplied:
    | "copay"
    | "deductible"
    | "deductible_plus_coinsurance"
    | "coinsurance"
    | "self_pay"
    | "unable_to_estimate";
  explanation: string;
}

/**
 * Pure calculation function for determining estimated patient vs insurance split.
 * Strict priority order:
 * 1. Copay first: if copayAmount is present, patientResponsibility = min(copay, servicePrice).
 * 2. Deductible second (only if no copay): patient owes up to unmet deductible.
 *    Any leftover above deductible falls through to coinsurance.
 * 3. Coinsurance third: applied if deductible is 0 (fully met) or on leftover from step 2.
 * 4. Fallback: self_pay / inactive coverage -> 100% patient, or null ("Unable to estimate").
 *
 * Guarantees patientResponsibility + insuranceResponsibility === exact servicePrice (no off-by-cent totals).
 */
export function calculateEstimatedSplit(
  servicePrice: number,
  eligibility?: Partial<EligibilityCheck> | null
): EstimatedSplitResult {
  const price = Math.max(0, Math.round(servicePrice * 100) / 100);

  if (price === 0) {
    return {
      patientResponsibility: 0,
      insuranceResponsibility: 0,
      ruleApplied: "copay",
      explanation: "Zero charge encounter",
    };
  }

  if (!eligibility) {
    return {
      patientResponsibility: null,
      insuranceResponsibility: null,
      ruleApplied: "unable_to_estimate",
      explanation: "No eligibility record on file",
    };
  }

  // Self-Pay: patient owes full price
  if (eligibility.status === "self_pay") {
    return {
      patientResponsibility: price,
      insuranceResponsibility: 0,
      ruleApplied: "self_pay",
      explanation: "Self-Pay: 100% patient responsibility",
    };
  }

  // Inactive or not covered: patient owes full price
  if (eligibility.status === "inactive" || eligibility.status === "not_covered") {
    return {
      patientResponsibility: price,
      insuranceResponsibility: 0,
      ruleApplied: "self_pay",
      explanation: `Coverage ${eligibility.status === "not_covered" ? "not covered" : "inactive"}: 100% patient responsibility`,
    };
  }

  // Pending / inconclusive clearinghouse response: unable to estimate
  if (
    eligibility.status === "inconclusive" ||
    eligibility.status === "unable_to_respond" ||
    eligibility.status === "pending"
  ) {
    return {
      patientResponsibility: null,
      insuranceResponsibility: null,
      ruleApplied: "unable_to_estimate",
      explanation: "Clearinghouse verification inconclusive or pending",
    };
  }

  // RULE 1: Copay first. If present, that's the entire patient responsibility. Stop here.
  const hasCopay =
    eligibility.copayAmount !== undefined &&
    eligibility.copayAmount !== null &&
    !isNaN(eligibility.copayAmount);

  if (hasCopay) {
    const copay = eligibility.copayAmount!;
    const patientShare = Math.min(price, Math.round(copay * 100) / 100);
    const insuranceShare = Math.round((price - patientShare) * 100) / 100;

    return {
      patientResponsibility: patientShare,
      insuranceResponsibility: insuranceShare,
      ruleApplied: "copay",
      explanation: `Copay governed: Patient owes fixed copay of $${patientShare.toFixed(2)}`,
    };
  }

  const hasDeductible =
    eligibility.deductibleRemaining !== undefined &&
    eligibility.deductibleRemaining !== null &&
    !isNaN(eligibility.deductibleRemaining);

  const hasCoinsurance =
    eligibility.coinsurance !== undefined &&
    eligibility.coinsurance !== null &&
    !isNaN(eligibility.coinsurance);

  // RULE 2: Deductible second — only if there's no copay.
  if (hasDeductible && eligibility.deductibleRemaining! > 0) {
    const deductibleRem = eligibility.deductibleRemaining!;
    const deductiblePortion = Math.min(deductibleRem, price);
    const leftoverAboveDeductible = Math.max(0, price - deductiblePortion); // Raw unrounded

    // Leftover above deductible falls through to coinsurance (Rule 3)
    if (leftoverAboveDeductible > 0 && hasCoinsurance) {
      const coinsPct =
        eligibility.coinsurance! > 1
          ? eligibility.coinsurance! / 100
          : eligibility.coinsurance!;
      const coinsurancePortion = leftoverAboveDeductible * coinsPct; // Raw unrounded
      const rawPatientShare = Math.min(price, deductiblePortion + coinsurancePortion); // Raw unrounded

      // Single end-of-chain rounding to final patient responsibility
      const patientShare = Math.round(rawPatientShare * 100) / 100;
      const insuranceShare = Math.round((price - patientShare) * 100) / 100;

      return {
        patientResponsibility: patientShare,
        insuranceResponsibility: insuranceShare,
        ruleApplied: "deductible_plus_coinsurance",
        explanation: `Deductible ($${deductiblePortion.toFixed(2)}) + ${Math.round(coinsPct * 100)}% Coinsurance ($${(patientShare - Math.round(deductiblePortion * 100) / 100).toFixed(2)})`,
      };
    } else {
      const patientShare = Math.round(deductiblePortion * 100) / 100;
      const insuranceShare = Math.round((price - patientShare) * 100) / 100;

      return {
        patientResponsibility: patientShare,
        insuranceResponsibility: insuranceShare,
        ruleApplied: "deductible",
        explanation: `Deductible remaining: Patient owes up to unmet deductible ($${patientShare.toFixed(2)})`,
      };
    }
  }

  // RULE 3: Coinsurance third — only if deductible is fully met (deductible remaining = 0), or on leftover.
  if (hasCoinsurance && (!hasDeductible || eligibility.deductibleRemaining === 0)) {
    const coinsPct =
      eligibility.coinsurance! > 1
        ? eligibility.coinsurance! / 100
        : eligibility.coinsurance!;
    const rawPatientShare = price * coinsPct;
    const patientShare = Math.round(rawPatientShare * 100) / 100;
    const insuranceShare = Math.round((price - patientShare) * 100) / 100;

    return {
      patientResponsibility: patientShare,
      insuranceResponsibility: insuranceShare,
      ruleApplied: "coinsurance",
      explanation: `Deductible met: Governed by ${Math.round(coinsPct * 100)}% coinsurance`,
    };
  }

  // Deductible is present and fully met (0), but no coinsurance specified -> 100% covered by payer
  if (hasDeductible && eligibility.deductibleRemaining === 0 && !hasCoinsurance) {
    return {
      patientResponsibility: 0,
      insuranceResponsibility: price,
      ruleApplied: "deductible",
      explanation: "Deductible fully met ($0 remaining): 100% covered by payer",
    };
  }

  // RULE 4: No copay, no deductible, no coinsurance on file
  return {
    patientResponsibility: null,
    insuranceResponsibility: null,
    ruleApplied: "unable_to_estimate",
    explanation: "Unable to estimate: No copay, deductible, or coinsurance terms on file",
  };
}

// ─── Charge Capture Bridge ──────────────────────────────────────────────────

export interface ChargeCaptureParams {
  appointmentId: string | number;
  clientId: string;
  clientName: string;
  providerName?: string;
  serviceName?: string;
  serviceDate?: string;
  billedAmount: number;
  diagnosisCodes: string[];
  cptCodes?: string[];
  payerName?: string;
  memberId?: string;
  patientResponsibility?: number;
}

export function createClaimFromChargeCapture(params: ChargeCaptureParams): Claim {
  const state = getStoredRcmState();
  const aptIdStr = String(params.appointmentId);
  const encounterId = `ENC-${aptIdStr}`;

  let claimId = `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  while (state.claims.some((c) => c.id === claimId)) {
    claimId = `CLM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 90);

  const newClaim: Claim = {
    id: claimId,
    encounterId,
    appointmentId: aptIdStr,
    clientId: params.clientId,
    clientName: params.clientName,
    payerName: params.payerName || "Blue Cross Blue Shield",
    memberId: params.memberId || `BCBS-${Math.floor(10000000 + Math.random() * 90000000)}`,
    providerName: params.providerName || "Dr. Amanda Clark",
    cptCodes: params.cptCodes && params.cptCodes.length > 0 ? params.cptCodes : ["99214"],
    diagnosisCodes: params.diagnosisCodes && params.diagnosisCodes.length > 0 ? params.diagnosisCodes : ["Z00.00"],
    serviceDate: params.serviceDate || new Date().toISOString().split("T")[0],
    submittedAt: new Date().toISOString(),
    status: "in_adjudication",
    billedAmount: params.billedAmount,
    allowedAmount: Math.round(params.billedAmount * 0.8),
    paidAmount: undefined,
    patientResponsibility: params.patientResponsibility !== undefined ? params.patientResponsibility : undefined,
    timelyFilingDeadline: deadline.toISOString().split("T")[0],
    timelyDaysRemaining: 90,
    notes: [
      {
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
        author: "Charge Capture Bridge",
        content: `Claim auto-generated from Charge Capture encounter #${encounterId}. Billed amount: $${params.billedAmount.toFixed(2)}${params.patientResponsibility !== undefined ? ` (Est. Patient: $${params.patientResponsibility.toFixed(2)})` : ""}. Electronic 837P transmitted for adjudication.`,
      },
    ],
    source: "native",
  };

  state.claims.unshift(newClaim);

  let enc = state.encounters.find((e) => e.id === encounterId || String(e.appointmentId) === aptIdStr);
  if (enc) {
    enc.status = "billed";
    if (!enc.claimIds.includes(claimId)) {
      enc.claimIds.push(claimId);
    }
  } else {
    state.encounters.unshift({
      id: encounterId,
      clientId: params.clientId,
      clientName: params.clientName,
      appointmentId: aptIdStr,
      appointmentTitle: params.serviceName || "Clinical Encounter",
      providerName: params.providerName || "Dr. Amanda Clark",
      serviceDate: params.serviceDate || new Date().toISOString().split("T")[0],
      cptCodes: newClaim.cptCodes,
      diagnosisCodes: newClaim.diagnosisCodes,
      documentationLocked: true,
      documentationSource: "scribe",
      status: "billed",
      totalCharges: params.billedAmount,
      claimIds: [claimId],
    });
  }

  saveRcmState(state);
  return newClaim;
}
