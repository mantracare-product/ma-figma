/**
 * Insurance claim pipeline rules, Set R (Round 6, Part A).
 * Drives the single "Insurance claim" pipeline through Eligibility -> Prior auth -> Charge capture -> Claim.
 * Ordinary editable rules with plain, clean names.
 * Ships ENABLED except rules that message patients directly (update_insurance, estimate) or submit claims automatically.
 */
import { registerSampleRuleSet, type SampleRuleDef } from "./sampleBundles";
import { stepDisplayName } from "./rcmCatalog";
import {
  INSURANCE_CLAIM_WORKFLOW_ID,
  APPT_INSURANCE_WORKFLOW_ID,
} from "./rcmWorkflowIds";
import { insuranceClaimStageId } from "./rcmPipelineR6";

const NOOP = { type: "moveToStage" as const, processId: "", stageId: "" };
const cond = (id: string, field: string, op: any, value: any) => ({ id, field, op, value });
const step = (id: string, stepKey: string, params: Record<string, any> = {}): any => ({
  id,
  stepKey,
  name: stepDisplayName({ stepKey }),
  params,
});

/** Eligibility result -> stage in the Insurance claim pipeline (resolved by stage name). */
export const ELIGIBILITY_RESULT_STAGES = {
  active: "Eligible",
  not_found: "Needs fix",
  provider_setup: "Credentialing issue",
  inactive: "Inactive coverage",
  inconclusive: "Inconclusive",
  no_coverage: "Self-pay",
};

const stageEntry = (
  id: string,
  name: string,
  stage: string,
  actions: any[],
  extra: Partial<SampleRuleDef> = {}
): SampleRuleDef => ({
  id,
  name,
  entityType: "claim",
  trigger: {
    event: "stage.entered",
    params: {
      processId: INSURANCE_CLAIM_WORKFLOW_ID,
      stageId: insuranceClaimStageId(stage),
    },
  },
  action: NOOP,
  actions,
  ...extra,
});

