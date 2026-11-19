/**
 * ERA (remittance) staging (Slice 5, item 5.1). An ERA is received (MOCK: generated here), staged in this store, and
 * posted to claims by the `post_remittance` action. Unmatched lines are kept on the ERA and raise `era.unmatched`.
 *
 * Mock data: receiveMockEra builds an ERA for claims that are out with the payer. The answer per claim is
 * deterministic: a member id containing DENY is denied (CO-97), PARTIAL is paid 60% (PR-2 coinsurance for the rest),
 * otherwise paid in full minus the contractual adjustment (CO-45) when the fee schedule is lower. A line for a claim
 * number that does not exist is added when `includeUnmatched` is set.
 */
import { recordRcmAudit } from "./rcmAudit";
import { createListStore } from "./refStore";
import { eventBus } from "./eventBus";
import { getStoredClaims, type Claim } from "./claimsStore";
import { findStage, getClaimWorkflow, getClaimWorkflows } from "./claimWorkflows";
import { getPayer } from "./billingSetupStore";

export const ERA_EVENT = "mantra_era_updated";

export interface EraAdjustment {
  /** CO contractual | PR patient responsibility | OA other | PI payer initiated */
  group: "CO" | "PR" | "OA" | "PI";
  /** Claim adjustment reason code (CARC), e.g. "45", "97". */
  carc: string;
  rarc?: string;
  amount: number;
}

export interface EraLine {
  id: string;
  /** Claim number as the payer echoes it. */
  claimNumber: string;
  payerClaimNumber: string;
  patientName?: string;
  charged: number;
  paid: number;
  adjustments: EraAdjustment[];
  patientResponsibility: number;
  status: "pending" | "posted" | "unmatched";
  matchedClaimId?: string;
  postedAt?: string;
}

export interface Era {
  id: string;
  traceNumber: string;
  payerId?: string;
  receivedAt: string;
  checkAmount: number;
  status: "received" | "posted" | "partial" | "unmatched";
  lines: EraLine[];
  mock: true;
}

export const erasStore = createListStore<Era>("mantra_eras_v1", ERA_EVENT);

const money = (n: number) => Math.round(n * 100) / 100;

function outForPayer(claim: Claim): boolean {
  const cat = ((claim as any).systemCategory || "").toLowerCase();
  const s = (claim.statusLabel || "").toLowerCase();
  const st = (claim.status || "").toLowerCase();
  if (["submitted", "accepted", "pending", "in_review", "ar", "in ar"].includes(cat)) return true;
  if (s.includes("submit") || s.includes("accept") || s.includes("ar") || s.includes("pending")) return true;
  if (st.includes("submit") || st.includes("accept") || st.includes("ar")) return true;
  const wf = getClaimWorkflow(claim.processId) || getClaimWorkflows()[0];
  const stage = findStage(wf, claim.currentStageId) || findStage(wf, claim.statusLabel);
  const stageCat = (stage?.systemCategory || "").toLowerCase();
  const phase = (stage?.phase || "").toLowerCase();
  return ["submitted", "accepted", "pending", "in_review"].includes(stageCat) || phase === "claim";
}

export function buildMockEraLine(claim: Claim): EraLine {
  const id = String(claim.insuredId || "").toUpperCase();
  const charged = claim.totalCharge || 150;
  const base = { id: `eraln-${claim.id}`, claimNumber: claim.claimNumber, payerClaimNumber: `PCN-${claim.claimNumber}`, patientName: claim.patientName, charged, matchedClaimId: claim.id };
  if (id.includes("DENY") || (claim.statusLabel || "").toLowerCase().includes("deni") || (claim.status || "").toLowerCase().includes("deni")) {
    return { ...base, paid: 0, adjustments: [{ group: "CO", carc: "97", rarc: "N130", amount: charged }], patientResponsibility: 0, status: "pending" };
  }
  if (id.includes("PARTIAL") || (claim.statusLabel || "").toLowerCase().includes("partial")) {
    const paid = money(charged * 0.6);
    const pr = money(charged - paid);
    return { ...base, paid, adjustments: [{ group: "PR", carc: "2", amount: pr }], patientResponsibility: pr, status: "pending" };
  }
  // paid in full less nothing or contractual adjustment
  const co = money(claim.contractualAdjustment || (charged > 50 ? charged * 0.15 : 0));
  const paid = money(charged - co);
  return { ...base, paid, adjustments: co > 0 ? [{ group: "CO", carc: "45", amount: co }] : [], patientResponsibility: 0, status: "pending" };
}

/** Stage an ERA for every claim that is out with the payer (plus one unmatched line on request). */
export function receiveMockEra(opts: { includeUnmatched?: boolean; claimIds?: string[]; payerId?: string } = {}): Era {
  const allClaims = getStoredClaims();
  let claims = opts.claimIds ? allClaims.filter((c) => opts.claimIds!.includes(c.id)) : allClaims.filter(outForPayer);
  if (claims.length === 0) {
    claims = allClaims.filter((c) => {
      const s = ((c.statusLabel || "") + " " + (c.status || "") + " " + ((c as any).systemCategory || "")).toLowerCase();
      return s.includes("submit") || s.includes("accept") || s.includes("ar");
    });
    if (claims.length === 0) claims = allClaims.slice(0, 3);
  }
  const lines = claims.map(buildMockEraLine);
  if (opts.includeUnmatched) {
    lines.push({ id: `eraln-unmatched-${Date.now()}`, claimNumber: "CLM-UNKNOWN-0000", payerClaimNumber: "PCN-UNKNOWN", charged: 100, paid: 100, adjustments: [], patientResponsibility: 0, status: "pending" });
  }
  const era: Era = {
    id: `era-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    traceNumber: `TRN-${Date.now().toString(36).toUpperCase()}`,
    payerId: opts.payerId || claims[0]?.payer?.id,
    receivedAt: new Date().toISOString(),
    checkAmount: money(lines.reduce((a, l) => a + l.paid, 0)),
    status: "received",
    lines,
    mock: true,
  };
  erasStore.upsert(era);
  recordRcmAudit({ action: "created", entityType: "era", entityId: era.id, summary: `Received (mock) ERA ${era.traceNumber} with ${lines.length} line(s)` });
  void eventBus.emit("era.received", "claim", era.id, { eraId: era.id, traceNumber: era.traceNumber, lines: lines.length });
  return era;
}

/** Match an ERA line to a claim: by claim number, then by clearinghouse tracking id / payer claim number.
 * Provider must be enrolled for ERA with the payer; otherwise remains unmatched.
 */
export function matchEraLine(line: EraLine, claims: Claim[] = getStoredClaims()): Claim | undefined {
  const claim =
    claims.find((c) => c.claimNumber === line.claimNumber) ||
    claims.find((c) => line.matchedClaimId && c.id === line.matchedClaimId) ||
    claims.find((c) => !!c.clearinghouseTrackingId && c.clearinghouseTrackingId === line.payerClaimNumber);
  if (!claim) return undefined;
  if (claim.payer?.id) {
    const payer = getPayer(claim.payer.id);
    const eraEnrollment = payer?.enrollment?.era?.status ?? payer?.enrollment?.status;
    if (eraEnrollment && eraEnrollment === "rejected") {
      return undefined;
    }
  }
  return claim;
}
