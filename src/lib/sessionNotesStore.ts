import { saveClientDocument } from "./clientDocumentsStore";
import { appendActivity } from "./activityEngine";
import { ScribeSession } from "./scribeSessionStore";
import { pushSessionNoteToEhr, getEhrSessionNoteTargets } from "./integrationsRegistry";

export const SESSION_NOTES_EVENT = "mantra_session_notes_updated";
const STORAGE_KEY = "mantra_session_notes_v1";

export type SessionNoteTemplateType = "SOAP" | "DAP" | "BIRP" | "Procedure" | "Freeform";

export interface SessionNoteTemplateSectionSpec {
  key: string;
  label: string;
  placeholder: string;
  rows?: number;
}

export const SESSION_NOTE_TEMPLATES: Record<
  SessionNoteTemplateType,
  {
    id: SessionNoteTemplateType;
    label: string;
    shortName: string;
    description: string;
    sections: SessionNoteTemplateSectionSpec[];
  }
> = {
  SOAP: {
    id: "SOAP",
    label: "SOAP Note",
    shortName: "SOAP",
    description: "Standard medical & allied health Subjective, Objective, Assessment, Plan chart note",
    sections: [
      { key: "subjective", label: "Subjective (S)", placeholder: "Chief complaint, history of present illness, symptom onset, patient-reported updates...", rows: 3 },
      { key: "objective", label: "Objective (O)", placeholder: "Exam findings, vitals, clinical observations, diagnostic/scale results...", rows: 3 },
      { key: "assessment", label: "Assessment (A)", placeholder: "Clinical impression, differential or confirmed diagnosis, response to treatment...", rows: 3 },
      { key: "plan", label: "Plan (P)", placeholder: "Medications, procedures, referrals, patient education, next follow-up date...", rows: 3 },
    ],
  },
  DAP: {
    id: "DAP",
    label: "DAP Progress Note",
    shortName: "DAP",
    description: "Behavioral health & therapy note covering Data, Assessment, and Plan",
    sections: [
      { key: "data", label: "Data (D)", placeholder: "Session focus, client statements, affect/mood observations, homework review...", rows: 4 },
      { key: "assessment", label: "Assessment (A)", placeholder: "Clinical formulation, progress toward treatment goals, risk screening...", rows: 3 },
      { key: "plan", label: "Plan (P)", placeholder: "Interventions assigned, coping skills practice, next session cadence...", rows: 3 },
    ],
  },
  BIRP: {
    id: "BIRP",
    label: "BIRP Note",
    shortName: "BIRP",
    description: "Structured Behavior, Intervention, Response, and Plan documentation",
    sections: [
      { key: "behavior", label: "Behavior (B)", placeholder: "Observed client presentation, demeanor, self-reported symptoms...", rows: 3 },
      { key: "intervention", label: "Intervention (I)", placeholder: "Therapeutic or clinical modalities used (CBT, motivational interviewing, etc.)...", rows: 3 },
      { key: "response", label: "Response (R)", placeholder: "How client engaged with or responded to the intervention during session...", rows: 3 },
      { key: "plan", label: "Plan (P)", placeholder: "Action items, homework, care coordination, next appointment...", rows: 3 },
    ],
  },
  Procedure: {
    id: "Procedure",
    label: "Procedure / Treatment Note",
    shortName: "Procedure",
    description: "Aesthetic, dental, or outpatient clinical procedure & post-care note",
    sections: [
      { key: "indication", label: "Indication & Informed Consent", placeholder: "Treatment area, clinical indication, consent verified, allergies/contraindications checked...", rows: 2 },
      { key: "procedureNotes", label: "Procedure & Dosages / Units", placeholder: "Technique, anatomic sites, batch/lot numbers, energy/units administered...", rows: 4 },
      { key: "findings", label: "Immediate Response & Tolerance", placeholder: "Patient tolerance, immediate skin/tissue response, adverse events (if any)...", rows: 2 },
      { key: "postCare", label: "Aftercare & Follow-Up Plan", placeholder: "Post-procedure instructions provided, review interval...", rows: 2 },
    ],
  },
  Freeform: {
    id: "Freeform",
    label: "General Clinical Note",
    shortName: "Freeform",
    description: "Flexible unstructured progress or consultation note",
    sections: [
      { key: "body", label: "Session Summary & Clinical Findings", placeholder: "Document the full consultation, clinical observations, and patient discussion...", rows: 7 },
      { key: "followUp", label: "Follow-Up & Action Items", placeholder: "Recommended next steps, referrals, or patient tasks...", rows: 3 },
    ],
  },
};

