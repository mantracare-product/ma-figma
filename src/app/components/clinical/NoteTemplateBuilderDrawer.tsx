import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  AlignLeft,
  Type,
  ChevronDown,
  ListChecks,
  CircleDot,
  Activity,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import FieldRenderer, { FormField } from "../form-builder/FieldRenderer";
import { AdminScopingRulesEditor } from "../../pages/admin/components/AdminScopingRulesEditor";
import { ScopingRule } from "../../context/FieldRegistryContext";
import {
  NoteBlockInputType,
  NoteTemplate,
  NoteTemplateSection,
  saveNoteTemplate,
} from "../../../lib/noteTemplatesStore";

export interface NoteTemplateBuilderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: NoteTemplate | null;
  isAdmin?: boolean;
  zIndex?: number;
  onSaved?: (template: NoteTemplate) => void;
}

const ELEMENT_PALETTE: Array<{
  inputType: NoteBlockInputType;
  label: string;
  defaultTitle: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  options?: string[];
  rows?: number;
}> = [
  {
    inputType: "textarea",
    label: "Long Text",
    defaultTitle: "Clinical Narrative",
    placeholder: "Document detailed clinical findings, observations, or narrative...",
    icon: AlignLeft,
    rows: 4,
  },
  {
    inputType: "text",
    label: "Short Text",
    defaultTitle: "Short Entry",
    placeholder: "Enter brief note...",
    icon: Type,
  },
  {
    inputType: "select",
    label: "Dropdown",
    defaultTitle: "Clinical Selection",
    placeholder: "Select an option...",
    icon: ChevronDown,
    options: ["Within Normal Limits", "Mild Improvement", "Needs Follow-up"],
  },
  {
    inputType: "checkbox",
    label: "Checkboxes",
    defaultTitle: "Interventions Used",
    placeholder: "Select all that apply",
    icon: ListChecks,
    options: ["Counseling", "Psychoeducation", "Skills Training", "Care Coordination"],
  },
  {
    inputType: "yes_no",
    label: "Yes / No",
    defaultTitle: "Safety / Screening Check",
    placeholder: "Select Yes or No",
    icon: CircleDot,
  },
];

const QUICK_CLINICAL_PRESETS: Array<{
  label: string;
  inputType: NoteBlockInputType;
  placeholder: string;
  scribeHint: string;
  options?: string[];
  rows?: number;
}> = [
  {
    label: "Chief Complaint",
    inputType: "text",
    placeholder: "Primary reason for visit...",
    scribeHint: "Reason for encounter and presenting concern",
  },
  {
    label: "Subjective",
    inputType: "textarea",
    placeholder: "Patient-reported symptoms, history, and interval changes...",
    scribeHint: "Patient quotes, symptoms, onset, severity",
    rows: 3,
  },
  {
    label: "Objective",
    inputType: "textarea",
    placeholder: "Clinical exam findings, appearance, affect, and observations...",
    scribeHint: "Clinician observations and exam findings",
    rows: 3,
  },
  {
    label: "Assessment",
    inputType: "textarea",
    placeholder: "Clinical formulation, progress, and diagnostic impression...",
    scribeHint: "Clinical impression and progress synthesis",
    rows: 3,
  },
  {
    label: "Plan",
    inputType: "textarea",
    placeholder: "Next steps, interventions, referrals, and follow-up timing...",
    scribeHint: "Action plan, instructions, and follow-up",
    rows: 3,
  },
  {
    label: "Follow-up Interval",
    inputType: "select",
    placeholder: "Choose follow-up cadence...",
    scribeHint: "Recommended return timeframe",
    options: ["1 week", "2 weeks", "4 weeks", "3 months", "PRN / As needed"],
  },
];

const NOTE_CATEGORIES = [
  "Clinical Progress",
  "Therapy & Behavioral",
  "Procedure / Treatment",
  "Intake & Assessment",
  "Specialty",
  "Custom",
];

function slugifyKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `section_${Math.random().toString(36).slice(2, 6)}`;
}

