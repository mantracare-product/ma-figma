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
  assignClaim as storeAssignClaim,
  deferClaim as storeDeferClaim,
  cancelDeferClaim as storeCancelDeferClaim,
  acceptScrubIssue as storeAcceptScrub,
  rejectScrubIssue as storeRejectScrub,
  updateDenialClusterStatus as storeUpdateCluster,
  saveAppealDraft as storeSaveAppeal,
  executePostingAction as storeExecutePosting,
  cancelPatientBalance as storeCancelBalance,
  writeOffPatientBalance as storeWriteOffBalance,
  batchChargeSavedCards as storeBatchCharge,
  recheckEligibility as storeRecheckEligibility,
  updateClientInsuranceInStore as storeUpdateInsurance,
  toggleScrubRule as storeToggleRule,
  addScrubRule as storeAddRule,
  updateScrubRule as storeUpdateRule,
  addFeeScheduleItem as storeAddFee,
  updateFeeScheduleItem as storeUpdateFee,
  addPriorAuth as storeAddPriorAuth,
  updatePriorAuth as storeUpdatePriorAuth,
  deletePriorAuth as storeDeletePriorAuth,
  addCredentialingRecord as storeAddCred,
  updateCredentialingRecord as storeUpdateCred,
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
  ClientInsurance,
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
  assignClaim: (claimId: string, assignedTo: string) => void;
  deferClaim: (claimId: string, deferReason: string, deferredUntil: string) => void;
  cancelDeferClaim: (claimId: string) => void;
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
  cancelPatientBalance: (balanceId: string) => { success: boolean; message: string };
  writeOffPatientBalance: (balanceId: string) => { success: boolean; message: string };
  batchChargeSavedCards: (clientIds: string[], floor?: number, ceiling?: number) => { count: number; total: number; results: any[] };
  recheckEligibility: (checkId: string) => void;
  updateClientInsurance: (clientId: string, clientName: string, insurance: ClientInsurance) => void;
  toggleScrubRule: (ruleId: string) => void;
  addScrubRule: (rule: Partial<ScrubRule>) => ScrubRule;
  updateScrubRule: (ruleId: string, patch: Partial<ScrubRule>) => void;
  addFeeScheduleItem: (item: Partial<FeeScheduleItem>) => FeeScheduleItem;
  updateFeeScheduleItem: (itemId: string, patch: Partial<FeeScheduleItem>) => void;
  addPriorAuth: (record: Partial<PriorAuthRecord>) => PriorAuthRecord;
  updatePriorAuth: (authId: string, patch: Partial<PriorAuthRecord>) => void;
  deletePriorAuth: (authId: string) => void;
  addCredentialingRecord: (record: Partial<CredentialingRecord>) => CredentialingRecord;
  updateCredentialingRecord: (recordId: string, patch: Partial<CredentialingRecord>) => void;
  generatePatientStatement: (balanceId: string) => boolean;
}

const RcmContext = createContext<RcmContextValue | null>(null);