export function buildSetRRules(): SampleRuleDef[] {
  const PIPE = INSURANCE_CLAIM_WORKFLOW_ID;

  return [
    // ── 1. Create record on insurance visit booking ────────────────────────────────
    {
      id: "r4-rule-create-record",
      name: "Insurance visit booked: create insurance claim and route appointment",
      description: "When an appointment is booked with payment mode Insurance, create its insurance claim at Run eligibility and route the appointment to Appointment via Insurance.",
      entityType: "appointment",
      trigger: { event: "appointment.booked" },
      conditions: [cond("c1", "paymentMode", "equals", "insurance")],
      action: NOOP,
      order: 10,
      actions: [
        step("r1-create", "create_claim", {
          startWorkflow: PIPE,
          startStage: "Run eligibility",
          linesFrom: "none",
          ifExists: "keep",
        }),
        step("r1-appt", "move_to_workflow", { workflowId: APPT_INSURANCE_WORKFLOW_ID }),
      ],
    },

    // ── 2. Run eligibility entry: check credentialing, else run eligibility ────────
    stageEntry(
      "r4-rule-check-cred-on-elig",
      "Run eligibility entry: route uncredentialed providers/org to Credentialing issue",
      "Run eligibility",
      [
        step("r2-cred-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Credentialing issue",
        }),
      ],
      {
        order: 10,
        conditions: [
          cond("c1", "_providerCredentialed", "equals", "false"),
        ],
      }
    ),

    stageEntry(
      "r4-rule-run-eligibility",
      "Run eligibility entry: verify coverage with payer",
      "Run eligibility",
      [
        step("r2-elig", "run_eligibility", {
          targets: ["instance", "appointment"],
          windowDays: 30,
          stageMap: ELIGIBILITY_RESULT_STAGES,
        }),
      ],
      { order: 20 }
    ),

    // ── 3. Eligibility issue handling ──────────────────────────────────────────────
    stageEntry(
      "r4-rule-needs-fix-task",
      "Needs fix: create task in Insurance fixes",
      "Needs fix",
      [
        step("r3-task", "create_task", {
          title: "Fix insurance for {{client.name}}",
          queue: "Insurance fixes",
          priority: "high",
          dueInDays: 1,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-needs-fix-msg",
      "Needs fix: request updated insurance from patient",
      "Needs fix",
      [
        step("r3-msg", "send_message", { channel: "sms", template: "update_insurance" }),
      ],
      { demoDefault: false }
    ),

    stageEntry(
      "r4-rule-cred-issue-task",
      "Credentialing issue: create task in Insurance fixes",
      "Credentialing issue",
      [
        step("r3-cred-task", "create_task", {
          title: "Provider credentialing issue for {{client.name}}",
          queue: "Insurance fixes",
          priority: "high",
          dueInDays: 1,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-inactive-task",
      "Inactive coverage: create task in Insurance fixes",
      "Inactive coverage",
      [
        step("r3b-task", "create_task", {
          title: "Insurance inactive for {{client.name}}",
          queue: "Insurance fixes",
          priority: "high",
          dueInDays: 1,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-inactive-msg",
      "Inactive coverage: notify patient of inactive policy",
      "Inactive coverage",
      [
        step("r3b-msg", "send_message", { channel: "sms", template: "update_insurance" }),
      ],
      { demoDefault: false }
    ),

    stageEntry(
      "r4-rule-pending-review-task",
      "Pending review: create task in Benefits to verify",
      "Pending review",
      [
        step("r3c-task", "create_task", {
          title: "Review benefits captured for {{client.name}}",
          queue: "Benefits to verify",
          priority: "normal",
          dueInDays: 1,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-inconclusive-task",
      "Inconclusive without automated call: task in Benefits to verify",
      "Inconclusive",
      [
        step("r3d-task", "create_task", {
          title: "Verify benefits by phone for {{client.name}}",
          queue: "Benefits to verify",
          priority: "normal",
          dueInDays: 1,
        }),
      ],
      { conditions: [cond("c1", "_voiceEnabled", "equals", "false")] }
    ),

    // ── 4. Eligible -> Prior Auth checks ──────────────────────────────────────────
    stageEntry(
      "r4-rule-eligible-check-auth",
      "Eligible: check if prior authorization is required",
      "Eligible",
      [
        step("r4-auth", "check_auth_required", {}),
      ]
    ),

    stageEntry(
      "r4-rule-eligible-estimate",
      "Eligible with copay: send patient estimate",
      "Eligible",
      [
        step("r4-est", "send_message", { channel: "sms", template: "estimate" }),
      ],
      {
        demoDefault: false,
        conditions: [cond("c1", "elig_copay", "greater_than", 0)],
      }
    ),

    {
      id: "r4-rule-auth-required",
      name: "Authorization required: advance to Auth required and submit request",
      entityType: "claim",
      trigger: { event: "auth.checked" },
      conditions: [cond("c1", "auth_status", "equals", "required")],
      action: NOOP,
      actions: [
        step("r4a-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Auth required",
        }),
        step("r4a-req", "request_prior_auth", { stageMap: { requested: "Auth submitted" } }),
      ],
    },

    {
      id: "r4-rule-auth-not-required",
      name: "Authorization not required: advance to Cleared for visit and clear appointment",
      entityType: "claim",
      trigger: { event: "auth.checked" },
      conditions: [cond("c1", "auth_status", "equals", "not_required")],
      action: NOOP,
      actions: [
        step("r4b-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Cleared for visit",
        }),
        step("r4b-appt", "move_to_workflow", {
          entity: "appointment",
          workflowId: APPT_INSURANCE_WORKFLOW_ID,
          stageName: "Insurance cleared",
        }),
      ],
    },

    stageEntry(
      "r4-rule-auth-required-task",
      "Auth required: create task in Prior auth",
      "Auth required",
      [
        step("r5-task", "create_task", {
          title: "Prior authorization needed for {{client.name}}",
          queue: "Prior auth",
          priority: "high",
          dueInDays: 2,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-auth-approved",
      "Auth approved: advance to Cleared for visit and clear appointment",
      "Auth approved",
      [
        step("r5a-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Cleared for visit",
        }),
        step("r5a-appt", "move_to_workflow", {
          entity: "appointment",
          workflowId: APPT_INSURANCE_WORKFLOW_ID,
          stageName: "Insurance cleared",
        }),
      ]
    ),

    stageEntry(
      "r4-rule-auth-denied",
      "Auth denied: create urgent task and notify",
      "Auth denied",
      [
        step("r5b-task", "create_task", {
          title: "Prior authorization denied for {{client.name}}",
          queue: "Prior auth",
          priority: "urgent",
          dueInDays: 1,
        }),
        step("r5b-notify", "notify", {
          title: "Prior authorization denied",
          message: "The authorization for {{client.name}} was denied",
          eventKey: "r4-rule-auth-denied",
        }),
      ]
    ),

    // ── 5. Re-checks and appointment lifecycle ─────────────────────────────────────
    {
      id: "r4-rule-no-decision-notify",
      name: "Daily: visit in 2 days and authorization pending decision, notify",
      entityType: "appointment",
      trigger: { event: "job.daily" },
      conditions: [
        cond("c1", "job", "equals", "upcoming_visits"),
        cond("c2", "daysUntil", "equals", 2),
        cond("c3", "auth_status", "equals", "requested"),
      ],
      action: NOOP,
      actions: [
        step("r5c-notify", "notify", {
          title: "Authorization has no decision",
          message: "A visit in 2 days still has no approved authorization",
          eventKey: "r4-rule-no-decision-notify",
        }),
      ],
    },

    {
      id: "r4-rule-daily-recheck",
      name: "Daily: re-check insurance for visits in next 3 days",
      entityType: "appointment",
      trigger: { event: "job.daily" },
      conditions: [
        cond("c1", "job", "equals", "upcoming_visits"),
        cond("c2", "daysUntil", "less_than_or_equal", 3),
        cond("c3", "paymentMode", "equals", "insurance"),
      ],
      action: NOOP,
      actions: [
        step("r6-elig", "run_eligibility", {
          targets: ["instance", "appointment"],
          windowDays: 30,
          stageMap: ELIGIBILITY_RESULT_STAGES,
        }),
      ],
    },

    {
      id: "r4-rule-coverage-updated",
      name: "Coverage updated: re-check future visits",
      entityType: "client",
      trigger: { event: "coverage.updated" },
      action: NOOP,
      actions: [
        step("r6b-elig", "run_eligibility", {
          scope: "future_appointments",
          targets: ["instance", "appointment"],
          windowDays: 0,
          stageMap: ELIGIBILITY_RESULT_STAGES,
        }),
      ],
    },

    {
      id: "r4-rule-credentialing-updated",
      name: "Credentialing updated: re-check records with credentialing issue",
      entityType: "claim",
      trigger: { event: "credentialing.updated" },
      conditions: [cond("c1", "currentStage", "equals", "Credentialing issue")],
      action: NOOP,
      actions: [
        step("r6-cred-recheck", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Run eligibility",
        }),
      ],
    },

    {
      id: "r4-rule-checkin-recheck",
      name: "Check-in: re-check insurance when previous check is over a day old",
      entityType: "appointment",
      trigger: { event: "appointment.checked_in" },
      conditions: [
        cond("c1", "paymentMode", "equals", "insurance"),
        cond("c2", "_daysSinceLastCheck", "greater_than", 1),
      ],
      action: NOOP,
      actions: [
        step("r6c-elig", "run_eligibility", {
          targets: ["instance", "appointment"],
          windowDays: 0,
          stageMap: ELIGIBILITY_RESULT_STAGES,
        }),
      ],
    },

    {
      id: "r4-rule-appointment-cancelled",
      name: "Appointment cancelled: close claim as Visit cancelled",
      description: "When an appointment is cancelled, move its insurance claim to Visit cancelled. Tasks auto-close.",
      entityType: "appointment",
      trigger: { event: "appointment.cancelled" },
      action: NOOP,
      actions: [
        step("r7-cancel-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Visit cancelled",
        }),
      ],
    },

    // ── 6. Charge capture and claim lifecycle ──────────────────────────────────────
    {
      id: "r4-rule-appointment-completed",
      name: "Appointment completed: move claim to Awaiting note",
      description: "When an insured appointment is completed, move its insurance claim to Awaiting note.",
      entityType: "appointment",
      trigger: { event: "appointment.completed" },
      conditions: [cond("c1", "paymentMode", "equals", "insurance")],
      action: NOOP,
      actions: [
        step("r8-note-move", "create_claim", {
          startWorkflow: PIPE,
          startStage: "Awaiting note",
          linesFrom: "appointment",
          ifExists: "move",
        }),
      ],
    },

    {
      id: "r4-rule-note-signed",
      name: "Note signed: advance claim to Ready to bill",
      entityType: "claim",
      trigger: { event: "claim.note_signed" },
      action: NOOP,
      actions: [
        step("r9-rtb-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Ready to bill",
        }),
      ],
    },

    stageEntry(
      "r4-rule-ready-to-bill",
      "Ready to bill: move claim to Draft",
      "Ready to bill",
      [
        step("r10-draft-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Draft",
        }),
      ]
    ),

    stageEntry(
      "r4-rule-draft-scrub",
      "Draft: scrub claim before submission",
      "Draft",
      [
        step("r11-scrub", "scrub_claim", {
          onPass: "Ready to submit",
          onFail: "Scrub failed",
        }),
      ]
    ),

    stageEntry(
      "r4-rule-scrub-failed",
      "Scrub failed: create task in Claim fixes",
      "Scrub failed",
      [
        step("r12-scrub-task", "create_task", {
          title: "Fix scrub errors on claim {{claim.claimNumber}}",
          queue: "Claim fixes",
          priority: "high",
          dueInDays: 1,
        }),
      ]
    ),

    stageEntry(
      "r4-rule-ready-submit",
      "Ready to submit: submit claim electronically",
      "Ready to submit",
      [
        step("r13-submit", "submit_claim", {
          onSuccess: "Submitted",
          onReject: "Rejected",
        }),
      ],
      { demoDefault: false }
    ),

    {
      id: "r4-rule-daily-submit",
      name: "Daily: submit all claims in Ready to submit",
      entityType: "claim",
      trigger: { event: "job.daily" },
      conditions: [
        cond("c1", "job", "equals", "claims"),
        cond("c2", "currentStage", "equals", "Ready to submit"),
      ],
      action: NOOP,
      actions: [
        step("r14-submit-job", "submit_claim", {
          onSuccess: "Submitted",
          onReject: "Rejected",
        }),
      ],
    },

    {
      id: "r4-rule-submitted-ack",
      name: "Claim submitted: advance to Accepted by payer on acknowledgement",
      entityType: "claim",
      trigger: { event: "claim.submitted" },
      action: NOOP,
      actions: [
        step("r15-accept-move", "update_to_stage", {
          stageEntity: "claim",
          processId: PIPE,
          stageName: "Accepted by payer",
        }),
      ],
    },

    stageEntry(
      "r4-rule-rejected-task",
      "Rejected: create task in Claim fixes",
      "Rejected",
      [
        step("r16-rej-task", "create_task", {
          title: "Resubmit rejected claim {{claim.claimNumber}}",
          queue: "Claim fixes",
          priority: "urgent",
          dueInDays: 1,
        }),
      ]
    ),
  ] as SampleRuleDef[];
}

registerSampleRuleSet({
  id: "R",
  label: "Insurance claim pipeline",
  description: "One single pipeline for insurance claims from booking to acceptance",
  rules: buildSetRRules,
  requires: [],
});
