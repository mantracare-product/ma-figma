import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud, FileText, CheckCircle2, Settings, AlertCircle, Loader2,
  LayoutTemplate, Layers, ChevronDown, ChevronRight, Check, Users, Hash, X, Search, Plus,
  Sparkles, RotateCcw, Code, Eye
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import {
  DocumentTemplate,
  DocumentTemplateFieldMapping,
  saveDocumentTemplate,
  extractTemplateFields,
} from "../../../lib/documentTemplatesStore";
import { CreateFieldModal } from "../help/FieldManager";
import {
  useFieldRegistry,
  FieldModule,
  ALL_MODULES,
  MODULE_NOUN,
} from "../../context/FieldRegistryContext";
import DrawerShell from "../ui/DrawerShell";

interface AddDocumentTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: (template: DocumentTemplate) => void;
}

const SYSTEM_FIELDS_BY_MODULE = [
  {
    module: "CLIENTS",
    fields: [
      { key: "name", label: "Client Full Name" },
      { key: "status", label: "Client Status" },
      { key: "email", label: "Email Address" },
      { key: "phone", label: "Phone Number" },
      { key: "location", label: "Location / Address" },
      { key: "companyName", label: "Company Name" },
      { key: "jobPosition", label: "Job Position / Title" },
      { key: "role", label: "Role / Job Title" },
      { key: "language", label: "Language" },
      { key: "country", label: "Country" },
      { key: "responsible", label: "Responsible Staff Member" },
      { key: "consent_signature", label: "Consent / E-Signature" },
      { key: "allergies", label: "Clinical Allergies" },
      { key: "medical_notes", label: "Medical / Clinical Notes" },
      { key: "emergency_contact", label: "Emergency Contact" },
      { key: "notes", label: "Client Notes" },
    ],
  },
  {
    module: "PROCESSES & DEALS",
    fields: [
      { key: "process_name", label: "Process Name" },
      { key: "stage", label: "Process Stage" },
      { key: "deal_value", label: "Deal Value" },
    ],
  },
  {
    module: "APPOINTMENTS",
    fields: [
      { key: "appointment_date", label: "Appointment Date" },
      { key: "appointment_time", label: "Appointment Time" },
      { key: "appointment_type", label: "Appointment Type" },
      { key: "provider", label: "Provider / Specialist" },
    ],
  },
  {
    module: "CALLS",
    fields: [
      { key: "call_duration", label: "Call Duration" },
      { key: "call_sentiment", label: "Call Sentiment" },
    ],
  },
  {
    module: "SERVICES & PRODUCTS",
    fields: [
      { key: "service_name", label: "Service Offered" },
      { key: "price", label: "Service Price" },
      { key: "tax_rate", label: "Tax Rate (%)" },
    ],
  },
  {
    module: "ORGANIZATIONS",
    fields: [
      { key: "org_name", label: "Organization Name" },
      { key: "tax_id", label: "Tax ID / Registration" },
      { key: "payment_terms", label: "Payment Terms" },
    ],
  },
  {
    module: "SYSTEM METADATA",
    fields: [
      { key: "date", label: "Current Date / Submission Date" },
    ],
  },
];

const SYSTEM_FIELDS_OPTIONS = SYSTEM_FIELDS_BY_MODULE.flatMap((group) =>
  group.fields.map((f) => ({ key: f.key, label: f.label, module: group.module }))
);

