/**
 * Claim actions (Slice 4, item 4.5): `create_claim`, `scrub_claim`, `submit_claim` (mock clearinghouse).
 * Nothing names a stage: every stage/workflow comes from the step params. Everything the claim builder needs
 * (billing entity, NPI, POS, fees, provider credentials) is read from Billing setup. All payer/clearinghouse
 * answers are MOCK data.
 */
import type { BusEvent } from "./eventBus";
import { eventBus } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { getStoredClaims, saveClaim, generateClaimNumber, type Claim, type ClaimDiagnosisCode, type ClaimPayer, type ClaimServiceLine } from "./claimsStore";
import { claimService } from "./claimService";
import { getClaimWorkflow, getClaimWorkflows, findStage } from "./claimWorkflows";
import { resolveRecordContext } from "./recordContext";
import { getCoverageOn, getClientDemographics } from "./coveragesStore";
import {
  billingEntityStore, billingLocationsStore, claimDefaultsStore, getPayer, getProviderCredential, lookupFee, scrubRulesStore, type ScrubRule,
} from "./billingSetupStore";
import { getStoredServices } from "./servicesStore";
import { getStoredTeamMembers } from "./teamStore";
import { getScribeSessionById } from "./scribeSessionStore";
import { getSessionCodes, applyCodesToClaim } from "./scribeBilling";
import { readLocalRecordFields } from "./recordWriter";
import { isFieldValueEmpty } from "./processFieldValidation";
import { createObjectStore } from "./refStore";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const CREATE_CLAIM_STEP_KEYS = ["create_claim", "create-claim"];
export const SCRUB_CLAIM_STEP_KEYS = ["scrub_claim", "scrub-claim"];
export const SUBMIT_CLAIM_STEP_KEYS = ["submit_claim", "submit-claim"];
export const isCreateClaimStep = (k: string) => CREATE_CLAIM_STEP_KEYS.includes((k || "").toLowerCase());
export const isScrubClaimStep = (k: string) => SCRUB_CLAIM_STEP_KEYS.includes((k || "").toLowerCase());
export const isSubmitClaimStep = (k: string) => SUBMIT_CLAIM_STEP_KEYS.includes((k || "").toLowerCase());

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// ── create_claim ────────────────────────────────────────────────────────────────────────────────

export interface CreateClaimInput {
  clientId: string;
  sourceType: "appointment" | "scribe" | "invoice" | "client" | "instance";
  sourceId: string;
  appointmentId?: string;
  sessionId?: string;
  startWorkflow?: string;
  startStage?: string;
  /** "service_cpt" (the appointment's service -> CPT) | "scribe_codes" | "none" */
  linesFrom?: "service_cpt" | "scribe_codes" | "none";
  payerId?: string;
  assignee?: string;
  cause: StageMove["cause"];
}

function claimPayerFrom(payerId?: string): ClaimPayer | undefined {
  const p = getPayer(payerId);
  if (!p) return undefined;
  return { id: p.id, name: p.name, payerId: p.payerIdCode, type: p.type === "medicare" ? "Medicare" : p.type === "medicaid" ? "Medicaid" : "Commercial", contactPhone: p.phone };
}

