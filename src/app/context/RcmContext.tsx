import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  RcmStoreState,
  getStoredRcmState,
  saveRcmState,
  RCM_STORE_EVENT,
  createEncounterFromAppointment as storeCreateEncounter,
  lockEncounterDocumentation as storeLockDocumentation,
  submitClaim as storeSubmitClaim,
  resubmitClaim as storeResubmitClaim,
  voidClaim as storeVoidClaim,
  acceptScrubIssue as storeAcceptScrub,
  rejectScrubIssue as storeRejectScrub,
  updateDenialClusterStatus as storeUpdateCluster,
  saveAppealDraft as storeSaveAppeal,
  executePostingAction as storeExecutePosting,
  recheckEligibility as storeRecheckEligibility,
  toggleScrubRule as storeToggleRule,
  createClaimFromChargeCapture as storeCreateClaimFromChargeCapture,
  type ChargeCaptureParams,
} from "../../lib/rcmStore";
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
} from "../types/rcmTypes";
import { useInvoices } from "./InvoiceContext";
import { appendActivity } from "../../lib/activityEngine";
import { toast } from "sonner";

interface RcmContextValue {
  state: RcmStoreState;
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

  // Actions
  createEncounterFromAppointment: (
    appointmentId: string | number,
    clientInfo: { id: string; name: string; email?: string; phone?: string },
    documentationLocked?: boolean,
    providerName?: string
  ) => Encounter;
  lockEncounterDocumentation: (encounterId: string, source?: "scribe" | "manual") => void;
  submitClaim: (claimId: string) => void;
  resubmitClaim: (claimId: string) => void;
  voidClaim: (claimId: string) => void;
  acceptScrubIssue: (claimId: string, issueId: string) => void;
  rejectScrubIssue: (claimId: string, issueId: string, reason: string) => void;
  updateDenialClusterStatus: (
    clusterId: string,
    newStatus: "denied" | "under_review" | "resubmitted" | "reconciled"
  ) => void;
  saveAppealDraft: (clusterId: string, newDraft: string) => void;
  executePostingAction: (
    remittanceId: string,
    action: PostingAction,
    params?: { customNote?: string; adjustmentAmount?: number }
  ) => void;
  recheckEligibility: (checkId: string) => void;
  toggleScrubRule: (ruleId: string) => void;
  generatePatientStatement: (balanceId: string) => boolean;
  createClaimFromChargeCapture: (params: ChargeCaptureParams) => Claim;
}

const RcmContext = createContext<RcmContextValue | null>(null);

