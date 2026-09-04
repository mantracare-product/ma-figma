/**
 * MantraAssist Revenue Cycle Management (RCM) — Lib Store
 * Backed by sessionStorage + RCM_STORE_EVENT event dispatch
 * Modelled on processLogsStore.ts and clientProcessState.ts
 *
 * v1.1: Reconnected to getClientList() real client roster
 */

import {
  EligibilityCheck,
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
  ClientInsurance,
} from "../app/types/rcmTypes";
import { getClientList } from "./getClientList";

export const RCM_STORE_EVENT = "rcm_store_updated";
const STORAGE_KEY = "mantra_rcm_store_v1_1";

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

// ─── Initial Mock Datasets Seeded from Real Client Roster ─────────────────────

function createInitialRcmState(): RcmStoreState {
  const clients = getClientList();
  const c1 = clients.find((c) => c.id === "c-1") || { id: "c-1", name: "James Wilson", email: "james.w@example.com", phoneNumber: "+1 (555) 123-4567" };
  const c2 = clients.find((c) => c.id === "c-2") || { id: "c-2", name: "Emma Brown", email: "emma.b@example.com", phoneNumber: "+1 (555) 234-5678" };
  const c3 = clients.find((c) => c.id === "c-3") || { id: "c-3", name: "Oliver Davis", email: "oliver.d@example.com", phoneNumber: "+1 (555) 345-6789" };
  const c4 = clients.find((c) => c.id === "c-4") || { id: "c-4", name: "Sophia Martinez", email: "sophia.m@example.com", phoneNumber: "+1 (555) 456-7890" };
  const c5 = clients.find((c) => c.id === "c-5") || { id: "c-5", name: "Sarah Jenkins", email: "sarah.j@example.com", phoneNumber: "+1 (555) 234-5678" };
  const c6 = clients.find((c) => c.id === "c-6") || { id: "c-6", name: "Michael Chang", email: "m.chang@example.com", phoneNumber: "+1 (555) 876-5432" };
  const c7 = clients.find((c) => c.id === "c-7") || { id: "c-7", name: "Jessica Taylor", email: "jtaylor@example.com", phoneNumber: "+1 (555) 654-3210" };
  const c8 = clients.find((c) => c.id === "c-8") || { id: "c-8", name: "Robert Chen", email: "rchen@example.com", phoneNumber: "+1 (555) 789-0123" };

  const eligibilityChecks: EligibilityCheck[] = [
    {
      id: "ELG-001",
      clientId: c1.id,
      clientName: c1.name,
      appointmentId: "1",
      appointmentDate: "2026-05-12",
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
      clientId: c2.id,
      clientName: c2.name,
      appointmentId: "2",
      appointmentDate: "2026-05-12",
      payerName: "Aetna Health",
      memberId: "AET-55421098",
      status: "inconclusive",
      checkedAt: "2026-09-03T08:00:00Z",
      source: "auto",
      inconclusiveReason: "Subscriber DOB mismatch between clinic records and payer registry",
    },
    {
      id: "ELG-003",
      clientId: c3.id,
      clientName: c3.name,
      appointmentId: "3",
      appointmentDate: "2026-05-13",
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
      clientId: c4.id,
      clientName: c4.name,
      appointmentId: "4",
      appointmentDate: "2026-05-14",
      payerName: "Cigna",
      memberId: "CGN-88129034",
      status: "inactive",
      checkedAt: "2026-09-03T08:00:00Z",
      source: "auto",
      inconclusiveReason: "Coverage terminated on 2026-08-31. Contact patient for updated insurance.",
    },
    {
      id: "ELG-005",
      clientId: c5.id,
      clientName: c5.name,
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
      clientId: c6.id,
      clientName: c6.name,
      appointmentId: "APT-106",
      appointmentDate: "2026-09-06",
      payerName: "Self Pay",
      status: "self_pay",
      checkedAt: "2026-09-03T08:00:00Z",
      source: "auto",
    },
  ];

  const encounters: Encounter[] = [
    {
      id: "ENC-2026-4401",
      clientId: c1.id,
      clientName: c1.name,
      appointmentId: "1",
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
      clientId: c2.id,
      clientName: c2.name,
      appointmentId: "2",
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
      clientId: c5.id,
      clientName: c5.name,
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
      clientId: c6.id,
      clientName: c6.name,
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
      clientId: c8.id,
      clientName: c8.name,
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

  const claims: Claim[] = [
    {
      id: "CLM-2026-8801",
      encounterId: "ENC-2026-4401",
      clientId: c1.id,
      clientName: c1.name,
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
      assignedTo: "Admin User",
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
      clientId: c5.id,
      clientName: c5.name,
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
      assignedTo: "Admin User",
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
      clientId: c4.id,
      clientName: c4.name,
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
      assignedTo: "Sarah Manager",
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
      clientId: c2.id,
      clientName: c2.name,
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
      assignedTo: "John Agent",
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
      clientId: c3.id,
      clientName: c3.name,
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
      assignedTo: "Admin User",
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
      clientId: c7.id,
      clientName: c7.name,
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
      assignedTo: "Admin User",
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
      clientId: c8.id,
      clientName: c8.name,
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
      assignedTo: "Admin User",
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

  const denialClusters: DenialClusterGroup[] = [
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
      claimCount: 4,
      priority: "critical",
      suggestedFixSummary: "Payer requires 8-digit member ID formatting and primary diagnosis pointer (Box 24E) linked directly to line item 1.",
      appealDraftTemplate:
        "Dear Blue Cross Blue Shield Claims Adjudication Committee,\n\nWe are submitting corrected billing details for the enclosed cluster of claims denied under CARC CO-16. All patient identifiers and diagnosis pointer linkages have been verified against active policy records.\n\nPlease reprocess for adjudication under standard in-network contract terms.",
      claims: [
        {
          claimId: "CLM-2026-8806",
          clientId: c3.id,
          clientName: c3.name,
          encounterId: "ENC-2026-4408",
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
          clientId: c1.id,
          clientName: c1.name,
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
          clientId: c5.id,
          clientName: c5.name,
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
          clientId: c7.id,
          clientName: c7.name,
          encounterId: "ENC-2026-4360",
          providerName: "Dr. Robert Wilson",
          serviceDate: "2026-07-28",
          amount: 250,
          timelyFilingDeadline: "2026-10-26",
          timelyDaysRemaining: 53,
          priorityScore: 80,
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
      claimCount: 2,
      priority: "high",
      suggestedFixSummary: "Check if retro-authorization was granted within 14 days of service date. If granted, attach authorization reference code.",
      appealDraftTemplate:
        "Dear Aetna Prior Authorization Department,\n\nWe request a retro-authorization review for the attached claims. Medical records demonstrating acute necessity have been appended to this correspondence.\n\nThank you for your prompt reconsideration.",
      claims: [
        {
          claimId: "CLM-2026-8807",
          clientId: c7.id,
          clientName: c7.name,
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
          clientId: c2.id,
          clientName: c2.name,
          encounterId: "ENC-2026-4395",
          providerName: "Dr. David Martinez",
          serviceDate: "2026-08-01",
          amount: 240,
          timelyFilingDeadline: "2026-10-30",
          timelyDaysRemaining: 57,
          priorityScore: 80,
          status: "under_review",
        },
      ],
      status: "under_review",
      lastUpdated: "2026-09-01T15:30:00Z",
    },
  ];

  const remittanceLines: RemittanceLine[] = [
    {
      id: "REM-001",
      claimId: "CLM-2026-8803",
      clientId: c8.id,
      clientName: c8.name,
      payerName: "Blue Cross Blue Shield",
      serviceDate: "2026-08-28",
      billedAmount: 310,
      paidAmount: 250,
      patientResponsibilityAmount: 25,
      adjustments: [
        { reasonCode: "CO-45", amount: 35, note: "Contractual fee schedule reduction" },
        { reasonCode: "PR-1", amount: 25, note: "Patient copay responsibility" },
      ],
      source: "era_835",
      status: "confirmed",
      receivedAt: "2026-09-01T10:00:00Z",
      postedAt: "2026-09-01T12:00:00Z",
      checkNumber: "CHK-881290",
    },
    {
      id: "REM-002",
      claimId: "CLM-2026-8801",
      clientId: c1.id,
      clientName: c1.name,
      payerName: "Blue Cross Blue Shield",
      serviceDate: "2026-09-02",
      billedAmount: 320,
      paidAmount: 260,
      patientResponsibilityAmount: 25,
      adjustments: [
        { reasonCode: "CO-45", amount: 35, note: "Contractual fee schedule reduction" },
        { reasonCode: "PR-1", amount: 25, note: "Patient copay responsibility" },
      ],
      source: "era_835",
      status: "pending_review",
      receivedAt: "2026-09-03T11:00:00Z",
      checkNumber: "CHK-881304",
    },
    {
      id: "REM-003",
      claimId: "CLM-2026-8806",
      clientId: c3.id,
      clientName: c3.name,
      payerName: "Blue Cross Blue Shield",
      serviceDate: "2026-08-10",
      billedAmount: 220,
      paidAmount: 0,
      patientResponsibilityAmount: 0,
      adjustments: [
        { reasonCode: "CO-16", amount: 220, note: "Claim lacks information needed for adjudication" },
      ],
      source: "era_835",
      status: "pending_review",
      receivedAt: "2026-08-18T14:00:00Z",
      checkNumber: "EFT-990214",
    },
  ];

  const patientBalances: PatientArBalance[] = [
    {
      id: "PBAL-001",
      clientId: c1.id,
      clientName: c1.name,
      clientEmail: c1.email,
      clientPhone: c1.phoneNumber,
      primaryPayer: "Blue Cross Blue Shield",
      invoiceableBalance: 25,
      nonInvoiceableBalance: 0,
      totalBalance: 25,
      hasActiveClawback: false,
      activeDenialCount: 0,
      agingBucket: "0-30",
      lastStatementDate: "2026-09-01",
      statementCount: 1,
      linkedClaimIds: ["CLM-2026-8801"],
      linkedEncounterIds: ["ENC-2026-4401"],
      source: "remittance",
    },
    {
      id: "PBAL-002",
      clientId: c3.id,
      clientName: c3.name,
      clientEmail: c3.email,
      clientPhone: c3.phoneNumber,
      primaryPayer: "Blue Cross Blue Shield",
      invoiceableBalance: 0,
      nonInvoiceableBalance: 220,
      totalBalance: 220,
      hasActiveClawback: false,
      activeDenialCount: 1,
      agingBucket: "31-60",
      statementCount: 0,
      linkedClaimIds: ["CLM-2026-8806"],
      linkedEncounterIds: ["ENC-2026-4408"],
      source: "remittance",
    },
    {
      id: "PBAL-003",
      clientId: c4.id,
      clientName: c4.name,
      clientEmail: c4.email,
      clientPhone: c4.phoneNumber,
      primaryPayer: "Cigna",
      invoiceableBalance: 85,
      nonInvoiceableBalance: 0,
      totalBalance: 85,
      hasActiveClawback: false,
      activeDenialCount: 0,
      agingBucket: "61-90",
      lastStatementDate: "2026-08-01",
      statementCount: 2,
      linkedClaimIds: ["CLM-2026-8804"],
      linkedEncounterIds: ["ENC-2026-4406"],
      source: "manual",
    },
    {
      id: "PBAL-004",
      clientId: c6.id,
      clientName: c6.name,
      clientEmail: c6.email,
      clientPhone: c6.phoneNumber,
      primaryPayer: "Self Pay",
      invoiceableBalance: 150,
      nonInvoiceableBalance: 0,
      totalBalance: 150,
      hasActiveClawback: false,
      activeDenialCount: 0,
      agingBucket: "0-30",
      lastStatementDate: "2026-09-01",
      statementCount: 1,
      linkedClaimIds: [],
      linkedEncounterIds: [],
      source: "manual",
    },
  ];

  const scrubRules: ScrubRule[] = [
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

  const feeSchedule: FeeScheduleItem[] = [
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
      medicareAllowed: 135.0,
      commercialExpectedAvg: 185,
      category: "Evaluation & Management",
      requiresPriorAuth: false,
    },
    {
      id: "FEE-003",
      cptCode: "99215",
      description: "Office/outpatient visit, established patient, 40-54 mins",
      standardFee: 285,
      medicareAllowed: 185.0,
      commercialExpectedAvg: 245,
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

  const priorAuths: PriorAuthRecord[] = [
    {
      id: "PA-001",
      authNumber: "PA-2026-88129",
      clientId: c1.id,
      clientName: c1.name,
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
      clientId: c2.id,
      clientName: c2.name,
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
      clientId: c7.id,
      clientName: c7.name,
      payerName: "Aetna Health",
      cptCodes: ["90837"],
      authorizedVisits: 6,
      usedVisits: 6,
      startDate: "2026-03-01",
      expirationDate: "2026-08-30",
      status: "exhausted",
    },
  ];

  const credentialing: CredentialingRecord[] = [
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
      effectiveDate: "2026-09-01",
      terminationDate: null,
      npi: "1129384756",
      taxId: "84-2910394",
      isServiceDateValid: true,
    },
  ];

  const payerPerformance: PayerPerformanceRow[] = [
    {
      payerName: "Blue Cross Blue Shield",
      totalBilled: 64200,
      totalCollected: 58400,
      approvalRate30d: 91.2,
      approvalRateAllTime: 92.4,
      denialRate: 8.8,
      avgDaysToPay: 18.4,
      patientMixPercent: 44.2,
      primaryDenialReason: "CO-16 Lacks information",
    },
    {
      payerName: "Aetna Health",
      totalBilled: 38100,
      totalCollected: 31200,
      approvalRate30d: 84.5,
      approvalRateAllTime: 86.1,
      denialRate: 15.5,
      avgDaysToPay: 24.8,
      patientMixPercent: 26.5,
      primaryDenialReason: "CO-197 Prior auth absent",
    },
    {
      payerName: "UnitedHealthcare",
      totalBilled: 21400,
      totalCollected: 19800,
      approvalRate30d: 96.8,
      approvalRateAllTime: 94.2,
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

  return {
    eligibilityChecks,
    encounters,
    claims,
    denialClusters,
    remittanceLines,
    patientBalances,
    scrubRules,
    feeSchedule,
    priorAuths,
    credentialing,
    payerPerformance,
  };
}

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

  const initial = createInitialRcmState();
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
  if (!clientInfo.id) {
    throw new Error(`createEncounterFromAppointment requires a valid client.id. Received: ${JSON.stringify(clientInfo)}`);
  }

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
    daysWaitingDocs: 0,
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
      assignedTo: "Admin User",
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
      assignedTo: "Admin User",
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

export function assignClaim(claimId: string, assignedTo: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.assignedTo = assignedTo;
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "System (Assignment)",
    content: `Claim assigned to ${assignedTo}.`,
  });

  saveRcmState(state);
}

export function deferClaim(claimId: string, deferReason: string, deferredUntil: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.deferredUntil = deferredUntil;
  claim.deferReason = deferReason;
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "Biller (Deferral)",
    content: `Claim deferred until ${deferredUntil}. Reason: "${deferReason}". Patient responsibility paused.`,
  });

  saveRcmState(state);
}

export function cancelDeferClaim(claimId: string): void {
  const state = getStoredRcmState();
  const claim = state.claims.find((c) => c.id === claimId);
  if (!claim) return;

  claim.deferredUntil = undefined;
  claim.deferReason = undefined;
  claim.notes.unshift({
    id: `note-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: "Biller (Deferral Cancelled)",
    content: "Claim deferral removed. Restored to active workable queues.",
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
        source: "remittance",
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

// ─── Patient Balances Actions: Cancel vs Write-off (§11.4) ───────────────────

export function cancelPatientBalance(balanceId: string): { success: boolean; message: string } {
  const state = getStoredRcmState();
  const balance = state.patientBalances.find((b) => b.id === balanceId);
  if (!balance) return { success: false, message: "Balance record not found" };

  if (balance.source === "remittance") {
    return {
      success: false,
      message: "Remittance-derived patient balances cannot be cancelled. They must be recorded as a Write-Off.",
    };
  }

  state.patientBalances = state.patientBalances.filter((b) => b.id !== balanceId);
  saveRcmState(state);
  return { success: true, message: "Manual balance cancelled successfully." };
}

export function writeOffPatientBalance(balanceId: string): { success: boolean; message: string } {
  const state = getStoredRcmState();
  const balance = state.patientBalances.find((b) => b.id === balanceId);
  if (!balance) return { success: false, message: "Balance record not found" };

  balance.totalBalance = 0;
  balance.invoiceableBalance = 0;
  balance.nonInvoiceableBalance = 0;
  saveRcmState(state);
  return { success: true, message: "Balance successfully written off as bad debt / contractual loss." };
}

export function batchChargeSavedCards(
  clientIds: string[],
  amountFloor = 20,
  amountCeiling = 500
): { count: number; total: number; results: { clientId: string; clientName: string; amount: number; status: string }[] } {
  const state = getStoredRcmState();
  const results: { clientId: string; clientName: string; amount: number; status: string }[] = [];
  let total = 0;

  state.patientBalances.forEach((b) => {
    if (clientIds.includes(b.clientId)) {
      if (b.invoiceableBalance >= amountFloor && b.invoiceableBalance <= amountCeiling) {
        const chargeAmount = b.invoiceableBalance;
        b.invoiceableBalance = 0;
        b.totalBalance = Math.max(0, b.totalBalance - chargeAmount);
        total += chargeAmount;
        results.push({
          clientId: b.clientId,
          clientName: b.clientName,
          amount: chargeAmount,
          status: "Charged to default card ending in 4242",
        });
      }
    }
  });

  saveRcmState(state);
  return { count: results.length, total, results };
}

// ─── Eligibility & Insurance Sync (§2.3) ────────────────────────────────────

export function recheckEligibility(checkId: string): void {
  const state = getStoredRcmState();
  const check = state.eligibilityChecks.find((c) => c.id === checkId);
  if (!check) return;

  check.status = "active";
  check.checkedAt = new Date().toISOString();
  check.source = "manual_rerun";
  check.copayAmount = check.copayAmount || 25;
  check.inconclusiveReason = undefined;

  saveRcmState(state);
}

export function updateClientInsuranceInStore(
  clientId: string,
  clientName: string,
  insurance: ClientInsurance
): void {
  const state = getStoredRcmState();

  // Find or create eligibility check for this client
  let check = state.eligibilityChecks.find((c) => c.clientId === clientId);
  const isSelfPay = insurance.payerName === "Self Pay";
  const isMissing = insurance.payerName === "Missing Insurance" || !insurance.payerName;

  if (check) {
    check.payerName = insurance.payerName;
    check.memberId = insurance.policyNumber;
    check.status = isSelfPay ? "self_pay" : isMissing ? "inactive" : "active";
    check.checkedAt = new Date().toISOString();
    check.inconclusiveReason = isMissing ? "No insurance policy on file." : undefined;
  } else {
    state.eligibilityChecks.unshift({
      id: `ELG-${Math.floor(100 + Math.random() * 900)}`,
      clientId,
      clientName,
      appointmentId: "N/A",
      appointmentDate: new Date().toISOString().split("T")[0],
      payerName: insurance.payerName || "Unassigned",
      memberId: insurance.policyNumber,
      status: isSelfPay ? "self_pay" : isMissing ? "inactive" : "active",
      checkedAt: new Date().toISOString(),
      copayAmount: isSelfPay ? 0 : 25,
      deductibleRemaining: isSelfPay ? 0 : 250,
      source: "manual_rerun",
    });
  }

  saveRcmState(state);
}

// ─── Scrub Rule Actions ──────────────────────────────────────────────────────

export function toggleScrubRule(ruleId: string): void {
  const state = getStoredRcmState();
  const rule = state.scrubRules.find((r) => r.id === ruleId);
  if (!rule) return;

  rule.isEnabled = !rule.isEnabled;
  saveRcmState(state);
}

export function addScrubRule(rule: Partial<ScrubRule>): ScrubRule {
  const state = getStoredRcmState();
  const newRule: ScrubRule = {
    id: `RULE-${Math.floor(100 + Math.random() * 900)}`,
    ruleCode: rule.ruleCode || `R-CUSTOM-${Math.floor(10 + Math.random() * 90)}`,
    name: rule.name || "Custom Billing Rule",
    description: rule.description || "",
    severity: rule.severity || "warning",
    actionOutcome: rule.actionOutcome || "skippable_warning",
    isEnabled: rule.isEnabled !== undefined ? rule.isEnabled : true,
    priorityOrder: state.scrubRules.length + 1,
    category: rule.category || "coding",
  };

  state.scrubRules.unshift(newRule);
  saveRcmState(state);
  return newRule;
}

export function updateScrubRule(ruleId: string, patch: Partial<ScrubRule>): void {
  const state = getStoredRcmState();
  const rule = state.scrubRules.find((r) => r.id === ruleId);
  if (!rule) return;

  Object.assign(rule, patch);
  saveRcmState(state);
}

// ─── Fee Schedule Actions (§12) ──────────────────────────────────────────────

export function addFeeScheduleItem(item: Partial<FeeScheduleItem>): FeeScheduleItem {
  const state = getStoredRcmState();
  const newItem: FeeScheduleItem = {
    id: `FEE-${Math.floor(100 + Math.random() * 900)}`,
    cptCode: item.cptCode || "99213",
    description: item.description || "Service Procedure",
    standardFee: Number(item.standardFee) || 150,
    medicareAllowed: Number(item.medicareAllowed) || 95,
    commercialExpectedAvg: Number(item.commercialExpectedAvg) || 125,
    category: item.category || "Evaluation & Management",
    requiresPriorAuth: Boolean(item.requiresPriorAuth),
  };

  state.feeSchedule.unshift(newItem);
  saveRcmState(state);
  return newItem;
}

export function updateFeeScheduleItem(itemId: string, patch: Partial<FeeScheduleItem>): void {
  const state = getStoredRcmState();
  const item = state.feeSchedule.find((f) => f.id === itemId);
  if (!item) return;

  Object.assign(item, patch);
  saveRcmState(state);
}

// ─── Prior Auth Actions (§6) ─────────────────────────────────────────────────

export function addPriorAuth(record: Partial<PriorAuthRecord>): PriorAuthRecord {
  const state = getStoredRcmState();
  const newAuth: PriorAuthRecord = {
    id: `PA-${Math.floor(100 + Math.random() * 900)}`,
    authNumber: record.authNumber || `PA-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    clientId: record.clientId || "c-1",
    clientName: record.clientName || "James Wilson",
    payerName: record.payerName || "Blue Cross Blue Shield",
    cptCodes: record.cptCodes || ["90834"],
    authorizedVisits: Number(record.authorizedVisits) || 10,
    usedVisits: Number(record.usedVisits) || 0,
    startDate: record.startDate || new Date().toISOString().split("T")[0],
    expirationDate: record.expirationDate || "2026-12-31",
    status: record.status || "active",
  };

  state.priorAuths.unshift(newAuth);
  saveRcmState(state);
  return newAuth;
}

export function updatePriorAuth(authId: string, patch: Partial<PriorAuthRecord>): void {
  const state = getStoredRcmState();
  const pa = state.priorAuths.find((p) => p.id === authId);
  if (!pa) return;

  Object.assign(pa, patch);
  saveRcmState(state);
}

export function deletePriorAuth(authId: string): void {
  const state = getStoredRcmState();
  state.priorAuths = state.priorAuths.filter((p) => p.id !== authId);
  saveRcmState(state);
}

// ─── Credentialing Actions (§12) ─────────────────────────────────────────────

export function addCredentialingRecord(record: Partial<CredentialingRecord>): CredentialingRecord {
  const state = getStoredRcmState();
  const newCred: CredentialingRecord = {
    id: `CRED-${Math.floor(100 + Math.random() * 900)}`,
    providerId: record.providerId || "TM-001",
    providerName: record.providerName || "Dr. Amanda Clark",
    payerName: record.payerName || "Blue Cross Blue Shield",
    trueCredentialingStatus: record.trueCredentialingStatus || "pending",
    transactionEnrollmentStatus: record.transactionEnrollmentStatus || "enrollment_pending",
    effectiveDate: record.effectiveDate || new Date().toISOString().split("T")[0],
    terminationDate: record.terminationDate || null,
    npi: record.npi || "1829304192",
    taxId: record.taxId || "84-2910394",
    isServiceDateValid: record.isServiceDateValid !== undefined ? record.isServiceDateValid : true,
  };

  state.credentialing.unshift(newCred);
  saveRcmState(state);
  return newCred;
}

export function updateCredentialingRecord(recordId: string, patch: Partial<CredentialingRecord>): void {
  const state = getStoredRcmState();
  const cred = state.credentialing.find((c) => c.id === recordId);
  if (!cred) return;

  Object.assign(cred, patch);
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
