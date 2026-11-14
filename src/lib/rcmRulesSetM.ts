/**
 * SAMPLE rules, Set M (money back): A21-A30 (spec 3.0.5). All ship DISABLED and editable. Stage names refer to the
 * sample claim workflows and the sample invoice stages; the clinic can retarget them. Deviation: A30 (invoice overdue
 * for 60 days) is a daily-job rule (job "invoices"), because nothing emits invoice.overdue after 60 days.
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { SAMPLE_CLAIM_WORKFLOW_IDS as W } from "./rcmSampleClaimWorkflows";

const NOOP = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({ id, stepKey, name: stepKey, params });
const claimStageEntry = (id: string, name: string, processId: string, stageId: string, actions: any[]): SampleRuleDef => ({
  id,
  name,
  entityType: "claim",
  trigger: { event: "stage.entered", params: { processId, stageId } },
  action: NOOP,
  actions,
});
const sid = (processId: string, stage: string) => `${processId}-${stage.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export function buildSetMRules(): SampleRuleDef[] {
  return [
    {
      id: "sample-rule-A21",
      name: "A21 Daily: accepted claims with no payment after 30 days, check status (Sample)",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "claims"), cond("c2", "stageCategory", "equals", "accepted"), cond("c3", "ageDays", "greater_than", 30)],
      action: NOOP,
      actions: [
        step("a21-check", "check_claim_status", { onPending: "Pending (payer)" }),
        step("a21-task", "create_task", { title: "Follow up with the payer: {{client.name}}", queue: "Denials and A/R", priority: "normal", dueInDays: 3, workflowId: W.claim, stage: "Pending (payer)" }),
      ],
    },
    {
      id: "sample-rule-A22",
      name: "A22 ERA received: post the payments (Sample)",
      entityType: "claim",
      trigger: { event: "era.received" },
      action: NOOP,
      actions: [step("a22-post", "post_remittance", { onPaid: "Paid", onPartial: "Partially paid" })],
    },
    {
      id: "sample-rule-A23",
      name: "A23 ERA lines that match no claim: task in Posting (Sample)",
      entityType: "claim",
      trigger: { event: "era.unmatched" },
      action: NOOP,
      actions: [step("a23-task", "create_task", { title: "Match unposted payment lines (ERA {{eraId}})", queue: "Posting", priority: "normal", dueInDays: 2, entityType: "era" })],
    },
    {
      id: "sample-rule-A24",
      name: "A24 Underpaid by more than $5: Partially paid + task in Posting (Sample)",
      entityType: "claim",
      trigger: { event: "claim.partially_paid" },
      conditions: [cond("c1", "underpaidBy", "greater_than", 5)],
      action: NOOP,
      actions: [
        step("a24-move", "update_to_stage", { stageEntity: "claim", processId: W.claim, stageName: "Partially paid" }),
        step("a24-task", "create_task", { title: "Review underpayment: {{client.name}}", queue: "Posting", priority: "normal", dueInDays: 3, workflowId: W.claim, stage: "Partially paid" }),
      ],
    },
    {
      id: "sample-rule-A25",
      name: "A25 Denied: move to Denial & appeal, set priority, queue a Denials and A/R task (Sample)",
      entityType: "claim",
      trigger: { event: "claim.denied" },
      action: NOOP,
      actions: [
        step("a25-mtw", "move_to_workflow", { workflowId: W.denial, stageName: "New denial" }),
        step("a25-fields", "update_fields", { targets: ["this"], fields: { priority: "high" } }),
        step("a25-task", "create_task", { title: "Work the denial: {{client.name}}", queue: "Denials and A/R", priority: "high", dueInDays: 2, workflowId: W.denial, stage: "New denial" }),
      ],
    },
    { ...claimStageEntry("sample-rule-A25b", "A25 New denial that can be appealed: draft the appeal (Sample)", W.denial, sid(W.denial, "New denial"), [step("a25b-appeal", "draft_appeal", {})]), conditions: [cond("c1", "denialNext", "equals", "appeal")] },
    {
      id: "sample-rule-A26",
      name: "A26 Daily: appeal deadline within 14 days, notify the manager and raise priority (Sample)",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "claims"), cond("c2", "stageCategory", "equals", "denied"), cond("c3", "daysToAppealDeadline", "less_than_or_equal", 14)],
      action: NOOP,
      actions: [step("a26-notify", "notify", { title: "Appeal deadline close", message: "A denied claim's appeal deadline is within 14 days" }), step("a26-fields", "update_fields", { targets: ["this"], fields: { priority: "urgent" } })],
    },
    claimStageEntry("sample-rule-A27a", "A27 Claim paid: update the invoice and send the statement (Sample)", W.claim, sid(W.claim, "Paid"), [
      step("a27a-inv", "update_invoice_from_claim", { invoiceStage: "Sent" }),
      step("a27a-msg", "send_message", { channel: "sms", template: "payment_link" }),
    ]),
    claimStageEntry("sample-rule-A27b", "A27 Claim partially paid: update the invoice and send the statement (Sample)", W.claim, sid(W.claim, "Partially paid"), [
      step("a27b-inv", "update_invoice_from_claim", { invoiceStage: "Sent" }),
      step("a27b-msg", "send_message", { channel: "sms", template: "payment_link" }),
    ]),
    claimStageEntry("sample-rule-A27c", "A27 Written off: update the invoice and send the statement (Sample)", W.denial, sid(W.denial, "Written off"), [
      step("a27c-inv", "update_invoice_from_claim", { invoiceStage: "Sent" }),
      step("a27c-msg", "send_message", { channel: "sms", template: "payment_link" }),
    ]),
    {
      id: "sample-rule-A28a",
      name: "A28 Daily: invoice sent 15 days ago and unpaid, Reminder 1 (Sample)",
      entityType: "invoice",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "invoices"), cond("c2", "stageCategory", "equals", "sent"), cond("c3", "ageDays", "greater_than_or_equal", 15)],
      action: NOOP,
      actions: [step("a28a-move", "update_to_stage", { stageEntity: "invoice", stageName: "Reminder 1" }), step("a28a-msg", "send_message", { channel: "sms", template: "balance_reminder" })],
    },
    {
      id: "sample-rule-A28b",
      name: "A28 Daily: Reminder 1 sent 30 days ago and still unpaid, Reminder 2 (Sample)",
      entityType: "invoice",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "invoices"), cond("c2", "stageName", "equals", "Reminder 1"), cond("c3", "ageDays", "greater_than_or_equal", 30)],
      action: NOOP,
      actions: [step("a28b-move", "update_to_stage", { stageEntity: "invoice", stageName: "Reminder 2" }), step("a28b-msg", "send_message", { channel: "sms", template: "balance_reminder" })],
    },
    {
      id: "sample-rule-A29",
      name: "A29 Daily: unpaid 45 days and the patient consented to voice, call about the balance (Sample)",
      entityType: "invoice",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "invoices"), cond("c2", "ageDays", "greater_than_or_equal", 45), cond("c3", "voiceConsent", "equals", "true")],
      action: NOOP,
      actions: [step("a29-call", "start_call", { purpose: "balance_reminder" })],
    },
    {
      id: "sample-rule-A30",
      name: "A30 Daily: unpaid 60 days, mark Overdue and queue a Patient balances task (Sample)",
      description: "The spec triggers on invoice.overdue; nothing emits that after 60 days, so this runs from the daily job.",
      entityType: "invoice",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "invoices"), cond("c2", "ageDays", "greater_than_or_equal", 60)],
      action: NOOP,
      actions: [
        step("a30-move", "update_to_stage", { stageEntity: "invoice", stageName: "Overdue" }),
        step("a30-task", "create_task", { title: "Collect the balance: {{client.name}}", queue: "Patient balances", priority: "high", dueInDays: 2, stage: "Overdue" }),
      ],
    },
  ] as SampleRuleDef[];
}

registerSampleRuleSet({
  id: "M",
  label: "Money back (A21-A30)",
  description: "ERA posting, denials and appeals, invoice statements, reminders and balance calls",
  requires: ["billing-setup", "task-views", "message-templates", "claim-workflows", "invoice-stages"],
  rules: buildSetMRules,
});
