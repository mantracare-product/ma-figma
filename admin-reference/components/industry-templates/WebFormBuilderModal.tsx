"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FormTemplate,
  FormSectionTemplate,
  FormFieldTemplate,
  FormFieldType,
} from "@/lib/types/industry-templates";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import {
  ALL_PREDEFINED_FIELDS,
  PredefinedFieldItem,
  getPredefinedFieldsForIndustry,
  createFormFieldFromPredefined,
} from "@/lib/system-and-custom-fields";
import { Pill } from "@/components/ui/Pill";
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Type,
  AlignLeft,
  Mail,
  Hash,
  ChevronsUpDown,
  CheckSquare,
  List,
  Calendar,
  FileText,
  Minus,
  UploadCloud,
  PenTool,
  Code2,
  Phone,
  Check,
  X,
  Search,
  Database,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface WebFormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: FormTemplate;
  onSave: (form: FormTemplate) => void;
}

interface PaletteItem {
  type: FormFieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPlaceholder?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: "text", label: "Single Line Text", icon: Type, defaultPlaceholder: "Enter single line text..." },
  { type: "textarea", label: "Paragraph Text", icon: AlignLeft, defaultPlaceholder: "Enter detailed response..." },
  { type: "email", label: "Email", icon: Mail, defaultPlaceholder: "name@example.com" },
  { type: "number", label: "Number", icon: Hash, defaultPlaceholder: "e.g. 100" },
  { type: "select", label: "Drop Down", icon: ChevronsUpDown },
  { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
  { type: "radio", label: "Radio Buttons", icon: List },
  { type: "date", label: "Date", icon: Calendar },
  { type: "page_break", label: "Page Break", icon: FileText },
  { type: "section_break", label: "Section Break", icon: Minus },
  { type: "file", label: "File Upload", icon: UploadCloud },
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "html", label: "HTML Block", icon: Code2 },
  { type: "phone", label: "Phone", icon: Phone, defaultPlaceholder: "+1 (555) 000-0000" },
];

