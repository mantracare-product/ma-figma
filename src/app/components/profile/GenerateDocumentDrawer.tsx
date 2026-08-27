import React, { useState, useEffect } from "react";
import {
  Search, Plus, FileText, CheckCircle2, ArrowRight, ShieldCheck, Printer,
  Loader2, User, Building, Mail, Phone, MapPin, Download, ChevronDown, Check,
  Sparkles, FileCode, RefreshCw, FileSpreadsheet, Share2, Database, Mic, Info
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
import { loadClientSubmissions, ClientFormSubmission } from "../../../data/submissionsStore";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
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

  // Source selection state ("current" | "webform_{id}" | "transcript_{id}")
  const [selectedSourceId, setSelectedSourceId] = useState<string>("current");
  const [selectedSourceType, setSelectedSourceType] = useState<"current" | "webform" | "transcript">("current");
  const [sourceTypeDropdownOpen, setSourceTypeDropdownOpen] = useState(false);
  const [recordDropdownOpen, setRecordDropdownOpen] = useState(false);

  // Loading state when generating document
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Field Values Map (key -> editable value)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Download Dropdown State
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [showAddTemplateDrawer, setShowAddTemplateDrawer] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  // WebForm submissions for dropdown
  const allSubmissions = loadClientSubmissions();
  const clientSubmissions = allSubmissions.filter(
    (s) =>
      s.clientId === client.id ||
      s.fields["Full Name"]?.toLowerCase() === client.name.toLowerCase() ||
      s.fields["Email"]?.toLowerCase() === client.email.toLowerCase()
  );
  const webformSources = clientSubmissions.length > 0 ? clientSubmissions : allSubmissions.slice(0, 4);

  // Scribe sessions for dropdown
  const allScribeSessions = getScribeSessions();
  const clientScribeSessions = allScribeSessions.filter(
    (s) =>
      s.clientName.toLowerCase().includes(client.name.toLowerCase()) ||
      client.name.toLowerCase().includes(s.clientName.toLowerCase().split(" ")[0])
  );
  const transcriptSources = clientScribeSessions.length > 0 ? clientScribeSessions : allScribeSessions.slice(0, 4);

  // Listen to template store updates
  useEffect(() => {
    const handleUpdate = () => setTemplates(getStoredDocumentTemplates());
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    return () => window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
  }, []);

  // Helper to compute field values for a specific source ID
  const getSourceFieldValues = (sourceId: string, tpl: DocumentTemplate | null): Record<string, string> => {
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const defaultValues: Record<string, string> = {
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

    if (sourceId.startsWith("webform_")) {
      const subId = sourceId.replace("webform_", "");
      const sub = loadClientSubmissions().find((s) => s.id === subId);
      if (sub) {
        const wfValues: Record<string, string> = {
          ...defaultValues,
          client_name: sub.fields["Full Name"] || sub.fields["Name"] || client.name,
          name: sub.fields["Full Name"] || sub.fields["Name"] || client.name,
          email: sub.fields["Email"] || client.email,
          phone: sub.fields["Phone"] || sub.fields["Phone Number"] || client.phone,
          company_name: sub.fields["Company"] || sub.fields["Company Name"] || client.companyName || "",
          job_position: sub.fields["Job Title"] || sub.fields["Job Position"] || client.jobPosition || "",
          location: sub.fields["Location"] || sub.fields["Address"] || client.location || "",
          medical_notes: sub.fields["Medical History"] || sub.fields["Message"] || "WebForm submission response",
          allergies: sub.fields["Allergies"] || "None Reported",
        };
        Object.entries(sub.fields).forEach(([k, v]) => {
          const snakeKey = k.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          wfValues[snakeKey] = v;
        });
        return wfValues;
      }
    }

    if (sourceId.startsWith("transcript_")) {
      const sessionId = sourceId.replace("transcript_", "");
      const session = getScribeSessions().find((s) => s.id === sessionId);
      if (session) {
        const medSummary = session.extractedData.medications && session.extractedData.medications.length > 0
          ? session.extractedData.medications.map((m) => `${m.name || m.drugName} ${m.dosage} (${m.frequency})`).join("; ")
          : "Take medicines as prescribed";

        return {
          ...defaultValues,
          client_name: session.clientName || client.name,
          name: session.clientName || client.name,
          responsible: session.doctorName || client.responsible || "Dr. Priya Sharma",
          doctor_name: session.doctorName || "Dr. Priya Sharma",
          chief_complaint: session.extractedData.chiefComplaint || "Visual impairment",
          diagnosis: session.extractedData.diagnosis || "Nuclear Cataract",
          icd10_code: session.extractedData.icd10Code || "H25.13",
          medications: medSummary,
          medical_notes: `Diagnosis: ${session.extractedData.diagnosis || "Nuclear Cataract"}. Chief complaint: "${session.extractedData.chiefComplaint || "Visual impairment"}". Prescribed: ${medSummary}.`,
          advice: session.extractedData.advice ? session.extractedData.advice.join(". ") : "Rest eyes and take medication as prescribed.",
          follow_up_date: session.extractedData.followUpDate || "14 days",
          investigations: session.extractedData.investigations ? session.extractedData.investigations.join(", ") : "Visual Acuity",
          vitals: session.extractedData.vitals
            ? `BP: ${session.extractedData.vitals.bloodPressure || '120/80'}, HR: ${session.extractedData.vitals.heartRate || '72 bpm'}`
            : "BP 120/80, HR 72 bpm",
        };
      }
    }

    return defaultValues;
  };

  const getSourceTypeFromId = (id: string): "current" | "webform" | "transcript" => {
    if (id.startsWith("webform_")) return "webform";
    if (id.startsWith("transcript_")) return "transcript";
    return "current";
  };

  // Handler for source record selection
  const handleSourceChange = (newSourceId: string) => {
    setSelectedSourceId(newSourceId);
    setSelectedSourceType(getSourceTypeFromId(newSourceId));
    const newVals = getSourceFieldValues(newSourceId, selectedTemplate);

    if (selectedTemplate?.extractedFields) {
      selectedTemplate.extractedFields.forEach((field) => {
        if (!newVals[field]) {
          newVals[field] = (client as any)[field] || field.replace(/_/g, " ");
        }
      });
    }

    setFieldValues(newVals);

    if (newSourceId === "current") {
      toast.info("Filled document fields from Client Profile Data");
    } else if (newSourceId.startsWith("webform_")) {
      const subId = newSourceId.replace("webform_", "");
      toast.success(`Filled document fields from WebForm Response #${subId}`);
    } else if (newSourceId.startsWith("transcript_")) {
      const sessionId = newSourceId.replace("transcript_", "");
      toast.success(`Filled document fields from AI Scribe Transcript #${sessionId}`);
    }
  };

  // Handler for source type category selection (Step 1)
  const handleSourceTypeChange = (newType: "current" | "webform" | "transcript") => {
    setSelectedSourceType(newType);
    if (newType === "current") {
      handleSourceChange("current");
    } else if (newType === "webform") {
      if (webformSources.length > 0) {
        handleSourceChange(`webform_${webformSources[0].id}`);
      } else {
        handleSourceChange("current");
      }
    } else if (newType === "transcript") {
      if (transcriptSources.length > 0) {
        handleSourceChange(`transcript_${transcriptSources[0].id}`);
      } else {
        handleSourceChange("current");
      }
    }
  };

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

    const initialValues = getSourceFieldValues(selectedSourceId, tpl);

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

  const getSelectedSourceInfo = () => {
    if (selectedSourceId === "current") {
      return {
        title: "Current Profile Data (Default)",
        subtitle: "Pre-filled with system profile fields",
        badge: "PROFILE DATA",
        icon: <User className="w-3.5 h-3.5 text-slate-700" />,
        bgColor: "bg-slate-100",
      };
    }
    if (selectedSourceId.startsWith("webform_")) {
      const subId = selectedSourceId.replace("webform_", "");
      const sub = loadClientSubmissions().find((s) => s.id === subId);
      return {
        title: `WebForm Response #${subId}`,
        subtitle: sub ? `Form #${sub.formId} • Submitted ${sub.submittedAt}` : "WebForm submission response",
        badge: "WEBFORM RESPONSE",
        icon: <FileText className="w-3.5 h-3.5 text-slate-700" />,
        bgColor: "bg-slate-100",
      };
    }
    if (selectedSourceId.startsWith("transcript_")) {
      const sessionId = selectedSourceId.replace("transcript_", "");
      const session = getScribeSessions().find((s) => s.id === sessionId);
      return {
        title: `Transcript #${sessionId}`,
        subtitle: session ? `${session.extractedData.diagnosis || "Clinical Note"} • ${session.createdAt}` : "AI Scribe extraction",
        badge: "AI TRANSCRIPT",
        icon: <Mic className="w-3.5 h-3.5 text-slate-700" />,
        bgColor: "bg-slate-100",
      };
    }
    return {
      title: "Current Profile Data (Default)",
      subtitle: "Pre-filled with system profile fields",
      badge: "PROFILE DATA",
      icon: <User className="w-3.5 h-3.5 text-slate-700" />,
      bgColor: "bg-slate-100",
    };
  };

  const selectedSourceInfo = getSelectedSourceInfo();

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
                    onClick={() => handleSourceChange("current")}
                    className="text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
                    title="Reset to system profile defaults"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                {/* DATA SOURCE SELECTOR (Conditional 2nd Dropdown & Minimal Clean UI with Info Icon) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-700" />
                      <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Auto-Fill From Source
                      </span>
                      <div className="group relative inline-flex items-center">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center font-outfit">
                          Maps and populates template placeholders automatically.
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-800 uppercase tracking-wider"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {selectedSourceInfo.badge}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {/* STEP 1: Select Source Type Category (Custom Styled Popover) */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                          SELECT SOURCE
                        </label>
                        <div className="group relative inline-flex items-center">
                          <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center font-outfit">
                            Choose category of data to pre-fill template placeholders.
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setSourceTypeDropdownOpen(!sourceTypeDropdownOpen);
                            setRecordDropdownOpen(false);
                          }}
                          className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          <span className="truncate">
                            {selectedSourceType === "current" && "Current Profile Data"}
                            {selectedSourceType === "webform" && `WebForm Responses (${webformSources.length})`}
                            {selectedSourceType === "transcript" && `AI Scribe Transcripts (${transcriptSources.length})`}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${sourceTypeDropdownOpen ? "rotate-180 text-slate-700" : ""}`} />
                        </button>

                        {sourceTypeDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setSourceTypeDropdownOpen(false)} />
                            <div
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1 space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleSourceTypeChange("current");
                                  setSourceTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedSourceType === "current" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <span>Current Profile Data</span>
                                {selectedSourceType === "current" && <Check className="w-3.5 h-3.5 text-slate-900" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSourceTypeChange("webform");
                                  setSourceTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedSourceType === "webform" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <span>WebForm Responses ({webformSources.length})</span>
                                {selectedSourceType === "webform" && <Check className="w-3.5 h-3.5 text-slate-900" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSourceTypeChange("transcript");
                                  setSourceTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  selectedSourceType === "transcript" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <span>AI Scribe Transcripts ({transcriptSources.length})</span>
                                {selectedSourceType === "transcript" && <Check className="w-3.5 h-3.5 text-slate-900" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* STEP 2: Select Specific Record (Custom Styled Popover ONLY for webform and transcript) */}
                    {selectedSourceType !== "current" && (
                      <div className="space-y-1 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                            SELECT RECORD
                          </label>
                          <div className="group relative inline-flex items-center">
                            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none text-center font-outfit">
                              Select specific response or session record to extract data.
                            </div>
                          </div>
                        </div>

                        <div className="relative">
                          {selectedSourceType === "webform" && (
                            <>
                              {webformSources.length === 0 ? (
                                <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                                  No WebForm responses available
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecordDropdownOpen(!recordDropdownOpen);
                                      setSourceTypeDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left truncate"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <span className="truncate">
                                      {(() => {
                                        const currentWf = webformSources.find((s) => `webform_${s.id}` === selectedSourceId);
                                        return currentWf ? `WebForm Response #${currentWf.id} (${currentWf.submittedAt})` : "Select WebForm Response";
                                      })()}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${recordDropdownOpen ? "rotate-180 text-slate-700" : ""}`} />
                                  </button>

                                  {recordDropdownOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setRecordDropdownOpen(false)} />
                                      <div
                                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      >
                                        {webformSources.map((wf) => {
                                          const isSelected = selectedSourceId === `webform_${wf.id}`;
                                          return (
                                            <button
                                              key={`wf_${wf.id}`}
                                              type="button"
                                              onClick={() => {
                                                handleSourceChange(`webform_${wf.id}`);
                                                setRecordDropdownOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                                isSelected ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                              }`}
                                            >
                                              <span className="truncate">WebForm Response #{wf.id} ({wf.submittedAt})</span>
                                              {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          {selectedSourceType === "transcript" && (
                            <>
                              {transcriptSources.length === 0 ? (
                                <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
                                  No AI Scribe transcripts available
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecordDropdownOpen(!recordDropdownOpen);
                                      setSourceTypeDropdownOpen(false);
                                    }}
                                    className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer text-left truncate"
                                    style={{ fontFamily: "Outfit, sans-serif" }}
                                  >
                                    <span className="truncate">
                                      {(() => {
                                        const currentTr = transcriptSources.find((s) => `transcript_${s.id}` === selectedSourceId);
                                        return currentTr ? `Transcript #${currentTr.id} — ${currentTr.extractedData.diagnosis || "Clinical Note"}` : "Select Transcript";
                                      })()}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${recordDropdownOpen ? "rotate-180 text-slate-700" : ""}`} />
                                  </button>

                                  {recordDropdownOpen && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setRecordDropdownOpen(false)} />
                                      <div
                                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden p-1 max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-100"
                                        style={{ fontFamily: "Outfit, sans-serif" }}
                                      >
                                        {transcriptSources.map((tr) => {
                                          const isSelected = selectedSourceId === `transcript_${tr.id}`;
                                          return (
                                            <button
                                              key={`tr_${tr.id}`}
                                              type="button"
                                              onClick={() => {
                                                handleSourceChange(`transcript_${tr.id}`);
                                                setRecordDropdownOpen(false);
                                              }}
                                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                                isSelected ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                                              }`}
                                            >
                                              <span className="truncate">Transcript #{tr.id} — {tr.extractedData.diagnosis || "Clinical Note"}</span>
                                              {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0 ml-2" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto">
                  <p className="text-[11px] text-slate-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                    The placeholders below were pre-filled from <strong>{selectedSourceId === "current" ? `${client.name}'s profile data` : selectedSourceId.startsWith("webform_") ? "WebForm submission response" : "AI Scribe transcript extraction"}</strong>. You can manually edit any field value:
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
