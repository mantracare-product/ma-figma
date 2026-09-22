/**
 * ProcessTemplatePreviewDrawer.tsx
 * Path: src/app/components/process/ProcessTemplatePreviewDrawer.tsx
 *
 * Interactive Process Detail Preview Drawer for Process Templates (/admin/process-templates).
 * Modeled after the /deals ProcessDetailDrawer with interactive stage pipeline ribbon,
 * section & field customization canvas, and stage-specific required fields configurator.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Workflow,
  Check,
  ChevronDown,
  Layers,
  Settings2,
  Trash2,
  Eye,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Edit2,
  Lock,
  ArrowRight,
  ListPlus,
  FolderPlus,
  Star,
  Tag,
  Calendar,
  Hash,
  DollarSign,
  AlignLeft,
  Link as LinkIcon,
  FileText,
  User,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
  FieldModule,
  SECTION_REGISTRY_EVENT,
  LEGACY_SECTION_REGISTRY_EVENT,
  FIELD_REGISTRY_EVENT,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { Process, Stage, saveStoredProcesses, getStoredProcesses } from "../../../lib/useProcessStore";
import AdminFieldDrawer from "../../pages/admin/components/AdminFieldDrawer";
import AdminSectionDrawer from "../../pages/admin/components/AdminSectionDrawer";
import { FieldInputRenderer } from "../fields/FieldInputRenderer";
import { InfoTooltip } from "../help/InfoTooltip";

export interface ProcessTemplatePreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  process: Process | null;
  onUpdateProcess?: (updated: Process) => void;
}

export default function ProcessTemplatePreviewDrawer({
  isOpen,
  onClose,
  process,
  onUpdateProcess,
}: ProcessTemplatePreviewDrawerProps) {
  const { activeOrganization } = useOrganization();
  const {
    getAllFields,
    getCustomSections,
    addCustomSection,
    updateCustomSection,
    deleteCustomSection,
    getFieldsForOrg,
    getSectionsForOrg,
    updateCustomField,
  } = useFieldRegistry();

  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

  // Field & Section Drawer modals
  const [fieldDrawerOpen, setFieldDrawerOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);

  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(null);

  // Field Picker Modal
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [pickerTargetSectionId, setPickerTargetSectionId] = useState<string | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");

  // Stage Required Field Settings Modal / Popover
  const [stageReqModalField, setStageReqModalField] = useState<FieldDefinition | null>(null);

  // Local simulated form values for previewing inputs
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  const stages: Stage[] = useMemo(() => {
    return process?.stages || [];
  }, [process]);

  const activeStage: Stage | undefined = stages[activeStageIdx];

  // Process Fields in Registry
  const allProcessFields = useMemo(() => {
    try {
      return getAllFields("process");
    } catch {
      return [];
    }
  }, [getAllFields]);

  // Process Sections in Registry
  const [registrySections, setRegistrySections] = useState<SectionDefinition[]>(() => {
    try {
      return getCustomSections("process");
    } catch {
      return [];
    }
  });

  const refreshSections = () => {
    try {
      setRegistrySections(getCustomSections("process"));
    } catch {
      setRegistrySections([]);
    }
  };

  useEffect(() => {
    window.addEventListener(SECTION_REGISTRY_EVENT, refreshSections);
    window.addEventListener(LEGACY_SECTION_REGISTRY_EVENT, refreshSections);
    window.addEventListener(FIELD_REGISTRY_EVENT, refreshSections);
    window.addEventListener("storage", refreshSections);
    return () => {
      window.removeEventListener(SECTION_REGISTRY_EVENT, refreshSections);
      window.removeEventListener(LEGACY_SECTION_REGISTRY_EVENT, refreshSections);
      window.removeEventListener(FIELD_REGISTRY_EVENT, refreshSections);
      window.removeEventListener("storage", refreshSections);
    };
  }, [getCustomSections]);

  if (!isOpen || !process) return null;

  const handleStageClick = (idx: number) => {
    setActiveStageIdx(idx);
  };

  // Toggle stage-specific required status for a field (single stage requirement)
  const toggleStageRequired = (field: FieldDefinition, stageName: string) => {
    const isCurrentlyThatStage = field.required && field.requiredStages?.length === 1 && field.requiredStages[0] === stageName;
    if (isCurrentlyThatStage) {
      updateCustomField("process", field.id, {
        required: false,
        requiredStages: undefined,
      });
      toast.success(`Removed required rule for "${stageName}" on ${field.label}`);
    } else {
      updateCustomField("process", field.id, {
        required: true,
        requiredStages: [stageName],
      });
      toast.success(`Field "${field.label}" is now required at stage "${stageName}"`);
    }
  };

  // Toggle general required status (across all stages)
  const toggleGeneralRequired = (field: FieldDefinition) => {
    const isCurrentlyAllStages = Boolean(field.required && (!field.requiredStages || field.requiredStages.length === 0));
    if (isCurrentlyAllStages) {
      updateCustomField("process", field.id, {
        required: false,
        requiredStages: undefined,
      });
      toast.success(`"${field.label}" marked as optional`);
    } else {
      updateCustomField("process", field.id, {
        required: true,
        requiredStages: undefined,
      });
      toast.success(`"${field.label}" marked as required across all stages`);
    }
  };

  // Attach an existing field to a section
  const handleAttachFieldToSection = (sectionId: string, fieldKey: string) => {
    const sec = registrySections.find((s) => s.id === sectionId);
    if (!sec) return;
    const currentKeys = sec.fieldKeys ? [...sec.fieldKeys] : [];
    if (!currentKeys.includes(fieldKey)) {
      const updatedKeys = [...currentKeys, fieldKey];
      updateCustomSection("process", sectionId, { fieldKeys: updatedKeys });
      toast.success("Field added to section");
    }
  };

  // Remove field from section
  const handleRemoveFieldFromSection = (sectionId: string, fieldKey: string) => {
    const sec = registrySections.find((s) => s.id === sectionId);
    if (!sec) return;
    const updatedKeys = (sec.fieldKeys || []).filter((k) => k !== fieldKey);
    updateCustomSection("process", sectionId, { fieldKeys: updatedKeys });
    toast.success("Field removed from section");
  };

  return (
    <div className="fixed inset-0 z-[600] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative flex flex-col bg-[#F8FAFC] text-slate-800 shadow-2xl h-screen transition-all duration-300 z-10"
        style={{
          width: "70vw",
          minWidth: "820px",
          maxWidth: "1200px",
          animation: "drawerSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        <style>{`
          @keyframes drawerSlideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* 1. Header Bar */}
        <div className="flex-shrink-0 bg-white px-7 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-base font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {process.name}
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-md">
                  Process Template View
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                <span>{stages.length} Configured Stages</span>
                <span>•</span>
                <span className="text-blue-600 font-semibold">
                  Active Stage: {activeStage?.name || "None"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEditingSection(null);
                setSectionDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Section</span>
            </button>
            <button
              onClick={() => {
                setEditingField(null);
                setTargetSectionIdForField(null);
                setFieldDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Process Template Banner */}
        <div className="flex-shrink-0 bg-blue-50/60 border-b border-blue-100/80 px-7 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Process Layout &amp; Required Field Builder:</strong> Customize the sections and fields that users will see when working on records in <strong>{process.name}</strong>.
            </span>
          </div>
          <span className="text-[11px] text-blue-600 font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
            Preview Mode
          </span>
        </div>

        {/* 3. Stage Pipeline - Interactive Stepper Ribbon */}
        <div className="flex-shrink-0 px-7 py-3 bg-white border-b border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Process Stage Pipeline (Click a stage to simulate record progression):</span>
            <span className="text-slate-500 font-medium lowercase">stage {activeStageIdx + 1} of {stages.length}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
            {stages.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-1">No stages defined in this process template.</div>
            ) : (
              stages.map((st, i) => {
                const isActive = i === activeStageIdx;
                const isPassed = i < activeStageIdx;

                return (
                  <button
                    key={st.id}
                    onClick={() => handleStageClick(i)}
                    className={`flex-1 min-w-[140px] max-w-[210px] h-9 px-3 flex items-center justify-center text-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs ${
                      isActive
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : isPassed
                        ? "bg-slate-900 text-slate-100 hover:bg-slate-800"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    title={`Stage ${i + 1}: ${st.name}`}
                  >
                    {isPassed && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.color || (isActive ? "#ffffff" : "#3b82f6") }}
                    />
                    <span className="truncate">{st.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 4. Canvas Content Area */}
        <div className="flex-1 overflow-y-auto p-7 space-y-6">
          {/* Active Stage Context Bar */}
          {activeStage && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: activeStage.color || "#3b82f6" }}
                />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Current Stage: <span className="text-blue-600">{activeStage.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeStage.description || "Fields marked as required on this stage must be filled before advancing to the next stage."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingSection(null);
                    setSectionDrawerOpen(true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Section</span>
                </button>
              </div>
            </div>
          )}

          {/* Sections List */}
          {registrySections.length === 0 ? (
            <div className="p-12 bg-white border border-slate-200 border-dashed rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No Sections Defined</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Create custom sections to organize and group fields for this process template.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditingSection(null);
                    setSectionDrawerOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Section</span>
                </button>
                <button
                  onClick={() => {
                    setEditingField(null);
                    setTargetSectionIdForField(null);
                    setFieldDrawerOpen(true);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Create Custom Field</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {registrySections.map((section) => {
                const sectionFieldKeys = section.fieldKeys || [];
                const assignedFields = allProcessFields.filter(
                  (f) => sectionFieldKeys.includes(f.key) || f.sectionId === section.id
                );

                return (
                  <div
                    key={section.id}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {section.title}
                          </h4>
                          {section.description && (
                            <p className="text-[11px] text-slate-500 truncate">{section.description}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full shrink-0">
                          {assignedFields.length} {assignedFields.length === 1 ? "field" : "fields"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPickerTargetSectionId(section.id);
                            setFieldPickerOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Select existing fields from catalog"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-blue-600" />
                          <span>Select Fields</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingField(null);
                            setTargetSectionIdForField(section.id);
                            setFieldDrawerOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Create a new field directly in this section"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Field</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(section);
                            setSectionDrawerOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title="Edit section"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCustomSection("process", section.id);
                            toast.success(`Deleted section "${section.title}"`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Delete section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fields List */}
                    <div className="p-4">
                      {assignedFields.length === 0 ? (
                        <div className="py-6 px-4 bg-slate-50/60 border border-slate-200/70 border-dashed rounded-xl text-center space-y-2">
                          <p className="text-xs text-slate-500 font-medium">No fields mapped to this section yet</p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPickerTargetSectionId(section.id);
                                setFieldPickerOpen(true);
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Select from existing fields
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingField(null);
                                setTargetSectionIdForField(section.id);
                                setFieldDrawerOpen(true);
                              }}
                              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              Create new field
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {assignedFields.map((field) => {
                            const isReqOnCurrentStage = Boolean(
                              activeStage &&
                              (field.requiredStages?.includes(activeStage.name) ||
                                (field.required && (!field.requiredStages || field.requiredStages.length === 0)))
                            );
                            const hasStageRules = Boolean(field.requiredStages && field.requiredStages.length > 0);

                            return (
                              <div
                                key={field.id}
                                className={`p-3.5 rounded-xl border transition-all ${
                                  isReqOnCurrentStage
                                    ? "bg-amber-50/40 border-amber-300/80 shadow-2xs"
                                    : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs font-bold text-slate-800 truncate">
                                      {field.label}
                                    </span>
                                    {field.required && !hasStageRules && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">
                                        Required (All)
                                      </span>
                                    )}
                                    {hasStageRules && (
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                          isReqOnCurrentStage
                                            ? "text-amber-800 bg-amber-200/90 border border-amber-300 font-semibold"
                                            : "text-slate-600 bg-slate-100"
                                        }`}
                                        title={`Required on: ${field.requiredStages?.join(", ")}`}
                                      >
                                        {isReqOnCurrentStage
                                          ? `★ Required on ${activeStage?.name}`
                                          : `Required on ${field.requiredStages?.length} stages`}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingField(field);
                                        setTargetSectionIdForField(section.id);
                                        setFieldDrawerOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                      title="Edit field settings"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFieldFromSection(section.id, field.key)}
                                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Remove from section"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Preview Renderer Input */}
                                <div className="mb-2.5">
                                  <FieldInputRenderer
                                    field={field}
                                    value={previewValues[field.key] ?? field.defaultValue}
                                    onChange={(val) => setPreviewValues((p) => ({ ...p, [field.key]: val }))}
                                  />
                                </div>

                                {/* Stage Requirement Controls */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => activeStage && toggleStageRequired(field, activeStage.name)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                        isReqOnCurrentStage
                                          ? "bg-amber-100 text-amber-800 border-amber-300"
                                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      {isReqOnCurrentStage
                                        ? `✓ Required on ${activeStage?.name || "Stage"}`
                                        : `+ Make Required on ${activeStage?.name || "Stage"}`}
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setStageReqModalField(field)}
                                    className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5"
                                  >
                                    <Sliders className="w-3 h-3" />
                                    <span>All Stages</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Footer Bar */}
        <div className="flex-shrink-0 px-7 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Previewing <strong>{process.name}</strong> layout. Changes to fields and sections apply instantly.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SELECT EXISTING FIELDS FROM CATALOG
      ───────────────────────────────────────────────────────────── */}
      {fieldPickerOpen && pickerTargetSectionId && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setFieldPickerOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Select Fields to Add</h3>
              </div>
              <button
                onClick={() => setFieldPickerOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                placeholder="Search available process fields..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
              {allProcessFields
                .filter((f) => {
                  if (!pickerSearchQuery.trim()) return true;
                  const q = pickerSearchQuery.toLowerCase();
                  return f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q);
                })
                .map((field) => {
                  const targetSec = registrySections.find((s) => s.id === pickerTargetSectionId);
                  const isAlreadyAdded = (targetSec?.fieldKeys || []).includes(field.key);

                  return (
                    <div
                      key={field.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">{field.label}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {field.key}
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-semibold uppercase">{field.inputType}</span>
                      </div>

                      {isAlreadyAdded ? (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleAttachFieldToSection(pickerTargetSectionId, field.key);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setFieldPickerOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: STAGE REQUIRED RULES CONFIGURATOR PER FIELD
      ───────────────────────────────────────────────────────────── */}
      {stageReqModalField && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setStageReqModalField(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Stage Required Rules: {stageReqModalField.label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select which stages require this field before advancing.
                </p>
              </div>
              <button
                onClick={() => setStageReqModalField(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Required across all stages</span>
                  <p className="text-[11px] text-slate-500">Field is unconditionally mandatory everywhere.</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(stageReqModalField.required && (!stageReqModalField.requiredStages || stageReqModalField.requiredStages.length === 0))}
                  onChange={() => toggleGeneralRequired(stageReqModalField)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">
                Or Require only on specific stages:
              </div>

              <div className="space-y-1.5">
                {stages.map((st, sIdx) => {
                  const isChecked = Boolean(stageReqModalField.requiredStages?.includes(st.name));

                  return (
                    <label
                      key={st.id}
                      className={`p-2.5 bg-white border rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
                        isChecked ? "border-blue-300 bg-blue-50/40" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isChecked ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {sIdx + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: st.color || "#3b82f6" }}
                        />
                        <span className="text-xs font-semibold text-slate-800">{st.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleStageRequired(stageReqModalField, st.name)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setStageReqModalField(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DRAWER 1: NESTED ADMIN FIELD DRAWER
      ───────────────────────────────────────────────────────────── */}
      {fieldDrawerOpen && (
        <AdminFieldDrawer
          field={editingField}
          initialModule="process"
          lockModule={true}
          activeProcessId={process.id}
          activeProcessName={process.name}
          processStages={stages.map((s) => ({ id: s.name, name: s.name, color: s.color }))}
          sections={registrySections}
          zIndex={750}
          onClose={() => setFieldDrawerOpen(false)}
          onSaved={(savedField) => {
            setFieldDrawerOpen(false);
            if (targetSectionIdForField) {
              handleAttachFieldToSection(targetSectionIdForField, savedField.key);
            }
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          DRAWER 2: NESTED ADMIN SECTION DRAWER
      ───────────────────────────────────────────────────────────── */}
      {sectionDrawerOpen && (
        <AdminSectionDrawer
          section={editingSection}
          initialModule="process"
          activeProcessId={process.id}
          activeProcessName={process.name}
          processStages={stages.map((s) => ({ id: s.name, name: s.name, color: s.color }))}
          zIndex={750}
          onClose={() => setSectionDrawerOpen(false)}
          onSaved={() => {
            setSectionDrawerOpen(false);
            refreshSections();
          }}
        />
      )}
    </div>
  );
}
