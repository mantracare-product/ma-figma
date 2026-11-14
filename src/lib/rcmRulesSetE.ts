/**
 * SAMPLE rules, Set E (eligibility and prior auth): A1-A10 and A13 (spec 3.0.5). All ship DISABLED, all are
 * editable, and they reference the sample process by id. Run order on the same event: A1 = 10, A10 = 20, A13 = 10.
 * A5, A7 and A9 use actions built later (send_message S3.6, start_call S5.4); until then those steps are inert.
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { SAMPLE_COVERAGE_PROCESS_ID } from "./rcmSampleIds";
import { covStageId } from "./rcmSampleProcess";

const NOOP_ACTION = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({ id, stepKey, name: stepKey, params });

/** Result -> stage names of the sample process (names resolve against the process at run time). */
export const ELIGIBILITY_STAGE_MAP = {
  active: "Verified",
  not_found: "Needs fix",
  inactive: "Inactive",
  provider_setup: "Provider setup issue",
  inconclusive: "Inconclusive",
  no_coverage: "Self-pay",
};

const stageEntry = (id: string, name: string, stage: string, actions: any[], extra: Partial<SampleRuleDef> = {}): SampleRuleDef => ({
  id,
  name,
  entityType: "client",
  trigger: { event: "stage.entered", params: { processId: SAMPLE_COVERAGE_PROCESS_ID, stageId: covStageId(stage) } },
  action: NOOP_ACTION,
  actions: actions as any,
  ...extra,
});

export function buildSetERules(): SampleRuleDef[] {
  return [
    {
      id: "sample-rule-A1",
      name: "A1 Start coverage check when an appointment is booked (Sample)",
      description: "Creates a Coverage & authorization instance for the appointment, then checks eligibility (30-day window, copy-fresh).",
      entityType: "appointment",
      trigger: { event: "appointment.booked" },
      conditions: [cond("c1", "_hasCoverage", "equals", "true")],
      action: NOOP_ACTION,
      order: 10,
      actions: [
        step("a1-start", "start_process", { processId: SAMPLE_COVERAGE_PROCESS_ID, stageName: "Not checked" }),
        step("a1-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 30, stageMap: ELIGIBILITY_STAGE_MAP }),
      ],
    },
    {
      id: "sample-rule-A2",
      name: "A2 Daily: re-check visits in the next 3 days (Sample)",
      entityType: "appointment",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "upcoming_visits"), cond("c2", "daysUntil", "less_than_or_equal", 3)],
      action: NOOP_ACTION,
      actions: [step("a2-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 30, stageMap: ELIGIBILITY_STAGE_MAP })],
    },
    {
      id: "sample-rule-A3",
      name: "A3 Coverage changed: re-check future visits (Sample)",
      entityType: "client",
      trigger: { event: "coverage.updated" },
      action: NOOP_ACTION,
      actions: [step("a3-elig", "run_eligibility", { scope: "future_appointments", targets: ["instance", "appointment"], windowDays: 0, stageMap: ELIGIBILITY_STAGE_MAP })],
    },
    stageEntry("sample-rule-A4", "A4 Needs fix: task in Insurance fixes (Sample)", "Needs fix", [
      step("a4-task", "create_task", { title: "Fix insurance for {{client.name}}", queue: "Insurance fixes", priority: "high", dueInDays: 1 }),
    ]),
    stageEntry("sample-rule-A5", "A5 Inactive: task and message to update insurance (Sample)", "Inactive", [
      step("a5-task", "create_task", { title: "Insurance inactive: {{client.name}}", queue: "Insurance fixes", priority: "high", dueInDays: 1 }),
      step("a5-msg", "send_message", { channel: "sms", template: "update_insurance" }),
    ]),
    stageEntry("sample-rule-A6", "A6 Provider setup issue: task in Enrollment (Sample)", "Provider setup issue", [
      step("a6-task", "create_task", { title: "Check provider enrollment for {{client.name}}", queue: "Enrollment", priority: "normal", dueInDays: 3 }),
    ]),
    stageEntry(
      "sample-rule-A7",
      "A7 Inconclusive with voice on: call the payer (Sample)",
      "Inconclusive",
      [step("a7-call", "start_call", { purpose: "payer_benefits" })],
      { conditions: [cond("c1", "_voiceEnabled", "equals", "true")] }
    ),
    stageEntry(
      "sample-rule-A8",
      "A8 Inconclusive with voice off: task in Benefits to verify (Sample)",
      "Inconclusive",
      [step("a8-task", "create_task", { title: "Verify benefits by phone: {{client.name}}", queue: "Benefits to verify", priority: "normal", dueInDays: 1 })],
      { conditions: [cond("c1", "_voiceEnabled", "equals", "false")] }
    ),
    {
      id: "sample-rule-A9",
      name: "A9 Daily: send the estimate 2 days before a verified visit (Sample)",
      entityType: "client",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "instance_visit_countdown"), cond("c2", "daysUntil", "equals", 2), cond("c3", "elig_status", "equals", "active")],
      action: NOOP_ACTION,
      actions: [step("a9-msg", "send_message", { channel: "sms", template: "estimate" })],
    },
    {
      id: "sample-rule-A10",
      name: "A10 Booked: check and request prior authorization (Sample)",
      description: "Order 20: runs after A1 on the same event so the instance exists. With no instance (A1 disabled) it writes to the appointment only and creates no instance.",
      entityType: "appointment",
      trigger: { event: "appointment.booked" },
      conditions: [cond("c1", "_hasCoverage", "equals", "true")],
      action: NOOP_ACTION,
      order: 20,
      actions: [
        step("a10-check", "check_auth_required", { stageMap: { required: "Auth required" } }),
        step("a10-request", "request_prior_auth", { stageMap: { requested: "Auth submitted" } }),
        step("a10-task", "create_task", {
          title: "Prior auth for {{client.name}}",
          queue: "Prior auth",
          priority: "high",
          dueInDays: 2,
          linkTo: "instance_if_present",
          onlyWhen: { field: "auth_status", in: ["requested"] },
        }),
      ],
    },
    {
      id: "sample-rule-A13",
      name: "A13 Checked in: re-verify if the last check is older than a day (Sample)",
      entityType: "appointment",
      trigger: { event: "appointment.checked_in" },
      conditions: [cond("c1", "_daysSinceLastCheck", "greater_than", 1)],
      action: NOOP_ACTION,
      order: 10,
      actions: [step("a13-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 0, stageMap: ELIGIBILITY_STAGE_MAP })],
    },
  ] as SampleRuleDef[];
}

registerSampleRuleSet({
  id: "E",
  label: "Eligibility and prior auth (A1-A10, A13)",
  description: "Eligibility checks, prior authorization and the related queue tasks",
  requires: ["billing-setup", "coverages", "task-views", "rcm-fields", "coverage-process", "prior-auth-rules"],
  rules: buildSetERules,
});