export interface SessionNoteVitals {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  spo2?: string;
  weight?: string;
}

export interface SessionNoteAddendum {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface SessionNoteEhrSyncRecord {
  integrationId: string;
  integrationName: string;
  syncedAt: string;
  externalNoteId: string;
  endpoint?: string;
  status: "synced" | "failed";
}

export interface SessionNote {
  id: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  appointmentTitle?: string;
  processId?: string;
  processName?: string;
  scribeSessionId?: string;
  providerId?: string;
  providerName: string;
  sessionDate: string; // ISO date or YYYY-MM-DDTHH:mm
  durationMinutes?: number;
  title: string;
  templateType: SessionNoteTemplateType;
  sections: Record<string, string>;
  vitals?: SessionNoteVitals;
  icd10Codes: string[];
  cptCodes: string[];
  status: "draft" | "signed";
  signedAt?: string;
  signedBy?: string;
  addendums: SessionNoteAddendum[];
  sharedToPatient?: boolean;
  sharedDocumentId?: string;
  ehrSyncRecords: SessionNoteEhrSyncRecord[];
  createdAt: string;
  updatedAt: string;
}

const SEED_SESSION_NOTES: SessionNote[] = [
  {
    id: "sn-seed-101",
    clientId: "1",
    clientName: "Sarah Johnson",
    appointmentId: "1",
    appointmentTitle: "Initial Consultation & Assessment",
    providerId: "2",
    providerName: "Dr. Akshita Sharma",
    sessionDate: "2026-11-18T10:30:00.000Z",
    durationMinutes: 45,
    title: "Initial Clinical Evaluation & Care Plan",
    templateType: "SOAP",
    sections: {
      subjective:
        "Patient reports intermittent tension headaches over the past 3 weeks and persistent work-related anxiety affecting sleep onset.",
      objective:
        "Alert and oriented x3. Affect calm, cooperative. BP 118/76 mmHg, Pulse 72 bpm, SpO2 99%. No focal deficits observed.",
      assessment:
        "Generalized anxiety disorder (moderate) with secondary tension-type sleep disturbance. Good candidate for structured CBT + relaxation protocol.",
      plan:
        "Initiated weekly CBT sessions. Recommended sleep hygiene guide via patient portal. Reassess symptom severity (GAD-7) in 2 weeks.",
    },
    vitals: { bloodPressure: "118/76", pulse: "72", spo2: "99%", temperature: "98.4°F" },
    icd10Codes: ["F41.1"],
    cptCodes: ["90791"],
    status: "signed",
    signedAt: "2026-11-18T11:20:00.000Z",
    signedBy: "Dr. Akshita Sharma",
    addendums: [],
    sharedToPatient: true,
    ehrSyncRecords: [
      {
        integrationId: "cliniko",
        integrationName: "Cliniko",
        syncedAt: "2026-11-18T11:21:00.000Z",
        externalNoteId: "CLINIKO-TN-8F4A21",
        endpoint: "POST /v1/treatment_notes",
        status: "synced",
      },
    ],
    createdAt: "2026-11-18T10:30:00.000Z",
    updatedAt: "2026-11-18T11:21:00.000Z",
  },
  {
    id: "sn-seed-102",
    clientId: "2",
    clientName: "Michael Brown",
    providerId: "5",
    providerName: "Dr. Robert Martinez",
    sessionDate: "2026-11-22T14:00:00.000Z",
    durationMinutes: 30,
    title: "Follow-Up Progress Review",
    templateType: "DAP",
    sections: {
      data:
        "Patient reports improved sleep consistency (6.5–7 hrs/night) after adopting structured evening wind-down. Mild anticipatory stress remains prior to team meetings.",
      assessment:
        "Steady positive response to cognitive reframing exercises. No safety concerns.",
      plan:
        "Continue current therapy cadence. Introduced exposure hierarchy worksheet; follow-up booked in 14 days.",
    },
    icd10Codes: ["F41.1"],
    cptCodes: ["90834"],
    status: "draft",
    addendums: [],
    ehrSyncRecords: [],
    createdAt: "2026-11-22T14:00:00.000Z",
    updatedAt: "2026-11-22T14:35:00.000Z",
  },
];

function readAllNotesRaw(): SessionNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to read session notes:", e);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SESSION_NOTES));
  } catch {}
  return SEED_SESSION_NOTES;
}

