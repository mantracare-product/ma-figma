import React, { useState, useEffect } from "react";
import {
  UploadCloud, FileText, CheckCircle2, Settings, AlertCircle, Loader2,
  LayoutTemplate, Layers, ChevronDown, Check, Users, Hash, X
} from "lucide-react";
import { toast } from "sonner";
import mammoth from "mammoth";
import {
  DocumentTemplate,
  DocumentTemplateFieldMapping,
  saveDocumentTemplate,
  extractTemplateFields,
} from "../../../lib/documentTemplatesStore";
import { SelectFieldsModal } from "../help/FieldManager";
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

const VARIABLE_OPTIONS = [
  { category: "Client Variables", items: [
    { key: "{client_name}", label: "Client Full Name" },
    { key: "{email}", label: "Email Address" },
    { key: "{phone}", label: "Phone Number" },
    { key: "{company_name}", label: "Company Name" },
    { key: "{job_position}", label: "Job Position" },
    { key: "{location}", label: "Location / Address" },
    { key: "{status}", label: "Client Status" },
  ]},
  { category: "System & Staff Variables", items: [
    { key: "{responsible}", label: "Responsible Staff" },
    { key: "{current_date}", label: "Current Date" },
    { key: "{organization_name}", label: "Organization Name" },
  ]},
  { category: "Service & Billing Variables", items: [
    { key: "{service_name}", label: "Service Name" },
    { key: "{duration}", label: "Duration" },
    { key: "{price}", label: "Price / Rate" },
    { key: "{tax_rate}", label: "Tax Rate (%)" },
  ]},
];