export function RcmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RcmStoreState>(getStoredRcmState);
  const { invoices } = useInvoices();

  useEffect(() => {
    const handleStoreUpdate = () => {
      setState(getStoredRcmState());
    };
    window.addEventListener(RCM_STORE_EVENT, handleStoreUpdate);
    return () => window.removeEventListener(RCM_STORE_EVENT, handleStoreUpdate);
  }, []);

  const createEncounterFromAppointment = useCallback(
    (
      appointmentId: string | number,
      clientInfo: { id: string; name: string; email?: string; phone?: string },
      documentationLocked = false,
      providerName = "Dr. Amanda Clark"
    ) => {
      const enc = storeCreateEncounter(appointmentId, clientInfo, documentationLocked, providerName);
      appendActivity({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: clientInfo.id,
        createdBy: "system",
        type: "field_update",
        fieldLabel: "RCM Encounter Created",
        newValue: `Encounter #${enc.id} created from Appointment #${appointmentId}. Status: ${enc.status}`,
      });
      return enc;
    },
    []
  );

  const lockEncounterDocumentation = useCallback(
    (encounterId: string, source: "scribe" | "manual" = "manual") => {
      storeLockDocumentation(encounterId, source);
      const curr = getStoredRcmState();
      const enc = curr.encounters.find((e) => e.id === encounterId);
      if (enc) {
        appendActivity({
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          clientId: enc.clientId,
          createdBy: source === "scribe" ? "ai_scribe" : "user",
          type: "field_update",
          fieldLabel: "Documentation Signed & Locked",
          newValue: `Encounter #${encounterId} documentation locked via ${source}. Claim ready for billing.`,
        });
      }
      toast.success(`Documentation locked for Encounter ${encounterId}`);
    },
    []
  );

  const submitClaim = useCallback((claimId: string) => {
    storeSubmitClaim(claimId);
    const curr = getStoredRcmState();
    const cl = curr.claims.find((c) => c.id === claimId);
    if (cl) {
      appendActivity({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: cl.clientId,
        createdBy: "user",
        type: "field_update",
        fieldLabel: "Claim Submitted (EDI 837)",
        newValue: `Claim #${claimId} ($${cl.billedAmount}) sent to ${cl.payerName}.`,
      });
    }
    toast.success(`Claim ${claimId} submitted to clearinghouse`);
  }, []);

  const resubmitClaim = useCallback((claimId: string) => {
    storeResubmitClaim(claimId);
    const curr = getStoredRcmState();
    const cl = curr.claims.find((c) => c.id === claimId);
    if (cl) {
      appendActivity({
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientId: cl.clientId,
        createdBy: "user",
        type: "field_update",
        fieldLabel: "Claim Resubmitted",
        newValue: `Claim #${claimId} resubmitted to ${cl.payerName} after correction.`,
      });
    }
    toast.success(`Claim ${claimId} resubmitted successfully`);
  }, []);

  const voidClaim = useCallback((claimId: string) => {
    storeVoidClaim(claimId);
    toast.info(`Claim ${claimId} voided`);
  }, []);

  const assignClaim = useCallback((claimId: string, assignedTo: string) => {
    storeAssignClaim(claimId, assignedTo);
    toast.success(`Claim ${claimId} assigned to ${assignedTo}`);
  }, []);

  const deferClaim = useCallback((claimId: string, deferReason: string, deferredUntil: string) => {
    storeDeferClaim(claimId, deferReason, deferredUntil);
    toast.info(`Claim ${claimId} deferred until ${deferredUntil}`);
  }, []);

  const cancelDeferClaim = useCallback((claimId: string) => {
    storeCancelDeferClaim(claimId);
    toast.success(`Deferral removed for Claim ${claimId}`);
  }, []);

  const acceptScrubIssue = useCallback((claimId: string, issueId: string) => {
    storeAcceptScrub(claimId, issueId);
    toast.success("AI scrub fix accepted and applied");
  }, []);

  const rejectScrubIssue = useCallback((claimId: string, issueId: string, reason: string) => {
    storeRejectScrub(claimId, issueId, reason);
    toast.info("Scrub suggestion dismissed with reason recorded");
  }, []);

  const updateDenialClusterStatus = useCallback(
    (clusterId: string, newStatus: "denied" | "under_review" | "resubmitted" | "reconciled") => {
      storeUpdateCluster(clusterId, newStatus);
      toast.success(`Cluster ${clusterId} moved to ${newStatus.replace("_", " ")}`);
    },
    []
  );

  const saveAppealDraft = useCallback((clusterId: string, newDraft: string) => {
    storeSaveAppeal(clusterId, newDraft);
    toast.success("Appeal letter template updated");
  }, []);

  const executePostingAction = useCallback(
    (remittanceId: string, action: PostingAction, params?: { customNote?: string; adjustmentAmount?: number }) => {
      storeExecutePosting(remittanceId, action, params);
      toast.success(`Posting action '${action.replace("_", " ")}' executed`);
    },
    []
  );

  const cancelPatientBalance = useCallback((balanceId: string) => {
    const res = storeCancelBalance(balanceId);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
    return res;
  }, []);

  const writeOffPatientBalance = useCallback((balanceId: string) => {
    const res = storeWriteOffBalance(balanceId);
    toast.success(res.message);
    return res;
  }, []);

  const batchChargeSavedCards = useCallback((clientIds: string[], floor = 20, ceiling = 500) => {
    const res = storeBatchCharge(clientIds, floor, ceiling);
    toast.success(`Charged ${res.count} patients a total of $${res.total.toFixed(2)}`);
    return res;
  }, []);

  const recheckEligibility = useCallback((checkId: string) => {
    storeRecheckEligibility(checkId);
    toast.success("Eligibility re-verified. Coverage active.");
  }, []);

  const updateClientInsurance = useCallback((clientId: string, clientName: string, insurance: ClientInsurance) => {
    storeUpdateInsurance(clientId, clientName, insurance);
    toast.success(`Insurance coverage updated for ${clientName}`);
  }, []);

  const toggleScrubRule = useCallback((ruleId: string) => {
    storeToggleRule(ruleId);
  }, []);

  const addScrubRule = useCallback((rule: Partial<ScrubRule>) => {
    const created = storeAddRule(rule);
    toast.success(`Billing Rule ${created.ruleCode} created`);
    return created;
  }, []);

  const updateScrubRule = useCallback((ruleId: string, patch: Partial<ScrubRule>) => {
    storeUpdateRule(ruleId, patch);
    toast.success("Billing rule updated");
  }, []);

  const addFeeScheduleItem = useCallback((item: Partial<FeeScheduleItem>) => {
    const created = storeAddFee(item);
    toast.success(`Fee code ${created.cptCode} added to schedule`);
    return created;
  }, []);

  const updateFeeScheduleItem = useCallback((itemId: string, patch: Partial<FeeScheduleItem>) => {
    storeUpdateFee(itemId, patch);
    toast.success("Fee schedule code updated");
  }, []);

  const addPriorAuth = useCallback((record: Partial<PriorAuthRecord>) => {
    const created = storeAddPriorAuth(record);
    toast.success(`Prior Auth ${created.authNumber} recorded`);
    return created;
  }, []);

  const updatePriorAuth = useCallback((authId: string, patch: Partial<PriorAuthRecord>) => {
    storeUpdatePriorAuth(authId, patch);
    toast.success("Prior auth updated");
  }, []);

  const deletePriorAuth = useCallback((authId: string) => {
    storeDeletePriorAuth(authId);
    toast.info("Prior auth removed");
  }, []);

  const addCredentialingRecord = useCallback((record: Partial<CredentialingRecord>) => {
    const created = storeAddCred(record);
    toast.success(`Credentialing entry created for ${created.providerName}`);
    return created;
  }, []);

  const updateCredentialingRecord = useCallback((recordId: string, patch: Partial<CredentialingRecord>) => {
    storeUpdateCred(recordId, patch);
    toast.success("Credentialing record updated");
  }, []);

  const generatePatientStatement = useCallback(
    (balanceId: string): boolean => {
      const curr = getStoredRcmState();
      const balance = curr.patientBalances.find((b) => b.id === balanceId);
      if (!balance || balance.invoiceableBalance <= 0) {
        toast.error("No invoiceable patient balance available to generate statement.");
        return false;
      }

      const invId = `INV-PR-${Math.floor(1000 + Math.random() * 9000)}`;
      const newInvoice = {
        id: invId,
        invoiceNumber: invId,
        clientId: balance.clientId,
        clientName: balance.clientName,
        clientEmail: balance.clientEmail || "",
        clientPhone: balance.clientPhone || "",
        date: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        status: "pending" as const,
        totalAmount: balance.invoiceableBalance,
        paidAmount: 0,
        subtotal: balance.invoiceableBalance,
        discountAmount: 0,
        lineItems: [
          {
            id: `item-${Date.now()}`,
            description: `Adjudicated Patient Responsibility — ${balance.primaryPayer}`,
            quantity: 1,
            unitPrice: balance.invoiceableBalance,
            totalPrice: balance.invoiceableBalance,
          },
        ],
        claimId: balance.linkedClaimIds[0],
        encounterId: balance.linkedEncounterIds[0],
        paymentLinkUrl: `https://pay.mantraassist.com/${invId}`,
      };

      try {
        const storedInvoices = sessionStorage.getItem("invoices");
        const parsedInvoices = storedInvoices ? JSON.parse(storedInvoices) : [];
        parsedInvoices.unshift(newInvoice);
        sessionStorage.setItem("invoices", JSON.stringify(parsedInvoices));
        window.dispatchEvent(new Event("invoices_updated"));
      } catch (err) {
        console.error("Failed to append invoice", err);
      }

      balance.statementCount += 1;
      balance.lastStatementDate = new Date().toISOString().split("T")[0];
      saveRcmState(curr);

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
    []
  );

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
    assignClaim,
    deferClaim,
    cancelDeferClaim,
    acceptScrubIssue,
    rejectScrubIssue,
    updateDenialClusterStatus,
    saveAppealDraft,
    executePostingAction,
    cancelPatientBalance,
    writeOffPatientBalance,
    batchChargeSavedCards,
    recheckEligibility,
    updateClientInsurance,
    toggleScrubRule,
    addScrubRule,
    updateScrubRule,
    addFeeScheduleItem,
    updateFeeScheduleItem,
    addPriorAuth,
    updatePriorAuth,
    deletePriorAuth,
    addCredentialingRecord,
    updateCredentialingRecord,
    generatePatientStatement,
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
  const {
    claims,
    submitClaim,
    resubmitClaim,
    voidClaim,
    assignClaim,
    deferClaim,
    cancelDeferClaim,
    acceptScrubIssue,
    rejectScrubIssue,
  } = useRcm();
  return {
    claims,
    submitClaim,
    resubmitClaim,
    voidClaim,
    assignClaim,
    deferClaim,
    cancelDeferClaim,
    acceptScrubIssue,
    rejectScrubIssue,
  };
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
  const {
    patientBalances,
    generatePatientStatement,
    cancelPatientBalance,
    writeOffPatientBalance,
    batchChargeSavedCards,
  } = useRcm();
  return {
    patientBalances,
    generatePatientStatement,
    cancelPatientBalance,
    writeOffPatientBalance,
    batchChargeSavedCards,
  };
}

export function useEligibility() {
  const { eligibilityChecks, recheckEligibility, updateClientInsurance } = useRcm();
  return { eligibilityChecks, recheckEligibility, updateClientInsurance };
}