function writeAllNotesRaw(notes: SessionNote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Failed to persist session notes:", e);
  }
  window.dispatchEvent(new CustomEvent(SESSION_NOTES_EVENT, { detail: { notes } }));
}

export function getSessionNotes(filter?: {
  clientId?: string;
  appointmentId?: string;
  clientName?: string;
}): SessionNote[] {
  const all = readAllNotesRaw().sort(
    (a, b) => new Date(b.sessionDate || b.createdAt).getTime() - new Date(a.sessionDate || a.createdAt).getTime()
  );

  if (!filter) return all;

  return all.filter((n) => {
    if (filter.appointmentId) {
      const matchesAppt = String(n.appointmentId || "").toLowerCase() === String(filter.appointmentId).toLowerCase();
      if (!matchesAppt) return false;
    }
    if (filter.clientId || filter.clientName) {
      const normId = filter.clientId ? String(filter.clientId).toLowerCase() : "";
      const normName = filter.clientName ? filter.clientName.trim().toLowerCase() : "";
      const idMatch = normId && String(n.clientId).toLowerCase() === normId;
      const nameMatch = normName && n.clientName.trim().toLowerCase() === normName;
      if (!idMatch && !nameMatch) return false;
    }
    return true;
  });
}

export function getSessionNoteById(noteId: string): SessionNote | undefined {
  return readAllNotesRaw().find((n) => n.id === noteId);
}

export function saveSessionNote(
  note: Omit<SessionNote, "createdAt" | "updatedAt" | "addendums" | "ehrSyncRecords"> &
    Partial<Pick<SessionNote, "createdAt" | "updatedAt" | "addendums" | "ehrSyncRecords">>,
  options?: { logActivity?: boolean }
): SessionNote {
  const current = readAllNotesRaw();
  const existing = current.find((n) => n.id === note.id);
  const nowIso = new Date().toISOString();

  const merged: SessionNote = {
    addendums: existing?.addendums || [],
    ehrSyncRecords: existing?.ehrSyncRecords || [],
    createdAt: existing?.createdAt || nowIso,
    ...note,
    updatedAt: nowIso,
  };

  const next = [merged, ...current.filter((n) => n.id !== merged.id)];
  writeAllNotesRaw(next);

  if (options?.logActivity && !existing) {
    try {
      appendActivity({
        clientId: String(merged.clientId),
        clientName: merged.clientName,
        processId: merged.processId || "",
        processName: merged.processName || "Clinical Chart",
        appointmentId: merged.appointmentId,
        type: "session_note",
        timestamp: nowIso,
        status: merged.status === "signed" ? "completed" : "pending",
        refId: merged.id,
        details: {
          primary: `${merged.templateType} Note: ${merged.title}`,
          secondary: `${merged.providerName} · ${merged.status === "signed" ? "Signed & Locked" : "Saved as Draft"}`,
        },
        notes: buildSessionNotePlainSummary(merged),
      } as any);
    } catch {}
  }

  return merged;
}

