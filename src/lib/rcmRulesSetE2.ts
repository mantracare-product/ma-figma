/**
 * SAMPLE rules, Set E2 (authorization renewal and reminders): A11 and A12 (spec 3.0.5). Disabled until enabled.
 * They run from the daily job "instance_visit_countdown", whose rows carry the authorization dates/units.
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { ELIGIBILITY_STAGE_MAP } from "./rcmRulesSetE";

const NOOP = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({ id, stepKey, name: stepKey, params });

export function buildSetE2Rules(): SampleRuleDef[] {
  return [
    {
      id: "sample-rule-A11",
      name: "A11 Daily: authorization expires within 14 days or 80% of units used, renew it (Sample)",
      entityType: "client",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "instance_visit_countdown"), cond("c2", "authRenewalDue", "equals", "true")],
      action: NOOP,
      actions: [
        step("a11-check", "check_auth_required", { stageMap: { required: "Auth required" } }),
        step("a11-renew", "request_prior_auth", { renew: true, stageMap: { requested: "Auth submitted" } }),
        step("a11-task", "create_task", { title: "Renew prior auth for {{client.name}}", queue: "Prior auth", priority: "high", dueInDays: 2, linkTo: "instance_if_present" }),
      ],
    },
    {
      id: "sample-rule-A12",
      name: "A12 Daily: visit in 2 days and the authorization is not approved, notify front desk and biller (Sample)",
      entityType: "client",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "instance_visit_countdown"), cond("c2", "daysUntil", "equals", 2), cond("c3", "auth_status", "equals", "requested")],
      action: NOOP,
      actions: [step("a12-notify", "notify", { title: "Authorization not approved", message: "A visit in 2 days still has no approved authorization", eventKey: "sample-rule-A12", recipients: "front desk, biller" })],
    },
  ] as SampleRuleDef[];
}

void ELIGIBILITY_STAGE_MAP;

registerSampleRuleSet({
  id: "E2",
  label: "Authorization renewal and reminders (A11-A12)",
  description: "Renews expiring authorizations and warns before a visit with no approval",
  requires: ["billing-setup", "coverages", "task-views", "rcm-fields", "coverage-process", "prior-auth-rules"],
  rules: buildSetE2Rules,
});
