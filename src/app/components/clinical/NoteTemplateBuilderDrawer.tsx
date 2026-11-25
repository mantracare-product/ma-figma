import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import {
  NoteTemplate,
  NoteTemplateSection,
  NoteBlockInputType,
  saveNoteTemplate,
} from "../../../lib/noteTemplatesStore";
import { AdminScopingRulesEditor } from "../../pages/admin/components/AdminScopingRulesEditor";
import type { ScopingRule } from "../../context/FieldRegistryContext";

export interface NoteTemplateBuilderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: NoteTemplate | null;
  isAdmin?: boolean;
  onSaved?: (template: NoteTemplate) => void;
}

const BLOCK_TYPES: { value: NoteBlockInputType; label: string }[] = [
  { value: "textarea", label: "Long Text (Paragraph)" },
  { value: "text", label: "Short Text Line" },
  { value: "select", label: "Dropdown Options" },
  { value: "checkbox", label: "Multi-Select Checklist" },
  { value: "yes_no", label: "Yes / No" },
];

const SCRIBE_HINTS = [
  { value: "", label: "No AI Scribe Auto-Fill" },
  { value: "chiefComplaint", label: "Chief Complaint / Symptoms" },
  { value: "vitals", label: "Vitals & Exam Findings" },
  { value: "diagnosis", label: "Assessment / Clinical Impression" },
  { value: "plan", label: "Care Plan / Medications / Follow-up" },
  { value: "doctorNotes", label: "Procedure / Clinician Remarks" },
];

const CATEGORY_OPTIONS = [
  "Medical & Allied Health",
  "Behavioral Health",
  "Aesthetics & Procedures",
  "Ophthalmology",
  "Physical Therapy",
  "General",
  "Custom",
];

function slugifyKey(label: string, fallbackIndex: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base || `section_${fallbackIndex + 1}`;
}

