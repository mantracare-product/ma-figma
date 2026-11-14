/**
 * Daily jobs (Slice 3, item 3.5). The engine has no scheduler (and does not honour `delay`), so JOB-trigger rules
 * are driven by `runDaily()`, called from the "Run daily jobs now" button on the Automation page.
 *
 * Each registered collector inspects the data and returns the records a job should touch; runDaily emits one
 * `job.daily` event per record with `data.job = <collector id>` so rules select their job with a condition
 * (field "job" equals <id>). Later slices register their own collectors (claims, invoices ...).
 */
import { eventBus } from "./eventBus";
import { appointmentService } from "./appointmentService";
import { getProcessInstances } from "./processLogsStore";
import { instancesForAppointment } from "./recordContext";

export interface DailyJobRecord {
  recordType: "appointment" | "client" | "claim" | "invoice";
  recordId: string;
  data: Record<string, any>;
}
export type DailyJobCollector = (now: Date) => DailyJobRecord[];

const collectors = new Map<string, DailyJobCollector>();
export function registerDailyJob(id: string, collector: DailyJobCollector): void {
  collectors.set(id, collector);
}
export const listDailyJobs = () => Array.from(collectors.keys());

const ymd = (d: Date) => d.toISOString().slice(0, 10);
export function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);
}

// Eligibility jobs -----------------------------------------------------------------------------------

/** Every scheduled appointment from today on, with the days until the visit and its instance (if any). */
registerDailyJob("upcoming_visits", (now) => {
  const today = ymd(now);
  return appointmentService
    .getAppointments()
    .filter((a) => a.status === "scheduled" || a.status === "pending-accept" || a.status === "rescheduled")
    .filter((a) => a.date >= today)
    .map((a) => {
      const inst = instancesForAppointment(a.id)[0];
      return {
        recordType: "appointment" as const,
        recordId: String(a.id),
        data: { clientId: a.clientId, appointmentId: String(a.id), date: a.date, daysUntil: daysBetween(today, a.date), instanceId: inst ? inst.instanceId || inst.id : undefined },
      };
    });
});

/** Every active instance created for an upcoming appointment, with the days until the visit and its eligibility/auth fields. */
registerDailyJob("instance_visit_countdown", (now) => {
  const today = ymd(now);
  const out: DailyJobRecord[] = [];
  for (const inst of getProcessInstances()) {
    if ((inst.instanceStatus || "active") !== "active" || inst.source?.type !== "appointment") continue;
    const appt = appointmentService.getAppointmentById(inst.source.id);
    if (!appt || appt.date < today) continue;
    const row: any = inst;
    out.push({
      recordType: "client",
      recordId: inst.instanceId || inst.id,
      data: {
        clientId: inst.clientId,
        instanceId: inst.instanceId || inst.id,
        appointmentId: String(appt.id),
        processId: inst.processId,
        date: appt.date,
        daysUntil: daysBetween(today, appt.date),
        currentStage: inst.currentStage,
        elig_status: row.elig_status,
        auth_status: row.auth_status,
        auth_valid_to: row.auth_valid_to,
      },
    });
  }
  return out;
});

export interface RunDailyResult {
  emitted: number;
  byJob: Record<string, number>;
}

/** Emit one `job.daily` event per record of every registered job (awaited in order, so rule chains finish in order). */
export async function runDaily(now: Date = new Date(), only?: string[]): Promise<RunDailyResult> {
  const byJob: Record<string, number> = {};
  let emitted = 0;
  for (const [id, collect] of collectors) {
    if (only && !only.includes(id)) continue;
    let records: DailyJobRecord[] = [];
    try {
      records = collect(now);
    } catch (e) {
      console.warn(`[rcmJobs] collector "${id}" failed:`, e);
    }
    byJob[id] = records.length;
    for (const r of records) {
      await eventBus.emit("job.daily", r.recordType, r.recordId, { ...r.data, job: id, runAt: now.toISOString() });
      emitted += 1;
    }
  }
  return { emitted, byJob };
}

// Claim jobs (Slice 4) ------------------------------------------------------------------------------------

import { getStoredClaims } from "./claimsStore";
import { findStage, getClaimWorkflow, getClaimWorkflows } from "./claimWorkflows";

/**
 * Every claim with where it is: stage name + category and how long it has been there (claim.updatedAt is the last
 * stage change/edit). Rules pick what they need with conditions on stageCategory / stageName / ageDays / ageHours.
 */
registerDailyJob("claims", (now) =>
  getStoredClaims().map((c) => {
    const wf = getClaimWorkflow(c.processId) || getClaimWorkflows()[0];
    const stage = findStage(wf, c.currentStageId) || findStage(wf, c.statusLabel);
    const ageMs = Math.max(0, now.getTime() - (Date.parse(c.updatedAt) || now.getTime()));
    return {
      recordType: "claim" as const,
      recordId: c.id,
      data: {
        claimId: c.id,
        clientId: c.patientId,
        workflowId: wf?.id,
        stageName: stage?.name || c.statusLabel,
        stageCategory: stage?.systemCategory || "",
        ageHours: Math.round(ageMs / 3600000),
        ageDays: Math.floor(ageMs / 86400000),
        submittedAt: c.submittedAt,
        trackingId: c.clearinghouseTrackingId,
        amount: c.totalCharge,
      },
    };
  })
);