const AVAILABLE_WEBFORMS = [
  {
    id: "wf-1",
    title: "Client Intake & Consent WebForm",
    category: "Medical / Intake",
    fields: ["client_name", "email", "phone", "location", "consent_signature", "date"],
    sampleText: `CLIENT INTAKE & CONSENT WEBFORM

Client Details:
Full Name: {client_name}
Email Address: {email}
Phone Number: {phone}
Address / Location: {location}
Submission Date: {date}

Consent & Authorization:
I hereby confirm that I have reviewed and agreed to the services and terms outlined.
Client Signature: {consent_signature}
Assigned Staff: {responsible}`,
  },
  {
    id: "wf-2",
    title: "KYC & Identity Verification WebForm",
    category: "Identification",
    fields: ["client_name", "email", "phone", "company_name", "job_position", "id_number", "date"],
    sampleText: `KYC & IDENTITY VERIFICATION WEBFORM

Identity Information:
Client Name: {client_name}
Email: {email}
Phone: {phone}
Company Name: {company_name}
Job Title: {job_position}
Verification Date: {date}

Verification Details:
Document Verified By Officer: {responsible}
Status: Verified`,
  },
  {
    id: "wf-3",
    title: "Medical History Intake WebForm",
    category: "Medical / Intake",
    fields: ["client_name", "phone", "allergies", "medical_notes", "emergency_contact", "date"],
    sampleText: `MEDICAL HISTORY INTAKE WEBFORM

Patient Info:
Name: {client_name}
Phone: {phone}
Intake Date: {date}

Clinical History:
Allergies: {allergies}
Medical Notes: {medical_notes}
Emergency Contact: {emergency_contact}
Attending Specialist: {responsible}`,
  },
  {
    id: "wf-4",
    title: "Financial Clearance WebForm",
    category: "Financial",
    fields: ["client_name", "email", "company_name", "tax_id", "payment_terms", "date"],
    sampleText: `FINANCIAL CLEARANCE WEBFORM

Billing & Financial Info:
Client Name: {client_name}
Company Name: {company_name}
Email: {email}
Tax ID / Registration: {tax_id}
Payment Terms: {payment_terms}
Clearance Date: {date}
Financial Officer: {responsible}`,
  },
];

const TEMPLATE_MODE_OPTIONS = [
  {
    id: "device",
    title: "Import Word Doc",
    icon: UploadCloud,
  },
  {
    id: "webforms",
    title: "Import WebForm",
    icon: Layers,
  },
  {
    id: "canvas",
    title: "Use Template Builder",
    icon: LayoutTemplate,
  },
];

