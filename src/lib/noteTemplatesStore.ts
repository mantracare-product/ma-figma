import type { ScopingRule } from "../app/context/FieldRegistryContext";

export const NOTE_TEMPLATES_EVENT = "mantra_note_templates_updated";
const STORAGE_KEY = "mantra_note_templates_v1";

export type NoteBlockInputType = "textarea" | "text" | "select" | "checkbox" | "yes_no";

export interface NoteSectionCondition {
  dependsOnKey: string;
  operator: "equals" | "not_equals" | "contains" | "is_filled";
  value?: string;
}

export interface NoteTemplateSection {
  key: string;
  label: string;
  placeholder: string;
  inputType?: NoteBlockInputType;
  options?: string[];
  required?: boolean;
  rows?: number;
  scribeHint?: string;
  conditionalRule?: NoteSectionCondition;
}

export function evaluateNoteSectionCondition(
  sec: NoteTemplateSection,
  values: Record<string, string | undefined>
): boolean {
  const rule = sec.conditionalRule;
  if (!rule || !rule.dependsOnKey) return true;
  const raw = String(values[rule.dependsOnKey] || "").trim();
  const target = String(rule.value || "").trim().toLowerCase();
  const normalized = raw.toLowerCase();

  switch (rule.operator) {
    case "is_filled":
      return raw.length > 0;
    case "equals": {
      if (!target) return raw.length > 0;
      const tokens = normalized.split(",").map((t) => t.trim()).filter(Boolean);
      return normalized === target || tokens.includes(target);
    }
    case "not_equals": {
      if (!target) return raw.length === 0;
      const tokens = normalized.split(",").map((t) => t.trim()).filter(Boolean);
      return normalized !== target && !tokens.includes(target);
    }
    case "contains":
      return target ? normalized.includes(target) : raw.length > 0;
    default:
      return true;
  }
}

export interface NoteTemplate {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  includeVitals?: boolean;
  sections: NoteTemplateSection[];
  isSystem?: boolean;
  enabled?: boolean;
  createdBy?: string;
  updatedAt?: string;
  scopingRules?: ScopingRule[];
}

export const SYSTEM_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "SOAP",
    name: "SOAP Note",
    shortName: "SOAP",
    category: "Medical & Allied Health",
    description: "Standard Subjective, Objective, Assessment, and Plan clinical chart format",
    includeVitals: true,
    isSystem: true,
    enabled: true,
    createdBy: "MantraAssist System",
    sections: [
      {
        key: "subjective",
        label: "Subjective (S)",
        inputType: "textarea",
        placeholder: "Chief complaint, history of present illness, symptom onset, patient-reported updates...",
        rows: 3,
        required: true,
        scribeHint: "chiefComplaint",
      },
      {
        key: "objective",
        label: "Objective (O)",
        inputType: "textarea",
        placeholder: "Exam findings, vitals summary, clinical observations, measurement results...",
        rows: 3,
        scribeHint: "vitals",
      },
      {
        key: "assessment",
        label: "Assessment (A)",
        inputType: "textarea",
        placeholder: "Clinical impression, evaluation findings, response to ongoing care...",
        rows: 3,
        required: true,
        scribeHint: "diagnosis",
      },
      {
        key: "plan",
        label: "Plan (P)",
        inputType: "textarea",
        placeholder: "Interventions, medications, patient guidance, follow-up interval...",
        rows: 3,
        scribeHint: "plan",
      },
    ],
  },
  {
    id: "DAP",
    name: "DAP Progress Note",
    shortName: "DAP",
    category: "Behavioral Health",
    description: "Behavioral health & therapy note covering Data, Assessment, and Plan",
    includeVitals: false,
    isSystem: true,
    enabled: true,
    createdBy: "MantraAssist System",
    sections: [
      {
        key: "data",
        label: "Data (D)",
        inputType: "textarea",
        placeholder: "Session focus, client statements, mood/affect observations, homework review...",
        rows: 4,
        required: true,
        scribeHint: "chiefComplaint",
      },
      {
        key: "assessment",
        label: "Assessment (A)",
        inputType: "textarea",
        placeholder: "Clinical formulation, progress toward treatment goals, risk screening...",
        rows: 3,
        scribeHint: "diagnosis",
      },
      {
        key: "plan",
        label: "Plan (P)",
        inputType: "textarea",
        placeholder: "Interventions assigned, coping skills practice, next session cadence...",
        rows: 3,
        scribeHint: "plan",
      },
    ],
  },
  {
    id: "BIRP",
    name: "BIRP Note",
    shortName: "BIRP",
    category: "Behavioral Health",
    description: "Structured Behavior, Intervention, Response, and Plan session documentation",
    includeVitals: false,
    isSystem: true,
    enabled: true,
    createdBy: "MantraAssist System",
    sections: [
      {
        key: "behavior",
        label: "Behavior (B)",
        inputType: "textarea",
        placeholder: "Observed client presentation, demeanor, self-reported symptoms...",
        rows: 3,
        scribeHint: "chiefComplaint",
      },
      {
        key: "intervention",
        label: "Intervention (I)",
        inputType: "textarea",
        placeholder: "Therapeutic or clinical modalities applied during the session...",
        rows: 3,
        scribeHint: "advice",
      },
      {
        key: "response",
        label: "Response (R)",
        inputType: "textarea",
        placeholder: "How the client responded to interventions and feedback...",
        rows: 3,
      },
      {
        key: "plan",
        label: "Plan (P)",
        inputType: "textarea",
        placeholder: "Action items, home exercises, care coordination, next visit...",
        rows: 3,
        scribeHint: "plan",
      },
    ],
  },
  {
    id: "Procedure",
    name: "Procedure / Treatment Note",
    shortName: "Procedure",
    category: "Aesthetics & Procedures",
    description: "Aesthetic, dental, or outpatient clinical procedure & aftercare note",
    includeVitals: false,
    isSystem: true,
    enabled: true,
    createdBy: "MantraAssist System",
    sections: [
      {
        key: "indication",
        label: "Indication & Informed Consent",
        inputType: "textarea",
        placeholder: "Treatment area, clinical indication, consent verified, allergies/contraindications checked...",
        rows: 2,
        scribeHint: "chiefComplaint",
      },
      {
        key: "procedureNotes",
        label: "Procedure & Products / Parameters",
        inputType: "textarea",
        placeholder: "Technique, anatomic sites, batch/lot numbers, settings or units administered...",
        rows: 4,
        required: true,
        scribeHint: "doctorNotes",
      },
      {
        key: "findings",
        label: "Immediate Response & Tolerance",
        inputType: "textarea",
        placeholder: "Patient tolerance, immediate skin/tissue response, adverse events (if any)...",
        rows: 2,
        scribeHint: "diagnosis",
      },
      {
        key: "postCare",
        label: "Aftercare & Follow-Up Plan",
        inputType: "textarea",
        placeholder: "Post-procedure instructions provided, review interval...",
        rows: 2,
        scribeHint: "plan",
      },
    ],
  },
  {
    id: "Freeform",
    name: "General Clinical Note",
    shortName: "Freeform",
    category: "General",
    description: "Flexible unstructured progress or consultation summary",
    includeVitals: false,
    isSystem: true,
    enabled: true,
    createdBy: "MantraAssist System",
    sections: [
      {
        key: "body",
        label: "Session Summary & Clinical Findings",
        inputType: "textarea",
        placeholder: "Document the full consultation, clinical observations, and patient discussion...",
        rows: 7,
        required: true,
        scribeHint: "chiefComplaint",
      },
      {
        key: "followUp",
        label: "Follow-Up & Next Steps",
        inputType: "textarea",
        placeholder: "Recommended next steps, referrals, or patient tasks...",
        rows: 3,
        scribeHint: "plan",
      },
    ],
  },
];

