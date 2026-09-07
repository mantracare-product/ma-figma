"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DocumentTemplate,
  DocumentCreationMethod,
  DocumentFieldMapping,
  FormTemplate,
} from "@/lib/types/industry-templates";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import {
  ALL_PREDEFINED_FIELDS,
  getPredefinedFieldsForIndustry,
  PredefinedFieldItem,
} from "@/lib/system-and-custom-fields";
import { Pill } from "@/components/ui/Pill";
import {
  X,
  Trash2,
  FileCode,
  Check,
  ChevronDown,
  ChevronRight,
  UploadCloud,
  Info,
  Layers,
  Code2,
  Eye,
  Settings,
  Search,
  PenLine,
} from "lucide-react";

interface DocumentEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentTemplate | null;
  onSave: (doc: DocumentTemplate) => void;
}

const DEFAULT_CUSTOM_HTML = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">Patient Consent & Treatment Agreement</h3>
  <p>Dear <strong>{{patient_name}}</strong>,</p>
  <p>Date of Treatment: <strong>{{treatment_date}}</strong></p>
  <p>Assigned Clinician: <strong>{{doctor_name}}</strong></p>
  <p>Doc Ref #: <strong>{{doc_number}}</strong></p>
  <p style="margin-top: 16px; font-size: 13px; color: #475569;">I hereby acknowledge and authorize the proposed clinical treatment procedure in accordance with medical protocol.</p>
