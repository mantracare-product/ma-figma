/**
 * `check_claim_status` (Slice 5, item 5.4) and the stage-entry call (R4.1; there is no start_call automation action). Both are MOCK:
 *  - check_claim_status asks the (mock) clearinghouse where a submitted claim is. A claim without a tracking id is
 *    "missing"; one whose member id contains LOST is "not_found"; everything else is "pending". Result is stored on the
 *    claim (statusCheck) and the claim moves to the configured stage (onPending / onMissing). Key: claimId:checkDate.
 *  - the stage call records an outbound call for a purpose (payer_benefits | balance_reminder) in the RCM call log and the
 *    activity feed. Balance reminders need the client's voice consent. The (mock) call completes immediately with a
 *    canned outcome. Key: recordId:purpose:day. (S6.4 writes benefit results from a payer call into an instance.)
 */
import { captureVoiceBenefits } from "./voiceBenefits";
import { eventBus, type BusEvent } from "./eventBus";
import { getStoredProcesses } from "./useProcessStore";
import { getPayers } from "./billingSetupStore";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { getStoredClaims, saveClaim, type Claim } from "./claimsStore";
import { claimService } from "./claimService";
import { findClientByRef, resolveRecordContext } from "./recordContext";
import { createListStore } from "./refStore";
import { appendActivity } from "./activityEngine";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const CHECK_CLAIM_STATUS_STEP_KEYS = ["check_claim_status", "check-claim-status"];
export const isCheckClaimStatusStep = (k: string) => CHECK_CLAIM_STATUS_STEP_KEYS.includes((k || "").toLowerCase());

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── check_claim_status ──────────────────────────────────────────────────────────────────────────

export interface CheckClaimStatusInput {
  claimId: string;
  minAgeDays?: number;
  onPending?: string;
  onMissing?: string;
  cause: StageMove["cause"];
}

export function mockClaimStatus(claim: Claim): { status: "pending" | "missing" | "not_found"; message: string } {
  if (!claim.clearinghouseTrackingId) return { status: "missing", message: "No tracking id: the claim was never accepted by the clearinghouse" };
  if (String(claim.insuredId || "").toUpperCase().includes("LOST")) return { status: "not_found", message: "Mock 277: the payer has no record of this claim" };
  return { status: "pending", message: "Mock 277: received and still in adjudication" };
}

export function performCheckClaimStatus(input: CheckClaimStatusInput): { status: string; moved?: string; skipped?: string } {
  const claim = getStoredClaims().find((c) => c.id === input.claimId);
  if (!claim) throw new Error(`check_claim_status: claim ${input.claimId} not found`);
  if (input.minAgeDays !== undefined && claim.submittedAt) {
    const age = (Date.now() - Date.parse(claim.submittedAt)) / 86400000;
    if (age < input.minAgeDays) return { status: "too_recent", skipped: `submitted ${age.toFixed(1)} days ago (< ${input.minAgeDays})` };
  }
  const r = mockClaimStatus(claim);
  saveClaim({ ...claim, statusCheck: { status: r.status, message: r.message, checkedAt: new Date().toISOString() } } as Claim);
  const target = r.status === "pending" ? input.onPending : input.onMissing;
  const moved = target ? claimService.moveToStage(claim.id, target, input.cause)?.stageName : undefined;
  return { status: r.status, moved };
}

registerActionRetryHandler("check_claim_status", (run) => performCheckClaimStatus(run.payload as CheckClaimStatusInput) as any);