export function performCreateClaim(input: CreateClaimInput): { claimId: string; created: boolean; missingData: string[]; workflowId: string; stage: string } {
  const workflow = (input.startWorkflow ? getClaimWorkflow(input.startWorkflow) || getClaimWorkflows().find((w) => (w.name || "").trim().toLowerCase() === input.startWorkflow!.trim().toLowerCase()) : undefined) || (input.startWorkflow ? undefined : getClaimWorkflows()[0]);
  if (!workflow) throw new Error(`create_claim: workflow "${input.startWorkflow}" not found`);
  const stage = input.startStage ? findStage(workflow, input.startStage) : undefined;
  if (input.startStage && !stage) throw new Error(`create_claim: stage "${input.startStage}" not found in "${workflow.name}"`);

  const dedupeKey = `claim:${input.sourceType}:${input.sourceId}:${workflow.id}`;
  const existing = getStoredClaims().find((c) => c.dedupeKey === dedupeKey);
  if (existing) return { claimId: existing.id, created: false, missingData: existing.missingData || [], workflowId: workflow.id, stage: existing.statusLabel || "" };

  const ctx = resolveRecordContext({ id: "x", event: "x", recordType: "appointment", recordId: input.appointmentId || "", data: { clientId: input.clientId, appointmentId: input.appointmentId }, timestamp: "" } as any);
  const client: any = ctx.client || {};
  const appt = ctx.appointment;
  const serviceDate = appt?.date || todayStr();
  const demo = getClientDemographics(input.clientId);
  const cov = getCoverageOn(input.clientId, serviceDate, "primary");
  const payer = claimPayerFrom(input.payerId || cov?.payerId);
  const missing: string[] = [];

  // provider (rendering) from the appointment's employee + Billing setup credentials
  const member: any = appt ? getStoredTeamMembers().find((m) => String(m.id) === String(appt.employeeId)) : undefined;
  const cred = member ? getProviderCredential(member.id) : undefined;
  if (!cred?.npi) missing.push("rendering_npi");

  const entity = billingEntityStore.get();
  if (!entity.legalName || !entity.npi) missing.push("billing_entity");
  const defaults = claimDefaultsStore.get();
  const loc = billingLocationsStore.get().find((l) => l.id === defaults.defaultBillingLocationId) || billingLocationsStore.get().find((l) => appt?.location && l.name === appt.location);
  const pos = loc?.pos || defaults.defaultPos || "";
  if (!pos) missing.push("place_of_service");
  if (!payer) missing.push("coverage");

  let diagnosisCodes: ClaimDiagnosisCode[] = [];
  let lines: ClaimServiceLine[] = [];
  const linesFrom = input.linesFrom || (input.sessionId ? "scribe_codes" : "service_cpt");
  const baseClaim: Claim = {
    id: `clm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    claimNumber: generateClaimNumber(),
    patientId: input.clientId,
    patientName: client.name || demo.legalFirstName || "",
    patientDob: demo.dob || client.dob || "",
    patientGender: demo.sex === "male" ? "Male" : demo.sex === "female" ? "Female" : "Other",
    patientAddress: demo.address || "",
    patientPhone: client.phone || "",
    insuredId: cov?.memberId || "",
    groupNumber: cov?.groupNumber,
    payer: payer || ({ id: "", name: "", payerId: "", type: "Private" } as ClaimPayer),
    appointmentId: appt ? String(appt.id) : input.appointmentId,
    appointmentTitle: appt?.title,
    scribeSessionId: input.sessionId,
    serviceId: appt ? String(appt.serviceId) : undefined,
    renderingProviderName: member?.name || "",
    renderingProviderNpi: cred?.npi || "",
    billingProviderName: entity.legalName,
    billingProviderNpi: entity.npi,
    billingProviderTaxId: entity.ein,
    billingProviderAddress: entity.address,
    placeOfService: pos,
    serviceDate,
    diagnosisCodes,
    lines,
    totalCharge: 0,
    amountPaid: 0,
    status: "Draft",
    assignee: input.assignee,
    timelyFilingDeadline: addDays(serviceDate, defaults.timelyFilingDays || 90),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    dedupeKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let claim = baseClaim;
  if (linesFrom === "scribe_codes" && input.sessionId) {
    const s = getScribeSessionById(input.sessionId);
    if (s) claim = applyCodesToClaim(claim, getSessionCodes(s), serviceDate);
  } else if (linesFrom === "service_cpt" && appt) {
    const svc = getStoredServices().find((s) => String(s.id) === String(appt.serviceId));
    if (svc?.cptCode) {
      const fee = lookupFee(svc.cptCode, payer?.id);
      const line: ClaimServiceLine = { id: `ln-${baseClaim.id}-1`, serviceDate, cptCode: svc.cptCode, description: svc.name, diagnosisPointer: "A", units: 1, chargeAmount: fee ?? svc.price ?? 0 };
      claim = { ...claim, lines: [line], totalCharge: line.chargeAmount };
    }
  }
  if (claim.lines.length === 0) missing.push("lines");
  if (claim.diagnosisCodes.length === 0) missing.push("diagnosis");
  claim = { ...claim, missingData: missing };

  const created = claimService.create(claim, workflow.id, stage?.id, input.cause);
  return { claimId: created.id, created: true, missingData: missing, workflowId: workflow.id, stage: created.statusLabel || "" };
}

registerActionRetryHandler("create_claim", (run) => performCreateClaim(run.payload as CreateClaimInput) as any);

export function executeCreateClaimStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const ctx = resolveRecordContext(event);
  const sessionId = (event.data as any)?.sessionId as string | undefined;
  const sourceType: CreateClaimInput["sourceType"] =
    params.source === "scribe" || (sessionId && !ctx.appointmentId) ? "scribe"
    : ctx.appointmentId ? "appointment"
    : event.recordType === "invoice" ? "invoice"
    : ctx.instance ? "instance"
    : "client";
  const sourceId = sourceType === "scribe" ? String(sessionId || event.recordId) : sourceType === "appointment" ? String(ctx.appointmentId) : sourceType === "instance" ? String(ctx.instance!.instanceId || ctx.instance!.id) : String(event.recordId);
  const input: CreateClaimInput = {
    clientId: ctx.clientId || "",
    sourceType,
    sourceId,
    appointmentId: ctx.appointmentId,
    sessionId,
    startWorkflow: params.startWorkflow || params.workflowId,
    startStage: params.startStage || params.stageName,
    linesFrom: params.linesFrom,
    payerId: params.payerId,
    assignee: params.assignee,
    cause,
  };
  const key = actionIdempotencyKey("create_claim", sourceType, sourceId, input.startWorkflow || "default");
  return runActionOnce(key, { actionKey: "create_claim", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!input.clientId) throw new Error(`create_claim: cannot resolve a client from ${event.recordType} ${event.recordId}`);
    return performCreateClaim(input) as any;
  });
}

// ── scrub_claim ─────────────────────────────────────────────────────────────────────────────────

export interface ScrubIssue {
  ruleId: string;
  severity: "error" | "warning";
  message: string;
}

export function scrubClaim(claim: Claim, rules: ScrubRule[] = scrubRulesStore.get()): ScrubIssue[] {
  const issues: ScrubIssue[] = [];
  const local = readLocalRecordFields("claim", claim.id);
  const add = (r: ScrubRule, fallback: string) => issues.push({ ruleId: r.id, severity: r.severity, message: r.message || fallback });
  for (const r of rules.filter((x) => x.enabled)) {
    switch (r.check) {
      case "icd_required":
        if (!claim.diagnosisCodes || claim.diagnosisCodes.length === 0) add(r, "At least one diagnosis code is required");
        break;
      case "billing_entity":
        if (!claim.billingProviderName || !claim.billingProviderNpi) add(r, "Billing entity / NPI is missing");
        break;
      case "rendering_npi":
        if (!claim.renderingProviderNpi) add(r, "Rendering provider NPI is missing");
        break;
      case "line_modifier":
        if ((claim.lines || []).some((l) => l.cptCode === r.target && !l.modifier)) add(r, `Line ${r.target} needs a modifier`);
        break;
      case "required_field": {
        const v = (claim as any)[r.target || ""] ?? local[r.target || ""];
        if (r.target && isFieldValueEmpty(v)) add(r, `${r.target} is empty`);
        break;
      }
    }
  }
  if (!claim.lines || claim.lines.length === 0) issues.push({ ruleId: "builtin-lines", severity: "error", message: "The claim has no service lines" });
  return issues;
}

export interface ScrubStepInput {
  claimId: string;
  onPass?: string;
  onFail?: string;
  cause: StageMove["cause"];
}

export function performScrubClaim(input: ScrubStepInput): { passed: boolean; issues: ScrubIssue[]; moved?: string } {
  const claim = getStoredClaims().find((c) => c.id === input.claimId);
  if (!claim) throw new Error(`scrub_claim: claim ${input.claimId} not found`);
  const issues = scrubClaim(claim);
  const passed = !issues.some((i) => i.severity === "error");
  saveClaim({ ...claim, scrubIssues: issues, scrubVersion: (claim.scrubVersion || 0) + 1 } as Claim);
  let moved: string | undefined;
  if (passed && input.onPass) moved = claimService.moveToStage(claim.id, input.onPass, input.cause)?.stageName;
  if (!passed) {
    if (input.onFail) moved = claimService.moveToStage(claim.id, input.onFail, input.cause)?.stageName;
    else void eventBus.emit("claim.scrub_failed", "claim", claim.id, { claimId: claim.id, clientId: claim.patientId, issues, chain: input.cause?.chain });
  }
  return { passed, issues, moved };
}

registerActionRetryHandler("scrub_claim", (run) => performScrubClaim(run.payload as ScrubStepInput) as any);

export function executeScrubClaimStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : (event.data as any)?.claimId;
  const claim = claimId ? getStoredClaims().find((c) => c.id === claimId) : undefined;
  const input: ScrubStepInput = { claimId: String(claimId || ""), onPass: params.onPass, onFail: params.onFail, cause };
  // key: claimId:scrubVersion (a re-scrub after fixes has a new version, so it runs again)
  const key = actionIdempotencyKey("scrub_claim", claimId, (claim as any)?.scrubVersion || 0, event.id);
  return runActionOnce(key, { actionKey: "scrub_claim", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!claimId) throw new Error(`scrub_claim: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    return performScrubClaim(input) as any;
  });
}

