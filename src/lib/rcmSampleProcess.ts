/**
 * SAMPLE client process "Coverage & authorization" (spec Sample A). One INSTANCE per appointment, one Deals card per
 * instance. Seeded only by "Load sample templates"; fully editable; never overwritten once present.
 * Stage ids are stable so the sample rules (Set E) can reference them.
 */
import { getStoredProcesses, saveStoredProcesses, type Process, type Stage } from "./useProcessStore";
import { SAMPLE_COVERAGE_PROCESS_ID, SAMPLE_COVERAGE_PROCESS_NAME } from "./rcmSampleIds";

export const covStageId = (name: string) => `stg-cov-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

interface Row {
  name: string;
  meaning: string;
  position: "initial" | "intermediate" | "final";
  category: "in_progress" | "success" | "lost";
  color: string;
}

const ROWS: Row[] = [
  { name: "Not checked", meaning: "Instance created, no check yet", position: "initial", category: "in_progress", color: "#64748B" },
  { name: "Checking", meaning: "Request in flight", position: "intermediate", category: "in_progress", color: "#3B82F6" },
  { name: "Needs fix", meaning: "Name, DOB or member ID mismatch after retries", position: "intermediate", category: "in_progress", color: "#F59E0B" },
  { name: "Provider setup issue", meaning: "Provider not enrolled with this payer", position: "intermediate", category: "in_progress", color: "#F97316" },
  { name: "Inconclusive", meaning: "No usable answer after retries", position: "intermediate", category: "in_progress", color: "#EAB308" },
  { name: "Pending review", meaning: "Voice or manual benefits captured", position: "intermediate", category: "in_progress", color: "#8B5CF6" },
  { name: "Auth required", meaning: "A rule says authorization is needed", position: "intermediate", category: "in_progress", color: "#EC4899" },
  { name: "Auth submitted", meaning: "Authorization request sent", position: "intermediate", category: "in_progress", color: "#06B6D4" },
  { name: "Verified", meaning: "Cleared: active, auth not needed or approved", position: "final", category: "success", color: "#10B981" },
  { name: "Auth expired", meaning: "Date or units exceeded", position: "intermediate", category: "in_progress", color: "#DC2626" },
  { name: "Inactive", meaning: "Coverage is inactive", position: "final", category: "lost", color: "#EF4444" },
  { name: "Auth denied", meaning: "Payer denied the authorization", position: "final", category: "lost", color: "#B91C1C" },
  { name: "Self-pay", meaning: "No coverage or chose self-pay", position: "final", category: "success", color: "#14B8A6" },
];

export function buildCoverageSampleProcess(): Process {
  const stages: Stage[] = ROWS.map((r) => ({
    id: covStageId(r.name),
    name: r.name,
    description: r.meaning,
    status: "active",
    color: r.color,
    stageCategory: r.category,
    stagePosition: r.position,
    isInitial: r.position === "initial",
    isFinal: r.position === "final",
    isFinalStage: r.position === "final",
  }));
  return {
    id: SAMPLE_COVERAGE_PROCESS_ID,
    name: `${SAMPLE_COVERAGE_PROCESS_NAME} (Sample)`,
    description: "Sample: one instance per appointment tracks eligibility and prior authorization",
    assignedToUserId: 1,
    entityType: "client",
    aiSettings: { platform: "OpenAI - GPT-4o", voiceSpeed: 1.0, voice: "Ava", tone: "Professional", style: "Balanced" },
    stages,
    source: "template",
  } as Process;
}

/** Add the sample process when missing (by id). Returns 1 when added. */
export function seedCoverageSampleProcess(): number {
  const list = getStoredProcesses();
  if (list.some((p) => p.id === SAMPLE_COVERAGE_PROCESS_ID)) return 0;
  saveStoredProcesses([...list, buildCoverageSampleProcess()]);
  return 1;
}