const TEMPLATE_MODE_OPTIONS = [
  {
    id: "device",
    title: "Import from Device",
    subtitle: "Upload Word (.docx) or Text (.txt) file with auto-extraction",
    icon: UploadCloud,
  },
  {
    id: "webforms",
    title: "Import from WebForms",
    subtitle: "Generate template from pre-built intake webforms & fields",
    icon: Layers,
  },
  {
    id: "canvas",
    title: "Create Canvas Template",
    subtitle: "Build document template using rich editor canvas & variables",
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
                      className={`w-full px-2.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isExpanded
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
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                          isExpanded ? "rotate-180 text-slate-700" : ""
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
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between group cursor-pointer ${
                                isSelected
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

  // WebForm Selection State
  const [selectedWebFormId, setSelectedWebFormId] = useState("");
  const [webformDropdownOpen, setWebformDropdownOpen] = useState(false);

  // Variable Modal / Popover state
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);

  // Template Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Template Users Settings
  const AVAILABLE_TEAM_ROLES = [
    "Admin", "Doctor", "Nurse", "Receptionist", "Finance Officer", "Case Manager", "All Staff"
  ];
  const [templateUsers, setTemplateUsers] = useState<string[]>(["All Staff"]);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);

  // Auto-Numbering Settings
  const NUMBER_FORMAT_TOKENS = [
    { id: "NUMBER", label: "Sequential numbers", token: "{NUMBER}" },
    { id: "DAY", label: "Current day", token: "{DAY}" },
    { id: "MONTH", label: "Current month", token: "{MONTH}" },
    { id: "YEAR", label: "Current year", token: "{YEAR}" },
    { id: "RANDOM", label: "Random number", token: "{RANDOM}" },
    { id: "PREFIX", label: "Prefix", token: "{PREFIX}" },
    { id: "ID", label: "ID", token: "{ID}" },
    { id: "COMPANY_ID", label: "My company ID", token: "{COMPANY_ID}" },
    { id: "CLIENT_ID", label: "Client ID", token: "{CLIENT_ID}" },
  ];
  const [numberFormat, setNumberFormat] = useState("{NUMBER}");
  const [activeTokens, setActiveTokens] = useState<string[]>(["NUMBER"]);
  const [startNumber, setStartNumber] = useState("1");
  const [incrementBy, setIncrementBy] = useState("1");
  const [numberLength, setNumberLength] = useState("0");
  const [paddingChar, setPaddingChar] = useState("0");
  const [activityPeriod, setActivityPeriod] = useState("Continuously");
  const [crossCompany, setCrossCompany] = useState(false);

  const handleInsertToken = (token: { id: string; token: string }) => {
    if (!activeTokens.includes(token.id)) {
      setActiveTokens((prev) => [...prev, token.id]);
    } else {
      setActiveTokens((prev) => prev.filter((t) => t !== token.id));
    }
    // Build format string from active tokens
    const newTokens = activeTokens.includes(token.id)
      ? activeTokens.filter((t) => t !== token.id)
      : [...activeTokens, token.id];
    const format = newTokens
      .map((id) => NUMBER_FORMAT_TOKENS.find((t) => t.id === id)?.token || "")
      .join("-");
    setNumberFormat(format || "{NUMBER}");
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

  const insertVariable = (variableKey: string) => {
    setTemplateText((prev) => `${prev}${variableKey}`);
    setShowVariableModal(false);
    toast.info(`Inserted ${variableKey}`);
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
        subtitle="Create reusable document templates using device import, webforms, or rich canvas editor"
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
                className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-left hover:border-slate-400 focus:outline-none transition-all cursor-pointer shadow-2xs"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {(() => {
                  const currentOpt = TEMPLATE_MODE_OPTIONS.find((o) => o.id === templateMode) || TEMPLATE_MODE_OPTIONS[0];
                  const IconComp = currentOpt.icon;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-800">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{currentOpt.title}</p>
                        <p className="text-[11px] text-slate-500">{currentOpt.subtitle}</p>
                      </div>
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
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white font-bold shadow-xs"
                                : "hover:bg-slate-100 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-white"
                                }`}
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div>
                                <p className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>{opt.title}</p>
                                <p className={`text-[11px] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>{opt.subtitle}</p>
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
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                                isSelected
                                  ? "bg-slate-900 text-white font-bold shadow-xs"
                                  : "hover:bg-slate-100 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-white"
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

          {/* Document Template Content — HTML Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Document Template Content (HTML) *
              </label>

              {/* Toolbar: Insert Variable only (shown in canvas mode) */}
              {templateMode === "canvas" && (
                <div className="flex items-center gap-2">
                  {/* Insert Variable Button & Compact Floating Popover */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowVariableModal((v) => !v)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="font-mono text-blue-600 font-bold">{"{ }"}</span>
                      <span>Insert Variable</span>
                    </button>

                    {/* WhatsApp Template Builder Style Compact Popover */}
                    {showVariableModal && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowVariableModal(false)} />
                        <div
                          className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-100"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              INSERT FIELD VARIABLE
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowVariableModal(false)}
                              className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
                            {VARIABLE_OPTIONS.map((cat) => (
                              <div key={cat.category} className="p-1">
                                <span className="text-[11px] font-bold text-slate-700 px-2 py-1 block">
                                  {cat.category}
                                </span>
                                <div className="space-y-0.5">
                                  {cat.items.map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() => insertVariable(item.key)}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                      <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                                        {item.label}
                                      </span>
                                      <span className="text-[11px] font-mono text-slate-400 group-hover:text-slate-600 font-medium">
                                        {item.key}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* HTML Editor — clean white textarea */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Minimal label bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Write your HTML template below
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
            </div>

            {/* Live HTML Preview (shown when content exists) */}
            {templateText.trim() && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
                </div>
                <div
                  className="px-5 py-4 bg-white text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                  dangerouslySetInnerHTML={{ __html: templateText }}
                />
              </div>
            )}
          </div>


          {/* Field Mapping Table */}
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

          {/* ─── Template Settings Section ─── */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {/* Settings Toggle Header */}
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100/70 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1F2937] flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Template Settings</p>
                  <p className="text-[11px] text-slate-500">Configure template access & document auto-numbering</p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Settings Content */}
            {settingsOpen && (
              <div className="p-5 space-y-6 border-t border-slate-200 bg-white animate-in fade-in-50 duration-150">

                {/* ── Section 1: Template Users ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Template Users
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Select which team roles are allowed to use and generate documents from this template.
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
                          <div className="space-y-0.5">
                            {AVAILABLE_TEAM_ROLES.map((role) => {
                              const isSelected = templateUsers.includes(role);
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => toggleTemplateUser(role)}
                                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                                    isSelected
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

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* ── Section 2: Auto-Numbering Settings ── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Auto-Numbering Settings
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Define how documents generated from this template will be automatically numbered.
                  </p>

                  {/* Number Format Preview + Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Number format
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={numberFormat}
                        onChange={(e) => setNumberFormat(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-slate-500 text-slate-900 bg-white"
                      />
                    </div>
                    {/* Token Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {NUMBER_FORMAT_TOKENS.map((token) => {
                        const isActive = activeTokens.includes(token.id);
                        return (
                          <button
                            key={token.id}
                            type="button"
                            onClick={() => handleInsertToken(token)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                              isActive
                                ? "bg-[#1F2937] text-white border-[#1F2937]"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {token.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start + Increment in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Start sequential numbering with
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={startNumber}
                        onChange={(e) => setStartNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Increment sequential numbers by
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={incrementBy}
                        onChange={(e) => setIncrementBy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Length + Padding in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Sequential number length
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={numberLength}
                        onChange={(e) => setNumberLength(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Padding character
                      </label>
                      <input
                        type="text"
                        maxLength={1}
                        value={paddingChar}
                        onChange={(e) => setPaddingChar(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Activity Period Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Automatic numbering template activity period
                    </label>
                    <select
                      value={activityPeriod}
                      onChange={(e) => setActivityPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500 text-slate-900 bg-white cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <option value="Continuously">Continuously</option>
                      <option value="Daily">Daily (reset each day)</option>
                      <option value="Monthly">Monthly (reset each month)</option>
                      <option value="Yearly">Yearly (reset each year)</option>
                      <option value="Per Process">Per Process</option>
                    </select>
                  </div>

                  {/* Cross-company checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={crossCompany}
                      onChange={(e) => setCrossCompany(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Use continuous numbering across all of my companies
                    </span>
                  </label>
                </div>

              </div>
            )}
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