// ── submit_claim (mock clearinghouse) ─────────────────────────────────────────────────────────────

export type ClearinghouseScenario = "auto" | "accept" | "reject";
export const CLEARINGHOUSE_SETTINGS_EVENT = "mantra_clearinghouse_settings_updated";
export const clearinghouseSettingsStore = createObjectStore<{ scenario: ClearinghouseScenario }>("mantra_clearinghouse_settings_v1", CLEARINGHOUSE_SETTINGS_EVENT, { scenario: "auto" });

/** Mock 277CA acknowledgement: "auto" rejects a claim whose member id contains REJECT. */
export function mockAcknowledge(claim: Claim): { accepted: boolean; reason?: string } {
  const s = clearinghouseSettingsStore.get().scenario;
  const reject = s === "reject" || (s === "auto" && String(claim.insuredId || "").toUpperCase().includes("REJECT"));
  return reject ? { accepted: false, reason: "Mock 277CA: subscriber ID rejected by the payer" } : { accepted: true };
}

export interface SubmitStepInput {
  claimId: string;
  onSubmit?: string;
  onAccepted?: string;
  onRejected?: string;
  autoAck: boolean;
  cause: StageMove["cause"];
}

export function performSubmitClaim(input: SubmitStepInput): { submitted: boolean; accepted?: boolean; seq: number; moved?: string } {
  const claim = getStoredClaims().find((c) => c.id === input.claimId);
  if (!claim) throw new Error(`submit_claim: claim ${input.claimId} not found`);
  const blockers = scrubClaim(claim).filter((i) => i.severity === "error");
  if (blockers.length) throw new Error(`submit_claim: claim has ${blockers.length} scrub error(s): ${blockers[0].message}`);
  const seq = (claim.submissionCount || 0) + 1;
  const freq = claimDefaultsStore.get().frequencyCode || "1";
  saveClaim({
    ...claim,
    submissionMethod: "clearinghouse",
    submissionCount: seq,
    clearinghouseTrackingId: `MOCK-837P-${claim.id}-${seq}`,
    clearinghouseBatchId: `BATCH-${todayStr().replace(/-/g, "")}-01`,
    submittedAt: new Date().toISOString(),
    frequencyCode: freq,
    rejectionReason: undefined,
  } as Claim);
  let moved: string | undefined;
  if (input.onSubmit) moved = claimService.moveToStage(claim.id, input.onSubmit, input.cause)?.stageName;
  if (!input.autoAck) return { submitted: true, seq, moved };

  const ack = mockAcknowledge(claim);
  const fresh = getStoredClaims().find((c) => c.id === claim.id)!;
  if (!ack.accepted) {
    saveClaim({ ...fresh, rejectionReason: ack.reason } as Claim);
    if (input.onRejected) moved = claimService.moveToStage(claim.id, input.onRejected, input.cause)?.stageName;
    return { submitted: true, accepted: false, seq, moved };
  }
  if (input.onAccepted) moved = claimService.moveToStage(claim.id, input.onAccepted, input.cause)?.stageName;
  return { submitted: true, accepted: true, seq, moved };
}

registerActionRetryHandler("submit_claim", (run) => performSubmitClaim(run.payload as SubmitStepInput) as any);

export function executeSubmitClaimStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : (event.data as any)?.claimId;
  const claim = claimId ? getStoredClaims().find((c) => c.id === claimId) : undefined;
  const input: SubmitStepInput = {
    claimId: String(claimId || ""),
    onSubmit: params.onSubmit,
    onAccepted: params.onAccepted,
    onRejected: params.onRejected,
    autoAck: params.autoAck !== false,
    cause,
  };
  // key: claimId:frequency:submissionSeq (resubmitting after a rejection is a new sequence number)
  const key = actionIdempotencyKey("submit_claim", claimId, claimDefaultsStore.get().frequencyCode || "1", (claim?.submissionCount || 0) + 1);
  return runActionOnce(key, { actionKey: "submit_claim", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!claimId) throw new Error(`submit_claim: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    return performSubmitClaim(input) as any;
  });
}
