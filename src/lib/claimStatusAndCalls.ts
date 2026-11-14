/**
 * `check_claim_status` and `start_call` (Slice 5, item 5.4). Both are MOCK:
 *  - check_claim_status asks the (mock) clearinghouse where a submitted claim is. A claim without a tracking id is
 *    "missing"; one whose member id contains LOST is "not_found"; everything else is "pending". Result is stored on the
 *    claim (statusCheck) and the claim moves to the configured stage (onPending / onMissing). Key: claimId:checkDate.
 *  - start_call records an outbound call for a purpose (payer_benefits | balance_reminder) in the RCM call log and the
 *    activity feed. Balance reminders need the client's voice consent. The (mock) call completes immediately with a
 *    canned outcome. Key: recordId:purpose:day. (S6.4 writes benefit results from a payer call into an instance.)
 */
import { captureVoiceBenefits } from "./voiceBenefits";
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { getStoredClaims, saveClaim, type Claim } from "./claimsStore";
import { claimService } from "./claimService";
import { resolveRecordContext } from "./recordContext";
import { createListStore } from "./refStore";
import { appendActivity } from "./activityEngine";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const CHECK_CLAIM_STATUS_STEP_KEYS = ["check_claim_status", "check-claim-status"];
export const START_CALL_STEP_KEYS = ["start_call", "start-call"];
export const isCheckClaimStatusStep = (k: string) => CHECK_CLAIM_STATUS_STEP_KEYS.includes((k || "").toLowerCase());
export const isStartCallStep = (k: string) => START_CALL_STEP_KEYS.includes((k || "").toLowerCase());

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
  skipped?: "no_consent" | "no_phone";
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
  if (input.purpose === "balance_reminder" && !input.voiceConsent) call = { ...base, status: "skipped", skipped: "no_consent" };
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

registerActionRetryHandler("start_call", (run) => performStartCall(run.payload as StartCallInput) as any);

export function executeStartCallStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause?: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const ctx = resolveRecordContext(event);
  const purpose = (params.purpose as CallPurpose) || "payer_benefits";
  const input: StartCallInput = {
    purpose,
    clientId: ctx.clientId || "",
    clientName: ctx.client?.name,
    phone: ctx.client?.phone || (ctx.client as any)?.phoneNumber,
    voiceConsent: !!(ctx.client as any)?.consents?.voice,
    recordType: event.recordType,
    recordId: String(event.recordId),
    instanceId: ctx.instance ? ctx.instance.instanceId || ctx.instance.id : undefined,
    resultStage: params.resultStage,
    cause,
  };
  const key = actionIdempotencyKey("start_call", event.recordId, purpose, todayStr());
  return runActionOnce(key, { actionKey: "start_call", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!input.clientId) throw new Error(`start_call: cannot resolve a client from ${event.recordType} ${event.recordId}`);
    return performStartCall(input) as any;
  });
}
