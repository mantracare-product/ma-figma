import { useState, useEffect } from "react";

export interface StageNumberAssignment {
  number: string;          // e.g. "+1 (555) 123-4567"
  channel: "whatsapp" | "sms";
  processId: string;
  processName: string;     // denormalized for easy display, e.g. "Patient Intake"
  stageId: string;
  stageName: string;       // denormalized, e.g. "Initial Contact"
}

export const STAGE_ROUTING_EVENT = "stageNumberRouting_updated";
const STORAGE_KEY = "stageNumberRouting";

export function getStageRouting(): StageNumberAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStageRouting(rows: StageNumberAssignment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(STAGE_ROUTING_EVENT));
}

// Assign (or reassign) a number to a process/stage. Silently overwrites any
// existing assignment for that number (last write wins — no blocking UI).
export function assignNumberToStage(assignment: StageNumberAssignment) {
  const current = getStageRouting();
  const filtered = current.filter(
    (r) => !(r.number === assignment.number && r.channel === assignment.channel)
  );
  saveStageRouting([...filtered, assignment]);
}

export function resolveStageForNumber(number: string, channel: "whatsapp" | "sms"): StageNumberAssignment | null {
  const rows = getStageRouting();
  return rows.find((r) => r.number === number && r.channel === channel) ?? null;
}

export function useStageNumberRouting() {
  const [rows, setRows] = useState<StageNumberAssignment[]>(getStageRouting);
  useEffect(() => {
    const handler = () => setRows(getStageRouting());
    window.addEventListener(STAGE_ROUTING_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(STAGE_ROUTING_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return rows;
}
