/**
 * Chart data for Overview > Claims overview (R2.1). Pure selectors over the real stores (claims, tasks, instances),
 * filtered by payer and date range (claim date = submittedAt, else createdAt).
 */
import { getStoredClaims, type Claim } from "./claimsStore";
import { claimsOnly, findStage, getClaimWorkflow, getClaimWorkflows, preClaimRecords } from "./claimWorkflows";
import { readLocalRecordFields } from "./recordWriter";
import { buildRcmReportRows } from "./rcmReportSources";
import { queueCounts } from "./rcmKpis";
import { stripSampleSuffix } from "./sampleSuffixMigration";
import { getProcessInstances } from "./processLogsStore";

export interface OverviewFilters {
  payer?: string; // payer name; empty/"all" = all
  from?: string; // YYYY-MM-DD
  to?: string;
}

export interface Slice {
  name: string;
  value: number;
}

const ymd = (iso?: string) => (iso || "").slice(0, 10);
const month = (iso?: string) => ymd(iso).slice(0, 7);
const claimDate = (c: Claim) => ymd(c.submittedAt || c.createdAt);

export function filterClaims(claims: Claim[], f: OverviewFilters = {}): Claim[] {
  return claims.filter((c) => {
    if (f.payer && f.payer !== "all" && (c.payer?.name || "") !== f.payer) return false;
    const d = claimDate(c);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    return true;
  });
}

function countBy<T>(items: T[], key: (t: T) => string): Slice[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it) || "Unassigned";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m, ([name, value]) => ({ name, value }));
}

export function stageNameOf(c: Claim): string {
  const wf = getClaimWorkflow(c.processId) || getClaimWorkflows()[0];
  return stripSampleSuffix((findStage(wf, c.currentStageId) || findStage(wf, c.statusLabel))?.name || c.statusLabel || "No stage");
}

export interface ClaimsOverviewData {
  payers: string[];
  claimsByStage: Slice[];
  claimsByWorkflow: Slice[];
  denialTrend: Array<{ month: string; rate: number | null; denied: number; decided: number }>;
  arAging: Array<{ bucket: string; amount: number; claims: number }>;
  payerMix: Slice[];
  firstPassTrend: Array<{ month: string; rate: number | null; submitted: number }>;
  eligibility: Slice[];
  queues: Slice[];
  total: number;
}

const BUCKETS = ["0-30", "31-60", "61-90", "90+"];

export function buildClaimsOverview(f: OverviewFilters = {}, now: number = Date.now()): ClaimsOverviewData {
  const all = claimsOnly(getStoredClaims());
  const claims = filterClaims(all, f);
  const ids = new Set(claims.map((c) => c.id));

  const months = Array.from(new Set(claims.map((c) => month(c.submittedAt || c.createdAt)).filter(Boolean))).sort();
  const denialTrend = months.map((m) => {
    const inMonth = claims.filter((c) => month(c.submittedAt || c.createdAt) === m);
    const denied = inMonth.filter((c) => !!c.denialCategory).length;
    const paid = inMonth.filter((c) => (c.amountPaid || 0) > 0 && !c.denialCategory).length;
    const decided = denied + paid;
    return { month: m, rate: decided ? Math.round((denied / decided) * 1000) / 10 : null, denied, decided };
  });
  const firstPassTrend = months.map((m) => {
    const submitted = claims.filter((c) => !!c.submittedAt && month(c.submittedAt) === m);
    const ok = submitted.filter((c) => (c.submissionCount || 1) === 1 && c.status !== "Rejected").length;
    return { month: m, rate: submitted.length ? Math.round((ok / submitted.length) * 1000) / 10 : null, submitted: submitted.length };
  });

  const aging = buildRcmReportRows("ar_aging", now).filter((r) => ids.has(r.id));
  const arAging = BUCKETS.map((b) => {
    const rows = aging.filter((r) => r.bucket === b);
    return { bucket: b, amount: Math.round(rows.reduce((a, r) => a + r.outstanding, 0) * 100) / 100, claims: rows.length };
  });

  const payerMixMap = new Map<string, number>();
  claims.forEach((c) => payerMixMap.set(c.payer?.name || "Unassigned", (payerMixMap.get(c.payer?.name || "Unassigned") || 0) + (c.totalCharge || 0)));

  const records = preClaimRecords(getStoredClaims()).filter((c) => getClaimWorkflow(c.processId)?.workflowType === "eligibility").map((c) => ({ elig_status: (readLocalRecordFields("claim", c.id) as any)?.elig_status || "" }));
  const inst = [...records, ...getProcessInstances()].filter((i) => (i as any).elig_status);
  const eligLabel = (s: string) => (s === "active" ? "Verified" : s === "not_found" || s === "provider_setup" ? "Needs fix" : s === "inactive" ? "Inactive" : s === "inconclusive" || s === "pending_review" ? "Inconclusive" : "");
  const eligibility = ["Verified", "Needs fix", "Inactive", "Inconclusive"].map((name) => ({ name, value: inst.filter((i) => eligLabel((i as any).elig_status) === name).length }));

  return {
    payers: Array.from(new Set(all.map((c) => c.payer?.name).filter(Boolean) as string[])).sort(),
    claimsByStage: countBy(claims, stageNameOf),
    claimsByWorkflow: countBy(claims, (c) => stripSampleSuffix((getClaimWorkflow(c.processId) || getClaimWorkflows()[0])?.name || "No workflow")),
    denialTrend,
    arAging,
    payerMix: Array.from(payerMixMap, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 })),
    firstPassTrend,
    eligibility,
    queues: queueCounts(now).map((q) => ({ name: q.name, value: q.open })),
    total: claims.length,
  };
}

export interface KpiDeltas {
  /** Change of the last 30 days vs the 30 days before (counts, or percentage points for rates); null when nothing to compare. */
  claims: number | null;
  submitted: number | null;
  denialRate: number | null;
  firstPass: number | null;
}

export function kpiDeltas(now: number = Date.now()): KpiDeltas {
  const claims = claimsOnly(getStoredClaims());
  const DAY = 86400000;
  const inWin = (c: Claim, a: number, b: number) => { const t = Date.parse(c.submittedAt || c.createdAt || ""); return !Number.isNaN(t) && t > now - b * DAY && t <= now - a * DAY; };
  const cur = claims.filter((c) => inWin(c, 0, 30));
  const prev = claims.filter((c) => inWin(c, 30, 60));
  const rate = (arr: Claim[], f: (c: Claim) => boolean, d: (c: Claim) => boolean) => { const den = arr.filter(d); return den.length ? (arr.filter(f).length / den.length) * 100 : null; };
  const sub = (arr: Claim[]) => arr.filter((c) => !!c.submittedAt).length;
  const denial = (arr: Claim[]) => rate(arr, (c) => !!c.denialCategory, (c) => !!c.denialCategory || (c.amountPaid || 0) > 0);
  const first = (arr: Claim[]) => rate(arr, (c) => (c.submissionCount || 1) === 1 && c.status !== "Rejected", (c) => !!c.submittedAt);
  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 10) / 10);
  return {
    claims: prev.length || cur.length ? cur.length - prev.length : null,
    submitted: sub(prev) || sub(cur) ? sub(cur) - sub(prev) : null,
    denialRate: diff(denial(cur), denial(prev)),
    firstPass: diff(first(cur), first(prev)),
  };
}
