/**
 * Round 4 starting set, delivered in flagged steps so existing workspaces get each step exactly once (as ordinary,
 * editable items; never overwritten, never recreated after a delete):
 *   1. appointment workflow "Appointment via Insurance" (R4.3)
 *   2. insurance-record workflows "Eligibility" and "Prior auth" (claim entity, workflow type eligibility / prior_auth),
 *      the Eligibility / Authorization field registrations on the claim module, and rule set R (R4.4)
 *   3. migrations: the old "Coverage & authorization" instances become insurance records, the rules that created
 *      instances are switched off (not deleted), the Charge-capture creation rules continue the same record (R4.4)
 * Every change to existing data is logged to mantra_migration_log_v1.
 */
import "./sampleBundlesRegistry";
import "./sampleRuleSets";
import { getStoredProcesses, saveStoredProcesses, type Process, type Stage } from "./useProcessStore";
import { getStoredRules, saveStoredRules } from "./useAutomationStore";
import { getStoredClaims, saveClaim, type Claim } from "./claimsStore";
import { claimService } from "./claimService";
import { claimStageId } from "./rcmSampleClaimWorkflows";
import { defaultCallSettings } from "./stageCallDefaults";
import { logMigration } from "./stageCallMigration";
import { listSampleRuleSets, loadSampleRules } from "./sampleBundles";
import { OUTBOUND_STEPS, isUnsafeByDefault } from "./rcmDefaults";
import { ensureRcmFieldSeeds } from "./rcmFieldSeeds";
import { getProcessInstances, saveCallLogs, getStoredCallLogs } from "./processLogsStore";
import { writeRecordFields } from "./recordWriter";
import { SAMPLE_COVERAGE_PROCESS_ID } from "./rcmSampleIds";
import {
  APPT_INSURANCE_WORKFLOW_ID, APPT_INSURANCE_WORKFLOW_NAME, ELIGIBILITY_WORKFLOW_ID, ELIGIBILITY_WORKFLOW_NAME, PRIOR_AUTH_WORKFLOW_ID, PRIOR_AUTH_WORKFLOW_NAME,
} from "./rcmWorkflowIds";

export { APPT_INSURANCE_WORKFLOW_ID, APPT_INSURANCE_WORKFLOW_NAME, ELIGIBILITY_WORKFLOW_ID, PRIOR_AUTH_WORKFLOW_ID };
void OUTBOUND_STEPS;

const FLAG_APPT = "mantra_r4_appt_workflow_v1";
const FLAG_RECORDS = "mantra_r4_insurance_records_v1";
const FLAG_MIGRATE = "mantra_r4_instances_migrated_v1";
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const apptInsuranceStageId = (name: string) => `${APPT_INSURANCE_WORKFLOW_ID}-${slug(name)}`;

type Row = [name: string, category: string | undefined, position: "initial" | "intermediate" | "final", stageCategory: "in_progress" | "success" | "lost", color: string];
const stagesOf = (wfId: string, rows: Row[], idOf: (name: string) => string): Stage[] =>
  rows.map(([name, category, position, stageCategory, color]) => ({
    id: idOf(name),
    name,
    description: "",
    status: "active",
    color,
    ...(category ? { systemCategory: category } : {}),
    stageCategory,
    stagePosition: position,
    isInitial: position === "initial",
    isFinal: position === "final",
    isFinalStage: position === "final",
  })) as Stage[];

const AI = { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0, voice: "Ava", tone: "Professional", style: "Balanced" };

// ── 1. appointment workflow ─────────────────────────────────────────────────────────────────────

const APPT_ROWS: Row[] = [
  ["Booked", "booked", "initial", "in_progress", "#3B82F6"],
  ["Insurance cleared", "insurance_cleared", "intermediate", "in_progress", "#10B981"],
  ["Reminded", "reminded", "intermediate", "in_progress", "#06B6D4"],
  ["Checked in", "checked_in", "intermediate", "in_progress", "#8B5CF6"],
  ["Completed", "completed", "final", "success", "#14B8A6"],
];

