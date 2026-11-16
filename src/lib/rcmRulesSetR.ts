/**
 * Insurance record rules, Set R (R4.4). One insurance record per appointment moves through the workflows
 * Eligibility -> Prior auth -> Charge capture -> Claim -> Denial & appeal. These are ordinary editable rules with plain
 * names. They ship ENABLED except the ones that message the patient (rcmDefaults turns those off).
 * Workflows and stages are referenced by id (ids are generated from the names in rcmDefaultsR4).
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { stepDisplayName } from "./rcmCatalog";
import { claimStageId } from "./rcmSampleClaimWorkflows";
import { APPT_INSURANCE_WORKFLOW_ID, ELIGIBILITY_WORKFLOW_ID, PRIOR_AUTH_WORKFLOW_ID } from "./rcmWorkflowIds";

const NOOP = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({ id, stepKey, name: stepDisplayName({ stepKey }), params });

/** Eligibility result -> stage of the Eligibility workflow (names resolve at run time; editable in the rule). */
export const ELIGIBILITY_RESULT_STAGES = {
  active: "Eligible",
  not_found: "Needs fix",
  provider_setup: "Needs fix",
  inactive: "Inactive",
  inconclusive: "Inconclusive",
  no_coverage: "Self-pay",
};

const enteredStage = (id: string, name: string, workflowId: string, stage: string, actions: any[], extra: Partial<SampleRuleDef> = {}): SampleRuleDef => ({
  id,
  name,
  entityType: "claim",
  trigger: { event: "stage.entered", params: { processId: workflowId, stageId: claimStageId(workflowId, stage) } },
  action: NOOP,
  actions,
  ...extra,
});

