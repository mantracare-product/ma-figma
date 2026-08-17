import React, { useState, useEffect } from "react";
import {
  Search, Plus, FileText, CheckCircle2, ArrowRight, ShieldCheck, Printer,
  Loader2, User, Building, Mail, Phone, MapPin, Download, ChevronDown, Check,
  Sparkles, FileCode, RefreshCw, FileSpreadsheet, Share2
} from "lucide-react";
import { toast } from "sonner";
import {
  DocumentTemplate,
  getStoredDocumentTemplates,
  DOCUMENT_TEMPLATES_EVENT,
} from "../../../lib/documentTemplatesStore";
import {
  StoredClientDocument,
  saveClientDocument,
} from "../../../lib/clientDocumentsStore";
import { generateClientPdf } from "../../../lib/pdfGenerator";
import AddDocumentTemplateDrawer from "./AddDocumentTemplateDrawer";
import ShareDocumentDrawer from "./ShareDocumentDrawer";
import DrawerShell from "../ui/DrawerShell";

export interface GenerateDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyName?: string;
    jobPosition?: string;
    location?: string;
    responsible?: string;
    status?: string;
  };
  initialTemplate?: DocumentTemplate | null;
  onDocumentGenerated?: (doc: StoredClientDocument) => void;
}

export default function GenerateDocumentDrawer({
  isOpen,
  onClose,
  client,
  initialTemplate = null,
  onDocumentGenerated,
}: GenerateDocumentDrawerProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(initialTemplate);

  // Loading state when generating document
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Field Values Map (key -> editable value)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Download Dropdown State
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [showAddTemplateDrawer, setShowAddTemplateDrawer] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  // Listen to template store updates
  useEffect(() => {
    const handleUpdate = () => setTemplates(getStoredDocumentTemplates());
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    return () => window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
  }, []);

  // Update selectedTemplate when initialTemplate prop changes
  useEffect(() => {
    if (initialTemplate) {
      handleSelectTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  // When a template is selected, initialize filled field values and simulate loading state
  const handleSelectTemplate = (tpl: DocumentTemplate) => {
    setSelectedTemplate(tpl);
    setIsGeneratingDoc(true);

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const initialValues: Record<string, string> = {
      client_name: client.name || "",
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      company_name: client.companyName || "",
      companyName: client.companyName || "",
      job_position: client.jobPosition || "",
      jobPosition: client.jobPosition || "",
      location: client.location || "",
      responsible: client.responsible || "Staff Member",
      status: client.status || "Active",
      date: dateStr,
      current_date: dateStr,
      consent_signature: client.name || "",
      allergies: "None Reported",
      medical_notes: "Regular Consultation",
      emergency_contact: client.phone || "—",
      tax_id: "TAX-998823",
      payment_terms: "Net 30 Days",
      service_name: "Healthcare Consultation",
      price: "$150.00",
      tax_rate: "5%",
    };

    // Include extracted fields from template
    if (tpl.extractedFields) {
      tpl.extractedFields.forEach((field) => {
        if (!initialValues[field]) {
          initialValues[field] = (client as any)[field] || field.replace(/_/g, " ");
        }
      });
    }

    setFieldValues(initialValues);

    // Simulate 750ms "Generating document..." loader animation
    setTimeout(() => {
      setIsGeneratingDoc(false);
    }, 750);
  };

  // Compute live rendered text based on current fieldValues
  const getRenderedText = (): string => {
    if (!selectedTemplate) return "";
    let text = selectedTemplate.templateText || "";

    // Replace mapped fields
    selectedTemplate.fieldMappings.forEach((m) => {
      const val = fieldValues[m.templateField] || fieldValues[m.mappedFieldKey] || "";
      const regex = new RegExp(`\\{${m.templateField}\\}`, "g");
      text = text.replace(regex, val);
    });

    // Replace all remaining {key} placeholders with fieldValues
    Object.keys(fieldValues).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      text = text.replace(regex, fieldValues[key] || "");
    });

    return text;
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tpl) =>
    tpl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Field change handler
  const handleFieldValueChange = (key: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  };

  // Helper to download document as Word (.docx)
  const downloadAsWordDoc = (docName: string, textContent: string) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Document</title></head><body>";
    const footer = "</body></html>";
    const bodyContent = /<[a-z][\s\S]*>/i.test(textContent)
      ? textContent
      : `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${textContent.replace(/\n/g, "<br/>")}</div>`;
    const html = header + bodyContent + footer;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = docName.endsWith(".docx") ? docName : `${docName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download PDF or DOCX
  const handleDownloadFormat = async (format: "pdf" | "docx") => {
    if (!selectedTemplate) return;
    setDownloadDropdownOpen(false);

    try {
      setIsSaving(true);
      const renderedText = getRenderedText();
      const baseName = `${client.name.replace(/\s+/g, "_")}_${selectedTemplate.name.replace(/\s+/g, "_")}`;

      if (format === "pdf") {
        const pdfResult = await generateClientPdf(selectedTemplate, renderedText, client);
        const blobUrl = URL.createObjectURL(pdfResult.blob);

        const newDoc: StoredClientDocument = {
          id: `doc-${Date.now()}`,
          clientId: client.id,
          name: `${baseName}.pdf`,
          category: "General",
          fileType: "pdf",
          fileSize: `${(pdfResult.blob.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
          uploadedBy: client.responsible || "Admin User",
          status: "Verified",
          notes: `Generated PDF from template: "${selectedTemplate.name}"`,
          templateId: selectedTemplate.id,
          generatedContent: renderedText,
          pdfBase64: pdfResult.base64,
          pdfBlobUrl: blobUrl,
        };

        saveClientDocument(newDoc);

        // Download browser trigger
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${baseName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Downloaded "${baseName}.pdf" & saved to client profile!`);
        if (onDocumentGenerated) onDocumentGenerated(newDoc);
      } else {
        // Download Word DOCX format
        downloadAsWordDoc(`${baseName}.docx`, renderedText);

        const newDoc: StoredClientDocument = {
          id: `doc-${Date.now()}`,
          clientId: client.id,
          name: `${baseName}.docx`,
          category: "General",
          fileType: "doc",
          fileSize: "1.2 MB",
          uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
          uploadedBy: client.responsible || "Admin User",
          status: "Verified",
          notes: `Generated Word doc from template: "${selectedTemplate.name}"`,
          templateId: selectedTemplate.id,
          generatedContent: renderedText,
        };

        saveClientDocument(newDoc);
        toast.success(`Downloaded "${baseName}.docx" & saved to client profile!`);
        if (onDocumentGenerated) onDocumentGenerated(newDoc);
      }
    } catch (err) {
      console.error("Document download failed:", err);
      toast.error("Failed to generate document file.");
    } finally {
      setIsSaving(false);
    }
  };

  // Print Document
  const handlePrintDocument = async () => {
    if (!selectedTemplate) return;
    try {
      const renderedText = getRenderedText();
      const pdfResult = await generateClientPdf(selectedTemplate, renderedText, client);
      const blobUrl = URL.createObjectURL(pdfResult.blob);
      window.open(blobUrl, "_blank");
      toast.info("Opened printable document view");
    } catch (err) {
      toast.error("Failed to prepare printable view.");
    }
  };

  // Extract unique placeholders present in the selected template
  const activePlaceholders = selectedTemplate
    ? Array.from(new Set([
        ...selectedTemplate.extractedFields,
        ...selectedTemplate.fieldMappings.map((m) => m.templateField),
      ]))
    : [];

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="Generate Document from Template"
        subtitle={
          selectedTemplate
            ? "Preview generated document, edit field values, print or download as PDF / DOCX"
            : "Select a document template to populate with client data"
        }
        icon={<FileText className="w-5 h-5 text-slate-700" />}
        width={selectedTemplate ? "max-w-[94vw] lg:max-w-6xl" : "max-w-3xl"}
        zIndex={650}
        footer={
          selectedTemplate ? (
            <div className="flex items-center justify-end w-full">
              <div className="flex items-center gap-3">
                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  disabled={isSaving}
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Document</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={() => setShareDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  disabled={isSaving}
                >
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>Share</span>
                </button>

                {/* Download Dropdown (Download as PDF or DOCX) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDownloadDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1F2937] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-200" />
                        <span>Generating File...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-slate-200" />
                        <span>Download Document</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${downloadDropdownOpen ? "rotate-180" : ""}`} />
                      </>
                    )}
                  </button>

                  {/* Download Format Options Popover Dropdown */}
                  {downloadDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDownloadDropdownOpen(false)} />
                      <div
                        className="absolute right-0 bottom-full mb-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden p-1.5 animate-in fade-in-50 zoom-in-95 duration-100"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block border-b border-slate-100 mb-1">
                          SELECT DOWNLOAD FORMAT
                        </span>
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadFormat("pdf")}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600">Download as PDF</p>
                                <p className="text-[10px] text-slate-400">Formatted Portable Document (.pdf)</p>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadFormat("docx")}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Download as Word</p>
                                <p className="text-[10px] text-slate-400">Editable Word Document (.docx)</p>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {/* Client Info Strip Header */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {client.name}
                  </span>
                  {client.companyName && (
                    <span className="text-[11px] text-slate-500 font-medium px-2 py-0.5 bg-white border border-slate-200 rounded-md truncate">
                      {client.companyName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {client.email}</span>
                  {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {client.phone}</span>}
                  {client.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {client.location}</span>}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-slate-200/80 text-slate-800 font-semibold rounded-lg text-[11px] shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
              Responsible: {client.responsible || "Staff Member"}
            </span>
          </div>

          {!selectedTemplate ? (
            /* STEP 1: Select Template View */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search templates by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddTemplateDrawer(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1F2937] hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors shadow-xs cursor-pointer shrink-0"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Template</span>
                </button>
              </div>

              {/* Templates Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "#1F2937", height: "42px" }} className="text-white">
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Template Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Fillable Fields
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Created Date
                      </th>
                      <th className="px-3 py-2 text-right font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 italic text-sm">
                          No matching document templates found. Click "Create New Template" to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredTemplates.map((tpl, idx) => (
                        <tr
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`cursor-pointer transition-colors hover:bg-slate-100/60 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <td className="px-3 py-3 font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                              <span>{tpl.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600 font-mono">
                            {tpl.extractedFields.length} fillable fields
                          </td>
                          <td className="px-3 py-3 text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {tpl.createdAt}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTemplate(tpl);
                              }}
                              className="px-3 py-1.5 bg-[#1F2937] hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span>Select Template</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* STEP 2: SPLIT SCREEN (Left: Live Document Preview | Right: Filled Editable Fields) */
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* LEFT PANEL: Document Preview Canvas */}
              <div className="col-span-7 space-y-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                    DOCUMENT PREVIEW
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium truncate ml-2">
                    Template: <strong className="text-slate-800">{selectedTemplate.name}</strong>
                  </span>
                </div>

                {/* Loading state OR Document Page Preview */}
                {isGeneratingDoc ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-xs min-h-[420px]">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-3" />
                    <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Generating Document...
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-outfit">
                      Pre-filling template placeholders with {client.name}'s system data
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl bg-white shadow-md p-8 min-h-[480px] animate-in fade-in-50 duration-150 overflow-hidden w-full">
                    {/* Document Content as-is */}
                    <div className="overflow-x-auto max-w-full">
                      {/<[a-z][\s\S]*>/i.test(getRenderedText()) ? (
                        <div
                          className="prose prose-slate max-w-full text-slate-900 leading-relaxed font-sans break-words [&_*]:max-w-full [&_table]:w-full [&_table]:table-auto [&_td]:break-all [&_th]:break-words [&_pre]:overflow-x-auto [&_code]:break-all"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                          dangerouslySetInnerHTML={{ __html: getRenderedText() }}
                        />
                      ) : (
                        <pre
                          className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed font-sans break-words overflow-x-auto max-w-full"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {getRenderedText()}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL: Extracted Filled Fields Editor (Sticky to top) */}
              <div className="col-span-5 space-y-3 min-w-0 sticky top-0 self-start z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                    FILLED FIELDS & VALUES ({activePlaceholders.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(selectedTemplate)}
                    className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
                    title="Reset to system defaults"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                  <p className="text-[11px] text-slate-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                    The placeholders below were pre-filled with {client.name}'s profile data. You can manually edit any field value to update the document in real time:
                  </p>

                  {activePlaceholders.length === 0 ? (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                      No fillable placeholders detected in this template.
                    </div>
                  ) : (
                    activePlaceholders.map((key) => {
                      const displayLabel = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                      const val = fieldValues[key] || "";

                      return (
                        <div key={key} className="space-y-1 bg-white p-2.5 border border-slate-200 rounded-xl">
                          <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                              {displayLabel}
                            </label>
                            <span className="text-[10px] font-mono font-semibold text-slate-400">
                              {"{"}{key}{"}"}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleFieldValueChange(key, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DrawerShell>

      {showAddTemplateDrawer && (
        <AddDocumentTemplateDrawer
          isOpen={showAddTemplateDrawer}
          onClose={() => setShowAddTemplateDrawer(false)}
          onTemplateCreated={(newTpl) => {
            handleSelectTemplate(newTpl);
          }}
        />
      )}

      {shareDrawerOpen && selectedTemplate && (
        <ShareDocumentDrawer
          isOpen={shareDrawerOpen}
          onClose={() => setShareDrawerOpen(false)}
          documentTitle={selectedTemplate.name}
          client={client}
        />
      )}
    </>
  );
}