export default function NoteTemplateBuilderDrawer({
  isOpen,
  onClose,
  initialTemplate,
  isAdmin = false,
  onSaved,
}: NoteTemplateBuilderDrawerProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [category, setCategory] = useState("Medical & Allied Health");
  const [description, setDescription] = useState("");
  const [includeVitals, setIncludeVitals] = useState(false);
  const [sections, setSections] = useState<NoteTemplateSection[]>([]);
  const [scopingRules, setScopingRules] = useState<ScopingRule[]>([]);
  const [optionsDraft, setOptionsDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (initialTemplate) {
      setName(initialTemplate.name);
      setShortName(initialTemplate.shortName);
      setCategory(initialTemplate.category || "Medical & Allied Health");
      setDescription(initialTemplate.description || "");
      setIncludeVitals(Boolean(initialTemplate.includeVitals));
      setSections(initialTemplate.sections.map((s) => ({ ...s })));
      setScopingRules(initialTemplate.scopingRules || []);
      const optMap: Record<number, string> = {};
      initialTemplate.sections.forEach((s, idx) => {
        if (s.options?.length) optMap[idx] = s.options.join(", ");
      });
      setOptionsDraft(optMap);
    } else {
      setName("");
      setShortName("");
      setCategory("Medical & Allied Health");
      setDescription("");
      setIncludeVitals(false);
      setSections([
        {
          key: "clinical_focus",
          label: "Session Focus & History",
          inputType: "textarea",
          placeholder: "Reason for visit and relevant clinical history...",
          rows: 3,
          required: true,
          scribeHint: "chiefComplaint",
        },
        {
          key: "clinical_observations",
          label: "Observations & Assessment",
          inputType: "textarea",
          placeholder: "Findings, client response, and clinical impression...",
          rows: 3,
          scribeHint: "diagnosis",
        },
        {
          key: "care_plan",
          label: "Care Plan & Next Steps",
          inputType: "textarea",
          placeholder: "Interventions, patient instructions, and follow-up schedule...",
          rows: 3,
          scribeHint: "plan",
        },
      ]);
      setScopingRules([]);
      setOptionsDraft({});
    }
  }, [isOpen, initialTemplate]);

  if (!isOpen) return null;

  const isEditingSystem = Boolean(initialTemplate?.isSystem);

  const handleAddSection = () => {
    setSections((prev) => [
      ...prev,
      {
        key: `custom_section_${Date.now()}`,
        label: `Section ${prev.length + 1}`,
        inputType: "textarea",
        placeholder: "Enter guidance placeholder...",
        rows: 3,
      },
    ]);
  };

  const handleUpdateSection = (idx: number, patch: Partial<NoteTemplateSection>) => {
    setSections((prev) =>
      prev.map((sec, i) => {
        if (i !== idx) return sec;
        const next = { ...sec, ...patch };
        if (patch.label !== undefined && !isEditingSystem) {
          next.key = slugifyKey(patch.label, idx);
        }
        return next;
      })
    );
  };

  const handleMoveSection = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setSections(next);
  };

  const handleRemoveSection = (idx: number) => {
    if (sections.length <= 1) {
      toast.error("A note template must have at least one section");
      return;
    }
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (sections.some((s) => !s.label.trim())) {
      toast.error("Every section must have a heading label");
      return;
    }

    const cleanShort = (shortName.trim() || name.trim().split(/\s+/)[0]).slice(0, 14);
    const finalizedSections: NoteTemplateSection[] = sections.map((s, idx) => {
      const needsOpts = s.inputType === "select" || s.inputType === "checkbox";
      const parsedOpts = needsOpts
        ? (optionsDraft[idx] !== undefined
            ? optionsDraft[idx].split(",")
            : s.options || []
          )
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

      return {
        ...s,
        key: s.key || slugifyKey(s.label, idx),
        label: s.label.trim(),
        options: parsedOpts,
      };
    });

    const saved = saveNoteTemplate({
      id: initialTemplate?.id || `tpl-note-${Date.now()}`,
      name: name.trim(),
      shortName: cleanShort,
      category,
      description: description.trim() || "Custom session note template",
      includeVitals,
      sections: finalizedSections,
      isSystem: initialTemplate?.isSystem || false,
      enabled: initialTemplate?.enabled ?? true,
      createdBy: isAdmin ? "Admin System" : initialTemplate?.createdBy || "Workspace User",
      scopingRules: isAdmin ? scopingRules : initialTemplate?.scopingRules,
    });

    toast.success(`Saved note template "${saved.name}"`);
    onSaved?.(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[760] overflow-hidden bg-slate-900/45 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full md:w-[68vw] md:min-w-[720px] md:max-w-[1140px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {initialTemplate ? `Edit Template: ${initialTemplate.name}` : "Create Session Note Template"}
                </h2>
                {isEditingSystem && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                    <Lock className="w-3 h-3" /> System Baseline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure note blocks, input types, and AI Scribe auto-fill hints for clinical encounters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT (~62%): Metadata + Sections Builder */}
            <div className="lg:col-span-7 space-y-5">
              {/* Metadata Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Template Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-700">Template Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!shortName && !initialTemplate) {
                          setShortName(e.target.value.trim().split(/\s+/)[0].slice(0, 10));
                        }
                      }}
                      placeholder="e.g. Dermatology Consultation, Couples Intake..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Short Badge</label>
                    <input
                      type="text"
                      value={shortName}
                      maxLength={14}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="e.g. DERM"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Specialty / Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeVitals}
                        onChange={(e) => setIncludeVitals(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>Show Vitals strip automatically</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief clinical purpose for your team..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Admin Scoping Rules when launched from Admin */}
              {isAdmin && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Industry & Location Scoping
                  </h3>
                  <AdminScopingRulesEditor
                    rules={scopingRules}
                    onChange={setScopingRules}
                  />
                </div>
              )}

              {/* Sections Builder */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Note Sections ({sections.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSection}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {sections.map((sec, idx) => {
                    const needsOpts = sec.inputType === "select" || sec.inputType === "checkbox";
                    const optString = optionsDraft[idx] ?? (sec.options ? sec.options.join(", ") : "");
                    return (
                      <div
                        key={sec.key + idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-slate-400">#{idx + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveSection(idx, -1)}
                              className="p-1 rounded hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === sections.length - 1}
                              onClick={() => handleMoveSection(idx, 1)}
                              className="p-1 rounded hover:bg-white text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(idx)}
                              className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">Heading Label *</label>
                            <input
                              type="text"
                              value={sec.label}
                              onChange={(e) => handleUpdateSection(idx, { label: e.target.value })}
                              placeholder="e.g. Subjective (S)"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">Block Type</label>
                            <select
                              value={sec.inputType || "textarea"}
                              onChange={(e) =>
                                handleUpdateSection(idx, { inputType: e.target.value as NoteBlockInputType })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              {BLOCK_TYPES.map((bt) => (
                                <option key={bt.value} value={bt.value}>
                                  {bt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {needsOpts ? (
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">
                              Choices (comma separated)
                            </label>
                            <input
                              type="text"
                              value={optString}
                              onChange={(e) => setOptionsDraft((prev) => ({ ...prev, [idx]: e.target.value }))}
                              placeholder="e.g. Calm, Anxious, Cooperative, Flat Affect"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-slate-600">Prompt / Placeholder</label>
                            <input
                              type="text"
                              value={sec.placeholder}
                              onChange={(e) => handleUpdateSection(idx, { placeholder: e.target.value })}
                              placeholder="Prompt text shown inside empty field..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1.5 flex-1">
                            <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
                            <select
                              value={sec.scribeHint || ""}
                              onChange={(e) => handleUpdateSection(idx, { scribeHint: e.target.value })}
                              className="px-2 py-1 rounded border border-slate-200 bg-white text-[11px] text-slate-600 focus:outline-none"
                            >
                              {SCRIBE_HINTS.map((h) => (
                                <option key={h.value} value={h.value}>
                                  {h.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(sec.required)}
                              onChange={(e) => handleUpdateSection(idx, { required: e.target.checked })}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900"
                            />
                            <span>Required</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT (~38%): Live Clinician Preview */}
            <div className="lg:col-span-5">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 sticky top-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Live Chart Preview
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                      {name.trim() || "Untitled Note Template"}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-mono font-semibold">
                    {shortName.trim() || "NOTE"}
                  </span>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {sections.map((sec, idx) => {
                    const opts = (optionsDraft[idx] ?? (sec.options ? sec.options.join(", ") : ""))
                      .split(",")
                      .map((o) => o.trim())
                      .filter(Boolean);
                    return (
                      <div key={sec.key + idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>
                            {sec.label || "Untitled Section"}
                            {sec.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </span>
                          {sec.scribeHint && (
                            <span className="text-[10px] font-normal text-slate-400">AI Scribe mapped</span>
                          )}
                        </div>

                        {sec.inputType === "select" ? (
                          <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400">
                            {opts.length > 0 ? `Select: ${opts.join(" / ")}` : "Dropdown choices..."}
                          </div>
                        ) : sec.inputType === "checkbox" ? (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {(opts.length > 0 ? opts : ["Option A", "Option B"]).map((opt) => (
                              <span
                                key={opt}
                                className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-600"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        ) : sec.inputType === "yes_no" ? (
                          <div className="flex gap-2">
                            <span className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
                              Yes
                            </span>
                            <span className="px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
                              No
                            </span>
                          </div>
                        ) : sec.inputType === "text" ? (
                          <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-400">
                            {sec.placeholder || "Short answer..."}
                          </div>
                        ) : (
                          <div className="px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-400 min-h-[56px]">
                            {sec.placeholder || "Paragraph clinical text..."}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-2.5 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs font-medium">
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} className="text-xs font-semibold gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{initialTemplate ? "Save Template" : "Create Template"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