export function buildSetRRules(): SampleRuleDef[] {
  const E = ELIGIBILITY_WORKFLOW_ID;
  const P = PRIOR_AUTH_WORKFLOW_ID;
  return [
    {
      id: "r4-rule-create-record",
      name: "Insurance visit booked: create the insurance record and use the insurance appointment workflow",
      description: "When an appointment is booked with payment mode Insurance (the service is billable to insurance), create its single insurance record in Eligibility and put the appointment in Appointment via Insurance.",
      entityType: "appointment",
      trigger: { event: "appointment.booked" },
      conditions: [cond("c1", "paymentMode", "equals", "insurance")],
      action: NOOP,
      order: 10,
      actions: [
        step("r1-create", "create_claim", { startWorkflow: E, linesFrom: "none", ifExists: "keep" }),
        step("r1-appt", "move_to_workflow", { workflowId: APPT_INSURANCE_WORKFLOW_ID }),
      ],
    },
    enteredStage("r4-rule-run-eligibility", "Record enters Run eligibility: run eligibility", E, "Run eligibility", [
      step("r2-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 30, stageMap: ELIGIBILITY_RESULT_STAGES }),
    ]),
    enteredStage("r4-rule-needs-fix", "Needs fix: task in Insurance fixes", E, "Needs fix", [
      step("r3-task", "create_task", { title: "Fix insurance for {{client.name}}", queue: "Insurance fixes", priority: "high", dueInDays: 1 }),
    ]),
    enteredStage("r4-rule-needs-fix-msg", "Needs fix: ask the patient to update their insurance", E, "Needs fix", [
      step("r3-msg", "send_message", { channel: "sms", template: "update_insurance" }),
    ]),
    enteredStage("r4-rule-inactive", "Inactive: task in Insurance fixes", E, "Inactive", [
      step("r3b-task", "create_task", { title: "Insurance inactive for {{client.name}}", queue: "Insurance fixes", priority: "high", dueInDays: 1 }),
    ]),
    enteredStage("r4-rule-inactive-msg", "Inactive: ask the patient to update their insurance", E, "Inactive", [
      step("r3b-msg", "send_message", { channel: "sms", template: "update_insurance" }),
    ]),
    enteredStage("r4-rule-pending-review", "Pending review: task to review the benefits", E, "Pending review", [
      step("r3c-task", "create_task", { title: "Review the benefits captured for {{client.name}}", queue: "Benefits to verify", priority: "normal", dueInDays: 1 }),
    ]),
    enteredStage("r4-rule-inconclusive-task", "Inconclusive and no payer call placed: task in Benefits to verify", E, "Inconclusive", [
      step("r3d-task", "create_task", { title: "Verify benefits by phone: {{client.name}}", queue: "Benefits to verify", priority: "normal", dueInDays: 1 }),
    ], { conditions: [cond("c1", "_voiceEnabled", "equals", "false")] }),
    enteredStage("r4-rule-eligible-check-auth", "Eligible: check whether authorization is required", E, "Eligible", [
      step("r4-auth", "check_auth_required", {}),
    ]),
    enteredStage("r4-rule-eligible-estimate", "Eligible with a copay: send the patient an estimate", E, "Eligible", [
      step("r4-est", "send_message", { channel: "sms", template: "estimate" }),
    ], { conditions: [cond("c1", "elig_copay", "greater_than", 0)] }),
    {
      id: "r4-rule-auth-required",
      name: "Authorization required: move the record to Prior auth and request it",
      entityType: "claim",
      trigger: { event: "auth.checked" },
      conditions: [cond("c1", "auth_status", "equals", "required")],
      action: NOOP,
      actions: [
        step("r4a-move", "move_to_workflow", { workflowId: P }),
        step("r4a-req", "request_prior_auth", { stageMap: { requested: "Submitted" } }),
      ],
    },
    {
      id: "r4-rule-auth-not-required",
      name: "Authorization not required: insurance cleared",
      entityType: "claim",
      trigger: { event: "auth.checked" },
      conditions: [cond("c1", "auth_status", "equals", "not_required")],
      action: NOOP,
      actions: [step("r4b-appt", "move_to_workflow", { entity: "appointment", workflowId: APPT_INSURANCE_WORKFLOW_ID, stageName: "Insurance cleared" })],
    },
    enteredStage("r4-rule-prior-auth-required", "Prior auth required: task in Prior auth", P, "Required", [
      step("r5-task", "create_task", { title: "Prior authorization for {{client.name}}", queue: "Prior auth", priority: "high", dueInDays: 2 }),
    ]),
    enteredStage("r4-rule-prior-auth-approved", "Prior auth approved: insurance cleared", P, "Approved", [
      step("r5a-appt", "move_to_workflow", { entity: "appointment", workflowId: APPT_INSURANCE_WORKFLOW_ID, stageName: "Insurance cleared" }),
    ]),
    enteredStage("r4-rule-prior-auth-denied", "Prior auth denied: task and notification", P, "Denied", [
      step("r5b-task", "create_task", { title: "Prior auth denied for {{client.name}}", queue: "Prior auth", priority: "urgent", dueInDays: 1 }),
      step("r5b-notify", "notify", { title: "Prior authorization denied", message: "The authorization for {{client.name}} was denied", eventKey: "r4-rule-prior-auth-denied" }),
    ]),
    {
      id: "r4-rule-no-decision",
      name: "Daily: visit in 2 days and the authorization has no decision, notify",
      entityType: "appointment",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "upcoming_visits"), cond("c2", "daysUntil", "equals", 2), cond("c3", "auth_status", "equals", "requested")],
      action: NOOP,
      actions: [step("r5c-notify", "notify", { title: "Authorization has no decision", message: "A visit in 2 days still has no approved authorization", eventKey: "r4-rule-no-decision" })],
    },
    {
      id: "r4-rule-daily-recheck",
      name: "Daily: re-check insurance visits in the next 3 days",
      entityType: "appointment",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "upcoming_visits"), cond("c2", "daysUntil", "less_than_or_equal", 3), cond("c3", "paymentMode", "equals", "insurance")],
      action: NOOP,
      actions: [step("r6-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 30, stageMap: ELIGIBILITY_RESULT_STAGES })],
    },
    {
      id: "r4-rule-coverage-updated",
      name: "Coverage changed: re-check future visits",
      entityType: "client",
      trigger: { event: "coverage.updated" },
      action: NOOP,
      actions: [step("r6b-elig", "run_eligibility", { scope: "future_appointments", targets: ["instance", "appointment"], windowDays: 0, stageMap: ELIGIBILITY_RESULT_STAGES })],
    },
    {
      id: "r4-rule-checkin-recheck",
      name: "Check-in: re-check insurance when the last check is older than a day",
      entityType: "appointment",
      trigger: { event: "appointment.checked_in" },
      conditions: [cond("c1", "paymentMode", "equals", "insurance"), cond("c2", "_daysSinceLastCheck", "greater_than", 1)],
      action: NOOP,
      actions: [step("r6c-elig", "run_eligibility", { targets: ["instance", "appointment"], windowDays: 0, stageMap: ELIGIBILITY_RESULT_STAGES })],
    },
    {
      id: "r4-rule-cancelled",
      name: "Appointment cancelled: close its insurance record as lost",
      description: "The record moves to the lost stage of its workflow; its open tasks close themselves when it leaves their stage.",
      entityType: "appointment",
      trigger: { event: "appointment.cancelled" },
      action: NOOP,
      actions: [step("r7-close", "update_to_stage", { stageEntity: "claim", closeAs: "lost" })],
    },
  ] as SampleRuleDef[];
}

registerSampleRuleSet({
  id: "R",
  label: "Insurance record (eligibility, prior auth)",
  description: "One insurance record per appointment through Eligibility and Prior auth",
  rules: buildSetRRules,
  requires: [],
});
