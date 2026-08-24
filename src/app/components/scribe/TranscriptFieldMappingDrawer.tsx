import React, { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Check,
  X,
  GripVertical,
  FolderPlus,
  Layers,
  Sparkles,
  RotateCcw,
  Save,
  Pencil,
  FileText,
  User,
  Activity,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import DrawerShell from "../ui/DrawerShell";
import { useFieldRegistry, FieldDefinition } from "../../context/FieldRegistryContext";
import { SelectFieldsModal } from "../help/FieldManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface ScribeMappingSection {
  id: string;
  title: string;
  fieldKeys: string[];
}

const STORAGE_SECTIONS_KEY = "mantra_scribe_simple_sections";
const STORAGE_TOGGLE_KEY = "mantra_scribe_autofetch_toggle";

export interface TranscriptFieldMappingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TranscriptFieldMappingDrawer({
  isOpen,
  onClose,
}: TranscriptFieldMappingDrawerProps) {
  const { getAllFields } = useFieldRegistry();

  // All available registry fields across client, process, appointment, etc.
  const allClientFields = getAllFields("client");
  const allFieldsMap = React.useMemo(() => {
    const map: Record<string, FieldDefinition> = {};
    ["client", "process", "appointment", "call", "service"].forEach((mod: any) => {
      getAllFields(mod).forEach((f) => {
        map[f.key] = f;
      });
    });
    return map;
  }, [getAllFields]);

  // Master toggle to fetch values from transcript
  const [autoFetchEnabled, setAutoFetchEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TOGGLE_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Sections list (starts empty if none saved)
  const [sections, setSections] = useState<ScribeMappingSection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECTIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal States
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [selectFieldsModalOpen, setSelectFieldsModalOpen] = useState(false);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);

  // Inline Section Rename State
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitleText, setEditSectionTitleText] = useState("");

  // Sync with localStorage on open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedSecs = localStorage.getItem(STORAGE_SECTIONS_KEY);
        if (savedSecs) setSections(JSON.parse(savedSecs));
        const savedToggle = localStorage.getItem(STORAGE_TOGGLE_KEY);
        if (savedToggle !== null) setAutoFetchEnabled(JSON.parse(savedToggle));
      } catch (e) {
        console.error("Failed to load scribe mapping", e);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify(sections));
      localStorage.setItem(STORAGE_TOGGLE_KEY, JSON.stringify(autoFetchEnabled));
      toast.success("Transcript field mapping saved successfully!");
      onClose();
    } catch (e) {
      toast.error("Failed to save configuration");
    }
  };

  const handleResetDefaults = () => {
    setSections([]);
    setAutoFetchEnabled(true);
    toast.info("Cleared all mapping sections");
  };

  // Section Handlers
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section name");
      return;
    }
    const newSec: ScribeMappingSection = {
      id: `sec-${Date.now()}`,
      title: newSectionTitle.trim(),
      fieldKeys: [],
    };
    setSections((prev) => [...prev, newSec]);
    setNewSectionTitle("");
    setAddSectionModalOpen(false);
    toast.success(`Section "${newSec.title}" added!`);
  };

  const handleDeleteSection = (secId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== secId));
    toast.success("Section removed");
  };

  const handleSaveRenameSection = (secId: string) => {
    if (!editSectionTitleText.trim()) return;
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, title: editSectionTitleText.trim() } : s))
    );
    setEditingSectionId(null);
    toast.success("Section renamed");
  };

  // Field Handlers
  const handleOpenSelectFields = (secId: string) => {
    setTargetSectionIdForField(secId);
    setSelectFieldsModalOpen(true);
  };

  const handleApplySelectedFields = (selectedKeys: string[]) => {
    if (!targetSectionIdForField) return;
    setSections((prev) =>
      prev.map((s) => (s.id === targetSectionIdForField ? { ...s, fieldKeys: selectedKeys } : s))
    );
    setSelectFieldsModalOpen(false);
    setTargetSectionIdForField(null);
    toast.success("Fields updated in section");
  };

  const handleRemoveFieldFromSection = (secId: string, fieldKey: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId ? { ...s, fieldKeys: s.fieldKeys.filter((k) => k !== fieldKey) } : s
      )
    );
    toast.success("Field removed");
  };

  const getFieldLabel = (key: string) => {
    if (allFieldsMap[key]) return allFieldsMap[key].label;
    // Fallback clean formatting
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Transcript Field Mapping"
      subtitle="Configure sections and fields to auto-populate from consultation transcripts"
      icon={<Settings className="w-5 h-5 text-[#181e25]" />}
      width="max-w-2xl"
      zIndex={650}
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Save className="w-3.5 h-3.5" /> Save Configuration
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* ─── MASTER TOGGLE ABOVE SECTIONS ─── */}
        <div className="rounded-2xl bg-white border border-border p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#181e25] flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                Fetch Values from AI Transcript
              </h4>
              <p className="text-muted-foreground text-[11px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Automatically extract and populate these fields from consultation speech
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoFetchEnabled(!autoFetchEnabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoFetchEnabled ? "bg-[#181e25]" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                autoFetchEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* ─── SECTIONS LIST ─── */}
        {sections.length === 0 ? (
          /* EMPTY STATE */
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center space-y-4 bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center text-slate-400 mx-auto shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                No Sections Added Yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Create sections and select which fields should be mapped and filled from the consultation transcript.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs"
              >
                {/* Section Header */}
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 cursor-grab" />
                    <div className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Layers className="w-3.5 h-3.5 text-[#181e25]" />
                    </div>

                    {editingSectionId === section.id ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                        <input
                          type="text"
                          value={editSectionTitleText}
                          onChange={(e) => setEditSectionTitleText(e.target.value)}
                          autoFocus
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-border rounded-md outline-none focus:border-[#181e25]"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameSection(section.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSectionId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="font-bold text-xs text-foreground tracking-tight"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {section.title}
                      </h3>
                    )}
                  </div>

                  {/* Section Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setEditSectionTitleText(section.title);
                        }}
                        className="flex items-center gap-2 text-xs cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-slate-500" /> Rename Section
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSection(section.id)}
                        className="flex items-center gap-2 text-xs text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Delete Section
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Fields List inside Section */}
                <div className="p-3 space-y-2">
                  {section.fieldKeys.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      No fields added to this section yet. Click "+ Add Field" below.
                    </div>
                  ) : (
                    section.fieldKeys.map((key) => (
                      <div
                        key={key}
                        className="group rounded-lg border border-border bg-white p-2.5 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="font-semibold text-xs text-foreground truncate"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {getFieldLabel(key)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded font-mono">
                            Auto-Fill Active
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldFromSection(section.id, key)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-all cursor-pointer"
                            title="Remove field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* + Add Field Button (Bottom Right of Section) */}
                  <div className="flex justify-end pt-1 pb-0.5 px-1">
                    <button
                      type="button"
                      onClick={() => handleOpenSelectFields(section.id)}
                      className="text-xs font-semibold text-[#181e25] hover:underline flex items-center gap-1 transition-colors cursor-pointer bg-transparent p-0"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Field</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* + Add Section Button */}
            <div className="flex justify-end pt-1 px-1">
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(true)}
                className="text-xs font-semibold text-[#181e25] hover:underline flex items-center gap-1 transition-colors cursor-pointer bg-transparent p-0"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SELECT FIELDS MODAL (STANDARD FIELD REGISTRY) ─── */}
      {selectFieldsModalOpen && targetSectionIdForField && (
        <SelectFieldsModal
          initiallySelected={
            sections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || []
          }
          onClose={() => {
            setSelectFieldsModalOpen(false);
            setTargetSectionIdForField(null);
          }}
          onApply={handleApplySelectedFields}
        />
      )}

      {/* ─── ADD NEW SECTION MODAL ─── */}
      {addSectionModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[700]"
            onClick={() => setAddSectionModalOpen(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 shadow-2xl z-[701] w-[440px] max-w-[92vw] space-y-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#181e25] flex items-center justify-center font-bold">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Add New Section</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Enter section name to organize mapped fields
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Clinical Notes, Medical History, General"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:bg-white focus:border-[#181e25]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-muted-foreground hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSection}
                className="flex-1 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#11161c] hover:to-[#22303e] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Create Section
              </button>
            </div>
          </div>
        </>
      )}
    </DrawerShell>
  );
}