export function deleteSessionNote(noteId: string): boolean {
  const current = readAllNotesRaw();
  const target = current.find((n) => n.id === noteId);
  if (!target || target.status === "signed") return false;
  writeAllNotesRaw(current.filter((n) => n.id !== noteId));
  return true;
}

export async function signAndLockSessionNote(
  noteId: string,
  signerName: string,
  options?: { autoSyncConnectedEhr?: boolean }
): Promise<{ note: SessionNote | null; syncedEhrs: string[] }> {
  const current = readAllNotesRaw();
  const target = current.find((n) => n.id === noteId);
  if (!target) return { note: null, syncedEhrs: [] };

  const nowIso = new Date().toISOString();
  let updated: SessionNote = {
    ...target,
    status: "signed",
    signedAt: target.signedAt || nowIso,
    signedBy: target.signedBy || signerName,
    updatedAt: nowIso,
  };

  const syncedEhrs: string[] = [];

  if (options?.autoSyncConnectedEhr !== false) {
    const enabledTargets = getEhrSessionNoteTargets().filter((t) => t.connected && t.sessionNotesEnabled);
    if (enabledTargets.length > 0) {
      const res = await pushSessionNoteToEhr({
        noteId: updated.id,
        clientId: updated.clientId,
        clientName: updated.clientName,
        appointmentId: updated.appointmentId,
        providerName: updated.providerName,
        templateType: updated.templateType,
        title: updated.title,
        sections: updated.sections,
        icd10Codes: updated.icd10Codes,
        cptCodes: updated.cptCodes,
        signedAt: updated.signedAt,
        signedBy: updated.signedBy,
      });
      if (res.syncedTargets.length > 0) {
        const newRecords: SessionNoteEhrSyncRecord[] = res.syncedTargets.map((s) => ({
          integrationId: s.integrationId,
          integrationName: s.integrationName,
          syncedAt: s.syncedAt,
          externalNoteId: s.externalNoteId,
          endpoint: s.endpoint,
          status: "synced",
        }));
        updated = {
          ...updated,
          ehrSyncRecords: [
            ...newRecords,
            ...updated.ehrSyncRecords.filter(
              (oldRec) => !newRecords.some((nr) => nr.integrationId === oldRec.integrationId)
            ),
          ],
        };
        res.syncedTargets.forEach((s) => syncedEhrs.push(s.integrationName));
      }
    }
  }

  writeAllNotesRaw([updated, ...current.filter((n) => n.id !== updated.id)]);

  try {
    appendActivity({
      clientId: String(updated.clientId),
      clientName: updated.clientName,
      processId: updated.processId || "",
      processName: updated.processName || "Clinical Chart",
      appointmentId: updated.appointmentId,
      type: "session_note",
      timestamp: nowIso,
      status: "completed",
      refId: updated.id,
      details: {
        primary: `Signed ${updated.templateType} Note: ${updated.title}`,
        secondary: `Signed by ${updated.signedBy}${syncedEhrs.length > 0 ? ` · Synced to ${syncedEhrs.join(", ")}` : ""}`,
      },
      notes: buildSessionNotePlainSummary(updated),
    } as any);
  } catch {}

  return { note: updated, syncedEhrs };
}

