"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  IndustryStarterBundle,
  ProcessTemplate,
} from "@/lib/types/industry-templates";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import { SYSTEM_FIELDS } from "@/lib/system-and-custom-fields";
import { ProcessTemplateEditor } from "./ProcessTemplateEditor";
import { Pill } from "@/components/ui/Pill";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  X,
  PhoneCall,
  ChevronDown,
  Check,
  GripVertical,
  Plus,
  Trash2,
  LayoutDashboard,
  Layers,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

interface MasterBundleStudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: IndustryStarterBundle;
  onSave: (bundle: IndustryStarterBundle) => void;
}

interface ProcessSectionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  fieldsCount: number;
}

interface SectionFieldRow {
  rowId: string;
  module: string;
  template: string;
  fieldId: string;
}

const MODULES = [
  "Clients",
  "Appointments",
  "Processes",
  "Organisation",
  "Products / Services",
] as const;

type ModuleType = (typeof MODULES)[number];

export const MasterBundleStudioDrawer: React.FC<MasterBundleStudioDrawerProps> = ({
  isOpen,
  onClose,
  bundle: initialBundle,
  onSave,
}) => {
  const { categories, bundles, getIndustriesByCategory } = useIndustryTemplateStore();

  const [bundle, setBundle] = useState<IndustryStarterBundle>(() => {
    const firstCat = categories[0];
    const firstBundle = bundles[0];
    return {
      ...initialBundle,
      categoryName: initialBundle.categoryName || firstCat?.name || "Healthcare",
      industryId: initialBundle.industryId || firstBundle?.industryId || "ind-cardiologist",
      industryName: initialBundle.industryName || firstBundle?.industryName || "Cardiologist",
      processTemplate: {
        ...initialBundle.processTemplate,
        name: initialBundle.processTemplate?.name || "New Process Blueprint",
        description: initialBundle.processTemplate?.description || "",
      },
    };
  });

  // Assigned Sections for this process - starts completely EMPTY for all new templates (no preloaded dummy sections!)
  const [assignedSections, setAssignedSections] = useState<ProcessSectionItem[]>([]);

  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);

  // Custom Section Drawer state (Exact same Create Section Drawer as in custom-fields)
  const [isSectionDrawerOpen, setIsSectionDrawerOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState<{
    name: string;
    description: string;
    industry: string;
    service: string;
    module: ModuleType;
    template: string;
    rows: SectionFieldRow[];
  }>({
    name: "",
    description: "",
    industry: "Healthcare",
    service: "Cardiologist",
    module: "Processes",
    template: "New Process Blueprint",
    rows: [],
  });

  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstCat = categories[0];
    const firstBundle = bundles[0];

    setBundle({
      ...initialBundle,
      categoryName: initialBundle.categoryName || firstCat?.name || "Healthcare",
      industryId: initialBundle.industryId || firstBundle?.industryId || "ind-cardiologist",
      industryName: initialBundle.industryName || firstBundle?.industryName || "Cardiologist",
      processTemplate: {
        ...initialBundle.processTemplate,
        name: initialBundle.processTemplate?.name || "New Process Blueprint",
        description: initialBundle.processTemplate?.description || "",
      },
    });

    // Reset assigned sections to completely empty
    setAssignedSections([]);
  }, [initialBundle, isOpen]);

  // Custom Dropdown States for Header
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);

  // Available industries for current category
  const availableIndustriesForCategory = useMemo(() => {
    return getIndustriesByCategory(bundle.categoryName || "All");
  }, [bundle.categoryName, getIndustriesByCategory]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCategoryId: string) => {
    const selectedCategory = categories.find((c) => c.id === newCategoryId || c.name === newCategoryId);
    const categoryName = selectedCategory ? selectedCategory.name : newCategoryId;
    const matchingIndustries = getIndustriesByCategory(newCategoryId);
    const firstInd = matchingIndustries[0];

    setBundle((prev) => ({
      ...prev,
      categoryName: categoryName,
      industryId: firstInd?.id || prev.industryId,
      industryName: firstInd?.name || prev.industryName,
      processTemplate: {
        ...prev.processTemplate,
        industryId: firstInd?.id || prev.industryId,
        industryName: firstInd?.name || prev.industryName,
      },
    }));
    setIsCategoryDropdownOpen(false);
  };

  const handleIndustryChange = (newIndustryId: string) => {
    const matchingBundle = bundles.find(
      (b) => b.industryId === newIndustryId || b.id === newIndustryId
    );
    const industryName = matchingBundle ? matchingBundle.industryName : newIndustryId;
    const categoryName = matchingBundle?.categoryName || bundle.categoryName;

    setBundle((prev) => ({
      ...prev,
      industryId: newIndustryId,
      industryName: industryName,
      categoryName: categoryName,
      processTemplate: {
        ...prev.processTemplate,
        industryId: newIndustryId,
        industryName: industryName,
      },
    }));
    setIsIndustryDropdownOpen(false);
  };

  // Open the Create Section Drawer with pre-selected industry and process
  const handleOpenSectionDrawer = () => {
    const currentCategory = bundle.categoryName || "Healthcare";
    const currentIndustry = bundle.industryName || "Cardiologist";
    const currentProcess = bundle.processTemplate.name || "New Process Blueprint";

    setSectionForm({
      name: "",
      description: "",
      industry: currentCategory,
      service: currentIndustry,
      module: "Processes",
      template: currentProcess,
      rows: [],
    });
    setIsSectionDrawerOpen(true);
  };

  // Add field row in Section Drawer
  const handleAddFieldRow = () => {
    setSectionForm((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        {
          rowId: `row-${Date.now()}-${Math.random()}`,
          module: "Clients",
          template: prev.template,
          fieldId: "",
        },
      ],
    }));
  };

  // Remove field row in Section Drawer
  const handleRemoveFieldRow = (rowIndex: number) => {
    setSectionForm((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  // Drag reorder inside Section Drawer
  const handleRowDragReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const updated = [...sectionForm.rows];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    setSectionForm((prev) => ({ ...prev, rows: updated }));
  };

  // Save Section Submit
  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.name.trim()) return;

    const validRows = sectionForm.rows.filter((r) => r.fieldId && r.fieldId.trim() !== "");

    const newSection: ProcessSectionItem = {
      id: `sec-${Date.now()}`,
      title: sectionForm.name.trim(),
      description: sectionForm.description.trim() || "Custom section assigned to this process layout",
      type: sectionForm.module,
      fieldsCount: validRows.length,
    };

    setAssignedSections((prev) => [...prev, newSection]);

    // Immediately reflect in Custom Sections page & storage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mantra_custom_sections_v2");
        const existingSections = stored ? JSON.parse(stored) : [];
        const customSecObj = {
          id: newSection.id,
          name: sectionForm.name.trim(),
          description: sectionForm.description.trim(),
          industry: sectionForm.industry,
          service: sectionForm.service,
          module: sectionForm.module,
          template: sectionForm.module === "Processes" ? (sectionForm.template || bundle.processTemplate.name) : undefined,
          fieldIds: validRows.map((r) => r.fieldId),
          rowTemplates: Object.fromEntries(
            validRows
              .filter((r) => r.module === "Processes" && r.template)
              .map((r) => [r.fieldId, r.template])
          ),
          createdAt: new Date().toISOString(),
        };
        const updated = [customSecObj, ...existingSections.filter((s: any) => s.id !== newSection.id)];
        localStorage.setItem("mantra_custom_sections_v2", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("mantra_custom_sections_updated"));
      } catch (e) {
        console.error("Error saving custom section to storage", e);
      }
    }

    setIsSectionDrawerOpen(false);
  };

  // Drag and drop handlers for layout sections reordering
  const handleDragStart = (index: number) => {
    setDraggedSectionIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverSectionIndex !== index) {
      setDragOverSectionIndex(index);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) {
      setDraggedSectionIndex(null);
      setDragOverSectionIndex(null);
      return;
    }

    const updated = [...assignedSections];
    const [movedItem] = updated.splice(draggedSectionIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setAssignedSections(updated);
    setDraggedSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  const handleDeleteSection = (id: string) => {
    setAssignedSections(assignedSections.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    if (!bundle.processTemplate.name.trim()) {
      alert("Please enter a process template name.");
      return;
    }
    onSave({
      ...bundle,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Side Drawer */}
      <div className="relative z-10 w-full sm:w-[88vw] md:w-[85vw] lg:w-[82vw] xl:w-[80vw] max-w-[1240px] h-full bg-[#fafbfc] shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* 1. TOP BAR / STICKY HEADER */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <PhoneCall className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#181e25]">
                {initialBundle?.processTemplate?.name ? "Edit Process Template" : "Add Process Template"}
              </h3>
              <p className="text-xs text-slate-500">
                Manage industry-tailored conversation blueprints, stages, and telephony configurations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. DRAWER SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-5">
          {/* Top Card: Compact General Settings Div (30/70 Ratio) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            {/* ROW 1: Process Template Name (30%) + Description (70%) in SAME ROW */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Process Template Name (30%) */}
              <div className="w-full sm:w-[30%] space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Process Name *
                </label>
                <input
                  type="text"
                  value={bundle.processTemplate.name}
                  onChange={(e) =>
                    setBundle({
                      ...bundle,
                      processTemplate: {
                        ...bundle.processTemplate,
                        name: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Cardiologist Consultation"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1456f0]/40 outline-none font-semibold text-[#181e25] placeholder:text-slate-400"
                />
              </div>

              {/* Description / Purpose (70%) */}
              <div className="w-full sm:w-[70%] space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  value={bundle.processTemplate.description}
                  onChange={(e) =>
                    setBundle({
                      ...bundle,
                      processTemplate: {
                        ...bundle.processTemplate,
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Clinical triage, consultation booking, and pre-appointment confirmation workflow"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1456f0]/40 outline-none text-[#181e25] placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* ROW 2: Industry Category (30%) + Industry (70%) in SAME ROW */}
            <div className="flex flex-col sm:flex-row items-start gap-4 pt-0.5">
              {/* 1. Custom Industry Category Dropdown (30%) */}
              <div className="w-full sm:w-[30%] space-y-1 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Industry Category *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    setIsIndustryDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-semibold text-[#181e25] flex items-center justify-between shadow-2xs transition-all text-left cursor-pointer"
                >
                  <span className="truncate">{bundle.categoryName || "Select Category"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCategoryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {categories.map((c) => {
                        const isSelected = bundle.categoryName === c.name || bundle.categoryName === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCategoryChange(c.id)}
                            className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected ? "bg-blue-50 text-[#1456f0] font-bold" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* 2. Custom Industry Dropdown (70%) */}
              <div className="w-full sm:w-[70%] space-y-1 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Industry *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsIndustryDropdownOpen(!isIndustryDropdownOpen);
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-semibold text-[#181e25] flex items-center justify-between shadow-2xs transition-all text-left cursor-pointer"
                >
                  <span className="truncate">{bundle.industryName || "Select Industry"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isIndustryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isIndustryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsIndustryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {availableIndustriesForCategory.map((ind) => {
                        const isSelected = bundle.industryId === ind.id || bundle.industryName === ind.name;
                        return (
                          <button
                            key={ind.id}
                            type="button"
                            onClick={() => handleIndustryChange(ind.id)}
                            className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected ? "bg-blue-50 text-[#1456f0] font-bold" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span className="truncate">{ind.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. STAGES & TABS WORKSPACE */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
            <ProcessTemplateEditor
              process={bundle.processTemplate}
              onChange={(updatedProcess) =>
                setBundle({
                  ...bundle,
                  processTemplate: updatedProcess,
                })
              }
            />
          </div>

          {/* 4. SECTION LAYOUT (Custom sections assigned to this process) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            {/* Header & Add Section Button */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center font-bold">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm sm:text-base text-[#181e25]">
                    Process Section Layout
                  </h4>
                  <p className="text-xs text-slate-500">
                    Custom sections and fields configured for this process flow
                  </p>
                </div>
              </div>

              {/* Add Section Button (opens Custom Section Drawer) */}
              <button
                type="button"
                onClick={handleOpenSectionDrawer}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>

            {/* Layout Body: Empty state if no sections, or Draggable Section Items */}
            {assignedSections.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-400 mb-3">
                  <Layers className="w-6 h-6 text-slate-400" />
                </div>
                <h5 className="font-display font-bold text-sm text-[#181e25]">
                  No sections added yet
                </h5>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Add custom sections with fields for {bundle.industryName || "this process"} to configure your process layout.
                </p>
                <button
                  type="button"
                  onClick={handleOpenSectionDrawer}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Section</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {assignedSections.map((sec, idx) => {
                  const isDragging = draggedSectionIndex === idx;
                  const isDragOver = dragOverSectionIndex === idx && draggedSectionIndex !== idx;

                  return (
                    <div
                      key={sec.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => {
                        setDraggedSectionIndex(null);
                        setDragOverSectionIndex(null);
                      }}
                      className={`
                        flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all select-none
                        ${
                          isDragging
                            ? "opacity-40 bg-slate-100 border-dashed border-slate-300"
                            : isDragOver
                            ? "border-[#1456f0] bg-blue-50/60 shadow-sm"
                            : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-2xs"
                        }
                      `}
                    >
                      {/* Left: Drag Handle, Title & Description */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 shrink-0"
                          title="Drag to change position"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <h5 className="font-display font-bold text-xs sm:text-sm text-[#181e25] truncate">
                            {sec.title}
                          </h5>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {sec.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Fields count & Delete */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200/70">
                          {sec.fieldsCount} Fields
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. STICKY BOTTOM FOOTER */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <Pill
            variant="navy"
            size="md"
            icon={<Check className="w-4 h-4 text-emerald-400" />}
            onClick={handleSave}
          >
            Save Process Template
          </Pill>
        </div>
      </div>

      {/* EXACT SAME CREATE CUSTOM SECTION DRAWER FROM CUSTOM-FIELDS */}
      <SideDrawer
        isOpen={isSectionDrawerOpen}
        onClose={() => setIsSectionDrawerOpen(false)}
        title="Create Custom Section"
        subtitle="Group fields into reusable sections for this process template"
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsSectionDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <Pill
              variant="navy"
              size="md"
              type="button"
              icon={<Check className="w-4 h-4" />}
              onClick={(e) => handleSaveSection(e)}
            >
              Save Section
            </Pill>
          </div>
        }
      >
        <form onSubmit={handleSaveSection} className="space-y-5">
          {/* 1. Section Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Section Label</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sectionForm.name}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, name: e.target.value })
              }
              placeholder="e.g. Patient Vitals, Billing Information"
              className="
                w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-[#222222]
                shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* 2. Description (Placed directly after Section Label) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25]">
              Description
            </label>
            <input
              type="text"
              value={sectionForm.description}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, description: e.target.value })
              }
              placeholder="Brief description of this section's purpose..."
              className="
                w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md
                border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-[#222222]
                shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0]/40 focus:border-[#1456f0]/60 focus:bg-white
              "
            />
          </div>

          {/* 3. Industry & Services Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Industry Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
                <span>Industry</span>
                <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={sectionForm.industry}
                onChange={(newInd) => {
                  const matchingInds = getIndustriesByCategory(newInd);
                  const firstServ = matchingInds[0]?.name || "Cardiologist";
                  setSectionForm({
                    ...sectionForm,
                    industry: newInd,
                    service: firstServ,
                  });
                }}
                options={categories.map((c) => c.name)}
                label="Choose Industry"
              />
            </div>

            {/* Relevant Services Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
                <span>Service</span>
                <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={sectionForm.service}
                onChange={(newServ) => {
                  setSectionForm({
                    ...sectionForm,
                    service: newServ,
                  });
                }}
                options={availableIndustriesForCategory.map((ind) => ind.name)}
                label={`Services (${sectionForm.industry})`}
              />
            </div>
          </div>

          {/* 4. Target Module Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center gap-1">
              <span>Target Module</span>
              <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={sectionForm.module}
              onChange={(val) => {
                setSectionForm({
                  ...sectionForm,
                  module: val as ModuleType,
                });
              }}
              options={[...MODULES]}
              label="Target Module"
            />
          </div>

          {/* 5. If Process is chosen: Choose Template dropdown below Target Module */}
          {sectionForm.module === "Processes" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Choose Template</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-semibold text-[#1456f0] lowercase tracking-normal">
                  ({sectionForm.service})
                </span>
              </label>
              <CustomSelect
                value={sectionForm.template || bundle.processTemplate.name}
                onChange={(val) =>
                  setSectionForm({ ...sectionForm, template: val })
                }
                options={[bundle.processTemplate.name]}
                placeholder="-- Choose Template --"
                label={`Templates (${sectionForm.service})`}
                triggerClassName="bg-blue-50/40 border-blue-200/80 text-[#181e25]"
              />
            </div>
          )}

          {/* SECTION LAYOUT (Matching custom-fields section layout with drag handle & delete) */}
          <div className="space-y-3 pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#181e25] block">
                Section Layout
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#1456f0]">
                {sectionForm.rows.filter((r) => r.fieldId).length} fields configured
              </span>
            </div>

            {sectionForm.rows.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/40 border border-dashed border-slate-200/80 text-center space-y-2">
                <p className="text-xs text-slate-500">No fields added to this section yet.</p>
                <Pill
                  variant="navy"
                  size="sm"
                  type="button"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddFieldRow}
                >
                  Add First Field
                </Pill>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sectionForm.rows.map((row, index) => {
                  return (
                    <div
                      key={row.rowId}
                      draggable
                      onDragStart={() => setDraggedRowIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverRowIndex(index);
                      }}
                      onDragLeave={() => setDragOverRowIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedRowIndex !== null) {
                          handleRowDragReorder(draggedRowIndex, index);
                        }
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedRowIndex(null);
                        setDragOverRowIndex(null);
                      }}
                      className={`
                        p-3 rounded-2xl bg-white/90 backdrop-blur-md
                        border shadow-xs transition-all duration-150 space-y-2
                        cursor-grab active:cursor-grabbing select-none
                        ${
                          draggedRowIndex === index
                            ? "opacity-30 border-dashed border-[#1456f0]"
                            : "border-slate-200/80 hover:border-slate-300"
                        }
                        ${
                          dragOverRowIndex === index
                            ? "ring-2 ring-[#1456f0]/50 bg-blue-50/30"
                            : ""
                        }
                      `}
                    >
                      {/* Header line for drag handle and delete action */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <GripVertical className="w-4 h-4 cursor-grab active:cursor-grabbing shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-500">Field #{index + 1}</span>
                        </div>

                        {/* Delete Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFieldRow(index)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete field row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Fields: Module, Template, Custom Field */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* 1. Module Dropdown */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#181e25] block mb-1">
                            Module
                          </label>
                          <CustomSelect
                            value={row.module}
                            onChange={(val) => {
                              const updated = [...sectionForm.rows];
                              updated[index] = { ...updated[index], module: val };
                              setSectionForm({ ...sectionForm, rows: updated });
                            }}
                            options={[...MODULES]}
                            label="Module"
                            triggerClassName="py-2"
                          />
                        </div>

                        {/* 2. Custom Field Dropdown */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#181e25] block mb-1">
                            Custom Field
                          </label>
                          <CustomSelect
                            value={row.fieldId}
                            onChange={(val) => {
                              const updated = [...sectionForm.rows];
                              updated[index] = { ...updated[index], fieldId: val };
                              setSectionForm({ ...sectionForm, rows: updated });
                            }}
                            options={SYSTEM_FIELDS.map((f) => ({
                              value: f.id,
                              label: f.label,
                              badge: f.category,
                            }))}
                            placeholder="-- Choose Field --"
                            label="Field"
                            triggerClassName="py-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Field Row Button */}
                <button
                  type="button"
                  onClick={handleAddFieldRow}
                  className="
                    w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300
                    text-xs font-semibold text-slate-600 hover:text-[#1456f0] hover:border-[#1456f0]/60 hover:bg-blue-50/40
                    flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer
                  "
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field Row</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </SideDrawer>
    </div>
  );
};
