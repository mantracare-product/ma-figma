/**
 * `post_remittance` and `draft_appeal` (Slice 5, items 5.1 and 5.2).
 *
 * post_remittance params: eraId (default: the event's era), onPaid / onPartial / onDenied (stage names in the claim's
 *   workflow; blank = no move, the claim.* event is raised instead), appealDays (deadline after receipt, default 180).
 *   Each ERA line posts once (line.status). Lines that match no claim stay on the ERA as unmatched and raise
 *   `era.unmatched`. Posted denials are categorized (denialCodes.ts) and get an appeal deadline.
 * draft_appeal is PROPOSE-ONLY: it stores a draft letter on the claim (appealDraft) from a template and the denial
 *   facts; it never moves the claim or sends anything. Key: claimId:appealRevision.
 */
import type { BusEvent } from "./eventBus";
import { eventBus } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { getStoredClaims, saveClaim, type Claim } from "./claimsStore";
import { claimService } from "./claimService";
import { erasStore, matchEraLine, type Era, type EraLine } from "./eraStore";
import { categorizeDenial } from "./denialCodes";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const POST_REMITTANCE_STEP_KEYS = ["post_remittance", "post-remittance"];
export const DRAFT_APPEAL_STEP_KEYS = ["draft_appeal", "draft-appeal"];
export const isPostRemittanceStep = (k: string) => POST_REMITTANCE_STEP_KEYS.includes((k || "").toLowerCase());
export const isDraftAppealStep = (k: string) => DRAFT_APPEAL_STEP_KEYS.includes((k || "").toLowerCase());

const money = (n: number) => Math.round(n * 100) / 100;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);

export interface PostRemittanceInput {
  eraId: string;
  onPaid?: string;
  onPartial?: string;
  onDenied?: string;
  appealDays?: number;
  cause: StageMove["cause"];
}

export interface PostRemittanceResult {
  posted: number;
  unmatched: number;
  paid: number;
  partial: number;
  denied: number;
}

export function performPostRemittance(input: PostRemittanceInput): PostRemittanceResult {
  const era = erasStore.find(input.eraId);
  if (!era) throw new Error(`post_remittance: ERA ${input.eraId} not found`);
  const result: PostRemittanceResult = { posted: 0, unmatched: 0, paid: 0, partial: 0, denied: 0 };
  const lines: EraLine[] = [];

  for (const line of era.lines) {
    if (line.status === "posted") {
      lines.push(line);
      continue;
    }
    const claim = matchEraLine(line);
    if (!claim) {
      result.unmatched += 1;
      lines.push({ ...line, status: "unmatched" });
      continue;
    }
    const co = money(line.adjustments.filter((a) => a.group === "CO" && ["45", "253"].includes(a.carc)).reduce((s, a) => s + a.amount, 0));
    const paidTotal = money((claim.amountPaid || 0) + line.paid);
    const prTotal = money((claim.patientResponsibility || 0) + line.patientResponsibility);
    const coTotal = money((claim.contractualAdjustment || 0) + co);
    const accounted = money(paidTotal + prTotal + coTotal);
    const actionable = line.adjustments.filter((a) => !(a.group === "PR" || (a.group === "CO" && ["45", "253"].includes(a.carc))));
    const denied = line.paid === 0 && actionable.length > 0;
    const fullyPaid = !denied && accounted >= money(claim.totalCharge) - 0.005;

    const payment = { id: `pay-${era.id}-${line.id}`, eraId: era.id, traceNumber: era.traceNumber, amount: line.paid, date: era.receivedAt.slice(0, 10) };
    let updated: Claim = {
      ...claim,
      amountPaid: paidTotal,
      patientResponsibility: prTotal,
      contractualAdjustment: coTotal,
      payments: [...(claim.payments || []), payment],
      underpaidBy: denied || fullyPaid ? 0 : money(claim.totalCharge - accounted),
    };
    if (denied) {
      const a = categorizeDenial(line.adjustments);
      updated = { ...updated, denialCategory: a.category, denialCodes: a.codes, denialSummary: a.summary, denialNext: a.next, appealDeadline: addDays(era.receivedAt, input.appealDays ?? 180) };
    }
    saveClaim(updated);

    const target = denied ? input.onDenied : fullyPaid ? input.onPaid : input.onPartial;
    if (target) claimService.moveToStage(claim.id, target, input.cause);
    if (denied && !input.onDenied) void eventBus.emit("claim.denied", "claim", claim.id, { ...updated, claimId: claim.id, clientId: claim.patientId, chain: input.cause?.chain });
    if (!denied && !fullyPaid && !input.onPartial) void eventBus.emit("claim.partially_paid", "claim", claim.id, { ...updated, claimId: claim.id, clientId: claim.patientId, chain: input.cause?.chain });

    if (denied) result.denied += 1;
    else if (fullyPaid) result.paid += 1;
    else result.partial += 1;
    result.posted += 1;
    lines.push({ ...line, status: "posted", matchedClaimId: claim.id, postedAt: new Date().toISOString() });
  }

  const status: Era["status"] = result.unmatched === lines.length && lines.length > 0 ? "unmatched" : lines.every((l) => l.status === "posted") ? "posted" : "partial";
  erasStore.upsert({ ...era, lines, status });
  if (result.unmatched > 0) void eventBus.emit("era.unmatched", "claim", era.id, { eraId: era.id, unmatched: result.unmatched, chain: input.cause?.chain });
  return result;
}

