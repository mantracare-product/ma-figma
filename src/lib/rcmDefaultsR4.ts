/**
 * Round 4 starting set, delivered in flagged steps so existing workspaces get each step exactly once (as ordinary,
 * editable items; never overwritten, never recreated after a delete):
 *   - appointment workflow "Appointment via Insurance" (R4.3)
 *   - insurance-record workflows, rules and field registrations (R4.4, added in that phase)
 */
import { getStoredProcesses, saveStoredProcesses, type Process, type Stage } from "./useProcessStore";

export const APPT_INSURANCE_WORKFLOW_ID = "proc-appt-via-insurance";
export const APPT_INSURANCE_WORKFLOW_NAME = "Appointment via Insurance";
const FLAG_APPT = "mantra_r4_appt_workflow_v1";

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const apptInsuranceStageId = (name: string) => `${APPT_INSURANCE_WORKFLOW_ID}-${slug(name)}`;

type Row = [name: string, category: string, position: "initial" | "intermediate" | "final", stageCategory: "in_progress" | "success" | "lost", color: string];
const ROWS: Row[] = [
  ["Booked", "booked", "initial", "in_progress", "#3B82F6"],
  ["Insurance cleared", "insurance_cleared", "intermediate", "in_progress", "#10B981"],
  ["Reminded", "reminded", "intermediate", "in_progress", "#06B6D4"],
  ["Checked in", "checked_in", "intermediate", "in_progress", "#8B5CF6"],
  ["Completed", "completed", "final", "success", "#14B8A6"],
];

export function buildAppointmentInsuranceWorkflow(): Process {
  const stages: Stage[] = ROWS.map(([name, category, position, stageCategory, color]) => ({
    id: apptInsuranceStageId(name),
    name,
    description: "",
    status: "active",
    color,
    systemCategory: category,
    stageCategory,
    stagePosition: position,
    isInitial: position === "initial",
    isFinal: position === "final",
    isFinalStage: position === "final",
  })) as Stage[];
  return {
    id: APPT_INSURANCE_WORKFLOW_ID,
    name: APPT_INSURANCE_WORKFLOW_NAME,
    description: "Appointments paid through insurance: booked, insurance cleared, reminded, checked in, completed",
    assignedToUserId: 1,
    entityType: "appointment",
    aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0, voice: "Ava", tone: "Professional", style: "Balanced" },
    stages,
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

/** Run every Round 4 defaults step (each is flagged and idempotent). */
export function ensureRound4Defaults(): { appointmentWorkflow: number } {
  return { appointmentWorkflow: seedAppointmentInsuranceWorkflow() };
}