export const WebFormBuilderModal: React.FC<WebFormBuilderModalProps> = ({
  isOpen,
  onClose,
  form: initialForm,
  onSave,
}) => {
  const { categories, bundles, getIndustriesByCategory } = useIndustryTemplateStore();

  const [form, setForm] = useState<FormTemplate>(() => {
    return {
      ...initialForm,
      title: initialForm?.title || "",
      description: initialForm?.description || "",
      categoryId: initialForm?.categoryId || "",
      categoryName: initialForm?.categoryName || "",
      industryId: initialForm?.industryId || "",
      industryName: initialForm?.industryName || "",
      sections: initialForm?.sections || [],
    };
  });

  useEffect(() => {
    setForm({
      ...initialForm,
      title: initialForm?.title || "",
      description: initialForm?.description || "",
      categoryId: initialForm?.categoryId || "",
      categoryName: initialForm?.categoryName || "",
      industryId: initialForm?.industryId || "",
      industryName: initialForm?.industryName || "",
      sections: initialForm?.sections || [],
    });
  }, [initialForm]);

  const [activeSidebarTab, setActiveSidebarTab] = useState<"add_fields" | "field_settings">("add_fields");

  // Custom Dropdown States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);

  // Select Field Dropdown State (Closed by default)
  const [isSelectFieldDropdownOpen, setIsSelectFieldDropdownOpen] = useState(false);
  const [openModuleDropdowns, setOpenModuleDropdowns] = useState<Record<string, boolean>>({});
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [industryFilterMode, setIndustryFilterMode] = useState<"assigned" | "all">("assigned");

  // Selection states
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    initialForm.sections[0]?.fields[0]?.id || null
  );
  const [isSubmitButtonSelected, setIsSubmitButtonSelected] = useState(false);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Available industries for current category
  const availableIndustriesForCategory = useMemo(() => {
    return getIndustriesByCategory(form.categoryId || form.categoryName || "All");
  }, [form.categoryId, form.categoryName, getIndustriesByCategory]);

  // Flatten all fields across sections for count & lookup
  const allFields = form.sections.flatMap((s) => s.fields);
  const selectedField = allFields.find((f) => f.id === selectedFieldId) || null;
  const selectedSection = form.sections.find((s) => s.id === selectedSectionId) || null;

  // Active fields tailored by selected industry
  const availableIndustryFields = useMemo(() => {
    if (industryFilterMode === "all") {
      return ALL_PREDEFINED_FIELDS;
    }
    return getPredefinedFieldsForIndustry(form.industryName || "General / Universal");
  }, [form.industryName, industryFilterMode]);

  // Group fields by module
  const groupedFieldsByModule = useMemo(() => {
    const query = fieldSearchQuery.toLowerCase().trim();
    const groups: Record<string, PredefinedFieldItem[]> = {};

    availableIndustryFields.forEach((f) => {
      const match =
        !query ||
        f.label.toLowerCase().includes(query) ||
        f.name.toLowerCase().includes(query) ||
        f.key.toLowerCase().includes(query) ||
        f.module.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query));

      if (match) {
        const mod = f.module || "General";
        if (!groups[mod]) {
          groups[mod] = [];
        }
        groups[mod].push(f);
      }
    });

    return groups;
  }, [availableIndustryFields, fieldSearchQuery]);

  const moduleList = useMemo(() => {
    const preferredOrder = [
      "Clients",
      "Appointments",
      "Call Logs",
      "Processes",
      "Products / Services",
      "Organisation",
    ];
    const available = Object.keys(groupedFieldsByModule);
    return [
      ...preferredOrder.filter((m) => available.includes(m)),
      ...available.filter((m) => !preferredOrder.includes(m)),
    ];
  }, [groupedFieldsByModule]);

  if (!isOpen) return null;

  const toggleModuleDropdown = (moduleName: string) => {
    setOpenModuleDropdowns((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const handleCategoryChange = (newCategoryId: string) => {
    const selectedCategory = categories.find((c) => c.id === newCategoryId || c.name === newCategoryId);
    const categoryName = selectedCategory ? selectedCategory.name : newCategoryId;
    const matchingIndustries = getIndustriesByCategory(newCategoryId);
    setForm((prev) => ({
      ...prev,
      categoryId: newCategoryId,
      categoryName: categoryName,
      industryId: "",
      industryName: "",
    }));
    setIsCategoryDropdownOpen(false);
  };

  const handleIndustryChange = (newIndustryId: string) => {
    const selectedBundle = bundles.find(
      (b) => b.industryId === newIndustryId || b.id === newIndustryId
    );
    if (selectedBundle) {
      setForm((prev) => ({
        ...prev,
        industryId: selectedBundle.industryId,
        industryName: selectedBundle.industryName,
        categoryName: selectedBundle.categoryName || prev.categoryName,
      }));
    }
    setIsIndustryDropdownOpen(false);
  };

  // Helper to generate a unique field key
  const generateFieldKey = (label: string) => {
    const slug = label.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${slug || "field"}_${randomSuffix}`;
  };

  // Add a new section container card (Section Break)
  const handleAddSection = () => {
    const newSectionIndex = form.sections.length + 1;
    const newSec: FormSectionTemplate = {
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: `Section ${newSectionIndex}: Additional Details`,
      description: "",
      fields: [],
    };

    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));
    setSelectedSectionId(newSec.id);
    setSelectedFieldId(null);
    setIsSubmitButtonSelected(false);
    setActiveSidebarTab("field_settings");
  };

  // Delete an entire section
  const handleDeleteSection = (sectionId: string) => {
    if (form.sections.length <= 1) {
      alert("A form must have at least one section.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  };

  // Update a section's title or description
  const handleUpdateSection = (sectionId: string, updates: Partial<FormSectionTemplate>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec)),
    }));
  };

  // Add standard field to target section
  const handleAddField = (type: FormFieldType, targetSectionId?: string, labelOverride?: string) => {
    if (type === "section_break") {
      handleAddSection();
      return;
    }

    const item = PALETTE_ITEMS.find((p) => p.type === type);
    const label = labelOverride || item?.label || "New Field";
    const newField: FormFieldTemplate = {
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label,
      name: generateFieldKey(label),
      type,
      placeholder: item?.defaultPlaceholder || "",
      isRequired: false,
      fieldSource: "standard",
    };

    const targetId = targetSectionId || selectedSectionId || form.sections[form.sections.length - 1]?.id;

    setForm((prev) => {
      if (prev.sections.length === 0) {
        return {
          ...prev,
          sections: [
            {
              id: `sec-${Date.now()}`,
              title: "General Information",
              description: "",
              fields: [newField],
            },
          ],
        };
      }
      return {
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.id === targetId || (!targetId && sec === prev.sections[prev.sections.length - 1])
            ? { ...sec, fields: [...sec.fields, newField] }
            : sec
        ),
      };
    });

    setSelectedFieldId(newField.id);
    setSelectedSectionId(null);
    setIsSubmitButtonSelected(false);
    setActiveSidebarTab("field_settings");
  };

  // Add Predefined Field to target section
  const handleAddPredefinedField = (predefined: PredefinedFieldItem, targetSectionId?: string) => {
    const newField = createFormFieldFromPredefined(predefined);
    const targetId = targetSectionId || selectedSectionId || form.sections[form.sections.length - 1]?.id;

    setForm((prev) => {
      if (prev.sections.length === 0) {
        return {
          ...prev,
          sections: [
            {
              id: `sec-${Date.now()}`,
              title: "General Information",
              description: "",
              fields: [newField],
            },
          ],
        };
      }
      return {
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.id === targetId || (!targetId && sec === prev.sections[prev.sections.length - 1])
            ? { ...sec, fields: [...sec.fields, newField] }
            : sec
        ),
      };
    });

    setSelectedFieldId(newField.id);
    setSelectedSectionId(null);
    setIsSubmitButtonSelected(false);
    setActiveSidebarTab("field_settings");
  };

  // Update selected field attributes
  const handleUpdateSelectedField = (updates: Partial<FormFieldTemplate>) => {
    if (!selectedFieldId) return;
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f)),
      })),
    }));
  };

  // Delete field from form
  const handleDeleteField = (fieldId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => ({
        ...sec,
        fields: sec.fields.filter((f) => f.id !== fieldId),
      })),
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  // Duplicate field
  const handleDuplicateField = (field: FormFieldTemplate, sectionId: string) => {
    const clonedField: FormFieldTemplate = {
      ...field,
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: generateFieldKey(`${field.label}_copy`),
      label: `${field.label} (Copy)`,
    };

    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id === sectionId) {
          const index = sec.fields.findIndex((f) => f.id === field.id);
          const nextFields = [...sec.fields];
          nextFields.splice(index + 1, 0, clonedField);
          return { ...sec, fields: nextFields };
        }
        return sec;
      }),
    }));

    setSelectedFieldId(clonedField.id);
    setSelectedSectionId(null);
    setIsSubmitButtonSelected(false);
    setActiveSidebarTab("field_settings");
  };

  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

  // Field Reordering Handler (Drag start from field on canvas)
  const handleFieldDragStart = (e: React.DragEvent, fieldId: string, sectionId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ kind: "field_reorder", fieldId, sourceSectionId: sectionId })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  // Field Drop on another field (Reorder or insert)
  const handleFieldDropOnField = (
    e: React.DragEvent,
    targetFieldId: string,
    targetSectionId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFieldId(null);
    setDragOverSectionId(null);

    const jsonString = e.dataTransfer.getData("application/json");
    if (!jsonString) return;

    try {
      const payload = JSON.parse(jsonString);

      // Case 1: Reordering existing field
      if (payload.kind === "field_reorder") {
        const { fieldId, sourceSectionId } = payload;
        if (fieldId === targetFieldId) return;

        setForm((prev) => {
          let movingField: FormFieldTemplate | null = null;

          // Remove field from source section
          const newSections = prev.sections.map((sec) => {
            if (sec.id === sourceSectionId) {
              const f = sec.fields.find((item) => item.id === fieldId);
              if (f) movingField = f;
              return { ...sec, fields: sec.fields.filter((item) => item.id !== fieldId) };
            }
            return sec;
          });

          if (!movingField) return prev;

          // Insert field at target position in target section
          return {
            ...prev,
            sections: newSections.map((sec) => {
              if (sec.id === targetSectionId) {
                const targetIndex = sec.fields.findIndex((f) => f.id === targetFieldId);
                const nextFields = [...sec.fields];
                if (targetIndex >= 0) {
                  nextFields.splice(targetIndex, 0, movingField!);
                } else {
                  nextFields.push(movingField!);
                }
                return { ...sec, fields: nextFields };
              }
              return sec;
            }),
          };
        });

        setSelectedFieldId(fieldId);
        setSelectedSectionId(targetSectionId);
        return;
      }

      // Case 2: Dropping new predefined field from palette directly onto a field position
      if (payload.kind === "predefined" && payload.item) {
        const newField = createFormFieldFromPredefined(payload.item);
        setForm((prev) => ({
          ...prev,
          sections: prev.sections.map((sec) => {
            if (sec.id === targetSectionId) {
              const targetIndex = sec.fields.findIndex((f) => f.id === targetFieldId);
              const nextFields = [...sec.fields];
              nextFields.splice(targetIndex >= 0 ? targetIndex : nextFields.length, 0, newField);
              return { ...sec, fields: nextFields };
            }
            return sec;
          }),
        }));
        setSelectedFieldId(newField.id);
        setSelectedSectionId(targetSectionId);
        return;
      }

      // Case 3: Dropping new standard field from palette directly onto a field position
      if (payload.kind === "standard" && payload.type) {
        const item = PALETTE_ITEMS.find((p) => p.type === payload.type);
        const label = item?.label || "New Field";
        const newField: FormFieldTemplate = {
          id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          label,
          name: generateFieldKey(label),
          type: payload.type,
          placeholder: item?.defaultPlaceholder || "",
          isRequired: false,
          fieldSource: "standard",
        };
        setForm((prev) => ({
          ...prev,
          sections: prev.sections.map((sec) => {
            if (sec.id === targetSectionId) {
              const targetIndex = sec.fields.findIndex((f) => f.id === targetFieldId);
              const nextFields = [...sec.fields];
              nextFields.splice(targetIndex >= 0 ? targetIndex : nextFields.length, 0, newField);
              return { ...sec, fields: nextFields };
            }
            return sec;
          }),
        }));
        setSelectedFieldId(newField.id);
        setSelectedSectionId(targetSectionId);
        return;
      }
    } catch {
      // fallback
    }
  };

  // Drag & Drop Handlers from Palette
  const handleDragStartFromStandardPalette = (e: React.DragEvent, type: FormFieldType) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ kind: "standard", type }));
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartFromPredefined = (e: React.DragEvent, item: PredefinedFieldItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ kind: "predefined", item }));
    e.dataTransfer.setData("text/plain", item.type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDropOnSection = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    setDragOverFieldId(null);

    const jsonString = e.dataTransfer.getData("application/json");
    if (jsonString) {
      try {
        const payload = JSON.parse(jsonString);

        // Moving field between sections
        if (payload.kind === "field_reorder") {
          const { fieldId, sourceSectionId } = payload;
          setForm((prev) => {
            let movingField: FormFieldTemplate | null = null;
            const newSections = prev.sections.map((sec) => {
              if (sec.id === sourceSectionId) {
                const f = sec.fields.find((item) => item.id === fieldId);
                if (f) movingField = f;
                return { ...sec, fields: sec.fields.filter((item) => item.id !== fieldId) };
              }
              return sec;
            });

            if (!movingField) return prev;

            return {
              ...prev,
              sections: newSections.map((sec) =>
                sec.id === sectionId
                  ? { ...sec, fields: [...sec.fields, movingField!] }
                  : sec
              ),
            };
          });
          setSelectedFieldId(fieldId);
          setSelectedSectionId(sectionId);
          return;
        }

        if (payload.kind === "predefined" && payload.item) {
          handleAddPredefinedField(payload.item, sectionId);
          return;
        }
        if (payload.kind === "standard" && payload.type) {
          handleAddField(payload.type, sectionId);
          return;
        }
      } catch {
        // fallback
      }
    }

    const fieldType = e.dataTransfer.getData("text/plain") as FormFieldType;
    if (fieldType) {
      handleAddField(fieldType, sectionId);
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      alert("Please enter a form name.");
      return;
    }
    onSave({
      ...form,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Side Drawer with reduced width (80vw) */}
      <div className="relative z-10 w-full sm:w-[75vw] md:w-[78vw] lg:w-[80vw] max-w-[80vw] h-full bg-[#fafbfc] shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* 1. TOP BAR / STICKY HEADER (Shows Add Web Form only, clean layout) */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#181e25]">
                {initialForm?.title ? "Edit Web Form" : "Add Web Form"}
              </h3>
              <p className="text-xs text-slate-500">
                Design dynamic customer intake questionnaires, booking forms, and qualification surveys
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
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-4">
          {/* Top Card: Compact Form Details Div (30/70 Ratio) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            {/* ROW 1: Form Name (30%) + Description (70%) in SAME ROW */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Form Name (30%) */}
              <div className="w-full sm:w-[30%] space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Form Name *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Patient Intake Form"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1456f0]/40 outline-none font-semibold text-[#181e25] placeholder:text-slate-400"
                />
              </div>

              {/* Description (70%) */}
              <div className="w-full sm:w-[70%] space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Capture client registration details and medical history"
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
                  <span className="truncate">{form.categoryName || "Select Category"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCategoryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {categories.map((c) => {
                        const isSelected = form.categoryId === c.id || form.categoryName === c.name;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleCategoryChange(c.id)}
                            className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${isSelected ? "bg-blue-50 text-[#1456f0] font-bold" : "text-slate-700 hover:bg-slate-50"
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
                  <span className="truncate">{form.industryName || "Select Industry"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isIndustryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isIndustryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsIndustryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {availableIndustriesForCategory.map((ind) => {
                        const isSelected = form.industryId === ind.id;
                        return (
                          <button
                            key={ind.id}
                            type="button"
                            onClick={() => handleIndustryChange(ind.id)}
                            className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${isSelected ? "bg-blue-50 text-[#1456f0] font-bold" : "text-slate-700 hover:bg-slate-50"
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

          {/* 3. FORM BUILDER WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT CANVAS WORKSPACE (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Canvas Header */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1456f0]" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Form Visual Canvas ({form.sections.length} {form.sections.length === 1 ? "Section" : "Sections"} &bull; {allFields.length} Fields)
                  </h3>
                </div>
              </div>

              {/* Sections List on Canvas */}
              {form.sections.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto shadow-2xs">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#181e25]">No Sections in this Form</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Start building your form by creating a section or dragging fields from the left palette.
                  </p>
                  <Pill
                    variant="navy"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleAddSection}
                  >
                    Add First Section
                  </Pill>
                </div>
              ) : (
                form.sections.map((section, secIdx) => {
                  const isSectionSelected = section.id === selectedSectionId;
                  const isDragOver = dragOverSectionId === section.id;

                  return (
                    <div
                      key={section.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverSectionId(section.id);
                      }}
                      onDragLeave={() => setDragOverSectionId(null)}
                      onDrop={(e) => handleDropOnSection(e, section.id)}
                      className={`bg-white rounded-3xl p-5 border transition-all space-y-3.5 shadow-xs ${isDragOver
                        ? "border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/20"
                        : isSectionSelected
                          ? "border-[#1456f0] ring-2 ring-[#1456f0]/20"
                          : "border-slate-200/90"
                        }`}
                    >
                      {/* Section Header */}
                      <div
                        onClick={() => {
                          setSelectedSectionId(section.id);
                          setSelectedFieldId(null);
                          setIsSubmitButtonSelected(false);
                          setActiveSidebarTab("field_settings");
                        }}
                        className="flex items-center justify-between border-b border-slate-100 pb-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase shrink-0">
                            Section {secIdx + 1}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-bold text-xs text-[#181e25] truncate group-hover:text-[#1456f0] transition-colors">
                              {section.title || "Untitled Section"}
                            </h4>
                            {section.description && (
                              <p className="text-[11px] text-slate-400 truncate">
                                {section.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {form.sections.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(section.id);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* If Section is Empty: Show Empty Square Container */}
                      {section.fields.length === 0 ? (
                        <div
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            setSelectedFieldId(null);
                            setIsSubmitButtonSelected(false);
                          }}
                          className="py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center">
                            <Plus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-700">This section is empty</p>
                            <p className="text-[11px] text-slate-400">
                              Drag fields here or click items from the palette to add to this section.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Fields in this Section */
                        <div className="space-y-3">
                          {section.fields.map((field) => {
                            const isSelected = field.id === selectedFieldId && !isSubmitButtonSelected;
                            const isFieldDragOver = dragOverFieldId === field.id;

                            return (
                              <div
                                key={field.id}
                                draggable={true}
                                onDragStart={(e) => handleFieldDragStart(e, field.id, section.id)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverFieldId(field.id);
                                }}
                                onDragLeave={(e) => {
                                  e.stopPropagation();
                                  setDragOverFieldId(null);
                                }}
                                onDrop={(e) => handleFieldDropOnField(e, field.id, section.id)}
                                onClick={() => {
                                  setSelectedFieldId(field.id);
                                  setSelectedSectionId(section.id);
                                  setIsSubmitButtonSelected(false);
                                  setActiveSidebarTab("field_settings");
                                }}
                                className={`
                                group relative p-3.5 rounded-2xl transition-all cursor-pointer border select-none
                                ${isFieldDragOver
                                    ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/30"
                                    : isSelected
                                      ? "bg-white border-[#1456f0] ring-2 ring-[#1456f0]/20 shadow-sm"
                                      : "bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs"
                                  }
                              `}
                              >
                                {/* Top Row: Grip, Label, and Actions */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-[#1456f0] shrink-0 cursor-grab active:cursor-grabbing" />
                                    <span className="font-bold text-xs text-[#181e25]">
                                      {field.label}
                                    </span>
                                    {field.isRequired && (
                                      <span className="text-rose-500 font-bold">*</span>
                                    )}
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                      {field.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicateField(field, section.id);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 hover:text-[#1456f0] hover:bg-blue-50 transition-colors"
                                      title="Duplicate Field"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteField(field.id);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Delete Field"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Helper Description */}
                                {field.helperText && (
                                  <p className="text-[11px] text-slate-400 mb-2">
                                    {field.helperText}
                                  </p>
                                )}

                                {/* Field Preview */}
                                <div className="pointer-events-none opacity-85">
                                  {field.type === "textarea" ? (
                                    <textarea
                                      rows={2}
                                      disabled
                                      placeholder={field.placeholder || "Enter paragraph text..."}
                                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none text-slate-500"
                                    />
                                  ) : field.type === "select" ? (
                                    <div className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-slate-500">
                                      <span>{field.options?.[0]?.label || "Select an option..."}</span>
                                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                  ) : field.type === "checkbox" ? (
                                    <div className="space-y-1.5 pt-1">
                                      {(field.options || [{ label: "Option 1", value: "1" }]).map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                          <input type="checkbox" disabled className="rounded border-slate-300" />
                                          <span>{opt.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : field.type === "radio" ? (
                                    <div className="space-y-1.5 pt-1">
                                      {(field.options || [{ label: "Option 1", value: "1" }]).map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                          <input type="radio" disabled className="border-slate-300" />
                                          <span>{opt.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : field.type === "signature" ? (
                                    <div className="w-full h-14 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                                      <PenTool className="w-4 h-4 mr-2" /> Sign here
                                    </div>
                                  ) : field.type === "file" ? (
                                    <div className="w-full py-2.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                                      <UploadCloud className="w-4 h-4 mr-2" /> Upload file
                                    </div>
                                  ) : field.type === "page_break" ? (
                                    <div className="p-2 bg-blue-50/60 border border-dashed border-blue-200 rounded-xl text-center text-xs font-bold text-blue-600">
                                      — PAGE BREAK —
                                    </div>
                                  ) : field.type === "html" ? (
                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-500">
                                      &lt;div&gt;Custom HTML Block&lt;/div&gt;
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      disabled
                                      placeholder={field.placeholder || `Enter ${field.label}...`}
                                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-500"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Bottom Submit Button Card on Canvas */}
              <div
                onClick={() => {
                  setIsSubmitButtonSelected(true);
                  setSelectedFieldId(null);
                  setSelectedSectionId(null);
                  setActiveSidebarTab("field_settings");
                }}
                className={`
                  p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between bg-white shadow-xs
                  ${isSubmitButtonSelected
                    ? "border-[#1456f0] ring-2 ring-[#1456f0]/20"
                    : "hover:bg-slate-50/80 border-slate-200/80 shadow-2xs"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-xl bg-[#1456f0] text-white font-bold text-xs shadow-xs pointer-events-none">
                    {form.submitButtonText || "Submit Registration"}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    (Click to customize submit button label & success message)
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT PALETTE / FIELD SETTINGS SIDEBAR (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Tab Selector: Add Fields vs Settings */}
              <div className="bg-white rounded-2xl p-1 border border-slate-200 flex items-center gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("add_fields")}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeSidebarTab === "add_fields"
                    ? "bg-[#181e25] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Fields</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("field_settings")}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeSidebarTab === "field_settings"
                    ? "bg-[#181e25] text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </div>

              {/* TAB 1: ADD FIELDS PALETTE */}
              {activeSidebarTab === "add_fields" && (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500 font-medium">
                      Drag a field to any section on the canvas or click to add directly.
                    </p>

                    {/* Standard Fields 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {PALETTE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isSectionBreak = item.type === "section_break";

                        return (
                          <div
                            key={item.type}
                            draggable={!isSectionBreak}
                            onDragStart={(e) => handleDragStartFromStandardPalette(e, item.type)}
                            onClick={() => {
                              if (isSectionBreak) {
                                handleAddSection();
                              } else {
                                handleAddField(item.type);
                              }
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group shadow-2xs flex flex-col items-center justify-center text-center select-none ${isSectionBreak
                              ? "border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300"
                              : "border-slate-200/90 bg-white hover:border-[#1456f0] hover:bg-blue-50/40"
                              }`}
                          >
                            <Icon className={`w-4 h-4 mb-1.5 transition-colors ${isSectionBreak ? "text-[#1456f0]" : "text-slate-500 group-hover:text-[#1456f0]"
                              }`} />
                            <span className="font-semibold text-[11px] leading-tight text-[#181e25]">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DIVIDER */}
                  <div className="pt-2 border-t border-slate-200/80" />

                  {/* UNIFIED SELECT FIELD DROPDOWN */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all">
                    {/* Header */}
                    <button
                      type="button"
                      onClick={() => setIsSelectFieldDropdownOpen(!isSelectFieldDropdownOpen)}
                      className={`w-full flex items-center justify-between p-3.5 transition-colors font-bold text-xs ${isSelectFieldDropdownOpen
                        ? "bg-slate-100/90 text-[#181e25] border-b border-slate-200"
                        : "bg-slate-50 hover:bg-slate-100/80 text-slate-800"
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold">Select Field</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono text-[10px]">
                          {availableIndustryFields.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="text-[11px] font-normal text-slate-500">
                          {isSelectFieldDropdownOpen ? "Collapse" : "Expand"}
                        </span>
                        {isSelectFieldDropdownOpen ? (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {/* Dropdown Content */}
                    {isSelectFieldDropdownOpen && (
                      <div className="p-3 bg-slate-50/50 space-y-2.5 animate-in fade-in duration-150">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={fieldSearchQuery}
                            onChange={(e) => setFieldSearchQuery(e.target.value)}
                            placeholder="Search all fields..."
                            className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200/90 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 placeholder:text-slate-400 text-[#181e25]"
                          />
                          {fieldSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setFieldSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Industry scope filter banner */}
                        <div className="flex items-center justify-between text-[10.5px] bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 truncate">
                            Scope: <strong className="text-[#1456f0]">{form.industryName || "General"}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setIndustryFilterMode(
                                industryFilterMode === "assigned" ? "all" : "assigned"
                              )
                            }
                            className="text-[10px] font-bold text-[#1456f0] hover:underline cursor-pointer"
                          >
                            {industryFilterMode === "assigned" ? "Show All Industries" : "Filter to Industry"}
                          </button>
                        </div>

                        {/* Module Accordions */}
                        <div className="space-y-2">
                          {moduleList.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs">
                              No matching fields found.
                            </div>
                          ) : (
                            moduleList.map((moduleName) => {
                              const fieldsInModule = groupedFieldsByModule[moduleName] || [];
                              const isOpen = !!openModuleDropdowns[moduleName];

                              return (
                                <div
                                  key={moduleName}
                                  className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleModuleDropdown(moduleName)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#181e25] transition-colors text-xs font-bold cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{moduleName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                                        ({fieldsInModule.length})
                                      </span>
                                    </div>
                                    <div className="text-slate-400">
                                      {isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  </button>

                                  {isOpen && (
                                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                      {fieldsInModule.map((fieldItem) => (
                                        <div
                                          key={fieldItem.id}
                                          draggable
                                          onDragStart={(e) => handleDragStartFromPredefined(e, fieldItem)}
                                          onClick={() => handleAddPredefinedField(fieldItem)}
                                          className="px-2.5 py-2 rounded-lg bg-white hover:bg-blue-50/70 border border-slate-200/70 hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing group shadow-2xs flex items-center justify-between gap-2"
                                        >
                                          <span className="text-xs font-semibold text-[#181e25] truncate">
                                            {fieldItem.label}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAddPredefinedField(fieldItem);
                                            }}
                                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1456f0] transition-colors shrink-0"
                                            title="Add to form"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SETTINGS (Context-sensitive: Section vs Field vs Submit Button) */}
              {activeSidebarTab === "field_settings" && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  {/* Case 1: Submit Button Selected */}
                  {isSubmitButtonSelected ? (
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                        Submit Button Settings
                      </h4>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={form.submitButtonText || ""}
                          onChange={(e) => setForm({ ...form, submitButtonText: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Success Message
                        </label>
                        <textarea
                          rows={3}
                          value={form.successMessage || ""}
                          onChange={(e) => setForm({ ...form, successMessage: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25] resize-none"
                        />
                      </div>
                    </div>
                  ) : selectedSection ? (
                    <div className="space-y-4">
                      {/* Case 2: Section Selected */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                          Section Settings
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-[#1456f0] rounded font-bold uppercase">
                          Section Container
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Section Title *
                        </label>
                        <input
                          type="text"
                          value={selectedSection.title}
                          onChange={(e) =>
                            handleUpdateSection(selectedSection.id, { title: e.target.value })
                          }
                          placeholder="e.g. Medical History, Insurance Details"
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Section Description / Subtitle
                        </label>
                        <textarea
                          rows={2}
                          value={selectedSection.description || ""}
                          onChange={(e) =>
                            handleUpdateSection(selectedSection.id, { description: e.target.value })
                          }
                          placeholder="Provide optional helper instructions for this section..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25] resize-none"
                        />
                      </div>
                    </div>
                  ) : selectedField ? (
                    <div className="space-y-4">
                      {/* Case 3: Field Selected */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                          Field Properties
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-[#1456f0] rounded font-bold uppercase">
                          {selectedField.type}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Field Label *
                        </label>
                        <input
                          type="text"
                          value={selectedField.label}
                          onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                        />
                      </div>

                      {/* Only show placeholder for text/email/phone/number/textarea */}
                      {["text", "email", "phone", "number", "textarea"].includes(selectedField.type) && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={selectedField.placeholder || ""}
                            onChange={(e) =>
                              handleUpdateSelectedField({ placeholder: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          Helper Text
                        </label>
                        <input
                          type="text"
                          value={selectedField.helperText || ""}
                          onChange={(e) =>
                            handleUpdateSelectedField({ helperText: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-semibold text-slate-700">Required Field</span>
                        <input
                          type="checkbox"
                          checked={selectedField.isRequired || false}
                          onChange={(e) =>
                            handleUpdateSelectedField({ isRequired: e.target.checked })
                          }
                          className="w-4 h-4 text-[#1456f0] rounded focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Select a section or field on the canvas to configure its settings.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. STICKY BOTTOM FOOTER */}
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
            Save Web Form
          </Pill>
        </div>
      </div>
    </div>
  );
};
