/**
 * `run_eligibility` action (Slice 3, item 3.2).
 *
 * Params (all optional, nothing hard-coded):
 *   targets     : ("instance" | "appointment")[]   where results are written (default: both that exist)
 *   stageMap    : { active|inactive|not_found|provider_setup|inconclusive|no_coverage: stage id or name }
 *                 applied to the INSTANCE target only
 *   windowDays  : default 30; 0 = always call the payer. A fresh verified result inside the window is COPIED
 *                 (history row source "copied") instead of calling the payer again.
 *   retries     : extra attempts with request variants (default 2, max 3 attempts in total). Backoff is not
 *                 executed (no scheduler yet) - TODO(rcm).
 *   coverage    : "primary" | "secondary" (default primary)
 *   serviceTypes: string[] (default ["30"])
 *   scenario    : forces a mock scenario for this step
 *
 * Results (EG1/EG2 fields, history row, benefit lines) are written through recordWriter; the appointment also gets a
 * typed `coverage` summary used by the chip. Every payer result is MOCK data.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule, StageMove } from "./useAutomationStore";
import { createListStore } from "./refStore";
import { resolveRecordContext } from "./recordContext";
import { writeRecordFields } from "./recordWriter";
import { getCoverageOn, type Coverage } from "./coveragesStore";
import { getPayer } from "./billingSetupStore";
import { getStoredProcesses } from "./useProcessStore";
import { getProcessInstanceById, logInstanceStageMove, updateProcessInstanceStage } from "./processLogsStore";
import {
  mockEligibilityCheck,
  normalizeBenefits,
  requestVariant,
  resolveEligibilityResponse,
  type BenefitLine,
  type EligibilityResponse,
  type MockScenario,
  type Resolution,
  type ResultStatus,
} from "./eligibility";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";
import { getStoredClients } from "./clientsStore";
import { appointmentService } from "./appointmentService";
import { getProcessInstances } from "./processLogsStore";

export const RUN_ELIGIBILITY_STEP_KEYS = ["run_eligibility", "run-eligibility"];
export const isRunEligibilityStep = (k: string) => RUN_ELIGIBILITY_STEP_KEYS.includes((k || "").toLowerCase());

export const ELIGIBILITY_RESULTS_EVENT = "mantra_eligibility_results_updated";

/** Last verified (active) result per client + coverage + service-type set; the source of copy-fresh. */
export interface StoredEligibilityResult {
  id: string;
  clientId: string;
  coverageId: string;
  serviceTypeKey: string;
  status: ResultStatus;
  checkedAt: string; // ISO
  fields: Record<string, any>;
  benefits: BenefitLine[];
  summary: string;
}
export const eligibilityResultsStore = createListStore<StoredEligibilityResult>("mantra_eligibility_results_v1", ELIGIBILITY_RESULTS_EVENT);

export interface RunEligibilityParams {
  targets?: Array<"instance" | "appointment">;
  stageMap?: Partial<Record<ResultStatus, string>>;
  windowDays?: number;
  retries?: number;
  coverage?: "primary" | "secondary";
  serviceTypes?: string[];
  scenario?: MockScenario;
}

export interface RunEligibilityInput {
  clientId: string;
  appointmentId?: string;
  instanceId?: string;
  serviceDate: string;
  trigger: string;
  params: RunEligibilityParams;
  cause: StageMove["cause"];
}