// MappedFieldSelector custom popover component for table rows with expandable categories
function MappedFieldSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (newKey: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Find currently selected option definition
  const selectedOpt = SYSTEM_FIELDS_OPTIONS.find((o) => o.key === value) || {
    key: value,
    label: value,
    module: "CLIENTS",
  };

  // State to track which module category is expanded. Default to the category of current value.
  const [expandedCategory, setExpandedCategory] = useState<string | null>(selectedOpt.module || "CLIENTS");

  // Keep expanded category synced when value changes or popover opens
  useEffect(() => {
    if (isOpen && selectedOpt.module) {
      setExpandedCategory(selectedOpt.module);
    }
  }, [isOpen, selectedOpt.module]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 focus:outline-none transition-all cursor-pointer shadow-2xs"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-bold text-slate-900 truncate">
            {selectedOpt.label}
          </span>
          <span className="text-[11px] font-mono text-slate-400 font-medium shrink-0">
            ({selectedOpt.key})
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left p-1.5 animate-in fade-in-50 zoom-in-95 duration-100 max-h-72 overflow-y-auto"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <div className="space-y-1">
              {SYSTEM_FIELDS_BY_MODULE.map((group) => {
                const isExpanded = expandedCategory === group.module;
                const hasSelected = group.fields.some((f) => f.key === value);

                return (
                  <div key={group.module} className="border border-slate-100 rounded-xl overflow-hidden">
                    {/* Category Header Button */}
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? null : group.module)}
                      className={`w-full px-2.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${isExpanded
                          ? "bg-slate-100 text-slate-900 font-bold"
                          : hasSelected
                            ? "bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100/80"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold tracking-wider uppercase">
                          {group.module}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isExpanded ? "rotate-180 text-slate-700" : ""
                          }`}
                      />
                    </button>

                    {/* Fields List (ONLY shown when category is selected / expanded) */}
                    {isExpanded && (
                      <div className="p-1 space-y-0.5 bg-slate-50/50 border-t border-slate-100 animate-in fade-in-50 duration-100">
                        {group.fields.map((opt) => {
                          const isSelected = value === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                onChange(opt.key);
                                setIsOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between group cursor-pointer ${isSelected
                                  ? "bg-[#1F2937] text-white font-bold shadow-xs"
                                  : "hover:bg-slate-200/60 text-slate-800"
                                }`}
                            >
                              <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                                {opt.label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-mono ${isSelected ? "text-slate-300" : "text-slate-400 group-hover:text-slate-600"}`}>
                                  ({opt.key})
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AddDocumentTemplateDrawer({
  isOpen,
  onClose,
  onTemplateCreated,
}: AddDocumentTemplateDrawerProps) {
  // Mode Selection: "device" | "webforms" | "canvas"
  const [templateMode, setTemplateMode] = useState<"device" | "webforms" | "canvas">("device");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fieldMappings, setFieldMappings] = useState<DocumentTemplateFieldMapping[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Webform selection state
  const [selectedWebFormId, setSelectedWebFormId] = useState<string>("");
  const [webformDropdownOpen, setWebformDropdownOpen] = useState(false);

  // Select Fields Dropdown Popover State (Form Builder style)
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFieldsForDropdown, setSelectedFieldsForDropdown] = useState<string[]>([]);
  const [collapsedDropdownSections, setCollapsedDropdownSections] = useState<Record<string, boolean>>({});
  const [createFieldModalOpenFor, setCreateFieldModalOpenFor] = useState<FieldModule | null>(null);

  const { getAllFields } = useFieldRegistry();

  // Compile fields grouped by module
  const targetModules: Exclude<FieldModule, "deal">[] = ALL_MODULES;
  const groupedFieldsList = targetModules.map((module) => {
    const fields = getAllFields(module).filter((f) =>
      f.label.toLowerCase().includes(fieldSearchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(fieldSearchQuery.toLowerCase())
    );
    return {
      module,
      label: MODULE_NOUN[module]?.plural.toUpperCase() || module.toUpperCase(),
      fields,
    };
  }).filter((g) => g.fields.length > 0);

  const totalFilteredCount = groupedFieldsList.reduce((acc, curr) => acc + curr.fields.length, 0);

  const toggleDropdownSection = (module: string) => {
    setCollapsedDropdownSections((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  // Template Builder Tab State: HTML vs Preview
  const [editorTab, setEditorTab] = useState<"html" | "preview">("html");
  const previewEditableRef = useRef<HTMLDivElement>(null);

  // Keep preview container in sync when switching tabs or external updates
  useEffect(() => {
    if (editorTab === "preview" && previewEditableRef.current) {
      if (previewEditableRef.current.innerHTML !== templateText) {
        previewEditableRef.current.innerHTML = templateText || "";
      }
    }
  }, [editorTab, templateText]);

  const handleApplyDropdownFields = () => {
    if (selectedFieldsForDropdown.length === 0) {
      setFieldDropdownOpen(false);
      return;
    }
    const variablesText = selectedFieldsForDropdown.map((k) => `{${k}}`).join(" ");
    setTemplateText((prev) => {
      const updated = prev ? `${prev} ${variablesText}` : variablesText;
      if (previewEditableRef.current && editorTab === "preview") {
        previewEditableRef.current.innerHTML = updated;
      }
      return updated;
    });
    toast.success(`Inserted ${selectedFieldsForDropdown.length} field placeholder${selectedFieldsForDropdown.length !== 1 ? "s" : ""}!`);
    setSelectedFieldsForDropdown([]);
    setFieldDropdownOpen(false);
  };

  // Advance Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usersSectionOpen, setUsersSectionOpen] = useState(false);
  const [autoNumberDrawerOpen, setAutoNumberDrawerOpen] = useState(false);

  // Template Users Settings
  const AVAILABLE_TEAM_ROLES = [
    "Admin", "Doctor", "Nurse", "Receptionist", "Finance Officer", "Case Manager", "All Staff"
  ];
  const [templateUsers, setTemplateUsers] = useState<string[]>(["All Staff"]);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);

  // Auto-Numbering Settings
  const NUMBER_FORMAT_TOKENS = [
    { id: "NUMBER", label: "Number", token: "{NUMBER}" },
    { id: "YEAR", label: "Year (YYYY)", token: "{YEAR}" },
    { id: "MONTH", label: "Month (MM)", token: "{MONTH}" },
    { id: "DAY", label: "Day (DD)", token: "{DAY}" },
    { id: "PREFIX", label: "Prefix (DOC)", token: "{PREFIX}" },
    { id: "CLIENT_ID", label: "Client ID", token: "{CLIENT_ID}" },
    { id: "COMPANY_ID", label: "Company ID", token: "{COMPANY_ID}" },
    { id: "RANDOM", label: "Random (4-digit)", token: "{RANDOM}" },
  ];
  const [numberFormat, setNumberFormat] = useState("DOC-{YEAR}-{NUMBER}");
  const [startNumber, setStartNumber] = useState("1");
  const [incrementBy, setIncrementBy] = useState("1");
  const [numberLength, setNumberLength] = useState("4");
  const [paddingChar, setPaddingChar] = useState("0");
  const [activityPeriod, setActivityPeriod] = useState("Continuously");
  const [crossCompany, setCrossCompany] = useState(false);

  const getSimulatedNumber = (format: string, start: string, len: string, pad: string) => {
    const numVal = parseInt(start, 10) || 1;
    const lengthVal = parseInt(len, 10) || 0;
    const padChar = pad || "0";
    const paddedNum = lengthVal > 0 ? String(numVal).padStart(lengthVal, padChar) : String(numVal);

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const fmt = format || "DOC-{YEAR}-{NUMBER}";

    return fmt
      .replace(/\{NUMBER\}/gi, paddedNum)
      .replace(/\{YEAR\}/gi, year)
      .replace(/\{MONTH\}/gi, month)
      .replace(/\{DAY\}/gi, day)
      .replace(/\{RANDOM\}/gi, "8429")
      .replace(/\{PREFIX\}/gi, "DOC")
      .replace(/\{ID\}/gi, "104")
      .replace(/\{COMPANY_ID\}/gi, "ORG")
      .replace(/\{CLIENT_ID\}/gi, "CL-902");
  };

  const handleInsertToken = (tokenStr: string) => {
    setNumberFormat((prev) => {
      if (!prev) return tokenStr;
      if (prev.endsWith("-") || prev.endsWith("_") || prev.endsWith("/")) {
        return `${prev}${tokenStr}`;
      }
      return `${prev}-${tokenStr}`;
    });
  };

  const toggleTemplateUser = (role: string) => {
    setTemplateUsers((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Extract fields automatically whenever templateText changes
  useEffect(() => {
    const extracted = extractTemplateFields(templateText);
    setFieldMappings((prev) => {
      return extracted.map((field) => {
        const existing = prev.find((p) => p.templateField === field);
        if (existing) return existing;

        const lower = field.toLowerCase();
        let defaultKey = "name";
        let defaultLabel = "Client Full Name";

        if (lower.includes("email")) {
          defaultKey = "email"; defaultLabel = "Email Address";
        } else if (lower.includes("phone") || lower.includes("mobile")) {
          defaultKey = "phone"; defaultLabel = "Phone Number";
        } else if (lower.includes("company") || lower.includes("org")) {
          defaultKey = "companyName"; defaultLabel = "Company Name";
        } else if (lower.includes("title") || lower.includes("position") || lower.includes("role")) {
          defaultKey = "jobPosition"; defaultLabel = "Job Position / Title";
        } else if (lower.includes("address") || lower.includes("location") || lower.includes("city")) {
          defaultKey = "location"; defaultLabel = "Location / Address";
        } else if (lower.includes("responsible") || lower.includes("agent") || lower.includes("officer")) {
          defaultKey = "responsible"; defaultLabel = "Responsible Staff Member";
        } else if (lower.includes("status")) {
          defaultKey = "status"; defaultLabel = "Client Status";
        } else if (lower.includes("date") || lower.includes("time")) {
          defaultKey = "date"; defaultLabel = "Current Date";
        }

        return {
          templateField: field,
          mappedFieldKey: defaultKey,
          label: defaultLabel,
        };
      });
    });
  }, [templateText]);

  if (!isOpen) return null;

  // File upload from device handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileError(null);
    if (!templateName) {
      setTemplateName(file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
    }

    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    if (isDocx) {
      setIsExtracting(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const extractedText = result.value;

          if (!extractedText || !extractedText.trim()) {
            setFileError("Word document contains no extractable plain text.");
            toast.error("Word document contains no text.");
          } else {
            setTemplateText(extractedText);
            toast.success(`Extracted text from "${file.name}"!`);
          }
        } catch (err) {
          console.error("Mammoth extraction error:", err);
          setFileError("Failed to extract text from Word document.");
          toast.error("Failed to parse Word document.");
        } finally {
          setIsExtracting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          setTemplateText(text);
          toast.success(`Loaded content from "${file.name}"!`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Webform import handler
  const handleSelectWebform = (wfId: string) => {
    setSelectedWebFormId(wfId);
    const wf = AVAILABLE_WEBFORMS.find((w) => w.id === wfId);
    if (wf) {
      setTemplateText(wf.sampleText);
      if (!templateName) setTemplateName(wf.title);
      toast.success(`Loaded template content from "${wf.title}"!`);
    }
  };

  // Insert Rich Content Helpers into Canvas
  const insertCanvasElement = (snippet: string) => {
    setTemplateText((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  const handleMappingChange = (field: string, newMappedKey: string) => {
    const option = SYSTEM_FIELDS_OPTIONS.find((o) => o.key === newMappedKey);
    setFieldMappings((prev) =>
      prev.map((m) =>
        m.templateField === field
          ? {
            ...m,
            mappedFieldKey: newMappedKey,
            label: option ? option.label : newMappedKey,
          }
          : m
      )
    );
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!templateText.trim()) {
      toast.error("Please enter template content or import a document");
      return;
    }

    const extracted = extractTemplateFields(templateText);
    const newTemplate: DocumentTemplate = {
      id: `tpl-${Date.now()}`,
      name: templateName.trim(),
      category: "General",
      fileName: fileName || `${templateName.trim().toLowerCase().replace(/\s+/g, "_")}.docx`,
      templateText: templateText.trim(),
      extractedFields: extracted,
      fieldMappings,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      createdBy: "Admin User",
    };

    saveDocumentTemplate(newTemplate);
    toast.success(`Document Template "${newTemplate.name}" saved!`);
    if (onTemplateCreated) onTemplateCreated(newTemplate);
    onClose();
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="Add Document Template"
        icon={<FileText className="w-5 h-5 text-slate-700" />}
        width="max-w-3xl"
        zIndex={700}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Template</span>
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Template Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Patient Onboarding Agreement"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-500"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>

          {/* Custom Modern Dropdown for Template Source & Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Choose Template Source & Method
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setModeDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 focus:outline-none transition-all cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {(() => {
                  const currentOpt = TEMPLATE_MODE_OPTIONS.find((o) => o.id === templateMode) || TEMPLATE_MODE_OPTIONS[0];
                  const IconComp = currentOpt.icon;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-800">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{currentOpt.title}</span>
                    </div>
                  );
                })()}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${modeDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Custom Popover Dropdown Menu */}
              {modeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setModeDropdownOpen(false)} />
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <div className="space-y-1">
                      {TEMPLATE_MODE_OPTIONS.map((opt) => {
                        const IconComp = opt.icon;
                        const isSelected = templateMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setTemplateMode(opt.id as any);
                              setModeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${isSelected
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "hover:bg-slate-100 text-slate-800"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-white"
                                  }`}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>{opt.title}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MODE 1: DEVICE UPLOAD (ONLY shown when templateMode === 'device') */}
          {templateMode === "device" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Upload Word / Text Document (.docx / .txt)
              </label>
              <label className="p-5 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl bg-slate-50/60 hover:bg-slate-100/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                {isExtracting ? (
                  <div className="flex flex-col items-center py-2 text-slate-700">
                    <Loader2 className="w-6 h-6 animate-spin mb-1 text-slate-800" />
                    <span className="text-xs font-semibold">Extracting document content...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-7 h-7 text-slate-700 mb-1.5" />
                    <span className="text-xs font-bold text-slate-900">
                      {fileName ? `Loaded: ${fileName}` : "Click to browse or drop Word / Text file"}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Extracts fillable {"{fields}"} automatically into template content
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept=".docx,.txt,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isExtracting}
                />
              </label>
              {fileError && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: IMPORT FROM WEBFORMS (Custom Popover Selector) */}
          {templateMode === "webforms" && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                Select Available WebForm
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setWebformDropdownOpen((v) => !v)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 focus:outline-none transition-all cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {(() => {
                    const selectedWf = AVAILABLE_WEBFORMS.find((w) => w.id === selectedWebFormId);
                    if (selectedWf) {
                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-800">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{selectedWf.title}</p>
                            <p className="text-[11px] text-slate-500">{selectedWf.category} • {selectedWf.fields.length} fillable fields</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <span className="text-xs font-semibold text-slate-400">
                        Select a webform to generate document template...
                      </span>
                    );
                  })()}
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${webformDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Popover Dropdown Menu */}
                {webformDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setWebformDropdownOpen(false)} />
                    <div
                      className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <div className="space-y-1">
                        {AVAILABLE_WEBFORMS.map((wf) => {
                          const isSelected = selectedWebFormId === wf.id;
                          return (
                            <button
                              key={wf.id}
                              type="button"
                              onClick={() => {
                                handleSelectWebform(wf.id);
                                setWebformDropdownOpen(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${isSelected
                                  ? "bg-slate-900 text-white font-bold shadow-xs"
                                  : "hover:bg-slate-100 text-slate-800"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-white"
                                    }`}
                                >
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>{wf.title}</p>
                                  <p className={`text-[11px] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                                    {wf.category} • {wf.fields.length} fillable fields
                                  </p>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Document Template Content — HTML / Preview Editor (Only visible when Canvas is selected) */}
          {templateMode === "canvas" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="block text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Document Template Content *
                  </label>

                  {/* Two Tabs: HTML and Preview */}
                  <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditorTab("html")}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        editorTab === "html"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>HTML</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorTab("preview");
                        if (previewEditableRef.current) {
                          previewEditableRef.current.innerHTML = templateText || "";
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        editorTab === "preview"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* Toolbar: Select Fields Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setFieldDropdownOpen((v) => !v)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <span className="font-mono text-blue-600 font-bold">{"{ }"}</span>
                      <span>Select Fields</span>
                      <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${fieldDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Form Builder Style Select Fields Dropdown Popover */}
                    {fieldDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFieldDropdownOpen(false)} />
                        <div
                          className="absolute right-0 top-full mt-1.5 w-[460px] max-w-[85vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-100 flex flex-col max-h-[480px]"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {/* Dropdown Header */}
                          <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                Select Fields
                              </h4>
                              <p className="text-[10px] text-slate-500">Insert placeholder variables into your HTML template</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFieldDropdownOpen(false)}
                              className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Search Input */}
                          <div className="p-2.5 border-b border-slate-100 flex-shrink-0 bg-white">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={fieldSearchQuery}
                                onChange={(e) => setFieldSearchQuery(e.target.value)}
                                placeholder="Search fields across all categories..."
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              />
                            </div>
                          </div>

                          {/* Collapsible Modules List */}
                          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0 bg-[#fafafa]">
                            {groupedFieldsList.map((group) => {
                              const isCollapsed = !!collapsedDropdownSections[group.module];
                              return (
                                <div key={group.module} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                                  <button
                                    type="button"
                                    onClick={() => toggleDropdownSection(group.module)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                  >
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                      {group.label} ({group.fields.length})
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                                  </button>

                                  {!isCollapsed && (
                                    <div className="p-2 space-y-1.5">
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {group.fields.map((f) => {
                                          const isChecked = selectedFieldsForDropdown.includes(f.key);
                                          return (
                                            <label
                                              key={`${group.module}-${f.key}`}
                                              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border select-none ${
                                                isChecked ? "bg-blue-50/70 border-blue-200" : "hover:bg-slate-50 border-transparent"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  if (e.target.checked) {
                                                    setSelectedFieldsForDropdown((prev) => [...prev, f.key]);
                                                  } else {
                                                    setSelectedFieldsForDropdown((prev) => prev.filter((k) => k !== f.key));
                                                  }
                                                }}
                                                className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                                              />
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[11px] font-semibold text-slate-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                                  {f.label}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-mono">
                                                  {"{"}{f.key}{"}"}
                                                </span>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>

                                      <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setCreateFieldModalOpenFor(group.module as FieldModule)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-dashed border-blue-200 transition-colors cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Create Field</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {totalFilteredCount === 0 && (
                              <div className="text-center py-6 text-xs text-slate-400">
                                No fields found matching your search.
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                            <span className="text-xs text-slate-600 font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              {selectedFieldsForDropdown.length} selected
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFieldDropdownOpen(false)}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyDropdownFields}
                                disabled={selectedFieldsForDropdown.length === 0}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                  selectedFieldsForDropdown.length > 0
                                    ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                <span>APPLY</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Editor Block: HTML Tab vs Live Preview Tab */}
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white">
                {editorTab === "html" ? (
                  <>
                    {/* Minimal label bar for HTML */}
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border-b border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Write your HTML template source below
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-200 rounded font-mono">HTML</span>
                    </div>
                    <textarea
                      rows={10}
                      required
                      placeholder={`<p>Dear <strong>{client_name}</strong>,</p>\n<p>Email: {email} | Phone: {phone}</p>\n<p>Date: {date}</p>`}
                      value={templateText}
                      onChange={(e) => setTemplateText(e.target.value)}
                      className="w-full px-4 py-3 bg-white text-slate-800 text-xs font-mono focus:outline-none leading-relaxed resize-none"
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <>
                    {/* Live Editable Preview */}
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Live Editable Preview
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Click and edit text directly — changes sync to HTML)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded font-mono">
                        PREVIEW
                      </span>
                    </div>
                    <div
                      ref={previewEditableRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const html = e.currentTarget.innerHTML;
                        setTemplateText(html);
                      }}
                      onBlur={(e) => {
                        const html = e.currentTarget.innerHTML;
                        setTemplateText(html);
                      }}
                      className="w-full min-h-[220px] max-h-[380px] overflow-y-auto overflow-x-auto px-5 py-4 bg-white text-slate-900 text-sm focus:outline-none leading-relaxed font-sans cursor-text prose prose-slate max-w-full break-words [&_*]:max-w-full [&_table]:w-full [&_table]:table-auto [&_td]:break-all [&_th]:break-words [&_pre]:overflow-x-auto [&_code]:break-all"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </>
                )}
              </div>
            </div>
          )}


          {/* Field Mapping Table (Only visible when Import from Device is selected) */}
          {templateMode === "device" && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Extracted Fillable Fields ({fieldMappings.length})
                </h3>
                <p className="text-xs text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Map each extracted template field to system or custom client profile fields
                </p>
              </div>

              {fieldMappings.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
                  <span>No {"{fields}"} detected yet. Add <code className="bg-slate-200 px-1 rounded font-bold">{"{field_name}"}</code> placeholders in the template content above.</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: "#1F2937", height: "40px" }} className="text-white">
                        <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Extracted Placeholder
                        </th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Mapped Client Field
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldMappings.map((m, idx) => (
                        <tr key={m.templateField} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="px-3 py-2 font-mono text-slate-900 font-bold">
                            {"{"}{m.templateField}{"}"}
                          </td>
                          <td className="px-3 py-2">
                            <MappedFieldSelector
                              value={m.mappedFieldKey}
                              onChange={(newKey) => handleMappingChange(m.templateField, newKey)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Advance Settings Section ─── */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            {/* Main Advance Settings Header */}
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1F2937] flex items-center justify-center shadow-xs">
                  <Settings className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Advance Settings</p>
                  <p className="text-[11px] text-slate-500">Configure template access permissions & document auto-numbering</p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Advance Settings Dropdown Content */}
            {settingsOpen && (
              <div className="p-4 space-y-3.5 border-t border-slate-200 bg-slate-50/50 animate-in fade-in-50 duration-150">

                {/* ── Sub-setting 1: Template Users Dropdown ── */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div
                    onClick={() => setUsersSectionOpen((v) => !v)}
                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-700">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Template Users
                          </p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                            {templateUsers.length === 0 ? "None" : templateUsers.includes("All Staff") ? "All Staff" : `${templateUsers.length} role${templateUsers.length > 1 ? "s" : ""}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Select which team roles are allowed to use this template
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          usersSectionOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Template Users Collapsible Details */}
                  {usersSectionOpen && (
                    <div className="p-4 border-t border-slate-100 bg-white space-y-3 animate-in fade-in-50 duration-150">
                      <p className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Assign role permissions for creating and generating documents with this template:
                      </p>

                      {/* Multi-select Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setUsersDropdownOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 transition-all cursor-pointer shadow-2xs"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                            {templateUsers.length === 0 ? (
                              <span className="text-xs text-slate-400">Select team roles...</span>
                            ) : (
                              templateUsers.map((role) => (
                                <span
                                  key={role}
                                  className="flex items-center gap-1 px-2 py-0.5 bg-[#1F2937] text-white text-[11px] font-semibold rounded-full"
                                >
                                  {role}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleTemplateUser(role); }}
                                    className="hover:text-red-300 transition-colors cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 transition-transform ${usersDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {usersDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setUsersDropdownOpen(false)} />
                            <div
                              className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block border-b border-slate-100 mb-1">
                                SELECT ROLES — MULTI SELECT
                              </span>
                              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                                {AVAILABLE_TEAM_ROLES.map((role) => {
                                  const isSelected = templateUsers.includes(role);
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => toggleTemplateUser(role)}
                                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${isSelected
                                          ? "bg-[#1F2937] text-white"
                                          : "hover:bg-slate-100 text-slate-800"
                                        }`}
                                    >
                                      <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                                        {role}
                                      </span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Sub-setting 2: Auto-Numbering Settings (Opens small drawer) ── */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div
                    onClick={() => setAutoNumberDrawerOpen(true)}
                    className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/80 transition-colors cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-700 group-hover:bg-[#1F2937] group-hover:text-white transition-colors">
                        <Hash className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                            Auto-Numbering Settings
                          </p>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 truncate max-w-[120px]">
                            {numberFormat || "{NUMBER}"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Configure automated document numbering format, counters & rules
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 hidden sm:inline-block" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Configure
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </DrawerShell>

      {/* ─── Auto-Numbering Settings Small Drawer ─── */}
      <DrawerShell
        isOpen={autoNumberDrawerOpen}
        onClose={() => setAutoNumberDrawerOpen(false)}
        title="Auto-Numbering Settings"
        subtitle="Configure sequential document numbering for this template"
        icon={<Hash className="w-5 h-5 text-slate-700" />}
        width="max-w-md"
        zIndex={800}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setAutoNumberDrawerOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoNumberDrawerOpen(false);
                toast.success("Auto-numbering settings applied");
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Save Settings
            </button>
          </div>
        }
      >
        <div className="space-y-5" style={{ fontFamily: "Outfit, sans-serif" }}>
          
          {/* Subtle Output Preview Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Generated Number Preview
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Live Output
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-slate-900 py-1 tracking-wide">
              {getSimulatedNumber(numberFormat, startNumber, numberLength, paddingChar)}
            </div>
            <p className="text-[11px] text-slate-500">
              Next document created with this template will follow this format.
            </p>
          </div>

          {/* Number Format Pattern */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Number Format Pattern
              </label>
              {numberFormat !== "DOC-{YEAR}-{NUMBER}" && (
                <button
                  type="button"
                  onClick={() => setNumberFormat("DOC-{YEAR}-{NUMBER}")}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Reset to default
                </button>
              )}
            </div>

            <input
              type="text"
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value)}
              placeholder="DOC-{YEAR}-{NUMBER}"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-slate-400 text-slate-900 bg-white shadow-2xs"
            />

            {/* Subtle Variable Badges */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-500 font-medium block">
                Insert variables:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {NUMBER_FORMAT_TOKENS.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    onClick={() => handleInsertToken(token.token)}
                    className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shadow-2xs"
                  >
                    + {token.token}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Format Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Year + Number", format: "DOC-{YEAR}-{NUMBER}" },
                { label: "Sequential Only", format: "DOC-{NUMBER}" },
                { label: "Year & Month", format: "{YEAR}{MONTH}-{NUMBER}" },
                { label: "Client Code", format: "CL-{CLIENT_ID}-{NUMBER}" },
              ].map((preset) => {
                const isActive = numberFormat === preset.format;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNumberFormat(preset.format)}
                    className={`px-3 py-2 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-slate-100 border-slate-400 text-slate-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sequence & Step Counter */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-800 block">
              Sequence & Digits
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-600 block">Start Number</span>
                <input
                  type="number"
                  min="0"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-600 block">Increment By</span>
                <input
                  type="number"
                  min="1"
                  value={incrementBy}
                  onChange={(e) => setIncrementBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-600 block">Minimum Digits (Padding)</span>
                <select
                  value={numberLength}
                  onChange={(e) => setNumberLength(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 text-slate-900 bg-white cursor-pointer"
                >
                  <option value="0">No padding (1, 2...)</option>
                  <option value="3">3 digits (001, 002...)</option>
                  <option value="4">4 digits (0001, 0002...)</option>
                  <option value="5">5 digits (00001, 00002...)</option>
                  <option value="6">6 digits (000001, 000002...)</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-600 block">Padding Character</span>
                <input
                  type="text"
                  maxLength={1}
                  value={paddingChar}
                  onChange={(e) => setPaddingChar(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Reset Period & Scope */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">
                Reset Frequency
              </label>
              <select
                value={activityPeriod}
                onChange={(e) => setActivityPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400 text-slate-900 bg-white cursor-pointer"
              >
                <option value="Continuously">Continuously (Never reset sequence)</option>
                <option value="Daily">Daily (Reset each day)</option>
                <option value="Monthly">Monthly (Reset each month)</option>
                <option value="Yearly">Yearly (Reset each year)</option>
                <option value="Per Process">Per Process</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={crossCompany}
                onChange={(e) => setCrossCompany(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-700">
                Use continuous numbering across all my companies
              </span>
            </label>
          </div>

        </div>
      </DrawerShell>

      {createFieldModalOpenFor && (
        <CreateFieldModal
          lockModule={createFieldModalOpenFor}
          onClose={() => setCreateFieldModalOpenFor(null)}
          onCreated={(newField) => {
            setSelectedFieldsForDropdown((prev) => [...prev, newField.key]);
            setCreateFieldModalOpenFor(null);
            toast.success(`Created field "${newField.label}" ({${newField.key}})`);
          }}
        />
      )}
    </>
  );
}
