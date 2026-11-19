/**
 * Revenue-cycle action catalog (R2.5): every executor action the rule engine can run, with a real name, group,
 * description and icon. Used by the flow builder's "Add actions" sidebar, the step catalog drawer, and the canvas
 * (so a node never shows a raw key like "check_claim_status"). Pure data: no React.
 */
export type RcmActionGroup = "Eligibility & Auth" | "Claims" | "Payments" | "Tasks & Messages" | "Processes";

export interface RcmActionDef {
  key: string;
  label: string;
  group: RcmActionGroup;
  desc: string;
  /** Key into the icon maps (StepCatalogDrawer.STEP_ICON_MAP / FlowBuilderTab). */
  iconKey: string;
}

export const RCM_ACTION_GROUPS: Array<{ id: string; label: RcmActionGroup }> = [
  { id: "rcm-eligibility", label: "Eligibility & Auth" },
  { id: "rcm-claims", label: "Claims" },
  { id: "rcm-payments", label: "Payments" },
  { id: "rcm-tasks", label: "Tasks & Messages" },
  { id: "rcm-processes", label: "Processes" },
];

export const RCM_ACTIONS: RcmActionDef[] = [
  { key: "run_eligibility", label: "Run Eligibility", group: "Eligibility & Auth", iconKey: "shield", desc: "Check the client's coverage with the payer and write the result to the instance and appointment; fresh results inside the window are reused." },
  { key: "check_auth_required", label: "Check Auth Required", group: "Eligibility & Auth", iconKey: "shield", desc: "Look up whether this payer and service need prior authorization and record the answer." },
  { key: "request_prior_auth", label: "Request Prior Auth", group: "Eligibility & Auth", iconKey: "shield", desc: "Record a prior-authorization request when one is required; writes the Authorization fields and a history row." },

  { key: "create_claim", label: "Create insurance record", group: "Claims", iconKey: "filetext", desc: "Create the appointment's insurance record in any workflow and stage (it can start with no lines); there is only ever one per appointment: if it exists it is kept, or moved to the chosen workflow." },
  { key: "create_ar_record", label: "Create AR record", group: "Claims", iconKey: "dollar", desc: "Create or initialize the accounts receivable record for this claim at Awaiting payer or specified stage." },
  { key: "scrub_claim", label: "Scrub Claim", group: "Claims", iconKey: "check", desc: "Check the claim against the scrub rules and move it on pass or fail." },
  { key: "submit_claim", label: "Submit Claim", group: "Claims", iconKey: "send", desc: "Submit the claim to the clearinghouse and handle the acknowledgement." },
  { key: "check_claim_status", label: "Check Claim Status", group: "Claims", iconKey: "search", desc: "Ask the clearinghouse where a submitted claim is and move it on." },
  { key: "draft_appeal", label: "Draft Appeal", group: "Claims", iconKey: "filetext", desc: "Propose an appeal letter for a denied claim. Never sends or moves anything." },

  { key: "post_remittance", label: "Post Remittance", group: "Payments", iconKey: "dollar", desc: "Post an ERA to its claims (paid, partial, denied). Unmatched lines are kept and raise an unmatched-ERA event." },
  { key: "update_invoice_from_claim", label: "Update Invoice From Claim", group: "Payments", iconKey: "dollar", desc: "Copy the claim's insurance payment, adjustments and patient responsibility to its invoice and move the invoice." },

  { key: "create_task", label: "Create Task", group: "Tasks & Messages", iconKey: "check", desc: "Create a work-queue task linked to this record; it closes itself when the record leaves the stage." },
  { key: "send_message", label: "Send Message", group: "Tasks & Messages", iconKey: "messagecircle", desc: "Send a templated message to the client (added to Chats; checks consent)." },
  { key: "notify", label: "Notify", group: "Tasks & Messages", iconKey: "bell", desc: "Raise an in-app notification for the team." },

  { key: "start_process", label: "Start Process", group: "Processes", iconKey: "gitbranch", desc: "Start a new instance of a process for this client, linked to the record that triggered it (idempotent)." },
  { key: "move_to_workflow", label: "Move To Workflow", group: "Processes", iconKey: "gitbranch", desc: "Move a claim to another claim workflow (keeps all its values)." },
  { key: "update_fields", label: "Update Fields", group: "Processes", iconKey: "edit", desc: "Write field values to this record, its instance, appointment or client (saved, merge-safe)." },
];

export const RCM_ACTION_KEYS = RCM_ACTIONS.map((a) => a.key);
export const getRcmAction = (key?: string) => RCM_ACTIONS.find((a) => a.key === key);

/** Other step keys the builder knows (kept here so a test can tell "known" from "typo"). */
export const OTHER_STEP_KEYS = [
  "update_to_stage", "update-stage", "condition", "wait", "delay", "parallel", "endworkflow", "scheduleappointment", "generate_invoice",
  "generate_document", "whatsapp", "sms", "email", "fieldupdate", "assignhuman", "webhook_trigger",
];

const humanize = (k: string) => k.replace(/[_.-]+/g, " ").replace(/^./, (m) => m.toUpperCase());

/** Name to show for a step: its own name, unless that is empty or just its raw key (then the catalog label). */
export function stepDisplayName(step: { name?: string; stepKey?: string }): string {
  const key = step.stepKey || "";
  const name = (step.name || "").trim();
  if (name && name !== key && !/^[a-z0-9]+([_-][a-z0-9]+)+$/.test(name)) return name;
  return getRcmAction(key)?.label || (name ? humanize(name) : humanize(key || "step"));
}