export interface RunEligibilityResult {
  status: ResultStatus;
  copied: boolean;
  payerCalls: number;
  reasonCode?: string;
  instanceId?: string;
  appointmentId?: string;
  stageMoved?: string;
  coverageId?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const keyOf = (clientId: string, coverageId: string, types: string[]) => `${clientId}|${coverageId}|${[...types].sort().join(",")}`;

function stageByRef(processId: string | undefined, ref: string): { id: string; name: string } | undefined {
  const proc = getStoredProcesses().find((p) => p.id === processId);
  if (!proc) return { id: ref, name: ref }; // process not in the store (tests / legacy rows): trust the ref
  const q = ref.trim().toLowerCase();
  const st = proc.stages?.find((s) => s.id === ref) || proc.stages?.find((s) => (s.name || "").trim().toLowerCase() === q);
  return st ? { id: st.id, name: st.name } : undefined;
}

function summaryText(status: ResultStatus, copay?: number, ded?: number, reason?: Resolution): string {
  if (status === "active") return `Active${copay !== undefined ? ` · copay ${copay}` : ""}${ded !== undefined ? ` · deductible left ${ded}` : ""}`;
  return reason?.message || status.replace("_", " ");
}

function fieldsFor(status: ResultStatus, cov: Coverage | undefined, res: EligibilityResponse | undefined, r: Resolution | undefined, attempt: number, source: string, benefits: ReturnType<typeof normalizeBenefits> | undefined, serviceTypes: string[]) {
  const payer = cov ? getPayer(cov.payerId) : undefined;
  const f: Record<string, any> = {
    elig_status: status,
    elig_payer: payer?.name || cov?.payerId || "",
    elig_plan: res?.planName || cov?.planName || "",
    elig_checked_at: new Date().toISOString(),
    elig_source: source,
    elig_attempt: attempt,
    elig_reason_code: r?.code || "",
    elig_reason_category: r?.category && r.category !== "none" ? r.category : "",
    elig_action_taken: r?.action && r.action !== "none" ? r.action : "",
    elig_message: status === "active" ? "" : r?.message || "",
  };
  if (status === "active" && benefits) {
    const s = benefits.summary;
    Object.assign(f, {
      elig_copay: s.copay ?? "",
      elig_deductible_remaining: s.deductibleRemaining ?? "",
      elig_coinsurance: s.coinsurancePercent ?? "",
      elig_oop_remaining: s.oopRemaining ?? "",
      elig_network: s.network || "",
      elig_plan_begin: res?.planBegin || "",
      elig_plan_end: res?.planEnd || "",
      elig_other_payers: (res?.otherPayers || []).join(", "),
      elig_benefits: benefits.lines,
    });
  }
  void serviceTypes;
  return f;
}

/** Does the real work; throws on configuration problems (recorded as a failed run). Payer problems are results, not errors. */
export function performRunEligibility(input: RunEligibilityInput): RunEligibilityResult {
  const { clientId, appointmentId, instanceId, serviceDate, params } = input;
  const serviceTypes = params.serviceTypes && params.serviceTypes.length ? params.serviceTypes : ["30"];
  const windowDays = params.windowDays === undefined ? 30 : Math.max(0, params.windowDays);
  const maxAttempts = Math.min(3, Math.max(1, (params.retries === undefined ? 2 : params.retries) + 1));

  const wantInstance = !params.targets || params.targets.includes("instance");
  const wantAppt = !params.targets || params.targets.includes("appointment");
  const instance = wantInstance && instanceId ? getProcessInstanceById(instanceId) : undefined;
  const apptId = wantAppt ? appointmentId : undefined;
  if (!instance && !apptId) throw new Error("run_eligibility: no write target (no instance and no appointment)");

  const client: any = (getStoredClients() as any[]).find((c) => c.id === clientId);
  const cov = getCoverageOn(clientId, serviceDate, params.coverage || "primary");

  let status: ResultStatus;
  let resolution: Resolution | undefined;
  let response: EligibilityResponse | undefined;
  let copied = false;
  let payerCalls = 0;
  let attempt = 0;
  let benefits: ReturnType<typeof normalizeBenefits> | undefined;
  let fields: Record<string, any>;

  if (!cov) {
    status = "no_coverage";
    resolution = { status, category: "none", action: "Add coverage or mark self-pay", message: "No coverage on file for the service date", retry: false };
    fields = fieldsFor(status, undefined, undefined, resolution, 0, "none", undefined, serviceTypes);
  } else {
    const key = keyOf(clientId, cov.id, serviceTypes);
    const prior = eligibilityResultsStore.find(key);
    const fresh = !!prior && windowDays > 0 && Date.now() - Date.parse(prior.checkedAt) < windowDays * 86400000;
    if (fresh && prior) {
      copied = true;
      status = prior.status;
      fields = { ...prior.fields, elig_source: "copied", elig_checked_at: prior.checkedAt, elig_benefits: prior.benefits };
      benefits = undefined;
    } else {
      const payer = getPayer(cov.payerId);
      const baseReq = {
        payerId: cov.payerId,
        payerEnrolled: payer ? payer.enrollment.status === "enrolled" : undefined,
        memberId: cov.memberId,
        firstName: client?.legalFirstName || String(client?.name || "").split(/\s+/)[0],
        lastName: client?.legalLastName || String(client?.name || "").split(/\s+/).slice(1).join(" "),
        dob: client?.dob,
        serviceDate,
        serviceTypes,
        scenario: params.scenario,
      };
      do {
        response = mockEligibilityCheck(requestVariant(baseReq, attempt));
        payerCalls += 1;
        resolution = resolveEligibilityResponse(response);
        attempt += 1;
      } while (resolution.retry && attempt < maxAttempts);
      status = resolution.status;
      benefits = status === "active" ? normalizeBenefits(response.benefits, serviceTypes) : undefined;
      fields = fieldsFor(status, cov, response, resolution, attempt, "mock", benefits, serviceTypes);
      if (status === "active") {
        eligibilityResultsStore.upsert({
          id: key,
          clientId,
          coverageId: cov.id,
          serviceTypeKey: [...serviceTypes].sort().join(","),
          status,
          checkedAt: fields.elig_checked_at,
          fields,
          benefits: benefits?.lines || [],
          summary: summaryText(status, benefits?.summary.copay, benefits?.summary.deductibleRemaining),
        });
      }
    }
  }

  const summary = summaryText(status, fields.elig_copay === "" ? undefined : fields.elig_copay, fields.elig_deductible_remaining === "" ? undefined : fields.elig_deductible_remaining, resolution);
  const historyRow = {
    checkedAt: fields.elig_checked_at,
    trigger: input.trigger,
    source: copied ? "copied" : fields.elig_source,
    status,
    reasonCode: fields.elig_reason_code || "",
    summary,
    sourceRecord: appointmentId ? `appointment:${appointmentId}` : "",
    rawRef: "",
  };

  const result: RunEligibilityResult = { status, copied, payerCalls, reasonCode: fields.elig_reason_code || undefined, coverageId: cov?.id };

  if (instance) {
    const existing = ((getProcessInstanceById(instance.instanceId || instance.id) as any)?.elig_history as any[]) || [];
    const w = writeRecordFields(
      { type: "process_instance", id: instance.instanceId || instance.id },
      { ...fields, elig_history: [...existing, historyRow] }
    );
    if (!w.ok) throw new Error(w.error || "instance write failed");
    result.instanceId = instance.instanceId || instance.id;

    const wantStage = params.stageMap?.[status];
    if (wantStage) {
      const stage = stageByRef(instance.processId, wantStage);
      if (!stage) throw new Error(`run_eligibility: stage "${wantStage}" not found in the instance's process`);
      const current = getProcessInstanceById(result.instanceId)!;
      if ((current.currentStage || "").trim().toLowerCase() !== stage.name.trim().toLowerCase()) {
        const from = current.currentStage;
        const moved = updateProcessInstanceStage(result.instanceId, stage.name);
        if (moved) {
          logInstanceStageMove(moved, from, input.cause);
          result.stageMoved = stage.name;
        }
      }
    }
  }

  if (apptId) {
    const apptSummary: Record<string, any> = {
      elig_status: status,
      elig_copay: fields.elig_copay ?? "",
      elig_deductible_remaining: fields.elig_deductible_remaining ?? "",
      elig_checked_at: fields.elig_checked_at,
      elig_instance_id: result.instanceId || "",
      coverage: { instanceId: result.instanceId, status, checkedAt: fields.elig_checked_at, summary },
      coverageId: cov?.id,
    };
    const w = writeRecordFields({ type: "appointment", id: apptId }, apptSummary);
    if (!w.ok) throw new Error(w.error || "appointment write failed");
    result.appointmentId = apptId;
  }
  return result;
}

registerActionRetryHandler("run_eligibility", (run) => performRunEligibility(run.payload as RunEligibilityInput) as any);

export function executeRunEligibilityStep(args: {
  rule: AutomationRule;
  stepId?: string;
  params: Record<string, any>;
  event: BusEvent;
  cause: StageMove["cause"];
}): RunOnceResult<any> {
  const { rule, stepId, params, event, cause } = args;
  const ctx = resolveRecordContext(event);

  // scope "future_appointments": run for every active instance of the client created for a future appointment
  // (e.g. after the coverage changed). One run per instance; failures of one do not stop the others.
  if ((params as any).scope === "future_appointments") {
    const clientId = ctx.clientId || "";
    const today = todayStr();
    const key = actionIdempotencyKey("run_eligibility", rule.id, stepId, event.id, clientId, "future");
    return runActionOnce(key, { actionKey: "run_eligibility", ruleId: rule.id, ruleName: rule.name, stepId }, () => {
      if (!clientId) throw new Error("run_eligibility: cannot resolve a client for future_appointments");
      const results: RunEligibilityResult[] = [];
      for (const inst of getProcessInstances()) {
        if (inst.clientId !== clientId || (inst.instanceStatus || "active") !== "active" || inst.source?.type !== "appointment") continue;
        const appt = appointmentService.getAppointmentById(inst.source.id);
        if (!appt || appt.date < today) continue;
        results.push(
          performRunEligibility({ clientId, appointmentId: String(appt.id), instanceId: inst.instanceId || inst.id, serviceDate: appt.date, trigger: event.event, params: params as RunEligibilityParams, cause })
        );
      }
      return { count: results.length, statuses: results.map((r) => r.status) } as any;
    });
  }

  const input: RunEligibilityInput = {
    clientId: ctx.clientId || "",
    appointmentId: ctx.appointmentId,
    instanceId: ctx.instance ? ctx.instance.instanceId || ctx.instance.id : undefined,
    serviceDate: ctx.appointment?.date || todayStr(),
    trigger: event.event,
    params: params as RunEligibilityParams,
    cause,
  };
  const key = actionIdempotencyKey("run_eligibility", rule.id, stepId, event.id, input.instanceId || input.appointmentId || input.clientId);
  return runActionOnce(key, { actionKey: "run_eligibility", ruleId: rule.id, ruleName: rule.name, stepId, payload: input as any }, () => {
    if (!input.clientId) throw new Error(`run_eligibility: cannot resolve a client from ${event.recordType} ${event.recordId}`);
    return performRunEligibility(input) as any;
  });
}