export function buildAppointmentInsuranceWorkflow(): Process {
  return {
    id: APPT_INSURANCE_WORKFLOW_ID,
    name: APPT_INSURANCE_WORKFLOW_NAME,
    description: "Appointments paid through insurance: booked, insurance cleared, reminded, checked in, completed",
    assignedToUserId: 1,
    entityType: "appointment",
    aiSettings: AI,
    stages: stagesOf(APPT_INSURANCE_WORKFLOW_ID, APPT_ROWS, apptInsuranceStageId),
    source: "template",
  } as Process;
}

/** Add the workflow once (by id). Returns 1 when added. */
export function seedAppointmentInsuranceWorkflow(): number {
  try {
    if (localStorage.getItem(FLAG_APPT) === "1") return 0;
    const list = getStoredProcesses();
    let added = 0;
    if (!list.some((p) => p.id === APPT_INSURANCE_WORKFLOW_ID)) {
      saveStoredProcesses([...list, buildAppointmentInsuranceWorkflow()]);
      added = 1;
    }
    localStorage.setItem(FLAG_APPT, "1");
    return added;
  } catch {
    return 0;
  }
}

// ── 2. insurance-record workflows ────────────────────────────────────────────────────────────────

const ELIG_ROWS: Row[] = [
  ["Run eligibility", undefined, "initial", "in_progress", "#64748B"],
  ["Needs fix", undefined, "intermediate", "in_progress", "#F59E0B"],
  ["Inconclusive", undefined, "intermediate", "in_progress", "#EAB308"],
  ["Pending review", undefined, "intermediate", "in_progress", "#8B5CF6"],
  ["Eligible", undefined, "final", "success", "#10B981"],
  ["Inactive", undefined, "final", "lost", "#EF4444"],
  ["Self-pay", undefined, "final", "lost", "#14B8A6"],
];
const AUTH_ROWS: Row[] = [
  ["Required", undefined, "initial", "in_progress", "#EC4899"],
  ["Submitted", undefined, "intermediate", "in_progress", "#06B6D4"],
  ["Approved", undefined, "final", "success", "#10B981"],
  ["Denied", undefined, "final", "lost", "#B91C1C"],
  ["Expired", undefined, "final", "lost", "#DC2626"],
];

export function buildEligibilityWorkflow(): Process {
  const stages = stagesOf(ELIGIBILITY_WORKFLOW_ID, ELIG_ROWS, (n) => claimStageId(ELIGIBILITY_WORKFLOW_ID, n));
  // The payer call is a STAGE setting: entering Inconclusive places a payer-benefits call whose result waits for review.
  const inc: any = stages.find((s) => s.name === "Inconclusive");
  inc.enableCalling = true;
  inc.callTriggerSettings = defaultCallSettings("payer_benefits", "Pending review");
  return { id: ELIGIBILITY_WORKFLOW_ID, name: ELIGIBILITY_WORKFLOW_NAME, description: "Check the patient's insurance for the appointment", assignedToUserId: 1, entityType: "claim", workflowType: "eligibility", aiSettings: AI, stages, source: "template" } as Process;
}

export function buildPriorAuthWorkflow(): Process {
  return { id: PRIOR_AUTH_WORKFLOW_ID, name: PRIOR_AUTH_WORKFLOW_NAME, description: "Get the prior authorization the visit needs", assignedToUserId: 1, entityType: "claim", workflowType: "prior_auth", aiSettings: AI, stages: stagesOf(PRIOR_AUTH_WORKFLOW_ID, AUTH_ROWS, (n) => claimStageId(PRIOR_AUTH_WORKFLOW_ID, n)), source: "template" } as Process;
}

/** Add the two workflows (by id), register the claim-module fields, load rule set R (enabled except patient messages). Once. */
export function seedInsuranceRecordDefaults(): { workflows: number; rules: number; enabled: number } {
  const out = { workflows: 0, rules: 0, enabled: 0 };
  try {
    if (localStorage.getItem(FLAG_RECORDS) === "1") return out;
    const list = getStoredProcesses();
    const fresh = [buildEligibilityWorkflow(), buildPriorAuthWorkflow()].filter((w) => !list.some((p) => p.id === w.id));
    if (fresh.length) { saveStoredProcesses([...list, ...fresh]); out.workflows = fresh.length; }
    try { ensureRcmFieldSeeds(); } catch { /* registry unavailable */ }
    const set = listSampleRuleSets().find((s) => s.id === "R");
    if (set) {
      const defs = set.rules();
      const before = new Set(getStoredRules().map((r) => r.id));
      out.rules = loadSampleRules("R" as any);
      const turnOn = new Set(defs.filter((d) => !before.has(d.id) && (d as any).demoDefault !== false && !isUnsafeByDefault(d)).map((d) => d.id));
      if (turnOn.size) {
        const now = new Date().toISOString();
        saveStoredRules(getStoredRules().map((r) => (turnOn.has(r.id) && !r.enabled ? (out.enabled++, { ...r, enabled: true, updatedAt: now }) : r)));
      }
    }
    localStorage.setItem(FLAG_RECORDS, "1");
  } catch (e) {
    console.warn("[rcmDefaultsR4] insurance records:", e);
  }
  return out;
}

