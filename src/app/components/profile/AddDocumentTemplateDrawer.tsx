import React, { useState, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, Settings, Sparkles, AlertCircle, Loader2 } from "lucide-react";
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

const SYSTEM_FIELDS_OPTIONS = [
  { key: "name", label: "Client Full Name" },
  { key: "email", label: "Email Address" },
  { key: "phone", label: "Phone Number" },
  { key: "companyName", label: "Company Name" },
  { key: "jobPosition", label: "Job Position / Title" },
  { key: "location", label: "Location / Address" },
  { key: "responsible", label: "Responsible Staff Member" },
  { key: "status", label: "Client Status" },
  { key: "date", label: "Current Date" },
];

export default function AddDocumentTemplateDrawer({
  isOpen,
  onClose,
  onTemplateCreated,
}: AddDocumentTemplateDrawerProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fieldMappings, setFieldMappings] = useState<DocumentTemplateFieldMapping[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Field manager state
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);

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
            toast.success(`Successfully extracted text from Word file "${file.name}"!`);
          }
        } catch (err) {
          console.error("Mammoth extraction error:", err);
          setFileError("Failed to extract text from Word document. Please ensure it is a valid .docx file.");
          toast.error("Failed to parse Word document.");
        } finally {
          setIsExtracting(false);
        }
      };
      reader.onerror = () => {
        setIsExtracting(false);
        setFileError("Failed to read file.");
        toast.error("File reader error.");
      };
      reader.readAsArrayBuffer(file);
    } else {
      // .txt file
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
      toast.error("Please enter template body or upload a template file");
      return;
    }

    const extracted = extractTemplateFields(templateText);
    const newTemplate: DocumentTemplate = {
      id: `tpl-${Date.now()}`,
      name: templateName.trim(),
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
        subtitle="Upload Word / Text document and map fillable {fields}"
        icon={<FileText className="w-5 h-5 text-blue-600" />}
        width="max-w-2xl"
        zIndex={700}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Template</span>
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-0.5">Template Placeholder Format</p>
              <p className="text-blue-700 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
                Use <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">{"{field_name}"}</code> syntax inside your document text (e.g. <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded">{"{client_name}"}</code>, <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded">{"{email}"}</code>). All variables will be extracted automatically below for field mapping.
              </p>
            </div>
          </div>

          {/* Form Inputs */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Template Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Patient Onboarding Agreement"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Word Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Upload Word Document (.docx / .txt)
            </label>
            <label className="p-4 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl bg-gray-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center cursor-pointer transition-colors">
              {isExtracting ? (
                <div className="flex flex-col items-center py-2 text-blue-600">
                  <Loader2 className="w-6 h-6 animate-spin mb-1" />
                  <span className="text-xs font-semibold">Extracting Word content via Mammoth.js...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-blue-600 mb-1.5" />
                  <span className="text-xs font-semibold text-gray-800">
                    {fileName ? `Loaded: ${fileName}` : "Click to browse or drop Word / Text file"}
                  </span>
                  <span className="text-[11px] text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Extracts fillable {"{fields}"} automatically
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
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Editor */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Document Template Content (with {"{placeholders}"}) *
            </label>
            <textarea
              rows={7}
              required
              placeholder="Paste or write document template content here with {client_name}, {email}, {phone}, {date}..."
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* Mapping Table */}
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Extracted Fillable Fields ({fieldMappings.length})
                </h3>
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Map each extracted template field to system or custom client profile fields
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFieldManagerOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Fields</span>
              </button>
            </div>

            {fieldMappings.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>No {"{fields}"} detected yet. Add <code className="bg-amber-100 px-1 rounded">{"{field_name}"}</code> placeholders in the template content above.</span>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
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
                      <tr key={m.templateField} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-3 py-2 font-mono text-blue-600 font-bold">
                          {"{"}{m.templateField}{"}"}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={m.mappedFieldKey}
                            onChange={(e) => handleMappingChange(m.templateField, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md bg-white text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {SYSTEM_FIELDS_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label} ({opt.key})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DrawerShell>

      {fieldManagerOpen && (
        <SelectFieldsModal
          initiallySelected={SYSTEM_FIELDS_OPTIONS.map((s) => s.key)}
          onlyModules={["client"]}
          onClose={() => setFieldManagerOpen(false)}
          onApply={() => setFieldManagerOpen(false)}
        />
      )}
    </>
  );
}