function readRaw(): NoteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Failed to load note templates:", e);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SYSTEM_NOTE_TEMPLATES));
  } catch {}
  return SYSTEM_NOTE_TEMPLATES;
}

function writeRaw(list: NoteTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist note templates:", e);
  }
  window.dispatchEvent(new CustomEvent(NOTE_TEMPLATES_EVENT, { detail: { templates: list } }));
}

export function getNoteTemplates(opts?: { onlyEnabled?: boolean }): NoteTemplate[] {
  const all = readRaw();
  if (opts?.onlyEnabled) {
    return all.filter((t) => t.enabled !== false);
  }
  return all;
}

export function getNoteTemplateById(idOrShortName?: string): NoteTemplate {
  const all = readRaw();
  if (idOrShortName) {
    const match = all.find(
      (t) =>
        t.id === idOrShortName ||
        t.shortName.toLowerCase() === idOrShortName.toLowerCase() ||
        t.name.toLowerCase() === idOrShortName.toLowerCase()
    );
    if (match) return match;
  }
  return all[0] || SYSTEM_NOTE_TEMPLATES[0];
}

export function saveNoteTemplate(tpl: NoteTemplate): NoteTemplate {
  const current = readRaw();
  const nextTpl: NoteTemplate = {
    ...tpl,
    updatedAt: new Date().toISOString(),
  };
  const exists = current.some((t) => t.id === nextTpl.id);
  const next = exists
    ? current.map((t) => (t.id === nextTpl.id ? nextTpl : t))
    : [...current, nextTpl];
  writeRaw(next);
  return nextTpl;
}

export function duplicateNoteTemplate(templateId: string): NoteTemplate | null {
  const current = readRaw();
  const source = current.find((t) => t.id === templateId);
  if (!source) return null;

  const copy: NoteTemplate = {
    ...source,
    id: `tpl-note-${Date.now()}`,
    name: `${source.name} (Copy)`,
    shortName: source.shortName.slice(0, 12),
    isSystem: false,
    enabled: true,
    createdBy: "Workspace User",
    updatedAt: new Date().toISOString(),
    sections: source.sections.map((s) => ({ ...s })),
  };
  writeRaw([...current, copy]);
  return copy;
}

export function deleteNoteTemplate(templateId: string): boolean {
  const current = readRaw();
  const target = current.find((t) => t.id === templateId);
  if (!target || target.isSystem) return false;
  writeRaw(current.filter((t) => t.id !== templateId));
  return true;
}