// ── 3. migrations ────────────────────────────────────────────────────────────────────────────────

const INSTANCE_STAGE_TO_RECORD: Record<string, { workflow: string; stage: string }> = {
  "Not checked": { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Run eligibility" },
  Checking: { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Run eligibility" },
  "Needs fix": { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Needs fix" },
  "Provider setup issue": { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Needs fix" },
  Inconclusive: { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Inconclusive" },
  "Pending review": { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Pending review" },
  Verified: { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Eligible" },
  Inactive: { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Inactive" },
  "Self-pay": { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Self-pay" },
  "Auth required": { workflow: PRIOR_AUTH_WORKFLOW_ID, stage: "Required" },
  "Auth submitted": { workflow: PRIOR_AUTH_WORKFLOW_ID, stage: "Submitted" },
  "Auth expired": { workflow: PRIOR_AUTH_WORKFLOW_ID, stage: "Expired" },
  "Auth denied": { workflow: PRIOR_AUTH_WORKFLOW_ID, stage: "Denied" },
};

/** Rules of the old "Coverage & authorization" flow (Set E A1-A13, E2 A11/A12): they create or move instances. */
const OLD_INSTANCE_RULE = /^sample-rule-A(1|2|3|4|5|6|8|9|10|11|12|13)$/;
const CLAIM_CREATION_RULES = ["sample-rule-A14", "sample-rule-A14-scribe", "sample-rule-A14-checkin", "sample-rule-A14-paid"];

export interface R4MigrationResult { records: number; rulesDisabled: number; rulesAdapted: number; retired: boolean }

/**
 * Once. (a) Every instance of the process "Coverage & authorization" becomes the insurance record of its appointment
 * (kept values: eligibility / authorization fields and history) in the matching Eligibility / Prior auth stage; the
 * instance rows are removed from the board and the process is copied to mantra_retired_processes_v1 before it is taken out
 * of the process list (reversible). (b) The old instance rules are DISABLED, not deleted. (c) The Charge-capture creation
 * rules (A14 family) continue the same record (ifExists "move") and only fire for insurance visits.
 */
export function migrateInstancesToInsuranceRecords(): R4MigrationResult {
  const out: R4MigrationResult = { records: 0, rulesDisabled: 0, rulesAdapted: 0, retired: false };
  try {
    if (localStorage.getItem(FLAG_MIGRATE) === "1") return out;
    const procs = getStoredProcesses();
    const hasWorkflows = procs.some((p) => p.id === ELIGIBILITY_WORKFLOW_ID);
    if (!hasWorkflows) return out; // wait until the workflows exist
    // (a) instances -> records
    const instances = getProcessInstances().filter((i) => i.processId === SAMPLE_COVERAGE_PROCESS_ID);
    for (const inst of instances as any[]) {
      const map = INSTANCE_STAGE_TO_RECORD[inst.currentStage] || { workflow: ELIGIBILITY_WORKFLOW_ID, stage: "Run eligibility" };
      const apptId = inst.source?.type === "appointment" ? String(inst.source.id) : "";
      if (!apptId) continue;
      const existing = getStoredClaims().find((c) => c.sourceType === "appointment" && c.sourceId === apptId);
      let claimId = existing?.id;
      if (!existing) {
        const claim: Claim = {
          id: `clm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          claimNumber: `INS-${String(inst.instanceId || inst.id).slice(-6).toUpperCase()}`,
          patientId: inst.clientId, patientName: inst.client || "", patientDob: "", patientGender: "Other", patientAddress: "", patientPhone: "", insuredId: "",
          payer: { id: "", name: inst.elig_payer || "", payerId: "", type: "Private" } as any,
          appointmentId: apptId, appointmentTitle: inst.source?.title,
          renderingProviderName: "", renderingProviderNpi: "", billingProviderName: "", billingProviderNpi: "", placeOfService: "",
          serviceDate: String(inst.date || "").slice(0, 10), diagnosisCodes: [], lines: [], totalCharge: 0, amountPaid: 0, status: "Draft",
          sourceType: "appointment", sourceId: apptId, dedupeKey: `claim:appointment:${apptId}`,
          createdAt: inst.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        const created = claimService.create(claim, map.workflow, claimStageId(map.workflow, map.stage), { type: "import" } as any);
        claimId = created.id;
        out.records += 1;
      }
      // carry the eligibility / authorization values and history over
      const fields: Record<string, any> = {};
      for (const k of Object.keys(inst)) if (k.startsWith("elig_") || k.startsWith("auth_") || k === "voice_call_id") fields[k] = inst[k];
      if (claimId && Object.keys(fields).length) writeRecordFields({ type: "claim", id: claimId }, fields);
    }
    if (instances.length) {
      saveCallLogs(getStoredCallLogs().filter((l: any) => l.processId !== SAMPLE_COVERAGE_PROCESS_ID));
      logMigration("R4.4", `${instances.length} Coverage & authorization instance(s) became insurance records (${out.records} new, the rest already had one for their appointment); the instance rows were removed from the board`);
    }
    // retire the process (copy kept)
    const old = procs.find((p) => p.id === SAMPLE_COVERAGE_PROCESS_ID);
    if (old) {
      try {
        const kept = JSON.parse(localStorage.getItem("mantra_retired_processes_v1") || "[]");
        kept.push({ retiredAt: new Date().toISOString(), process: old });
        localStorage.setItem("mantra_retired_processes_v1", JSON.stringify(kept));
      } catch { /* ignore */ }
      saveStoredProcesses(procs.filter((p) => p.id !== SAMPLE_COVERAGE_PROCESS_ID));
      out.retired = true;
      logMigration("R4.4", `Process "${old.name}" was taken out of the process list (a copy is in mantra_retired_processes_v1)`);
    }
    // (b) + (c) rules
    const now = new Date().toISOString();
    const rules = getStoredRules().map((r) => {
      if (OLD_INSTANCE_RULE.test(r.id) && r.enabled) {
        out.rulesDisabled += 1;
        logMigration("R4.4", `Rule "${r.name}" was switched off: it worked on Coverage & authorization instances (the insurance record rules replace it)`);
        return { ...r, enabled: false, updatedAt: now };
      }
      if (CLAIM_CREATION_RULES.includes(r.id)) {
        let touched = false;
        const actions = (r.actions || []).map((s: any) => {
          if (s.stepKey === "create_claim" && (s.params || {}).ifExists === undefined) { touched = true; return { ...s, params: { ...(s.params || {}), ifExists: "move" } }; }
          return s;
        });
        const hasCond = (r.conditions || []).some((c: any) => c.field === "paymentMode");
        if (touched || !hasCond) {
          out.rulesAdapted += 1;
          logMigration("R4.4", `Rule "${r.name}" now continues the appointment's insurance record (moves it to Charge capture) and only fires for insurance visits`);
          return { ...r, actions, conditions: hasCond ? r.conditions : [...(r.conditions || []), { id: "r4-pay", field: "paymentMode", op: "equals", value: "insurance" } as any], updatedAt: now };
        }
      }
      return r;
    });
    saveStoredRules(rules);
    localStorage.setItem(FLAG_MIGRATE, "1");
  } catch (e) {
    console.warn("[rcmDefaultsR4] migration:", e);
  }
  return out;
}

/** Run every Round 4 defaults step (each is flagged and idempotent). */
export function ensureRound4Defaults(): { appointmentWorkflow: number; workflows: number; rules: number; migrated: R4MigrationResult } {
  const appointmentWorkflow = seedAppointmentInsuranceWorkflow();
  const rec = seedInsuranceRecordDefaults();
  const migrated = migrateInstancesToInsuranceRecords();
  return { appointmentWorkflow, workflows: rec.workflows, rules: rec.rules, migrated };
}
