/**
 * Invoice side of the money-back loop (Slice 5, item 5.3):
 *  - `update_invoice_from_claim` action: copies the claim's payment facts onto its linked invoice, optionally moves the
 *    invoice to a stage and marks a statement/payment link. Key: claimId:invoiceId:claimEventSeq (payments posted).
 *  - invoice sample stages (seeded on request): the reminder / payment-plan / write-off stages of the sample process.
 *  - payment plans: split an invoice balance into installments (stored on the invoice).
 *  - getInvoiceStatement: what the statement drawer and the patient portal show.
 * Nothing names a stage in logic: the stage comes from the step params.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { invoiceService } from "./invoiceService";
import { getStoredClaims, type Claim } from "./claimsStore";
import { getStoredProcesses, saveStoredProcesses, type Stage } from "./useProcessStore";
import { readLocalRecordFields, writeRecordFields } from "./recordWriter";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const UPDATE_INVOICE_FROM_CLAIM_STEP_KEYS = ["update_invoice_from_claim", "update-invoice-from-claim"];
export const isUpdateInvoiceFromClaimStep = (k: string) => UPDATE_INVOICE_FROM_CLAIM_STEP_KEYS.includes((k || "").toLowerCase());

const money = (n: number) => Math.round(n * 100) / 100;

/** The invoice linked to a claim: Claim.invoiceId, else the invoice of the same appointment. */
export function findInvoiceForClaim(claim: Claim) {
  const all = invoiceService.getInvoices();
  return (
    (claim.invoiceId ? all.find((i) => i.id === claim.invoiceId) : undefined) ||
    (claim.appointmentId ? all.find((i) => String(i.appointmentId) === String(claim.appointmentId)) : undefined)
  );
}

function resolveInvoiceStage(ref?: string): Stage | undefined {
  if (!ref) return undefined;
  const q = ref.trim().toLowerCase();
  const proc = getStoredProcesses().find((p) => p.entityType === "invoice");
  return proc?.stages.find((s) => s.id === ref) || proc?.stages.find((s) => (s.name || "").trim().toLowerCase() === q);
}

export interface UpdateInvoiceFromClaimInput {
  claimId: string;
  invoiceStage?: string;
  statement?: boolean;
  cause: StageMove["cause"];
}

export function performUpdateInvoiceFromClaim(input: UpdateInvoiceFromClaimInput): { invoiceId: string; moved?: string; patientResponsibility: number } {
  const claim = getStoredClaims().find((c) => c.id === input.claimId);
  if (!claim) throw new Error(`update_invoice_from_claim: claim ${input.claimId} not found`);
  const inv = findInvoiceForClaim(claim);
  if (!inv) throw new Error(`update_invoice_from_claim: no invoice is linked to claim ${claim.claimNumber}`);
  const stage = input.invoiceStage ? resolveInvoiceStage(input.invoiceStage) : undefined;
  if (input.invoiceStage && !stage) throw new Error(`update_invoice_from_claim: invoice stage "${input.invoiceStage}" not found`);

  const patientResponsibility = money(claim.patientResponsibility ?? 0);
  const fields: Record<string, any> = {
    claim_id: claim.id,
    claim_number: claim.claimNumber,
    insurance_paid: money(claim.amountPaid || 0),
    adjustments: money(claim.contractualAdjustment || 0),
    patient_responsibility: patientResponsibility,
  };
  if (input.statement) {
    fields.statement_sent_at = new Date().toISOString();
    fields.payment_link = readLocalRecordFields("invoice", inv.id).payment_link || inv.paymentLinkUrl || `https://pay.mantraassist.mock/${inv.id.toLowerCase()}`;
  }
  const w = writeRecordFields({ type: "invoice", id: inv.id }, fields);
  if (!w.ok) throw new Error(w.error);

  let moved: string | undefined;
  if (stage && inv.currentStageId !== stage.id) {
    invoiceService.moveToStage(inv.id, stage.id, input.cause as any);
    moved = stage.name;
  }
  return { invoiceId: inv.id, moved, patientResponsibility };
}

registerActionRetryHandler("update_invoice_from_claim", (run) => performUpdateInvoiceFromClaim(run.payload as UpdateInvoiceFromClaimInput) as any);

export function executeUpdateInvoiceFromClaimStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent; cause: StageMove["cause"] }): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const claimId = event.recordType === "claim" ? String(event.recordId) : String((event.data as any)?.claimId || "");
  const claim = claimId ? getStoredClaims().find((c) => c.id === claimId) : undefined;
  const inv = claim ? findInvoiceForClaim(claim) : undefined;
  const input: UpdateInvoiceFromClaimInput = { claimId, invoiceStage: params.invoiceStage, statement: params.statement !== false, cause };
  const key = actionIdempotencyKey("update_invoice_from_claim", claimId, inv?.id, (claim?.payments || []).length);
  return runActionOnce(key, { actionKey: "update_invoice_from_claim", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!claimId) throw new Error(`update_invoice_from_claim: cannot resolve a claim from ${event.recordType} ${event.recordId}`);
    return performUpdateInvoiceFromClaim(input) as any;
  });
}