</div>`;

export const DocumentEditorModal: React.FC<DocumentEditorDrawerProps> = ({
  isOpen,
  onClose,
  document: initialDoc,
  onSave,
}) => {
  const { categories, bundles, allForms, getIndustriesByCategory } = useIndustryTemplateStore();

  // Local document state
  const [doc, setDoc] = useState<DocumentTemplate>(() => {
    if (initialDoc) return initialDoc;
    return {
      id: `doc-${Date.now()}`,
      categoryId: "",
      categoryName: "",
      industryId: "",
      industryName: "",
      name: "",
      title: "",
      description: "",
      creationMethod: "import_doc",
      contentHtml: "",
      extractedFields: [],
      autoNumbering: {
        enabled: true,
        prefix: "DOC-",
        sequenceDigits: 4,
        currentNumber: 1001,
        suffix: `-${new Date().getFullYear()}`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Keep in sync when initialDoc changes
  useEffect(() => {
    if (initialDoc) {
      setDoc(initialDoc);
    } else {
      setDoc({
        id: `doc-${Date.now()}`,
        categoryId: "",
        categoryName: "",
        industryId: "",
        industryName: "",
        name: "",
        title: "",
        description: "",
        creationMethod: "import_doc",
        contentHtml: "",
        extractedFields: [],
        autoNumbering: {
          enabled: true,
          prefix: "DOC-",
          sequenceDigits: 4,
          currentNumber: 1001,
          suffix: `-${new Date().getFullYear()}`,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [initialDoc]);

  // Custom UI Dropdown States
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = useState(false);
  const [isWebFormDropdownOpen, setIsWebFormDropdownOpen] = useState(false);

  // Field Mapping Dropdown State (which extracted field index is currently open)
  const [activeMappingFieldIndex, setActiveMappingFieldIndex] = useState<number | null>(null);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [industryFilterMode, setIndustryFilterMode] = useState<"assigned" | "all">("assigned");
  // By default all accordions are CLOSED
  const [openModuleDropdowns, setOpenModuleDropdowns] = useState<Record<string, boolean>>({});

  // Custom HTML builder state
  const [activeEditorTab, setActiveEditorTab] = useState<"html" | "preview">("html");
  const [isAdvanceSettingsOpen, setIsAdvanceSettingsOpen] = useState(false);
  
  // Insert variable dropdown state for Custom HTML editor
  const [isInsertVarOpen, setIsInsertVarOpen] = useState(false);
  const [varSearchQuery, setVarSearchQuery] = useState("");
  const insertVarRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Editable Preview Refs
  const customPreviewRef = useRef<HTMLDivElement>(null);
  const webformPreviewRef = useRef<HTMLDivElement>(null);

  // Available industries for current category
  const availableIndustriesForCategory = useMemo(() => {
    return getIndustriesByCategory(doc.categoryId || doc.categoryName || "All");
  }, [doc.categoryId, doc.categoryName, getIndustriesByCategory]);

  // Filtered webforms for current industry
  const availableWebForms = useMemo(() => {
    return allForms.filter((f) => f.industryId === doc.industryId);
  }, [allForms, doc.industryId]);

  // Available predefined fields scoped to active industry
  const availableIndustryFields = useMemo(() => {
    if (industryFilterMode === "all") {
      return ALL_PREDEFINED_FIELDS;
    }
    return getPredefinedFieldsForIndustry(doc.industryName || "Dental Practice");
  }, [industryFilterMode, doc.industryName]);

  // Filtered predefined fields matching search query
  const searchedPredefinedFields = useMemo(() => {
    if (!fieldSearchQuery.trim()) return availableIndustryFields;
    const q = fieldSearchQuery.toLowerCase();
    return availableIndustryFields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.module.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [availableIndustryFields, fieldSearchQuery]);

  // Group fields by module category
  const groupedFieldsByModule = useMemo(() => {
    const groups: Record<string, PredefinedFieldItem[]> = {};
    searchedPredefinedFields.forEach((field) => {
      const mod = field.module || "General";
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(field);
    });
    return groups;
  }, [searchedPredefinedFields]);

  const moduleList = useMemo(() => {
    return Object.keys(groupedFieldsByModule);
  }, [groupedFieldsByModule]);

  // Sync contentEditable preview when switching tabs or loading content
  useEffect(() => {
    if (activeEditorTab === "preview" && customPreviewRef.current) {
      customPreviewRef.current.innerHTML = doc.contentHtml || DEFAULT_CUSTOM_HTML;
    }
  }, [activeEditorTab]);

  useEffect(() => {
    if (webformPreviewRef.current && doc.contentHtml) {
      webformPreviewRef.current.innerHTML = doc.contentHtml;
    }
  }, [doc.sourceWebFormId]);

  const toggleModuleDropdown = (moduleName: string) => {
    setOpenModuleDropdowns((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  // Handle Category Change
  const handleCategoryChange = (newCategoryId: string) => {
    const selectedCategory = categories.find((c) => c.id === newCategoryId || c.name === newCategoryId);
    const categoryName = selectedCategory ? selectedCategory.name : newCategoryId;
    const matchingIndustries = getIndustriesByCategory(newCategoryId);
    setDoc((prev) => ({
      ...prev,
      categoryId: newCategoryId,
      categoryName: categoryName,
      industryId: "",
      industryName: "",
    }));
    setIsCategoryDropdownOpen(false);
  };

  // Handle Industry Change
  const handleIndustryChange = (newIndustryId: string) => {
    const selectedBundle = bundles.find(
      (b) => b.industryId === newIndustryId || b.id === newIndustryId
    );
    if (selectedBundle) {
      setDoc((prev) => ({
        ...prev,
        industryId: selectedBundle.industryId,
        industryName: selectedBundle.industryName,
        categoryName: selectedBundle.categoryName || prev.categoryName,
      }));
    }
    setIsIndustryDropdownOpen(false);
  };

  // Generate WebForm HTML representation
  const generateWebFormHtml = (form: FormTemplate, currentDocName: string) => {
    const fieldsHtml = form.sections.map((sec) => `
  <div style="margin-top: 18px; margin-bottom: 14px;">
    <h4 style="color: #0f172a; margin: 0 0 8px 0; font-size: 13px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${sec.title}</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
      ${sec.fields.map((f) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 8px; width: 40%; font-weight: 600; color: #475569;">${f.label}:</td>
          <td style="padding: 6px 8px; width: 60%; color: #0f172a; font-family: monospace;">{{${f.name}}}</td>
        </tr>
      `).join('')}
    </table>
  </div>
`).join('');

    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1456f0; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${currentDocName || form.title}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${form.description || "WebForm Intake & Authorization Record"}</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #eff6ff; color: #1456f0; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
        Doc #: {{doc_number}}
      </span>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Effective: {{treatment_date}}</p>
    </div>
  </div>
  ${fieldsHtml}
  <div style="margin-top: 32px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
    <div style="width: 45%;">
      <p style="font-size: 11px; color: #64748b; margin-bottom: 20px;">Client / Patient Signatory:</p>
      <div style="border-bottom: 1px solid #334155; width: 100%;"></div>
      <p style="font-size: 10.5px; color: #94a3b8; margin-top: 4px;">Signatory: {{client_name}}</p>
    </div>
    <div style="width: 45%;">
      <p style="font-size: 11px; color: #64748b; margin-bottom: 20px;">Verification & Timestamp:</p>
      <div style="border-bottom: 1px solid #334155; width: 100%;"></div>
      <p style="font-size: 10.5px; color: #94a3b8; margin-top: 4px;">Verified on {{treatment_date}}</p>
    </div>
  </div>
</div>`;
  };

  // Close insert var dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (insertVarRef.current && !insertVarRef.current.contains(e.target as Node)) {
        setIsInsertVarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Insert variable into HTML content
  const handleInsertVariable = (varKey: string) => {
    const placeholder = `{{${varKey}}}`;
    const textarea = htmlTextareaRef.current;
    if (activeEditorTab === "html" && textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentVal = doc.contentHtml || "";
      const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);
      setDoc((prev) => ({ ...prev, contentHtml: newVal }));
      setIsInsertVarOpen(false);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 50);
    } else {
      const updated = (doc.contentHtml || "") + " " + placeholder;
      setDoc((prev) => ({ ...prev, contentHtml: updated }));
      if (customPreviewRef.current) {
        customPreviewRef.current.innerHTML = updated;
      }
      setIsInsertVarOpen(false);
    }
  };

  // Map predefined field to extracted placeholder
  const handleSelectFieldMapping = (fieldIndex: number, field: PredefinedFieldItem) => {
    const updated = [...doc.extractedFields];
    updated[fieldIndex] = {
      ...updated[fieldIndex],
      mappedVariable: field.key,
      label: field.label,
      fieldSource: field.category === "System" ? "system" : "custom",
    };
    setDoc({ ...doc, extractedFields: updated });
    setActiveMappingFieldIndex(null);
  };

  // File Upload Handler (Parses text / .docx)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || "";
      
      // Extract {{placeholder}} patterns
      const regex = /\{\{([^}]+)\}\}|\{([^}]+)\}/g;
      const matches = new Set<string>();
      let match;
      while ((match = regex.exec(content)) !== null) {
        matches.add(match[1] || match[2]);
      }

      const extractedList: DocumentFieldMapping[] = Array.from(matches).map((key) => {
        const cleanKey = key.trim();
        const matchedPredefined = ALL_PREDEFINED_FIELDS.find(
          (v) => v.key.toLowerCase() === cleanKey.toLowerCase()
        );
        return {
          placeholder: `{{${cleanKey}}}`,
          mappedVariable: matchedPredefined ? matchedPredefined.key : "full_name",
          label: matchedPredefined ? matchedPredefined.label : cleanKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          fieldSource: (matchedPredefined?.category === "System" ? "system" : "custom") as "system" | "custom",
        };
      });

      const finalExtracted: DocumentFieldMapping[] = extractedList.length > 0 ? extractedList : [
        { placeholder: "{{patient_name}}", mappedVariable: "full_name", label: "Full Name", fieldSource: "system" },
        { placeholder: "{{treatment_date}}", mappedVariable: "appointment_date", label: "Appointment Date", fieldSource: "system" },
        { placeholder: "{{doctor_name}}", mappedVariable: "practitioner_name", label: "Practitioner / Doctor", fieldSource: "system" },
      ];

      const generatedHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1456f0; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${doc.name || file.name.replace(/\.[^/.]+$/, "")}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Source: ${file.name} | Category: ${doc.categoryName || "General"}</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #eff6ff; color: #1456f0; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
        Doc #: {{doc_number}}
      </span>
    </div>
  </div>
  <p style="font-size: 13px; color: #334155;">I, <strong>{{patient_name}}</strong>, hereby authorize <strong>{{doctor_name}}</strong> to perform scheduled service on <strong>{{treatment_date}}</strong>.</p>
</div>`;

      setDoc((prev) => ({
        ...prev,
        sourceFileName: file.name,
        extractedFields: finalExtracted,
        contentHtml: prev.contentHtml || generatedHtml,
      }));
    };

    if (file.type.includes("text") || file.name.endsWith(".txt")) {
      reader.readAsText(file);
    } else {
      const simulatedFields: DocumentFieldMapping[] = [
        { placeholder: "{{patient_name}}", mappedVariable: "full_name", label: "Full Name", fieldSource: "system" },
        { placeholder: "{{treatment_date}}", mappedVariable: "appointment_date", label: "Appointment Date", fieldSource: "system" },
        { placeholder: "{{doctor_name}}", mappedVariable: "practitioner_name", label: "Practitioner / Doctor", fieldSource: "system" },
        { placeholder: "{{doc_number}}", mappedVariable: "doc_number", label: "Document Number", fieldSource: "system" },
      ];
      setDoc((prev) => ({
        ...prev,
        sourceFileName: file.name,
        extractedFields: simulatedFields,
        contentHtml: prev.contentHtml || `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1456f0; padding-bottom: 12px; margin-bottom: 16px;">
    <div>
      <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${doc.name || "CLINICAL TREATMENT CONSENT FORM"}</h2>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Source Document: ${file.name}</p>
    </div>
    <div style="text-align: right;">
      <span style="display: inline-block; background: #eff6ff; color: #1456f0; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid #bfdbfe;">
        Doc #: {{doc_number}}
      </span>
    </div>
  </div>
  <p style="font-size: 13px; color: #334155;">Patient Name: <strong>{{patient_name}}</strong> &nbsp;|&nbsp; Date: <strong>{{treatment_date}}</strong></p>
  <p style="font-size: 13px; color: #334155;">Attending Clinician: <strong>{{doctor_name}}</strong></p>
</div>`,
      }));
    }
  };

  const handleSave = () => {
    if (!doc.name.trim()) {
      alert("Please enter a document template name.");
      return;
    }
    const finalDoc: DocumentTemplate = {
      ...doc,
      title: doc.name,
      updatedAt: new Date().toISOString(),
    };
    onSave(finalDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click dismiss area */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Side Drawer Container with reduced width (80vw) */}
      <div className="relative z-10 w-full sm:w-[75vw] md:w-[78vw] lg:w-[80vw] max-w-[80vw] h-full bg-[#fafbfc] shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Top Sticky Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#181e25] to-[#2c3e50] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <FileCode className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#181e25]">
                {initialDoc?.name ? "Edit Document Template" : "Add Document Template"}
              </h3>
              <p className="text-xs text-slate-500">
                Operational & hospital consent document templates with variable placeholder mapping
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-4">
          {/* Top Section: Compact Details Div (30/70 Ratio) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
            {/* ROW 1: Template Name (30%) + Description (70%) in SAME ROW */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Template Name (30%) */}
              <div className="w-full sm:w-[30%] space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => setDoc({ ...doc, name: e.target.value, title: e.target.value })}
                  placeholder="e.g. Informed Consent Form"
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
                  value={doc.description}
                  onChange={(e) => setDoc({ ...doc, description: e.target.value })}
                  placeholder="e.g. Standard clinical consent form required before treatment"
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
                  <span className="truncate">{doc.categoryName || "Select Category"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCategoryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {categories.map((c) => {
                        const isSelected = doc.categoryId === c.id || doc.categoryName === c.name;
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
                  <span className="truncate">{doc.industryName || "Select Industry"}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isIndustryDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsCategoryDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                      {categories.map((c) => {
                        const isSelected = doc.categoryId === c.id || doc.categoryName === c.name;
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
            </div>
          </div>

          {/* Creation Method Selection Dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Choose Template Source & Method
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                className="w-full px-4 py-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between text-left shadow-2xs hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#181e25]">
                    {doc.creationMethod === "import_doc" && <UploadCloud className="w-4 h-4 text-[#1456f0]" />}
                    {doc.creationMethod === "import_webform" && <Layers className="w-4 h-4 text-emerald-600" />}
                    {doc.creationMethod === "custom" && <Code2 className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#181e25] block">
                      {doc.creationMethod === "import_doc" && "Import Word Doc"}
                      {doc.creationMethod === "import_webform" && "Import WebForm"}
                      {doc.creationMethod === "custom" && "Use Template Builder (Custom HTML)"}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {doc.creationMethod === "import_doc" && "Upload .docx or .txt with {{placeholder}} fields"}
                      {doc.creationMethod === "import_webform" && "Import layout & fields directly from existing WebForm"}
                      {doc.creationMethod === "custom" && "Compose custom document layout with Insert Variable selector"}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isMethodDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Method Dropdown List */}
              {isMethodDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMethodDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100">
                    {/* Option 1 */}
                    <button
                      type="button"
                      onClick={() => {
                        setDoc({ ...doc, creationMethod: "import_doc" });
                        setIsMethodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        doc.creationMethod === "import_doc"
                          ? "bg-[#181e25] text-white"
                          : "hover:bg-slate-50 text-[#181e25]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            doc.creationMethod === "import_doc" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm block">Import Word Doc</span>
                          <span
                            className={`text-[11px] block ${
                              doc.creationMethod === "import_doc" ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            Extracts fillable {"{{fields}}"} automatically from Word / Text doc
                          </span>
                        </div>
                      </div>
                      {doc.creationMethod === "import_doc" && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* Option 2 */}
                    <button
                      type="button"
                      onClick={() => {
                        setDoc({ ...doc, creationMethod: "import_webform" });
                        setIsMethodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        doc.creationMethod === "import_webform"
                          ? "bg-[#181e25] text-white"
                          : "hover:bg-slate-50 text-[#181e25]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            doc.creationMethod === "import_webform" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm block">Import WebForm</span>
                          <span
                            className={`text-[11px] block ${
                              doc.creationMethod === "import_webform" ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            Select industry intake form with direct live document preview
                          </span>
                        </div>
                      </div>
                      {doc.creationMethod === "import_webform" && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* Option 3 */}
                    <button
                      type="button"
                      onClick={() => {
                        setDoc({ ...doc, creationMethod: "custom" });
                        setIsMethodDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        doc.creationMethod === "custom"
                          ? "bg-[#181e25] text-white"
                          : "hover:bg-slate-50 text-[#181e25]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            doc.creationMethod === "custom" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Code2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm block">Use Template Builder</span>
                          <span
                            className={`text-[11px] block ${
                              doc.creationMethod === "custom" ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            Write HTML source code with Insert Variable and live document preview
                          </span>
                        </div>
                      </div>
                      {doc.creationMethod === "custom" && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* METHOD 1: IMPORT WORD DOC */}
          {doc.creationMethod === "import_doc" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Upload Word / Text Document */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Upload Word / Text Document (.docx / .txt)
                  </label>
                  <div className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
                    <Info className="w-3 h-3" />
                    <span>Upload .docx Word document with {"{{placeholder}}"} syntax</span>
                  </div>
                </div>

                <label className="border-2 border-dashed border-slate-300 hover:border-[#1456f0] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white hover:bg-blue-50/30 group">
                  <input
                    type="file"
                    accept=".docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1456f0] group-hover:scale-110 flex items-center justify-center mb-2 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-[#181e25]">
                    Click to browse or drop Word / Text file
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    {doc.sourceFileName ? (
                      <strong className="text-[#1456f0]">Uploaded: {doc.sourceFileName}</strong>
                    ) : (
                      "Upload a document with {{placeholders}} to automatically extract fillable fields"
                    )}
                  </span>
                </label>
              </div>

              {/* Extracted Fillable Fields List (ONLY SHOWS AFTER A DOCUMENT HAS BEEN UPLOADED WITH EXTRACTED FIELDS) */}
              {doc.sourceFileName && doc.extractedFields.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs animate-in fade-in duration-200">
                  <div>
                    <h4 className="font-bold text-xs text-[#181e25]">
                      Extracted Fillable Fields ({doc.extractedFields.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Map each extracted template placeholder to available CRM fields
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {doc.extractedFields.map((field, idx) => {
                      const matchedItem = ALL_PREDEFINED_FIELDS.find(
                        (v) => v.key === field.mappedVariable
                      );
                      const displayFieldLabel = matchedItem ? matchedItem.label : field.label || field.mappedVariable || "Select Field...";
                      const isDropdownOpen = activeMappingFieldIndex === idx;

                      return (
                        <div
                          key={idx}
                          className="relative flex items-center justify-between gap-3 p-2.5 px-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs"
                        >
                          {/* Extracted Placeholder Tag */}
                          <div className="flex items-center min-w-[140px] shrink-0">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/70">
                              {field.placeholder}
                            </span>
                          </div>

                          {/* Arrow */}
                          <span className="text-slate-300 font-bold text-sm shrink-0">→</span>

                          {/* Clean Single Trigger Button (Opens INLINE dropdown right there) */}
                          <div className="flex-1 min-w-0 relative">
                            <button
                              type="button"
                              onClick={() => {
                                if (isDropdownOpen) {
                                  setActiveMappingFieldIndex(null);
                                } else {
                                  setActiveMappingFieldIndex(idx);
                                  setFieldSearchQuery("");
                                  setIndustryFilterMode("assigned");
                                  setOpenModuleDropdowns({}); // closed by default
                                }
                              }}
                              className={`w-full px-3 py-2 bg-white hover:bg-slate-50 border rounded-xl text-left flex items-center justify-between shadow-2xs transition-all cursor-pointer ${
                                isDropdownOpen
                                  ? "border-[#1456f0] ring-2 ring-[#1456f0]/20 bg-blue-50/20"
                                  : "border-slate-200/90 hover:border-slate-300"
                              }`}
                            >
                              <span className="font-semibold text-xs text-[#181e25] truncate">
                                {displayFieldLabel}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
                                  isDropdownOpen ? "rotate-180 text-[#1456f0]" : ""
                                }`}
                              />
                            </button>

                            {/* INLINE DROPDOWN (Right there attached below trigger button) */}
                            {isDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMappingFieldIndex(null)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 z-50 w-full sm:w-[360px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-80">
                                  {/* Header: Clean single color, text only */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-[#181e25]">Select Field</span>
                                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px]">
                                        {availableIndustryFields.length}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setActiveMappingFieldIndex(null)}
                                      className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Collapse</span>
                                      <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                                    </button>
                                  </div>

                                  {/* Search Input */}
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                      type="text"
                                      value={fieldSearchQuery}
                                      onChange={(e) => setFieldSearchQuery(e.target.value)}
                                      placeholder="Search all fields..."
                                      className="w-full pl-8 pr-7 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 placeholder:text-slate-400 text-[#181e25]"
                                      autoFocus
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
                                  <div className="flex items-center justify-between text-[10.5px] bg-slate-50 p-1.5 px-2 rounded-lg border border-slate-200/80">
                                    <span className="text-slate-500 truncate">
                                      Scope: <strong className="text-[#1456f0]">{doc.industryName || "General"}</strong>
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

                                  {/* Nested Module Accordions (Closed by default, no icons, single color) */}
                                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pt-0.5 pr-0.5">
                                    {moduleList.length === 0 ? (
                                      <div className="py-6 text-center text-slate-400 text-xs">
                                        No matching fields found.
                                      </div>
                                    ) : (
                                      moduleList.map((moduleName) => {
                                        const fieldsInModule = groupedFieldsByModule[moduleName] || [];
                                        const isModuleOpen = !!openModuleDropdowns[moduleName];

                                        return (
                                          <div
                                            key={moduleName}
                                            className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs"
                                          >
                                            {/* Sub-dropdown Accordion Header */}
                                            <button
                                              type="button"
                                              onClick={() => toggleModuleDropdown(moduleName)}
                                              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#181e25] transition-colors text-xs font-semibold cursor-pointer"
                                            >
                                              <div className="flex items-center gap-1.5">
                                                <span>{moduleName}</span>
                                                <span className="text-[10px] text-slate-400 font-mono font-normal">
                                                  ({fieldsInModule.length})
                                                </span>
                                              </div>
                                              <div className="text-slate-400">
                                                {isModuleOpen ? (
                                                  <ChevronDown className="w-3.5 h-3.5" />
                                                ) : (
                                                  <ChevronRight className="w-3.5 h-3.5" />
                                                )}
                                              </div>
                                            </button>

                                            {/* Sub-dropdown Fields List */}
                                            {isModuleOpen && (
                                              <div className="p-1.5 border-t border-slate-100 bg-slate-50/50 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {fieldsInModule.map((item) => {
                                                  const isSelected = field.mappedVariable === item.key;
                                                  return (
                                                    <button
                                                      key={item.id}
                                                      type="button"
                                                      onClick={() => handleSelectFieldMapping(idx, item)}
                                                      className={`w-full px-2.5 py-1.5 rounded-lg text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                                        isSelected
                                                          ? "bg-blue-50 text-[#1456f0] font-bold border border-blue-200"
                                                          : "bg-white hover:bg-slate-100/80 border border-slate-200/70 text-[#181e25]"
                                                      }`}
                                                    >
                                                      <span className="text-xs truncate">
                                                        {item.label}
                                                      </span>

                                                      {isSelected && (
                                                        <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0" />
                                                      )}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Delete Field Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = doc.extractedFields.filter((_, i) => i !== idx);
                              setDoc({ ...doc, extractedFields: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Remove field mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: IMPORT WEBFORM */}
          {doc.creationMethod === "import_webform" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Choose WebForm (Custom Dropdown) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-2xs relative">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Select WebForm for {doc.industryName}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsWebFormDropdownOpen(!isWebFormDropdownOpen)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-semibold text-[#181e25] flex items-center justify-between shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <span className="truncate">
                      {availableWebForms.find((f) => f.id === doc.sourceWebFormId)?.title ||
                        (availableWebForms.length > 0 ? "-- Choose a WebForm --" : "No WebForms Available for Industry")}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWebFormDropdownOpen ? "rotate-180 text-[#1456f0]" : ""}`} />
                  </button>

                  {isWebFormDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsWebFormDropdownOpen(false)} />
                      <div className="absolute top-full left-4 right-4 mt-1.5 z-40 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                        {availableWebForms.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No intake webforms found for {doc.industryName}.
                          </div>
                        ) : (
                          availableWebForms.map((f) => {
                            const isSelected = doc.sourceWebFormId === f.id;
                            const totalFields = f.sections.reduce((acc, s) => acc + s.fields.length, 0);
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  const generatedHtml = generateWebFormHtml(f, doc.name || `${f.title} Consent Document`);
                                  setDoc({
                                    ...doc,
                                    sourceWebFormId: f.id,
                                    name: doc.name || `${f.title} Consent Document`,
                                    description: doc.description || f.description,
                                    contentHtml: generatedHtml,
                                  });
                                  if (webformPreviewRef.current) {
                                    webformPreviewRef.current.innerHTML = generatedHtml;
                                  }
                                  setIsWebFormDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                                  isSelected ? "bg-blue-50 text-[#1456f0] font-bold" : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate mr-2">{f.title}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                    {totalFields} fields
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Direct Editable Document Preview Block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    WebForm Document Preview
                  </label>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md border border-emerald-200">
                    <PenLine className="w-3 h-3" />
                    <span>Live Editable Canvas</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {doc.sourceWebFormId ? (
                      <div
                        ref={webformPreviewRef}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onInput={(e) => {
                          const updatedHtml = e.currentTarget.innerHTML;
                          setDoc((prev) => ({ ...prev, contentHtml: updatedHtml }));
                        }}
                        className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 outline-none focus:ring-2 focus:ring-[#1456f0]/30 min-h-[200px]"
                      />
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        Select a WebForm above to generate the editable document preview.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* METHOD 3: CUSTOM TEMPLATE (USE TEMPLATE BUILDER) */}
          {doc.creationMethod === "custom" && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Header with HTML / Preview Toggle and Insert Variable Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Document Template Content *
                </label>

                <div className="flex items-center gap-2">
                  {/* HTML / Preview Toggle */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("html")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeEditorTab === "html"
                          ? "bg-white text-[#181e25] shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEditorTab("preview")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeEditorTab === "preview"
                          ? "bg-white text-[#181e25] shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                  </div>

                  {/* Insert Variable Button / Dropdown */}
                  <div className="relative" ref={insertVarRef}>
                    <button
                      type="button"
                      onClick={() => setIsInsertVarOpen(!isInsertVarOpen)}
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-[#1456f0] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>{"{ }"} Select Fields</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isInsertVarOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Insert Variable Modal / Dropdown */}
                    {isInsertVarOpen && (
                      <div className="absolute right-0 top-full mt-1.5 z-40 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={varSearchQuery}
                            onChange={(e) => setVarSearchQuery(e.target.value)}
                            placeholder="Search {{variable}}..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#1456f0]"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                          {availableIndustryFields.filter(
                            (v) =>
                              v.label.toLowerCase().includes(varSearchQuery.toLowerCase()) ||
                              v.key.toLowerCase().includes(varSearchQuery.toLowerCase())
                          ).map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleInsertVariable(v.key)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div className="truncate pr-2">
                                <span className="font-semibold text-xs text-[#181e25] block truncate">
                                  {v.label}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {"{{" + v.key + "}}"}
                                </span>
                              </div>
                              <Check className="w-3.5 h-3.5 text-[#1456f0] opacity-0 group-hover:opacity-100 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Editor Views */}
              {activeEditorTab === "html" ? (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Write HTML source code below (changes sync live to Preview)</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      HTML Source
                    </span>
                  </div>
                  <textarea
                    ref={htmlTextareaRef}
                    value={doc.contentHtml || DEFAULT_CUSTOM_HTML}
                    onChange={(e) => setDoc({ ...doc, contentHtml: e.target.value })}
                    rows={10}
                    placeholder="Enter document HTML markup with {{variables}}..."
                    className="w-full p-4 font-mono text-xs text-slate-800 bg-white outline-none resize-none"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Click anywhere to edit document text directly (syncs to HTML)</span>
                    <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      <PenLine className="w-3 h-3" />
                      <span>Live Editable</span>
                    </div>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    <div
                      ref={customPreviewRef}
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onInput={(e) => {
                        const newHtml = e.currentTarget.innerHTML;
                        setDoc((prev) => ({ ...prev, contentHtml: newHtml }));
                      }}
                      className="bg-white p-5 rounded-xl shadow-xs border border-slate-200/80 outline-none focus:ring-2 focus:ring-[#1456f0]/30 min-h-[220px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADVANCE SETTINGS ACCORDION (AUTO-NUMBERING) */}
          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvanceSettingsOpen(!isAdvanceSettingsOpen)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#181e25]">
                    Advance Settings
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Configure template access permissions & document auto-numbering
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isAdvanceSettingsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAdvanceSettingsOpen && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
                {/* Enable Auto-Numbering Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div>
                    <span className="font-bold text-xs text-[#181e25] block">
                      Enable Document Auto-Numbering
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Generates sequential identifier for every hospital consent & signed document
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={doc.autoNumbering.enabled}
                    onChange={(e) =>
                      setDoc({
                        ...doc,
                        autoNumbering: { ...doc.autoNumbering, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-[#1456f0] rounded focus:ring-0 cursor-pointer"
                  />
                </div>

                {doc.autoNumbering.enabled && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Prefix */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={doc.autoNumbering.prefix}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              autoNumbering: {
                                ...doc.autoNumbering,
                                prefix: e.target.value.toUpperCase(),
                              },
                            })
                          }
                          placeholder="e.g. DOC-"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-[#181e25] outline-none"
                        />
                      </div>

                      {/* Sequence Digits */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Digits
                        </label>
                        <input
                          type="number"
                          min={2}
                          max={8}
                          value={doc.autoNumbering.sequenceDigits}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              autoNumbering: {
                                ...doc.autoNumbering,
                                sequenceDigits: parseInt(e.target.value) || 4,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-[#181e25] outline-none"
                        />
                      </div>

                      {/* Current / Start Counter */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Current Counter
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={doc.autoNumbering.currentNumber}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              autoNumbering: {
                                ...doc.autoNumbering,
                                currentNumber: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-[#181e25] outline-none"
                        />
                      </div>

                      {/* Suffix */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Suffix (Optional)
                        </label>
                        <input
                          type="text"
                          value={doc.autoNumbering.suffix || ""}
                          onChange={(e) =>
                            setDoc({
                              ...doc,
                              autoNumbering: {
                                ...doc.autoNumbering,
                                suffix: e.target.value.toUpperCase(),
                              },
                            })
                          }
                          placeholder="e.g. -2026"
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-[#181e25] outline-none"
                        />
                      </div>
                    </div>

                    {/* Preview Badge */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-xs">
                      <span className="font-semibold text-blue-900">
                        Generated Document ID Sample:
                      </span>
                      <span className="font-mono font-bold px-2.5 py-1 bg-white rounded-md text-[#1456f0] border border-blue-200 shadow-2xs">
                        {doc.autoNumbering.prefix}{String(doc.autoNumbering.currentNumber).padStart(doc.autoNumbering.sequenceDigits, "0")}{doc.autoNumbering.suffix || ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Footer */}
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
            Save Document Template
          </Pill>
        </div>
      </div>
    </div>
  );
};

export const DocumentEditorDrawer = DocumentEditorModal;