export function RcmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RcmStoreState>(() => getStoredRcmState());
  const { invoices } = useInvoices();

  useEffect(() => {
    const handleUpdate = () => {
      setState(getStoredRcmState());
    };
    window.addEventListener(RCM_STORE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(RCM_STORE_EVENT, handleUpdate);
    };
  }, []);

  const createEncounterFromAppointment = useCallback(
    (
      appointmentId: string | number,
      clientInfo: { id: string; name: string; email?: string; phone?: string },
      documentationLocked = false,
      providerName = "Dr. Amanda Clark"
    ) => {
      const encounter = storeCreateEncounter(
        appointmentId,
        clientInfo,
        documentationLocked,
        providerName
      );
      appendActivity({
        id: `act-enc-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: clientInfo.id,
        createdBy: "system",
        type: "process_entry",
        details: {
          primary: `Encounter #${encounter.id} created`,
          secondary: documentationLocked ? "Ready to bill" : "Pending clinician documentation lock",
        },
      });
      return encounter;
    },
    []
  );

  const lockEncounterDocumentation = useCallback((encounterId: string, source: "scribe" | "manual" = "manual") => {
    storeLockDocumentation(encounterId, source);
    toast.success("Documentation locked — Encounter is now Ready to Bill");
  }, []);

  const submitClaim = useCallback((claimId: string) => {
    storeSubmitClaim(claimId);
    appendActivity({
      id: `act-clm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      createdBy: "user",
      type: "field_update",
      fieldLabel: "Claim Submission",
      newValue: `Submitted to Clearinghouse (Claim #${claimId})`,
    });
    toast.success(`Claim ${claimId} successfully submitted to Clearinghouse`);
  }, []);

  const resubmitClaim = useCallback((claimId: string) => {
    storeResubmitClaim(claimId);
    toast.success(`Claim ${claimId} resubmitted with corrected billing data`);
  }, []);

  const voidClaim = useCallback((claimId: string) => {
    storeVoidClaim(claimId);
    toast.info(`Claim ${claimId} marked as void`);
  }, []);

  const acceptScrubIssue = useCallback((claimId: string, issueId: string) => {
    storeAcceptScrub(claimId, issueId);
    toast.success("AI scrub proposal accepted");
  }, []);

  const rejectScrubIssue = useCallback((claimId: string, issueId: string, reason: string) => {
    storeRejectScrub(claimId, issueId, reason);
    toast.info("Scrub issue dismissed with audit note");
  }, []);

  const updateDenialClusterStatus = useCallback(
    (clusterId: string, newStatus: "denied" | "under_review" | "resubmitted" | "reconciled") => {
      storeUpdateCluster(clusterId, newStatus);
      toast.success(`Denial Cluster updated to ${newStatus.replace("_", " ")}`);
    },
    []
  );

  const saveAppealDraft = useCallback((clusterId: string, newDraft: string) => {
    storeSaveAppeal(clusterId, newDraft);
    toast.success("AI Appeal Letter draft saved");
  }, []);

  const executePostingAction = useCallback(
    (remittanceId: string, action: PostingAction, params?: { customNote?: string; adjustmentAmount?: number }) => {
      storeExecutePosting(remittanceId, action, params);
      toast.success(`Remittance posted with action: ${action.replace(/_/g, " ")}`);
    },
    []
  );

  const recheckEligibility = useCallback((checkId: string) => {
    storeRecheckEligibility(checkId);
    toast.success("Eligibility re-verified successfully");
  }, []);

  const toggleScrubRule = useCallback((ruleId: string) => {
    storeToggleRule(ruleId);
  }, []);

  // ─── Patient Responsibility Sequencing Rule ──────────────────────────────────
  const generatePatientStatement = useCallback(
    (balanceId: string): boolean => {
      const curr = getStoredRcmState();
      const balance = curr.patientBalances.find((b) => b.id === balanceId);
      if (!balance) {
        toast.error("Balance record not found");
        return false;
      }

      // Sequencing rule: Denied portion sitting alongside PR blocks statement
      if (balance.nonInvoiceableBalance > 0) {
        toast.error(
          `Cannot generate statement: $${balance.nonInvoiceableBalance.toFixed(
            2
          )} in active denials is pending resolution. Patient Responsibility is not fully settled.`
        );
        return false;
      }

      if (balance.invoiceableBalance <= 0) {
        toast.info("No outstanding patient responsibility to invoice");
        return false;
      }

      // Create linked ClientInvoice in localStorage/sessionStorage
      const invId = `INV-STMT-${Math.floor(1000 + Math.random() * 9000)}`;
      const newInvoice = {
        id: invId,
        clientId: balance.clientId,
        clientName: balance.clientName,
        clientEmail: balance.clientEmail,
        clientPhone: balance.clientPhone,
        status: "sent" as const,
        currency: "$",
        lineItems: [
          {
            id: `li-${Date.now()}`,
            source: "manual" as const,
            description: `Patient Responsibility (Post-Adjudication: ${balance.primaryPayer})`,
            quantity: 1,
            unitPrice: balance.invoiceableBalance,
            discountAmount: 0,
            taxPercent: 0,
          },
        ],
        subtotal: balance.invoiceableBalance,
        discountAmount: 0,
        taxAmount: 0,
        total: balance.invoiceableBalance,
        amountPaid: 0,
        paymentType: "self_pay" as const,
        createdAt: new Date().toISOString(),
        createdBy: "system" as const,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        sentAt: new Date().toISOString(),
        sentVia: "email" as const,
        paymentLinkUrl: `https://pay.mantraassist.mock/stmt-${balance.clientId.toLowerCase()}`,
        claimId: balance.linkedClaimIds[0],
        encounterId: balance.linkedEncounterIds[0],
        insurancePaidAmount: 250, // Adjudicated insurance amount
      };

      try {
        const rawInvoices = sessionStorage.getItem("invoices");
        const parsedInvoices = rawInvoices ? JSON.parse(rawInvoices) : [];
        parsedInvoices.unshift(newInvoice);
        sessionStorage.setItem("invoices", JSON.stringify(parsedInvoices));
        window.dispatchEvent(new Event("invoices_updated"));
      } catch (err) {
        console.error("Failed to append invoice", err);
      }

      // Update patient balance record
      balance.statementCount += 1;
      balance.lastStatementDate = new Date().toISOString().split("T")[0];
      saveRcmState(curr);

      // Record Activity
      appendActivity({
        id: `act-stmt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: balance.clientId,
        createdBy: "system",
        type: "field_update",
        fieldLabel: "Patient Statement Generated",
        newValue: `Statement #${invId} ($${balance.invoiceableBalance.toFixed(2)}) sent to ${balance.clientName}`,
      });

      toast.success(`Patient Statement #${invId} generated and dispatched via payment link`);
      return true;
    },
    [invoices]
  );

  const createClaimFromChargeCapture = useCallback((params: ChargeCaptureParams) => {
    const claim = storeCreateClaimFromChargeCapture(params);
    appendActivity({
      id: `act-clm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      clientId: params.clientId,
      createdBy: "user",
      type: "field_update",
      fieldLabel: "Charge Capture",
      newValue: `Claim #${claim.id} generated ($${params.billedAmount.toFixed(2)}) and submitted for adjudication`,
    });
    toast.success(`Claim ${claim.id} created and moved to In Adjudication`);
    return claim;
  }, []);

  const value: RcmContextValue = {
    state,
    eligibilityChecks: state.eligibilityChecks,
    encounters: state.encounters,
    claims: state.claims,
    denialClusters: state.denialClusters,
    remittanceLines: state.remittanceLines,
    patientBalances: state.patientBalances,
    scrubRules: state.scrubRules,
    feeSchedule: state.feeSchedule,
    priorAuths: state.priorAuths,
    credentialing: state.credentialing,
    payerPerformance: state.payerPerformance,

    createEncounterFromAppointment,
    lockEncounterDocumentation,
    submitClaim,
    resubmitClaim,
    voidClaim,
    acceptScrubIssue,
    rejectScrubIssue,
    updateDenialClusterStatus,
    saveAppealDraft,
    executePostingAction,
    recheckEligibility,
    toggleScrubRule,
    generatePatientStatement,
    createClaimFromChargeCapture,
  };

  return <RcmContext.Provider value={value}>{children}</RcmContext.Provider>;
}

