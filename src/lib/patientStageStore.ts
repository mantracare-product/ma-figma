/**
 * patientStageStore.ts
 *
 * Provides resolution of patient-facing stage content (instructions, checklists,
 * digital consents, document requests, and wait status) keyed per (Process, Stage)
 * combination, as mandated by the PRD.
 */

import { getStoredProcesses, PatientFacingStageContent, Process, Stage } from "./useProcessStore";

export function getPatientFacingStageContent(
  processId: string,
  stageId: string,
  stageName?: string
): PatientFacingStageContent | null {
  const processes = getStoredProcesses();
  const proc = processes.find(
    (p) => p.id === processId || p.name.toLowerCase() === processId.toLowerCase()
  );

  if (proc && proc.stages) {
    const stage = proc.stages.find(
      (s) =>
        s.id === stageId ||
        (stageName && s.name.toLowerCase() === stageName.toLowerCase()) ||
        s.name.toLowerCase() === stageId.toLowerCase()
    );

    if (stage?.patientFacingContent) {
      return stage.patientFacingContent;
    }
  }

  // Fallback defaults for common stages if not explicitly configured on the stage
  return getFallbackStageContent(proc?.pipelineType || "OPD", stageName || stageId);
}

function getFallbackStageContent(
  pipelineType: "OPD" | "IPD" | "Operation",
  stageIdentifier: string
): PatientFacingStageContent {
  const normalized = stageIdentifier.toLowerCase();

  if (normalized.includes("reception") || normalized.includes("initial") || normalized.includes("contact")) {
    return {
      infoText: "You are checked in. Please have your identification ready for frontdesk verification.",
      instructions: ["Take a seat in the waiting lounge", "Your token will be announced on display monitors"],
      badge: "Checked In",
      estimatedWaitTime: "~5-10 mins",
      roomOrCounter: "Reception Counter 1",
    };
  }

  if (normalized.includes("insurance")) {
    return {
      infoText: "Our financial coordinator is verifying your health plan benefits and pre-authorization.",
      instructions: ["Ensure your policy card is scanned", "Digital eligibility check in progress"],
      badge: "Eligibility Check",
      estimatedWaitTime: "~10 mins",
      roomOrCounter: "Billing Desk 3",
    };
  }

  if (normalized.includes("doctor") || normalized.includes("consult") || normalized.includes("exam")) {
    return {
      infoText: "The doctor is reviewing your vitals and prior clinical notes.",
      instructions: ["Please prepare to enter the examination room when called", "Have any previous prescriptions or questions ready"],
      badge: "Ready for Consult",
      estimatedWaitTime: "Next in Queue",
      roomOrCounter: "Consultation Cabin",
    };
  }

  if (normalized.includes("pharmacy") || normalized.includes("checkout") || normalized.includes("discharge")) {
    return {
      infoText: "Your care encounter is being finalized. Please pick up any medications and summary instructions.",
      instructions: ["Collect your digital prescription", "Review medication schedule", "Receipt sent to billing"],
      badge: "Checkout",
      estimatedWaitTime: "~5 mins",
      roomOrCounter: "Counter 4 - Checkout",
    };
  }

  if (pipelineType === "Operation") {
    return {
      infoText: "Surgical team preparing clinical area.",
      instructions: ["Adhere to sterile protocol", "Attendant should wait in family lounge"],
      badge: "Procedure Stage",
      estimatedWaitTime: "In Progress",
      roomOrCounter: "OR Suite",
    };
  }

  if (pipelineType === "IPD") {
    return {
      infoText: "Inpatient care and monitoring in progress.",
      instructions: ["Nursing staff rounds every 4 hours", "Press call button if assistance is needed"],
      badge: "Active Stay",
      roomOrCounter: "Inpatient Ward",
    };
  }

  return {
    infoText: "Stage progress in progress. Our care team is attending to your visit.",
    instructions: ["Please remain in the clinic area", "Listen for announcements"],
    badge: "In Progress",
    estimatedWaitTime: "~10 mins",
  };
}
