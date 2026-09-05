/**
 * MantraAssist Revenue Cycle Management (RCM) — Core Types
 * Based on MantraAssist_RCM_Spec.md
 */

// ─── 1. Eligibility ──────────────────────────────────────────────────────────

export type EligibilityStatus =
  | "active"
  | "inactive"
  | "not_covered"
  | "inconclusive"
  | "unable_to_respond"
  | "pending"
  | "self_pay"
  | "site_responsibility";

export interface EligibilityCheck {
  id: string;
  clientId: string;                 // FK to unified client record
  clientName: string;
  appointmentId: string;
  appointmentDate: string;
  payerName: string;
  memberId?: string;
  status: EligibilityStatus;
  checkedAt: string;
  copayAmount?: number;
  deductibleRemaining?: number;
  coinsurance?: number;             // Coinsurance percent, e.g. 20 for 20%
  terminationReason?: string;       // Reason for inactive or not covered
  source: "auto" | "manual_rerun";
  inconclusiveReason?: string;
  serviceName?: string;
  servicePrice?: number;
}

// ─── 2. Encounter ────────────────────────────────────────────────────────────

export type EncounterStatus =
  | "pending_documentation"
  | "ready_to_bill"
  | "billed"
  | "reconciled";

export interface Encounter {
  id: string;                       // e.g. "ENC-2026-4401"
  clientId: string;                 // FK to unified client record
  clientName: string;
  appointmentId: string;
  appointmentTitle?: string;
  providerName: string;
  serviceDate: string;
  cptCodes: string[];
  diagnosisCodes?: string[];
  documentationLocked: boolean;      // true when Scribe note signed OR manual override checked
  documentationSource: "scribe" | "manual";
  status: EncounterStatus;
  totalCharges?: number;
  claimIds: string[];
  invoiceId?: string;                // links to existing ClientInvoice when generated
  notes?: string;
  daysWaitingDocs?: number;
}

// ─── 3. Claim Lifecycle & Fault Attribution ──────────────────────────────────

export type ClaimLifecycleStatus =
  | "draft"
  | "scrubbing"
  | "awaiting_acknowledgement"
  | "in_adjudication"
  | "rejected"
  | "denied"
  | "paid"
  | "void";

export type FaultAttribution =
  | "platform_responsibility"
  | "site_action_required"
  | "unattributed";

export interface ClaimNote {
  id: string;
  createdAt: string;
  author: string;
  isAi?: boolean;
  content: string;
}

export interface ContractualAdjustment {
  reasonCode: string;
  description: string;
  amount: number;
}

export interface ClaimScrubIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  ruleId?: string;
  title: string;
  description: string;
  suggestedAction: string;
  accepted?: boolean;
  rejectedReason?: string;
}

export interface Claim {
  id: string;                       // e.g. "CLM-2026-8812"
  encounterId: string;
  appointmentId?: string;
  clientId: string;                 // FK to unified client record
  clientName: string;
  payerName: string;
  memberId?: string;
  providerName: string;
  cptCodes: string[];
  diagnosisCodes?: string[];
  serviceDate: string;
  submittedAt?: string;
  status: ClaimLifecycleStatus;
  billedAmount: number;
  allowedAmount?: number;
  paidAmount?: number;
  patientResponsibility?: number;
  timelyFilingDeadline: string;      // absolute ISO date, always computed
  timelyDaysRemaining: number;       // derived / refreshed on read
  faultAttribution?: FaultAttribution;
  rejectionReason?: string;           // populated only when status = "rejected"
  denialCarc?: string;                // CARC code, populated only when status = "denied"
  denialCarcDescription?: string;
  denialRarcs?: string[];
  denialRarcDescriptions?: string[];
  notes: ClaimNote[];
  adjustmentsList?: ContractualAdjustment[];
  scrubIssues?: ClaimScrubIssue[];
  source: "native" | "imported";
}

// ─── 4. Denial Clustering ───────────────────────────────────────────────────

export interface DenialClaimItem {
  claimId: string;
  clientId: string;
  clientName: string;
  encounterId: string;
  providerName: string;
  serviceDate: string;
  amount: number;
  timelyFilingDeadline: string;
  timelyDaysRemaining: number;
  priorityScore: number;
  status: "denied" | "under_review" | "resubmitted" | "reconciled" | "approved";
}