export async function syncExistingNoteToEhr(
  noteId: string,
  targetIntegrationIds?: string[]
): Promise<{ note: SessionNote | null; syncedNames: string[] }> {
  const current = readAllNotesRaw();
  const target = current.find((n) => n.id === noteId);
  if (!target) return { note: null, syncedNames: [] };

  const res = await pushSessionNoteToEhr(
    {
      noteId: target.id,
      clientId: target.clientId,
      clientName: target.clientName,
      appointmentId: target.appointmentId,
      providerName: target.providerName,
      templateType: target.templateType,
      title: target.title,
      sections: target.sections,
      icd10Codes: target.icd10Codes,
      cptCodes: target.cptCodes,
      signedAt: target.signedAt,
      signedBy: target.signedBy,
    },
    targetIntegrationIds
  );

  if (res.syncedTargets.length === 0) {
    return { note: target, syncedNames: [] };
  }

  const nowIso = new Date().toISOString();
  const newRecords: SessionNoteEhrSyncRecord[] = res.syncedTargets.map((s) => ({
    integrationId: s.integrationId,
    integrationName: s.integrationName,
    syncedAt: s.syncedAt,
    externalNoteId: s.externalNoteId,
    endpoint: s.endpoint,
    status: "synced",
  }));

  const updated: SessionNote = {
    ...target,
    ehrSyncRecords: [
      ...newRecords,
      ...target.ehrSyncRecords.filter(
        (oldRec) => !newRecords.some((nr) => nr.integrationId === oldRec.integrationId)
      ),
    ],
    updatedAt: nowIso,
  };

  writeAllNotesRaw([updated, ...current.filter((n) => n.id !== updated.id)]);
  return { note: updated, syncedNames: res.syncedTargets.map((s) => s.integrationName) };
}

export function addSessionNoteAddendum(
  noteId: string,
  text: string,
  authorName: string
): SessionNote | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const current = readAllNotesRaw();
  const target = current.find((n) => n.id === noteId);
  if (!target) return null;

  const addendum: SessionNoteAddendum = {
    id: `add-${Date.now()}`,
    text: trimmed,
    authorName,
    createdAt: new Date().toISOString(),
  };

  const updated: SessionNote = {
    ...target,
    addendums: [...target.addendums, addendum],
    updatedAt: new Date().toISOString(),
  };

  writeAllNotesRaw([updated, ...current.filter((n) => n.id !== updated.id)]);
  return updated;
}

export function publishVisitSummaryToPatient(noteId: string): SessionNote | null {
  const current = readAllNotesRaw();
  const target = current.find((n) => n.id === noteId);
  if (!target) return null;

  const docId = target.sharedDocumentId || `doc-visit-summary-${target.id}`;
  const planSection =
    target.sections.plan ||
    target.sections.postCare ||
    target.sections.followUp ||
    target.sections.body ||
    "Follow your clinician's care recommendations and reach out if symptoms worsen.";

  const assessmentSummary =
    target.sections.assessment ||
    target.sections.indication ||
    target.sections.findings ||
    target.title;

  const summaryContent = [
    `AFTER-VISIT SUMMARY`,
    `Patient: ${target.clientName}`,
    `Clinician: ${target.providerName}`,
    `Visit Date: ${new Date(target.sessionDate).toLocaleDateString()}`,
    ``,
    `Summary / Focus:`,
    assessmentSummary,
    ``,
    `Care Plan & Next Steps:`,
    planSection,
  ].join("\n");

  saveClientDocument({
    id: docId,
    clientId: target.clientId,
    appointmentId: target.appointmentId,
    entityType: target.appointmentId ? "appointment" : "client",
    entityId: target.appointmentId || target.clientId,
    name: `After_Visit_Summary_${target.clientName.replace(/\s+/g, "_")}_${target.sessionDate.slice(0, 10)}.pdf`,
    category: "Visit Summary",
    fileType: "pdf",
    fileSize: "185 KB",
    uploadedDate: new Date().toISOString().slice(0, 16).replace("T", " "),
    uploadedBy: target.providerName,
    status: "Verified",
    notes: planSection.slice(0, 160),
    generatedContent: summaryContent,
    showToPatient: true,
  });

  const updated: SessionNote = {
    ...target,
    sharedToPatient: true,
    sharedDocumentId: docId,
    updatedAt: new Date().toISOString(),
  };

  writeAllNotesRaw([updated, ...current.filter((n) => n.id !== updated.id)]);
  return updated;
}

