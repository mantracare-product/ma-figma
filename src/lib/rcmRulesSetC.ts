/**
 * SAMPLE rules, Set C (visit to claim): A14-A20 (spec 3.0.5). All ship DISABLED and editable. A14 has three variants
 * for WHEN the claim is created (at completion = the default; at scribe signing; at check-in; at invoice paid): the
 * clinic enables ONE, so "Enable demo set C" turns on only the default. Stage names/ids come from the sample claim
 * workflows; the clinic can point the rules at its own workflows.
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { SAMPLE_CLAIM_WORKFLOW_IDS as W, claimStageId } from "./rcmSampleClaimWorkflows";

const NOOP = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({ id, stepKey, name: stepKey, params });
const CAPTURE_START = { startWorkflow: W.chargeCapture, startStage: "Awaiting note" };

const claimStageEntry = (id: string, name: string, processId: string, stage: string, actions: any[]): SampleRuleDef => ({
  id,
  name,
  entityType: "claim",
  trigger: { event: "stage.entered", params: { processId, stageId: claimStageId(processId, stage) } },
  action: NOOP,
  actions,
});

export function buildSetCRules(): SampleRuleDef[] {
  return [
    {
      id: "sample-rule-A14",
      name: "A14 Visit completed: create the claim in Charge capture (Sample)",
      description: "Default timing. Variants A14-scribe / A14-checkin / A14-paid create the claim at another moment; enable only one.",
      entityType: "appointment",
      trigger: { event: "appointment.completed" },
      action: NOOP,
      actions: [step("a14-claim", "create_claim", CAPTURE_START), step("a14-notify", "notify", { title: "Visit completed", message: "Document and code the visit for {{client.name}}" })],
    },
    {
      id: "sample-rule-A14-scribe",
      name: "A14 variant: create the claim when the note is signed (Sample)",
      description: "Variant of A14 (enable one). Needs the scribe note to be signed with accepted codes.",
      entityType: "client",
      trigger: { event: "scribe.note_signed" },
      action: NOOP,
      demoDefault: false,
      actions: [step("a14s-claim", "create_claim", { ...CAPTURE_START, source: "scribe", linesFrom: "scribe_codes", startStage: "Ready to bill" })],
    },
    {
      id: "sample-rule-A14-checkin",
      name: "A14 variant: create the claim at check-in (Sample)",
      entityType: "appointment",
      trigger: { event: "appointment.checked_in" },
      action: NOOP,
      demoDefault: false,
      actions: [step("a14c-claim", "create_claim", CAPTURE_START)],
    },
    {
      id: "sample-rule-A14-paid",
      name: "A14 variant: create the claim when the invoice is paid (Sample)",
      entityType: "invoice",
      trigger: { event: "invoice.paid" },
      action: NOOP,
      demoDefault: false,
      actions: [step("a14p-claim", "create_claim", CAPTURE_START)],
    },
    {
      id: "sample-rule-A15",
      name: "A15 Daily: nudge the provider about notes waiting over 24 h (Sample)",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "claims"), cond("c2", "stageCategory", "equals", "awaiting_note"), cond("c3", "ageHours", "greater_than", 24)],
      action: NOOP,
      actions: [step("a15-notify", "notify", { title: "Note overdue", message: "A visit is waiting for its note (over 24 h)" })],
    },
    {
      id: "sample-rule-A16a",
      name: "A16 Note signed and codes accepted: mark ready to bill (Sample)",
      entityType: "claim",
      trigger: { event: "claim.note_signed" },
      action: NOOP,
      actions: [step("a16a-move", "update_to_stage", { stageEntity: "claim", processId: W.chargeCapture, stageName: "Ready to bill" })],
    },
    claimStageEntry("sample-rule-A16b", "A16 Ready to bill: move the claim to the Claim workflow (Sample)", W.chargeCapture, "Ready to bill", [
      step("a16b-mtw", "move_to_workflow", { workflowId: W.claim, stageName: "Draft" }),
    ]),
    claimStageEntry("sample-rule-A16c", "A16 Draft: scrub the claim (Sample)", W.claim, "Draft", [step("a16c-scrub", "scrub_claim", { onPass: "Ready to submit" })]),
    {
      id: "sample-rule-A17",
      name: "A17 Scrub failed: move to Scrub failed and queue a Claim fixes task (Sample)",
      entityType: "claim",
      trigger: { event: "claim.scrub_failed" },
      action: NOOP,
      actions: [
        step("a17-move", "update_to_stage", { stageEntity: "claim", processId: W.claim, stageName: "Scrub failed" }),
        step("a17-task", "create_task", { title: "Fix claim scrub errors: {{client.name}}", queue: "Claim fixes", priority: "high", dueInDays: 1, workflowId: W.claim, stage: "Scrub failed" }),
      ],
    },
    {
      id: "sample-rule-A18",
      name: "A18 Daily: submit claims that are ready (Sample)",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "claims"), cond("c2", "stageCategory", "equals", "ready")],
      action: NOOP,
      actions: [step("a18-submit", "submit_claim", { onSubmit: "Submitted", onAccepted: "Accepted by payer", onRejected: "Rejected" })],
    },
    {
      id: "sample-rule-A19",
      name: "A19 Daily: tell the biller about claims submitted over 2 days without a response (Sample)",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [cond("c1", "job", "equals", "claims"), cond("c2", "stageCategory", "equals", "submitted"), cond("c3", "ageDays", "greater_than", 2)],
      action: NOOP,
      actions: [step("a19-notify", "notify", { title: "No response from the payer", message: "A submitted claim has had no response for over 2 days" })],
    },
    {
      id: "sample-rule-A20",
      name: "A20 Rejected: queue a Claim fixes task (Sample)",
      entityType: "claim",
      trigger: { event: "claim.rejected" },
      action: NOOP,
      actions: [
        step("a20-move", "update_to_stage", { stageEntity: "claim", processId: W.claim, stageName: "Rejected" }),
        step("a20-task", "create_task", { title: "Fix rejected claim: {{client.name}}", queue: "Claim fixes", priority: "high", dueInDays: 1, workflowId: W.claim, stage: "Rejected" }),
      ],
    },
  ] as SampleRuleDef[];
}

registerSampleRuleSet({
  id: "C",
  label: "Visit to claim (A14-A20)",
  description: "Create, code, scrub, submit and follow the claim. Enables A14 at visit completion; the other A14 timings are variants (enable one).",
  requires: ["billing-setup", "coverages", "task-views", "claim-workflows"],
  rules: buildSetCRules,
});
