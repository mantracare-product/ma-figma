/**
 * patientStageProgressStore.ts
 *
 * Tracks patient-side task completions for active stages:
 * - Checked checklist items
 * - Digital consent signatures
 * - Uploaded documents (synced to clientSavedDocuments)
 * - Visit feedback submissions
 *
 * Persisted in localStorage and synchronized cross-window via syncBroadcast.
 */

import { broadcastSync, onSyncEvent } from "./syncBroadcast";
import { saveClientDocument } from "./clientDocumentsStore";

const PROGRESS_STORAGE_KEY = "patient_stage_progress_v1";
const FEEDBACK_STORAGE_KEY = "patient_visit_feedback_v1";

export interface StageTaskProgress {
  completedChecklistIds: string[];
  consentsSigned: Record<string, { signedAt: string; signatureData?: string; signerName: string }>;
  uploadedDocIds: string[];
}

export interface VisitFeedback {
  id: string;
  clientId: string;
  clientName: string;
  processId: string;
  processName: string;
  rating: number; // 1 to 5
  tags: string[];
  comment: string;
  submittedAt: string;
}

function getProgressKey(clientId: string, processId: string, stageId: string): string {
  return `${clientId}::${processId}::${stageId}`;
}

export function getStoredStageProgress(clientId: string, processId: string, stageId: string): StageTaskProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const map: Record<string, StageTaskProgress> = raw ? JSON.parse(raw) : {};
    const key = getProgressKey(clientId, processId, stageId);
    return map[key] || { completedChecklistIds: [], consentsSigned: {}, uploadedDocIds: [] };
  } catch {
    return { completedChecklistIds: [], consentsSigned: {}, uploadedDocIds: [] };
  }
}

export function saveStageChecklistItem(
  clientId: string,
  processId: string,
  stageId: string,
  checklistItemId: string,
  isCompleted: boolean
) {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const map: Record<string, StageTaskProgress> = raw ? JSON.parse(raw) : {};
    const key = getProgressKey(clientId, processId, stageId);
    const current = map[key] || { completedChecklistIds: [], consentsSigned: {}, uploadedDocIds: [] };

    let updatedList: string[];
    if (isCompleted) {
      updatedList = Array.from(new Set([...current.completedChecklistIds, checklistItemId]));
    } else {
      updatedList = current.completedChecklistIds.filter((id) => id !== checklistItemId);
    }

    map[key] = { ...current, completedChecklistIds: updatedList };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
    broadcastSync("STAGE_PROGRESS_UPDATED", { clientId, processId, stageId });
  } catch {}
}

export function saveStageConsentSignature(
  clientId: string,
  clientName: string,
  processId: string,
  processName: string,
  stageId: string,
  stageName: string,
  consentId: string,
  consentTitle: string,
  signatureData: string
) {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const map: Record<string, StageTaskProgress> = raw ? JSON.parse(raw) : {};
    const key = getProgressKey(clientId, processId, stageId);
    const current = map[key] || { completedChecklistIds: [], consentsSigned: {}, uploadedDocIds: [] };

    const signedAt = new Date().toISOString();
    current.consentsSigned[consentId] = {
      signedAt,
      signatureData,
      signerName: clientName,
    };

    map[key] = current;
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));

    // Also auto-save as a permanent client document so staff can view/verify it!
    saveClientDocument({
      id: `DOC-CONSENT-${Date.now()}`,
      clientId,
      name: `${consentTitle} (Signed Digital Consent)`,
      category: "Consent Form",
      fileType: "pdf",
      fileSize: "24 KB",
      uploadedDate: signedAt.split("T")[0],
      uploadedBy: clientName,
      status: "Verified",
      notes: `Signed during ${processName} (${stageName}) stage by patient ${clientName}.`,
    });

    broadcastSync("STAGE_PROGRESS_UPDATED", { clientId, processId, stageId });
  } catch {}
}

export function uploadStageDocument(
  clientId: string,
  clientName: string,
  processId: string,
  stageId: string,
  docRequestId: string,
  fileTitle: string,
  fileName: string,
  fileSizeStr: string
) {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const map: Record<string, StageTaskProgress> = raw ? JSON.parse(raw) : {};
    const key = getProgressKey(clientId, processId, stageId);
    const current = map[key] || { completedChecklistIds: [], consentsSigned: {}, uploadedDocIds: [] };

    const docId = `DOC-UP-${Date.now()}`;
    current.uploadedDocIds = Array.from(new Set([...current.uploadedDocIds, docRequestId]));
    map[key] = current;
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));

    // Save directly into clientDocumentsStore so it reflects in staff's Document tab immediately!
    saveClientDocument({
      id: docId,
      clientId,
      name: `${fileTitle} - ${fileName}`,
      category: "Patient Upload",
      fileType: fileName.endsWith(".pdf") ? "pdf" : "image",
      fileSize: fileSizeStr || "450 KB",
      uploadedDate: new Date().toISOString().split("T")[0],
      uploadedBy: clientName,
      status: "Verified",
      notes: `Uploaded via Patient Front for stage requirement.`,
    });

    broadcastSync("STAGE_PROGRESS_UPDATED", { clientId, processId, stageId });
  } catch {}
}

// ── Visit Feedback ──

export function getVisitFeedbackList(clientId?: string): VisitFeedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const list: VisitFeedback[] = raw ? JSON.parse(raw) : [];
    if (clientId) {
      return list.filter((f) => f.clientId === clientId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveVisitFeedback(feedback: Omit<VisitFeedback, "id" | "submittedAt">): VisitFeedback {
  const all = getVisitFeedbackList();
  const entry: VisitFeedback = {
    ...feedback,
    id: `FB-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };
  const updated = [entry, ...all];
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
  broadcastSync("VISIT_FEEDBACK_UPDATED", entry);
  return entry;
}