export function buildSessionNotePlainSummary(note: SessionNote): string {
  const spec = SESSION_NOTE_TEMPLATES[note.templateType];
  const firstNonEmpty = spec.sections
    .map((s) => (note.sections[s.key] ? `${s.label}: ${note.sections[s.key]}` : ""))
    .filter(Boolean);
  return firstNonEmpty.join(" | ").slice(0, 260);
}

export function mapScribeSessionToSections(
  session: ScribeSession,
  templateType: SessionNoteTemplateType
): {
  title: string;
  sections: Record<string, string>;
  vitals?: SessionNoteVitals;
  icd10Codes: string[];
} {
  const ed = session.extractedData || ({} as any);
  const medsText = (ed.medications || [])
    .map((m: any) => `${m.drugName || m.name || ""} ${m.dosage || ""} (${m.frequency || ""})`)
    .filter(Boolean)
    .join("; ");
  const invText = (ed.investigations || []).join(", ");
  const adviceText = (ed.advice || []).join("; ");
  const planParts = [
    medsText ? `Medications: ${medsText}` : "",
    invText ? `Investigations: ${invText}` : "",
    adviceText ? `Advice: ${adviceText}` : "",
    ed.followUpDate ? `Follow-up: ${ed.followUpDate}` : ed.followUpDays ? `Follow-up in ${ed.followUpDays} days` : "",
    ed.doctorNotes || "",
  ].filter(Boolean);

  const planStr = planParts.join("\n");
  const vitals: SessionNoteVitals | undefined = ed.vitals
    ? {
        bloodPressure: ed.vitals.bloodPressure,
        pulse: ed.vitals.pulse || ed.vitals.heartRate,
        temperature: ed.vitals.temperature,
        spo2: ed.vitals.spo2,
        weight: ed.vitals.weight,
      }
    : undefined;

  const icd10Codes = ed.icd10Code ? [String(ed.icd10Code)] : [];

  let sections: Record<string, string> = {};
  switch (templateType) {
    case "SOAP":
      sections = {
        subjective: ed.chiefComplaint || "",
        objective: vitals
          ? `Vitals — ${[
              vitals.bloodPressure && `BP ${vitals.bloodPressure}`,
              vitals.pulse && `Pulse ${vitals.pulse}`,
              vitals.temperature && `Temp ${vitals.temperature}`,
              vitals.spo2 && `SpO2 ${vitals.spo2}`,
            ]
              .filter(Boolean)
              .join(", ")}.`
          : "",
        assessment: ed.diagnosis || "",
        plan: planStr,
      };
      break;
    case "DAP":
      sections = {
        data: [ed.chiefComplaint, session.transcript?.fullText?.slice(0, 240)].filter(Boolean).join("\n"),
        assessment: ed.diagnosis || "",
        plan: planStr,
      };
      break;
    case "BIRP":
      sections = {
        behavior: ed.chiefComplaint || "",
        intervention: adviceText || ed.doctorNotes || "Clinical consultation & education.",
        response: "Patient verbalized understanding and agreed with proposed plan.",
        plan: planStr,
      };
      break;
    case "Procedure":
      sections = {
        indication: ed.chiefComplaint || ed.diagnosis || "",
        procedureNotes: ed.doctorNotes || "",
        findings: ed.diagnosis || "",
        postCare: [adviceText, ed.followUpDate || (ed.followUpDays ? `Follow-up in ${ed.followUpDays} days` : "")].filter(Boolean).join("\n"),
      };
      break;
    case "Freeform":
      sections = {
        body: [
          ed.chiefComplaint ? `Chief Complaint: ${ed.chiefComplaint}` : "",
          ed.diagnosis ? `Assessment: ${ed.diagnosis}` : "",
          ed.doctorNotes || "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        followUp: planStr,
      };
      break;
  }

  return {
    title: session.title || ed.diagnosis || "AI Scribe Clinical Note",
    sections,
    vitals,
    icd10Codes,
  };
}