export interface DenialClusterGroup {
  id: string;                       // e.g. "DCLUST-BCBS-CO16"
  payerName: string;
  carc: { code: string; description: string };
  rarcs: { code: string; description: string }[];
  totalAmountAtRisk: number;
  claimCount: number;
  priority: "critical" | "high" | "standard";
  suggestedFixSummary: string;       // AI-generated, human-readable
  appealDraftTemplate: string;       // AI-generated, requires review before send (human gate)
  claims: DenialClaimItem[];
  status: "denied" | "under_review" | "resubmitted" | "reconciled";
  deferredUntil?: string;
  lastUpdated: string;
}

// ─── 5. Remittance & Payment Posting ─────────────────────────────────────────

export type PostingAction =
  | "negate"
  | "write_off"
  | "write_off_pr"
  | "push_to_pr"
  | "custom_adjustment";

export interface RemittanceAdjustment {
  reasonCode: string;
  amount: number;
  note: string;
}

export interface RemittanceLine {
  id: string;
  claimId: string;
  clientId: string;
  clientName: string;
  payerName: string;
  serviceDate: string;
  billedAmount: number;
  paidAmount: number;
  patientResponsibilityAmount: number;
  adjustments: RemittanceAdjustment[];
  postingAction?: PostingAction;
  source: "era_835" | "manual_eob" | "portal_check";
  status: "pending_review" | "confirmed" | "archived";
  receivedAt: string;
  postedAt?: string;
  checkNumber?: string;
  holdReason?: string;               // e.g. "Negative balance detected", "Unbalanced amounts"
}

// ─── 6. Patient Responsibility & Aging ───────────────────────────────────────

export type AgingBucket =
  | "0-30"
  | "31-60"
  | "61-90"
  | "91-120"
  | "121-180"
  | "181-365"
  | "366+";

export interface PatientArBalance {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  primaryPayer: string;
  invoiceableBalance: number;        // Only when PR = total encounter balance (sequencing rule)
  nonInvoiceableBalance: number;     // Denied portion pending appeal or unresolved
  totalBalance: number;
  hasActiveClawback: boolean;
  activeDenialCount: number;
  agingBucket: AgingBucket;
  lastStatementDate?: string;
  statementCount: number;
  linkedClaimIds: string[];
  linkedEncounterIds: string[];
}

// ─── 7. Billing Rules & Fee Schedule & Prior Auth ───────────────────────────

export interface ScrubRule {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  severity: "critical" | "warning" | "info";
  actionOutcome: "hard_block" | "skippable_warning" | "auto_modifier";
  isEnabled: boolean;
  priorityOrder: number;
  category: "coding" | "payer_specific" | "demographic" | "compliance";
}

export interface FeeScheduleItem {
  id: string;
  cptCode: string;
  description: string;
  standardFee: number;
  medicareAllowed: number;
  commercialExpectedAvg: number;
  category: string;
  requiresPriorAuth: boolean;
}

export interface PriorAuthRecord {
  id: string;
  authNumber: string;
  clientId: string;
  clientName: string;
  payerName: string;
  cptCodes: string[];
  authorizedVisits: number;
  usedVisits: number;
  startDate: string;
  expirationDate: string;
  status: "active" | "expiring_soon" | "exhausted" | "expired";
}

// ─── 8. Credentialing ────────────────────────────────────────────────────────

export interface CredentialingRecord {
  id: string;
  providerId: string;               // FK to team member record
  providerName: string;
  payerName: string;
  trueCredentialingStatus: "not_credentialed" | "pending" | "credentialed";
  transactionEnrollmentStatus:
    | "not_enrolled"
    | "enrollment_pending"
    | "action_required"
    | "live"
    | "rejected";
  effectiveDate: string;
  terminationDate: string | null;
  npi: string;
  taxId: string;
  isServiceDateValid: boolean;      // does effectiveDate/terminationDate cover today
}

// ─── 9. Payer Performance ────────────────────────────────────────────────────

export interface PayerPerformanceRow {
  payerName: string;
  totalBilled: number;
  totalCollected: number;
  approvalRate30d: number;
  approvalRateAllTime: number;
  denialRate: number;
  avgDaysToPay: number;
  patientMixPercent: number;
  primaryDenialReason: string;
}