// ─── Focused Sub-Hooks to Avoid Excessive Re-renders ─────────────────────────

export function useRcm() {
  const ctx = useContext(RcmContext);
  if (!ctx) {
    throw new Error("useRcm must be used within an RcmProvider");
  }
  return ctx;
}

export function useClaims() {
  const { claims, submitClaim, resubmitClaim, voidClaim, acceptScrubIssue, rejectScrubIssue } = useRcm();
  return { claims, submitClaim, resubmitClaim, voidClaim, acceptScrubIssue, rejectScrubIssue };
}

export function useEncounters() {
  const { encounters, createEncounterFromAppointment, lockEncounterDocumentation } = useRcm();
  return { encounters, createEncounterFromAppointment, lockEncounterDocumentation };
}

export function useDenials() {
  const { denialClusters, updateDenialClusterStatus, saveAppealDraft } = useRcm();
  return { denialClusters, updateDenialClusterStatus, saveAppealDraft };
}

export function usePosting() {
  const { remittanceLines, executePostingAction } = useRcm();
  return { remittanceLines, executePostingAction };
}

export function usePatientAr() {
  const { patientBalances, generatePatientStatement } = useRcm();
  return { patientBalances, generatePatientStatement };
}

export function useEligibility() {
  const { eligibilityChecks, recheckEligibility } = useRcm();
  return { eligibilityChecks, recheckEligibility };
}
