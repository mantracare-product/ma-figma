/**
 * RCM report data sources (Slice 6, item 6.2): claims, denials, payments, ar_aging, eligibility.
 * Pure row builders over the stores + field metadata for the report builder. Mock data is flagged (`isMock` per row)
 * when it came from sample/mock sources so reports can show the banner.
 */
import { getStoredClaims, type Claim } from "./claimsStore";
import { findStage, getClaimWorkflow, getClaimWorkflows } from "./claimWorkflows";
import { getProcessInstances } from "./processLogsStore";
import type { FieldMetadata } from "./reportEngine";

export type RcmReportSource = "claims" | "denials" | "payments" | "ar_aging" | "eligibility";
export const RCM_REPORT_SOURCES: RcmReportSource[] = ["claims", "denials", "payments", "ar_aging", "eligibility"];
export const isRcmReportSource = (s: string): s is RcmReportSource => (RCM_REPORT_SOURCES as string[]).includes(s);

const money = (n: number) => Math.round(n * 100) / 100;
const ymd = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const daysSince = (iso?: string, now = Date.now()) => (iso && Number.isFinite(Date.parse(iso)) ? Math.max(0, Math.floor((now - Date.parse(iso)) / 86400000)) : 0);

function stageOf(c: Claim) {
  const wf = getClaimWorkflow(c.processId) || getClaimWorkflows()[0];
  return { wf, stage: findStage(wf, c.currentStageId) || findStage(wf, c.statusLabel) };
}

export const outstandingOf = (c: Claim) => money(Math.max(0, (c.totalCharge || 0) - (c.amountPaid || 0) - (c.contractualAdjustment || 0) - (c.patientResponsibility || 0)));

export function agingBucket(days: number): "0-30" | "31-60" | "61-90" | "90+" {
  return days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";
}

export function buildRcmReportRows(source: RcmReportSource, now: number = Date.now()): Record<string, any>[] {
  const claims = getStoredClaims();
  switch (source) {
    case "claims":
      return claims.map((c) => {
        const { wf, stage } = stageOf(c);
        const denied = !!c.denialCategory;
        return {
          id: c.id, claimNumber: c.claimNumber, client: c.patientName, payer: c.payer?.name || "", workflow: wf?.name || "", stage: stage?.name || c.statusLabel || "", status: c.status,
          serviceDate: c.serviceDate, date: ymd(c.submittedAt || c.createdAt), submittedAt: ymd(c.submittedAt), charge: c.totalCharge || 0, paid: c.amountPaid || 0,
          patientResponsibility: c.patientResponsibility || 0, adjustment: c.contractualAdjustment || 0, outstanding: outstandingOf(c), ageDays: daysSince(c.submittedAt || c.createdAt, now),
          denied: denied ? 1 : 0, denialCategory: c.denialCategory || "", submissions: c.submissionCount || 0,
        };
      });
    case "denials":
      return claims
        .filter((c) => !!c.denialCategory)
        .map((c) => ({
          id: c.id, claimNumber: c.claimNumber, client: c.patientName, payer: c.payer?.name || "", category: c.denialCategory, codes: (c.denialCodes || []).join(", "), summary: c.denialSummary || "",
          next: c.denialNext || "", appealDeadline: c.appealDeadline || "", daysToDeadline: c.appealDeadline ? Math.round((Date.parse(c.appealDeadline) - now) / 86400000) : "", amount: c.totalCharge || 0,
          stage: stageOf(c).stage?.name || c.statusLabel || "", date: ymd(c.updatedAt),
        }));
    case "payments":
      return claims.flatMap((c) =>
        (c.payments || []).map((p) => ({ id: p.id, claimNumber: c.claimNumber, client: c.patientName, payer: c.payer?.name || "", amount: p.amount, date: p.date, trace: p.traceNumber }))
      );
    case "ar_aging":
      return claims
        .filter((c) => outstandingOf(c) > 0 && !["paid", "closed", "written_off"].includes((stageOf(c).stage?.systemCategory || "").toLowerCase()))
        .map((c) => {
          const age = daysSince(c.submittedAt || c.createdAt, now);
          return { id: c.id, claimNumber: c.claimNumber, client: c.patientName, payer: c.payer?.name || "", outstanding: outstandingOf(c), ageDays: age, bucket: agingBucket(age), stage: stageOf(c).stage?.name || c.statusLabel || "", date: ymd(c.submittedAt || c.createdAt) };
        });
    case "eligibility":
      return getProcessInstances()
        .filter((i) => (i as any).elig_status)
        .map((i) => {
          const r: any = i;
          return { id: i.instanceId || i.id, client: i.client, process: i.process, stage: i.currentStage, status: r.elig_status, payer: r.elig_payer || "", copay: Number(r.elig_copay) || 0, checkedAt: r.elig_checked_at || "", date: ymd(r.elig_checked_at), reason: r.elig_reason_code || "", source: r.elig_source || "" };
        });
  }
}