export function executeCheckClaimStatusStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : String((event.data as any)?.claimId || "");
  const input: CheckClaimStatusInput = { claimId, minAgeDays: params.minAgeDays, onPending: params.onPending, onMissing: params.onMissing, cause };
  const key = actionIdempotencyKey("check_claim_status", claimId, todayStr());
  return runActionOnce(key, { actionKey: "check_claim_status", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!claimId) throw new Error(`check_claim_status: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    return performCheckClaimStatus(input) as any;
  });
}

// ── start_call ───────────────────────────────────────────────────────────────────────────────────

export type CallPurpose = "payer_benefits" | "balance_reminder";

export interface RcmCall {
  id: string;
  purpose: CallPurpose;
  clientId: string;
  clientName?: string;
  recordType: string;
  recordId: string;
  instanceId?: string;
  status: "completed" | "skipped";
  skipped?: "no_consent" | "no_phone" | "no_payer_phone";
  outcome?: string;
  at: string;
  mock: true;
}

export const rcmCallsStore = createListStore<RcmCall>("mantra_rcm_calls_v1", "mantra_rcm_calls_updated");

export interface StartCallInput {
  purpose: CallPurpose;
  clientId: string;
  clientName?: string;
  phone?: string;
  voiceConsent: boolean;
  /** payer_benefits placed by a stage: the payer's phone from the payer record is required. */
  requirePayerPhone?: boolean;
  payerPhone?: string;
  recordType: string;
  recordId: string;
  instanceId?: string;
  /** payer_benefits only: stage the instance moves to once the (mock) call result is captured (pending review). */
  resultStage?: string;
  cause?: StageMove["cause"];
}

export function performStartCall(input: StartCallInput): RcmCall {
  const base = { id: `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, purpose: input.purpose, clientId: input.clientId, clientName: input.clientName, recordType: input.recordType, recordId: input.recordId, instanceId: input.instanceId, at: new Date().toISOString(), mock: true as const };
  let call: RcmCall;
  if (input.purpose === "payer_benefits" && input.requirePayerPhone && !input.payerPhone) call = { ...base, status: "skipped", skipped: "no_payer_phone" };
  else if (input.purpose === "balance_reminder" && !input.voiceConsent) call = { ...base, status: "skipped", skipped: "no_consent" };
  else if (input.purpose === "balance_reminder" && !input.phone) call = { ...base, status: "skipped", skipped: "no_phone" };
  else call = { ...base, status: "completed", outcome: input.purpose === "payer_benefits" ? "Mock call: payer read out the benefits" : "Mock call: patient acknowledged the balance" };
  rcmCallsStore.upsert(call);
  // A payer-benefits call on an instance writes its (mock) result there as PENDING REVIEW until a person accepts it.
  if (call.status === "completed" && input.purpose === "payer_benefits" && input.instanceId) {
    captureVoiceBenefits({ instanceId: input.instanceId, callId: call.id, resultStage: input.resultStage, cause: input.cause || { type: "manual" } });
  }
  appendActivity({
    type: call.status === "completed" ? "outbound_call" : "failed_call",
    callId: call.id,
    direction: "outbound",
    status: call.status === "completed" ? "completed" : "failed",
    clientId: input.clientId,
    clientName: input.clientName,
    instanceId: input.instanceId,
    outcomeSummary: call.outcome || `Skipped (${call.skipped})`,
    createdBy: "system",
    details: { primary: `${input.purpose.replace("_", " ")} call`, secondary: call.outcome || call.skipped },
  } as any);
  return call;
}


// ── Stage calls ──────────────────────────────────────────────────────────────────────────────────
// Calls are NOT an automation action. A stage with calling enabled and a call purpose places the call when a record
// enters it (the stage's call settings: purpose, calling hours, retries). Payer calls need the payer phone from the
// payer record; patient calls need voice consent. Hours and retries are stored for the real dialer; the mock call here
// runs immediately.

export function performStageCall(event: BusEvent): RcmCall | null {
  const data: any = event.data || {};
  const procId = data.processId;
  const stageRef = data.stageId || data.stageName;
  if (!procId || !stageRef) return null;
  const proc = getStoredProcesses().find((p) => p.id === procId);
  const stage: any = proc?.stages.find((s) => s.id === stageRef || s.name === stageRef);
  const settings = stage?.callTriggerSettings;
  const purpose = settings?.callPurpose;
  if (!stage || !stage.enableCalling || !purpose || purpose === "general") return null;
  const key = actionIdempotencyKey("stage_call", event.recordId, `${stage.id}:${purpose}`, todayStr());
  const run = runActionOnce(key, { actionKey: "stage_call", ruleId: stage.id, ruleName: `${proc?.name} / ${stage.name}`, payload: { recordId: event.recordId, purpose } as any }, () => {
    const ctx = resolveRecordContext(event);
    const claim = event.recordType === "claim" ? getStoredClaims().find((c) => c.id === String(event.recordId)) : undefined;
    const clientId = ctx.clientId || data.clientId || claim?.patientId || "";
    const client: any = ctx.client || (clientId ? findClientByRef(clientId) : undefined);
    const payerId = claim?.payer?.id || (ctx.instance as any)?.elig_payer_id;
    const payerName = claim?.payer?.name || (ctx.instance as any)?.elig_payer;
    const payer = getPayers().find((p) => p.id === payerId || p.name === payerName);
    const input: StartCallInput = {
      purpose,
      clientId,
      clientName: client?.name || claim?.patientName,
      phone: client?.phone || client?.phoneNumber,
      voiceConsent: !!client?.consents?.voice,
      requirePayerPhone: true,
      payerPhone: payer?.phone,
      recordType: event.recordType,
      recordId: String(event.recordId),
      instanceId: ctx.instance ? ctx.instance.instanceId || ctx.instance.id : event.recordType === "claim" ? String(event.recordId) : undefined,
      resultStage: settings.resultStage,
      cause: { type: "manual" } as any,
    };
    return performStartCall(input) as any;
  });
  return (run as any)?.result ?? null;
}

let stageCallsStarted = false;
export function initStageCalls(): void {
  if (stageCallsStarted) return;
  stageCallsStarted = true;
  eventBus.subscribe("stage.entered", (event) => {
    try { performStageCall(event); } catch (e) { console.warn("[stageCalls] failed:", e); }
  });
}
initStageCalls();
