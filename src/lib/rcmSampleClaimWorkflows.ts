/**
 * SAMPLE claim workflows (spec Sample B): Charge capture, Claim, Denial & appeal. Seeded only by "Load sample
 * templates"; editable; never overwritten once present. Required categories are per workflow and minimal
 * (sample Claim: submitted, paid; the others none).
 */
import { getStoredProcesses, saveStoredProcesses, type Process, type Stage } from "./useProcessStore";

export const SAMPLE_CLAIM_WORKFLOW_IDS = {
  chargeCapture: "proc-sample-claim-charge-capture",
  claim: "proc-sample-claim-claim",
  denial: "proc-sample-claim-denial",
} as const;

const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const claimStageId = (processId: string, stageName: string) => `${processId}-${slug(stageName)}`;

type Row = [name: string, category: string | undefined, position: "initial" | "intermediate" | "final", stageCategory: "in_progress" | "success" | "lost", color: string];

function stagesFor(processId: string, rows: Row[]): Stage[] {
  return rows.map(([name, category, position, stageCategory, color]) => ({
    id: claimStageId(processId, name),
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
  }));
}

const base = (id: string, name: string, description: string, rows: Row[], requiredCategories: string[]): Process =>
  ({
    id,
    name: `${name} (Sample)`,
    description,
    assignedToUserId: 1,
    entityType: "claim",
    aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0, voice: "Ava", tone: "Professional", style: "Balanced" },
    stages: stagesFor(id, rows),
    requiredCategories,
    source: "template",
  }) as Process;

export function buildSampleClaimWorkflows(): Process[] {
  const { chargeCapture, claim, denial } = SAMPLE_CLAIM_WORKFLOW_IDS;
  return [
    base(chargeCapture, "Charge capture", "Sample: the visit's charges are coded before a claim is built", [
      ["Awaiting note", "awaiting_note", "initial", "in_progress", "#64748B"],
      ["Coding review", "coding", "intermediate", "in_progress", "#3B82F6"],
      ["Hold", "hold", "intermediate", "in_progress", "#F59E0B"],
      ["Ready to bill", "ready_to_bill", "final", "success", "#10B981"],
    ], []),
    base(claim, "Claim", "Sample: scrub, submit and follow the claim to payment", [
      ["Draft", "draft", "initial", "in_progress", "#64748B"],
      ["Scrub failed", "scrub_failed", "intermediate", "in_progress", "#F59E0B"],
      ["Ready to submit", "ready", "intermediate", "in_progress", "#06B6D4"],
      ["Submitted", "submitted", "intermediate", "in_progress", "#3B82F6"],
      ["Rejected", "rejected", "intermediate", "in_progress", "#EF4444"],
      ["Accepted by payer", "accepted", "intermediate", "in_progress", "#8B5CF6"],
      ["Pending (payer)", "pending", "intermediate", "in_progress", "#EAB308"],
      ["Partially paid", "partially_paid", "intermediate", "in_progress", "#F97316"],
      ["Paid", "paid", "final", "success", "#10B981"],
      ["Closed", "closed", "final", "success", "#14B8A6"],
    ], ["submitted", "paid"]),
    base(denial, "Denial & appeal", "Sample: work a denied claim until it is corrected, appealed or written off", [
      ["New denial", "denied", "initial", "in_progress", "#EF4444"],
      ["Correct & resubmit", "correct", "intermediate", "in_progress", "#F59E0B"],
      ["Appeal drafted", "appeal_drafted", "intermediate", "in_progress", "#8B5CF6"],
      ["Appeal submitted", "appeal_submitted", "intermediate", "in_progress", "#3B82F6"],
      ["Written off", "written_off", "final", "lost", "#64748B"],
    ], []),
  ];
}

/** Add the sample workflows missing by id. Returns how many were added. */
export function seedSampleClaimWorkflows(): number {
  const list = getStoredProcesses();
  const have = new Set(list.map((p) => p.id));
  const fresh = buildSampleClaimWorkflows().filter((p) => !have.has(p.id));
  if (fresh.length === 0) return 0;
  saveStoredProcesses([...list, ...fresh]);
  return fresh.length;
}