function makeUniqueKey(baseLabel: string, existing: NoteTemplateSection[]): string {
  const base = slugifyKey(baseLabel);
  if (!existing.some((s) => s.key === base)) return base;
  let counter = 2;
  while (existing.some((s) => s.key === `${base}_${counter}`)) counter += 1;
  return `${base}_${counter}`;
}

function toRendererField(sec: NoteTemplateSection): FormField {
  const typeMap: Record<NoteBlockInputType, string> = {
    textarea: "textarea",
    text: "text",
    select: "select",
    checkbox: "checkbox",
    yes_no: "radio",
  };
  const resolvedType = typeMap[sec.inputType || "textarea"] || "textarea";
  const options =
    sec.inputType === "yes_no"
      ? [
          { id: `${sec.key}_yes`, label: "Yes", value: "Yes" },
          { id: `${sec.key}_no`, label: "No", value: "No" },
        ]
      : (sec.options || []).map((opt, idx) => ({
          id: `${sec.key}_opt_${idx}`,
          label: opt,
          value: opt,
        }));

  return {
    id: sec.key,
    name: sec.label,
    label: sec.label || "Untitled Section",
    type: resolvedType,
    placeholder: sec.placeholder || "",
    required: Boolean(sec.required),
    essential: false,
    helpText: sec.scribeHint ? `AI Scribe: ${sec.scribeHint}` : undefined,
    options,
  };
}