// ── invoice sample stages ──────────────────────────────────────────────────────────────────────

export const SAMPLE_INVOICE_STAGE_NAMES = ["Reminder 1", "Reminder 2", "Payment plan", "Written off"] as const;

/** Add the sample invoice stages (by name) to the invoice workflow, before its first final stage. Returns how many were added. */
export function seedInvoiceSampleStages(): number {
  const list = getStoredProcesses();
  const idx = list.findIndex((p) => p.entityType === "invoice");
  if (idx < 0) return 0;
  const proc = list[idx];
  const have = new Set(proc.stages.map((s) => (s.name || "").trim().toLowerCase()));
  const fresh: Stage[] = SAMPLE_INVOICE_STAGE_NAMES.filter((n) => !have.has(n.toLowerCase())).map((n) => ({
    id: `${proc.id}-sample-${n.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: n,
    description: "Sample stage",
    status: "active",
    color: n === "Written off" ? "#64748B" : "#F59E0B",
    stageCategory: n === "Written off" ? ("lost" as const) : ("in_progress" as const),
    stagePosition: n === "Written off" ? ("final" as const) : ("intermediate" as const),
    isFinal: n === "Written off",
    isFinalStage: n === "Written off",
  }));
  if (fresh.length === 0) return 0;
  const firstFinal = proc.stages.findIndex((s) => s.isFinal || s.isFinalStage || s.stagePosition === "final");
  const stages = firstFinal < 0 ? [...proc.stages, ...fresh] : [...proc.stages.slice(0, firstFinal), ...fresh, ...proc.stages.slice(firstFinal)];
  const next = [...list];
  next[idx] = { ...proc, stages };
  saveStoredProcesses(next);
  return fresh.length;
}

// ── payment plans + statement ─────────────────────────────────────────────────────────────────────

export interface PlanInstallment {
  dueDate: string;
  amount: number;
  status: "scheduled" | "paid";
}

export function buildPaymentPlan(balance: number, opts: { installments: number; firstDueDate: string; intervalDays?: number }): PlanInstallment[] {
  const n = Math.max(1, Math.floor(opts.installments));
  const base = money(balance / n);
  const out: PlanInstallment[] = [];
  for (let i = 0; i < n; i++) {
    const due = new Date(Date.parse(`${opts.firstDueDate}T00:00:00Z`) + i * (opts.intervalDays ?? 30) * 86400000).toISOString().slice(0, 10);
    out.push({ dueDate: due, amount: i === n - 1 ? money(balance - base * (n - 1)) : base, status: "scheduled" });
  }
  return out;
}

export function createPaymentPlan(invoiceId: string, opts: { installments: number; firstDueDate: string; intervalDays?: number }): PlanInstallment[] {
  const inv = invoiceService.getInvoiceById(invoiceId);
  if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
  const balance = money(inv.total - (inv.amountPaid || 0));
  if (balance <= 0) throw new Error("Nothing to pay: the invoice has no balance");
  const plan = buildPaymentPlan(balance, opts);
  const w = writeRecordFields({ type: "invoice", id: invoiceId }, { payment_plan: plan });
  if (!w.ok) throw new Error(w.error);
  return plan;
}

export interface InvoiceStatement {
  invoiceId: string;
  total: number;
  insurancePaid: number;
  adjustments: number;
  patientResponsibility: number;
  amountPaid: number;
  balance: number;
  paymentLink?: string;
  plan: PlanInstallment[];
  claimNumber?: string;
}

export function getInvoiceStatement(invoiceId: string): InvoiceStatement | undefined {
  const inv = invoiceService.getInvoiceById(invoiceId);
  if (!inv) return undefined;
  const f = readLocalRecordFields("invoice", invoiceId);
  return {
    invoiceId,
    total: inv.total,
    insurancePaid: Number(f.insurance_paid || 0),
    adjustments: Number(f.adjustments || 0),
    patientResponsibility: Number(f.patient_responsibility ?? 0),
    amountPaid: inv.amountPaid || 0,
    balance: money(inv.total - (inv.amountPaid || 0)),
    paymentLink: f.payment_link || inv.paymentLinkUrl,
    plan: Array.isArray(f.payment_plan) ? f.payment_plan : [],
    claimNumber: f.claim_number,
  };
}