const F = (key: string, label: string, type: FieldMetadata["type"] = "string"): FieldMetadata => ({ key, label, type, category: "core" });

export const RCM_SOURCE_METADATA: Record<RcmReportSource, { name: string; description: string; icon: string; primaryDateField?: string; fields: FieldMetadata[] }> = {
  claims: {
    name: "Claims (RCM)", description: "Claims by workflow, stage, payer, charges and payments. Mock data where sample data is loaded", icon: "FileText", primaryDateField: "date",
    fields: [F("claimNumber", "Claim #"), F("client", "Client / Patient"), F("payer", "Payer"), F("workflow", "Workflow"), F("stage", "Stage"), F("status", "Status", "status"), F("serviceDate", "Service date", "date"), F("date", "Submitted / created", "date"),
      F("charge", "Charge ($)", "currency"), F("paid", "Paid ($)", "currency"), F("patientResponsibility", "Patient responsibility ($)", "currency"), F("adjustment", "Contractual adjustment ($)", "currency"), F("outstanding", "Outstanding ($)", "currency"),
      F("ageDays", "Age (days)", "number"), F("denied", "Denied (1/0; average = denial rate)", "number"), F("denialCategory", "Denial category"), F("submissions", "Submissions", "number")],
  },
  denials: {
    name: "Denials (RCM)", description: "Denied claims by category, reason codes and appeal deadline", icon: "AlertTriangle", primaryDateField: "date",
    fields: [F("claimNumber", "Claim #"), F("client", "Client / Patient"), F("payer", "Payer"), F("category", "Denial category"), F("codes", "Reason codes"), F("summary", "Reason"), F("next", "Next step"), F("appealDeadline", "Appeal deadline", "date"), F("daysToDeadline", "Days to deadline", "number"), F("amount", "Amount ($)", "currency"), F("stage", "Stage"), F("date", "Updated", "date")],
  },
  payments: {
    name: "Payments (RCM)", description: "Insurance payments posted from remittances", icon: "DollarSign", primaryDateField: "date",
    fields: [F("claimNumber", "Claim #"), F("client", "Client / Patient"), F("payer", "Payer"), F("amount", "Amount ($)", "currency"), F("date", "Payment date", "date"), F("trace", "Trace #")],
  },
  ar_aging: {
    name: "A/R aging (RCM)", description: "Outstanding insurance balances by age bucket", icon: "Clock", primaryDateField: "date",
    fields: [F("claimNumber", "Claim #"), F("client", "Client / Patient"), F("payer", "Payer"), F("outstanding", "Outstanding ($)", "currency"), F("ageDays", "Age (days)", "number"), F("bucket", "Aging bucket", "bucket"), F("stage", "Stage"), F("date", "Submitted / created", "date")],
  },
  eligibility: {
    name: "Eligibility (RCM)", description: "Eligibility results per appointment instance (mock payer answers)", icon: "ShieldCheck", primaryDateField: "date",
    fields: [F("client", "Client / Patient"), F("process", "Process"), F("stage", "Stage"), F("status", "Eligibility status", "status"), F("payer", "Payer"), F("copay", "Copay ($)", "currency"), F("checkedAt", "Checked at", "date"), F("reason", "Reason code"), F("source", "Source"), F("date", "Checked date", "date")],
  },
};