export default function NoteTemplateBuilderDrawer({
  isOpen,
  onClose,
  initialTemplate,
  isAdmin = false,
  zIndex = 90,
  onSaved,
}: NoteTemplateBuilderDrawerProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [description, setDescription] = useState("");
  const [includeVitals, setIncludeVitals] = useState(false);
  const [sections, setSections] = useState<NoteTemplateSection[]>([]);
  const [scopingRules, setScopingRules] = useState<ScopingRule[]>([]);

  // FormBuilder-style interaction state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"elements" | "template">("elements");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const [draggedPaletteType, setDraggedPaletteType] = useState<NoteBlockInputType | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTemplate) {
      setName(initialTemplate.name || "");
      setShortName(initialTemplate.shortName || "");
      setCategory(initialTemplate.category || "Custom");
      setDescription(initialTemplate.description || "");
      setIncludeVitals(Boolean(initialTemplate.includeVitals));
      setSections(
        (initialTemplate.sections || []).map((sec) => ({
          ...sec,
          inputType: sec.inputType || "textarea",
          options: sec.options ? [...sec.options] : undefined,
        }))
      );
      setScopingRules(initialTemplate.scopingRules ? [...initialTemplate.scopingRules] : []);
    } else {
      setName("Untitled Note Template");
      setShortName("CUSTOM");
      setCategory("Clinical Progress");
      setDescription("");
      setIncludeVitals(false);
      setSections([
        {
          key: "clinical_focus",
          label: "Clinical Focus / Chief Complaint",
          inputType: "text",
          placeholder: "Primary reason for visit...",
          required: true,
          scribeHint: "Reason for encounter",
        },
        {
          key: "session_summary",
          label: "Session Narrative",
          inputType: "textarea",
          rows: 4,
          placeholder: "Document observations, clinical discussion, and patient response...",
          required: false,
          scribeHint: "Main clinical discussion and observations",
        },
        {
          key: "plan",
          label: "Assessment & Next Steps",
          inputType: "textarea",
          rows: 3,
          placeholder: "Clinical impression and follow-up plan...",
          required: false,
          scribeHint: "Plan and follow-up actions",
        },
      ]);
      setScopingRules([]);
    }
    setSelectedKey(null);
    setSidebarTab("elements");
    setPreviewValues({});
    setDraggedFieldKey(null);
    setDraggedPaletteType(null);
    setDropTargetKey(null);
  }, [isOpen, initialTemplate]);

  const selectedSection = useMemo(
    () => sections.find((s) => s.key === selectedKey) || null,
    [sections, selectedKey]
  );

  if (!isOpen) return null;

  const addSectionFromType = (inputType: NoteBlockInputType, customLabel?: string, insertAtIndex?: number) => {
    const spec = ELEMENT_PALETTE.find((e) => e.inputType === inputType) || ELEMENT_PALETTE[0];
    const label = customLabel || spec.defaultTitle;
    const key = makeUniqueKey(label, sections);
    const newSec: NoteTemplateSection = {
      key,
      label,
      inputType,
      placeholder: spec.placeholder,
      required: false,
      rows: inputType === "textarea" ? spec.rows || 4 : undefined,
      options: spec.options ? [...spec.options] : undefined,
      scribeHint: "",
    };

    setSections((prev) => {
      if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= prev.length) {
        const next = [...prev];
        next.splice(insertAtIndex, 0, newSec);
        return next;
      }
      return [...prev, newSec];
    });
    setSelectedKey(key);
  };

  const addSectionFromPreset = (preset: (typeof QUICK_CLINICAL_PRESETS)[number]) => {
    const key = makeUniqueKey(preset.label, sections);
    const newSec: NoteTemplateSection = {
      key,
      label: preset.label,
      inputType: preset.inputType,
      placeholder: preset.placeholder,
      required: false,
      rows: preset.rows,
      options: preset.options ? [...preset.options] : undefined,
      scribeHint: preset.scribeHint,
    };
    setSections((prev) => [...prev, newSec]);
    setSelectedKey(key);
  };

  const updateSelectedSection = (patch: Partial<NoteTemplateSection>) => {
    if (!selectedSection) return;
    setSections((prev) =>
      prev.map((sec) => (sec.key === selectedSection.key ? { ...sec, ...patch } : sec))
    );
  };

  const handleDuplicateSection = (targetKey: string) => {
    const idx = sections.findIndex((s) => s.key === targetKey);
    if (idx === -1) return;
    const source = sections[idx];
    const newLabel = `${source.label} (Copy)`;
    const newKey = makeUniqueKey(newLabel, sections);
    const copy: NoteTemplateSection = {
      ...source,
      key: newKey,
      label: newLabel,
      options: source.options ? [...source.options] : undefined,
    };
    setSections((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedKey(newKey);
  };

  const handleDeleteSection = (targetKey: string) => {
    setSections((prev) => prev.filter((s) => s.key !== targetKey));
    if (selectedKey === targetKey) {
      setSelectedKey(null);
    }
  };

  const handleReorderDrop = (targetKey: string) => {
    if (draggedPaletteType) {
      const targetIdx = sections.findIndex((s) => s.key === targetKey);
      addSectionFromType(draggedPaletteType, undefined, targetIdx >= 0 ? targetIdx : undefined);
      setDraggedPaletteType(null);
      setDropTargetKey(null);
      return;
    }

    if (!draggedFieldKey || draggedFieldKey === targetKey) {
      setDraggedFieldKey(null);
      setDropTargetKey(null);
      return;
    }

    setSections((prev) => {
      const fromIdx = prev.findIndex((s) => s.key === draggedFieldKey);
      const toIdx = prev.findIndex((s) => s.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedFieldKey(null);
    setDropTargetKey(null);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasDropActive(false);
    setDropTargetKey(null);
    if (draggedPaletteType) {
      addSectionFromType(draggedPaletteType);
      setDraggedPaletteType(null);
    }
    setDraggedFieldKey(null);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Please enter a template name");
      return;
    }
    const cleanSections = sections
      .map((s) => ({
        ...s,
        label: s.label.trim() || "Untitled Section",
        options:
          s.inputType === "select" || s.inputType === "checkbox"
            ? (s.options || []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      }))
      .filter((s) => s.label.length > 0);

    if (cleanSections.length === 0) {
      toast.error("Add at least one block to the template canvas");
      return;
    }

    const derivedShort =
      shortName.trim() ||
      trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w.slice(0, 4))
        .join("")
        .toUpperCase();

    const templateToSave: NoteTemplate = {
      id: initialTemplate?.id || `tpl_${Date.now()}`,
      name: trimmedName,
      shortName: derivedShort,
      category: category.trim() || "Custom",
      description: description.trim() || "Custom clinical session note template.",
      includeVitals,
      sections: cleanSections,
      isSystem: initialTemplate?.isSystem,
      enabled: initialTemplate?.enabled ?? true,
      createdBy: initialTemplate?.createdBy || (isAdmin ? "Admin" : "Provider"),
      updatedAt: new Date().toISOString(),
      scopingRules: isAdmin ? scopingRules : initialTemplate?.scopingRules,
    };

    const saved = saveNoteTemplate(templateToSave);
    toast.success(`Saved note template "${saved.name}"`);
    onSaved?.(saved);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex justify-end transition-opacity"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className="w-full md:w-[76vw] md:min-w-[820px] md:max-w-[1260px] h-full bg-[#F8FAFC] shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER BAR (FormBuilder style) ── */}
        <div className="h-[64px] shrink-0 bg-white border-b border-[#E2E8F0] px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Note Template Name..."
              className="text-base font-bold text-[#0F172A] bg-transparent border border-transparent hover:border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white rounded-lg px-2.5 py-1 focus:outline-none min-w-[200px] max-w-[320px] truncate transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 shrink-0">
              {shortName.trim() || "NOTE"}
            </span>
            <span className="hidden md:inline text-xs text-slate-400 shrink-0">
              {sections.length} {sections.length === 1 ? "block" : "blocks"}
              {includeVitals ? " · Vitals included" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedKey(null);
                setSidebarTab((prev) => (prev === "template" ? "elements" : "template"));
              }}
              className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                sidebarTab === "template" && !selectedSection
                  ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                  : "border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isAdmin ? "Template & Scoping" : "Template Details"}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── MAIN WORKSPACE: LEFT CANVAS + RIGHT 320px SIDEBAR ── */}
        <div className="flex-1 min-h-0 flex gap-5 p-5 overflow-hidden">
          {/* LEFT: NOTE CANVAS (Matches FormBuilder Form Canvas) */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1">
            <div className="max-w-3xl mx-auto space-y-4 pb-8">
              {/* Template Banner Card on Canvas */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2
                        className="text-lg font-bold text-[#0F172A] truncate"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {name || "Untitled Note Template"}
                      </h2>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {category}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a brief description for clinicians using this template..."
                      className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#2563EB] focus:outline-none py-0.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </div>
              </div>

              {/* Dashed Drop Canvas */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsCanvasDropActive(true);
                }}
                onDragLeave={() => setIsCanvasDropActive(false)}
                onDrop={handleCanvasDrop}
                className={`border-2 border-dashed rounded-xl p-4 bg-white transition-colors min-h-[340px] space-y-3 ${
                  isCanvasDropActive ? "border-[#2563EB] bg-blue-50/30" : "border-gray-300"
                }`}
              >
                {sections.length === 0 ? (
                  <div className="h-[280px] flex flex-col items-center justify-center text-center px-6">
                    <p className="text-sm font-medium text-slate-600" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Your note template canvas is empty
                    </p>
                    <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Click or drag elements from the right panel to add sections
                    </p>
                  </div>
                ) : (
                  sections.map((sec) => {
                    const rendererField = toRendererField(sec);
                    return (
                      <FieldRenderer
                        key={sec.key}
                        field={rendererField}
                        isSelected={selectedKey === sec.key}
                        isDropTarget={dropTargetKey === sec.key}
                        fieldValue={previewValues[sec.key]}
                        onFieldClick={() => setSelectedKey(sec.key)}
                        onFieldChange={(val) =>
                          setPreviewValues((prev) => ({ ...prev, [sec.key]: val }))
                        }
                        onDuplicate={() => handleDuplicateSection(sec.key)}
                        onDelete={() => handleDeleteSection(sec.key)}
                        onDragStart={(e) => {
                          setDraggedFieldKey(sec.key);
                          setDraggedPaletteType(null);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dropTargetKey !== sec.key) setDropTargetKey(sec.key);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReorderDrop(sec.key);
                        }}
                        onConditionalLogic={() => setSelectedKey(sec.key)}
                      />
                    );
                  })
                )}

                {/* Optional Vitals Preview Card inside Canvas */}
                {includeVitals && (
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800">
                          Vitals Strip Enabled
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Captures BP, Heart Rate, Temp, SpO2, and Pain (0–10) in Session Note drawer
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeVitals(false)}
                      className="text-[11px] font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-white cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: FIXED 320px SIDEBAR (Exact FormBuilder right panel) */}
          <div className="w-[320px] shrink-0 h-full bg-white border border-[#E2E8F0] rounded-xl shadow-2xs flex flex-col overflow-hidden">
            {selectedSection ? (
              /* ── FIELD PROPERTIES INSPECTOR ── */
              <div className="flex flex-col h-full">
                <div className="shrink-0 p-3.5 border-b border-[#E2E8F0] bg-slate-50/70 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <h3
                      className="text-xs font-bold text-[#0F172A] truncate"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {selectedSection.label || "Untitled Section"}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {selectedSection.inputType || "textarea"} properties
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer shrink-0"
                    title="Close Properties"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
                  {/* Label */}
                  <div>
                    <label
                      className="block text-xs font-medium text-[#64748B] mb-1.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Section Label
                    </label>
                    <input
                      type="text"
                      value={selectedSection.label}
                      onChange={(e) => updateSelectedSection({ label: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>

                  {/* Block Input Type */}
                  <div>
                    <label
                      className="block text-xs font-medium text-[#64748B] mb-1.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Field Type
                    </label>
                    <select
                      value={selectedSection.inputType || "textarea"}
                      onChange={(e) => {
                        const nextType = e.target.value as NoteBlockInputType;
                        updateSelectedSection({
                          inputType: nextType,
                          options:
                            nextType === "select" || nextType === "checkbox"
                              ? selectedSection.options && selectedSection.options.length > 0
                                ? selectedSection.options
                                : ["Option 1", "Option 2", "Option 3"]
                              : undefined,
                          rows: nextType === "textarea" ? selectedSection.rows || 4 : undefined,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="textarea">Long Text / Narrative</option>
                      <option value="text">Short Text</option>
                      <option value="select">Dropdown Select</option>
                      <option value="checkbox">Checkboxes</option>
                      <option value="yes_no">Yes / No</option>
                    </select>
                  </div>

                  {/* Placeholder */}
                  {selectedSection.inputType !== "checkbox" && selectedSection.inputType !== "yes_no" && (
                    <div>
                      <label
                        className="block text-xs font-medium text-[#64748B] mb-1.5"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={selectedSection.placeholder}
                        onChange={(e) => updateSelectedSection({ placeholder: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      />
                    </div>
                  )}

                  {/* Options Editor for select / checkbox */}
                  {(selectedSection.inputType === "select" ||
                    selectedSection.inputType === "checkbox") && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          className="text-xs font-medium text-[#64748B]"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Options
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedSection({
                              options: [
                                ...(selectedSection.options || []),
                                `Option ${(selectedSection.options?.length || 0) + 1}`,
                              ],
                            })
                          }
                          className="text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {(selectedSection.options || []).map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...(selectedSection.options || [])];
                                next[idx] = e.target.value;
                                updateSelectedSection({ options: next });
                              }}
                              className="flex-1 px-2.5 py-1.5 border border-[#E2E8F0] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = (selectedSection.options || []).filter((_, i) => i !== idx);
                                updateSelectedSection({ options: next });
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rows for Textarea */}
                  {(selectedSection.inputType || "textarea") === "textarea" && (
                    <div>
                      <label
                        className="block text-xs font-medium text-[#64748B] mb-1.5"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Editor Height (Rows)
                      </label>
                      <select
                        value={selectedSection.rows || 4}
                        onChange={(e) => updateSelectedSection({ rows: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                      >
                        <option value={2}>Compact (2 rows)</option>
                        <option value={3}>Standard (3 rows)</option>
                        <option value={4}>Medium (4 rows)</option>
                        <option value={6}>Expanded (6 rows)</option>
                      </select>
                    </div>
                  )}

                  {/* Required Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span
                        className="block text-xs font-medium text-[#0F172A]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Required to Sign
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Clinician must fill before locking
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedSection({ required: !selectedSection.required })
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        selectedSection.required ? "bg-[#0F172A]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          selectedSection.required ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* AI Scribe Mapping Hint */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      <span>AI Scribe Auto-Fill Hint</span>
                    </label>
                    <textarea
                      value={selectedSection.scribeHint || ""}
                      onChange={(e) => updateSelectedSection({ scribeHint: e.target.value })}
                      rows={2}
                      placeholder="Describe what AI Scribe should extract into this section..."
                      className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
                    />
                  </div>
                </div>

                {/* Pinned Done Footer */}
                <div className="shrink-0 p-3 border-t border-[#E2E8F0] bg-white">
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    className="w-full h-10 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg transition-colors text-[13px] font-medium flex items-center justify-center cursor-pointer shadow-2xs"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ── ELEMENTS PALETTE & TEMPLATE SETTINGS ── */
              <div className="flex flex-col h-full">
                {/* Sidebar Sub-Tabs */}
                <div className="shrink-0 grid grid-cols-2 border-b border-[#E2E8F0] bg-slate-50/70 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("elements")}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      sidebarTab === "elements"
                        ? "bg-white text-[#0F172A] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Elements
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("template")}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      sidebarTab === "template"
                        ? "bg-white text-[#0F172A] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {isAdmin ? "Details & Rules" : "Template Details"}
                  </button>
                </div>

                {sidebarTab === "elements" ? (
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
                    <div>
                      <h3
                        className="text-xs font-bold text-[#0F172A]"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Note Elements
                      </h3>
                      <p
                        className="text-[11px] text-[#64748B] mt-0.5"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Click or drag elements to canvas
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {ELEMENT_PALETTE.map((item) => (
                          <button
                            key={item.inputType}
                            type="button"
                            draggable
                            onDragStart={() => {
                              setDraggedPaletteType(item.inputType);
                              setDraggedFieldKey(null);
                            }}
                            onClick={() => addSectionFromType(item.inputType)}
                            className="group flex flex-col items-center gap-1.5 p-2.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#2563EB] hover:shadow-2xs hover:bg-blue-50/20 transition-all cursor-grab active:cursor-grabbing text-center"
                          >
                            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-[#64748B] group-hover:bg-blue-100 group-hover:text-[#2563EB] transition-colors">
                              <item.icon className="w-3.5 h-3.5" />
                            </div>
                            <span
                              className="text-[11px] font-medium leading-tight truncate w-full text-[#0F172A]"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {item.label}
                            </span>
                          </button>
                        ))}

                        {/* Vitals Strip toggle tile */}
                        <button
                          type="button"
                          onClick={() => setIncludeVitals((v) => !v)}
                          className={`group flex flex-col items-center gap-1.5 p-2.5 border rounded-lg transition-all cursor-pointer text-center ${
                            includeVitals
                              ? "border-[#2563EB] bg-blue-50/40"
                              : "border-[#E2E8F0] bg-white hover:border-[#2563EB] hover:bg-blue-50/20"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                              includeVitals
                                ? "bg-blue-100 text-[#2563EB]"
                                : "bg-slate-50 text-[#64748B] group-hover:bg-blue-100 group-hover:text-[#2563EB]"
                            }`}
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className="text-[11px] font-medium leading-tight truncate w-full text-[#0F172A]"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {includeVitals ? "Vitals: On" : "Vitals Strip"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Clinical Section Presets (analogous to Existing Fields) */}
                    <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
                      <span
                        className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        QUICK SECTION PRESETS
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_CLINICAL_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => addSectionFromPreset(preset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-slate-50/80 hover:bg-blue-50/50 hover:border-[#2563EB] text-[11px] font-medium text-slate-700 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                        Short Badge
                      </label>
                      <input
                        type="text"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value)}
                        placeholder="e.g. SOAP, PT, ORTHO"
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                      >
                        {NOTE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#64748B] mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="When clinicians should use this template..."
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <span className="block text-xs font-medium text-[#0F172A]">
                          Include Vitals Strip
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Show BP, HR, Temp, SpO2, Pain fields
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeVitals((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          includeVitals ? "bg-[#0F172A]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            includeVitals ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="pt-3 border-t border-slate-200">
                        <AdminScopingRulesEditor
                          rules={scopingRules}
                          onChange={setScopingRules}
                          showHeader={true}
                          allowEntities={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