registerActionRetryHandler("post_remittance", (run) => performPostRemittance(run.payload as PostRemittanceInput) as any);

export function executePostRemittanceStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const eraId = String(params.eraId || (event.data as any)?.eraId || (event.recordType === "claim" ? event.recordId : ""));
  const era = eraId ? erasStore.find(eraId) : undefined;
  const input: PostRemittanceInput = { eraId, onPaid: params.onPaid, onPartial: params.onPartial, onDenied: params.onDenied, appealDays: params.appealDays, cause };
  // key per ERA: traceNumber (a line is additionally guarded by its posted status)
  const key = actionIdempotencyKey("post_remittance", era?.traceNumber || eraId);
  return runActionOnce(key, { actionKey: "post_remittance", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!eraId) throw new Error("post_remittance: no ERA on the event");
    return performPostRemittance(input) as any;
  });
}

// ── draft_appeal (propose-only) ───────────────────────────────────────────────────────────────

export function buildAppealLetter(claim: Claim): string {
  const codes = (claim.denialCodes || []).join(", ") || "the stated reason codes";
  const lines = (claim.lines || []).map((l) => `${l.cptCode}${l.modifier ? "-" + l.modifier : ""} (${l.description})`).join("; ");
  return [
    `Re: Appeal of denied claim ${claim.claimNumber}`,
    `Patient: ${claim.patientName}   Member ID: ${claim.insuredId}   Date of service: ${claim.serviceDate}`,
    ``,
    `To ${claim.payer?.name || "the payer"} appeals department,`,
    ``,
    `We are appealing the denial of the above claim (${codes}${claim.denialSummary ? ": " + claim.denialSummary : ""}). ` +
      `Services billed: ${lines || "see the attached claim"}. Total charge ${claim.totalCharge}.`,
    ``,
    `We believe the services were medically necessary and correctly coded, and ask that the claim be reprocessed for payment. ` +
      `Supporting documentation (visit note, codes and any authorization${claim.authNumber ? " " + claim.authNumber : ""}) is attached.`,
    ``,
    `Sincerely,`,
    `${claim.billingProviderName || "Billing office"}`,
    ``,
    `[Proposed draft: review and edit before sending]`,
  ].join("\n");
}

export interface DraftAppealInput {
  claimId: string;
}

export function performDraftAppeal(input: DraftAppealInput): { revision: number; length: number } {
  const claim = getStoredClaims().find((c) => c.id === input.claimId);
  if (!claim) throw new Error(`draft_appeal: claim ${input.claimId} not found`);
  const revision = (claim.appealRevision || 0) + 1;
  saveClaim({ ...claim, appealRevision: revision, appealDraft: { text: buildAppealLetter(claim), revision, proposedAt: new Date().toISOString(), status: "proposed" } } as Claim);
  return { revision, length: buildAppealLetter(claim).length };
}

registerActionRetryHandler("draft_appeal", (run) => performDraftAppeal(run.payload as DraftAppealInput) as any);

export function executeDraftAppealStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent }): RunOnceResult<any> {
  const { rule, stepId, event } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : String((event.data as any)?.claimId || "");
  const claim = claimId ? getStoredClaims().find((c) => c.id === claimId) : undefined;
  const key = actionIdempotencyKey("draft_appeal", claimId, claim?.appealRevision || 0);
  return runActionOnce(key, { actionKey: "draft_appeal", ruleId: rule.id, ruleName: rule.name, stepId, payload: { claimId } as any }, () => {
    if (!claimId) throw new Error(`draft_appeal: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    return performDraftAppeal({ claimId }) as any;
  });
}
