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
  extractTemplateFields,
} from "../../../lib/documentTemplatesStore";
import {
  StoredClientDocument,
  saveClientDocument,
} from "../../../lib/clientDocumentsStore";
import { loadClientSubmissions, ClientFormSubmission } from "../../../data/submissionsStore";
import { getScribeSessions, ScribeSession } from "../../../lib/scribeSessionStore";
import { generateClientPdf } from "../../../lib/pdfGenerator";
import { generatePopulatedDocx } from "../../../lib/docxProcessor";
import { renderAsync as renderDocxAsync } from "docx-preview";
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

  const docxContainerRef = React.useRef<HTMLDivElement>(null);
  const previewOuterRef = React.useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.65);

  // Dynamically compute preview scaling so A4 Word documents fit 100% inside container without any edge clipping
  useEffect(() => {
    if (!previewOuterRef.current) return;
    const updateScale = () => {
      if (previewOuterRef.current) {
        const containerWidth = previewOuterRef.current.clientWidth;
        if (containerWidth > 0) {
          // Standard A4 width in docx-preview is 816px. Leave 48px padding
          const targetWidth = Math.max(280, containerWidth - 48);
          const calculatedScale = Math.min(1, Math.max(0.4, Number((targetWidth / 816).toFixed(2))));
          setPreviewScale(calculatedScale);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(previewOuterRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [selectedTemplate?.id, isOpen]);

  // Listen to template store updates
  useEffect(() => {
    const handleUpdate = () => setTemplates(getStoredDocumentTemplates());
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    return () => window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
  }, []);

  const [isDocxRendered, setIsDocxRendered] = useState(false);

  // Render authentic docx with 100% fidelity (backgrounds, logos, colors, tables) via docx-preview
  useEffect(() => {
    let isMounted = true;
    if (isGeneratingDoc) return;

    const renderDocx = async () => {
      if (selectedTemplate?.rawDocxBase64 && docxContainerRef.current) {
        try {
          docxContainerRef.current.innerHTML = "";
          const populatedBlob = await generatePopulatedDocx(
            selectedTemplate.rawDocxBase64,
            fieldValues,
            selectedTemplate.fieldMappings
          );
          if (!isMounted || !docxContainerRef.current) return;
          await renderDocxAsync(populatedBlob, docxContainerRef.current, undefined, {
            className: "docx-doc-viewer",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
          });
          if (isMounted) setIsDocxRendered(true);
        } catch (err) {
          console.error("docx-preview rendering error:", err);
          if (isMounted) setIsDocxRendered(false);
        }
      } else {
        if (isMounted) setIsDocxRendered(false);
      }
    };

    renderDocx();
    return () => {
      isMounted = false;
    };
  }, [selectedTemplate?.id, selectedTemplate?.rawDocxBase64, fieldValues, isGeneratingDoc]);

  // Smart helper to resolve a placeholder name to real client / system / source data
  const resolvePlaceholderValue = (
    rawKey: string,
    clientObj: any,
    sourceValues: Record<string, string>,
    tpl: DocumentTemplate | null
  ): string => {
    // 1. Direct match in sourceValues (e.g. from webform or transcript)
    if (sourceValues[rawKey] !== undefined && sourceValues[rawKey] !== "") {
      return sourceValues[rawKey];
    }
    const rawKeyLower = rawKey.toLowerCase().trim();
    if (sourceValues[rawKeyLower] !== undefined && sourceValues[rawKeyLower] !== "") {
      return sourceValues[rawKeyLower];
    }

    // 2. Check template field mappings if available
    if (tpl?.fieldMappings) {
      const mapping = tpl.fieldMappings.find(
        (m) =>
          m.templateField.toLowerCase().trim() === rawKeyLower ||
          m.mappedFieldKey.toLowerCase().trim() === rawKeyLower
      );
      if (mapping) {
        const mappedVal = sourceValues[mapping.mappedFieldKey] || (clientObj as any)[mapping.mappedFieldKey];
        if (mappedVal) return String(mappedVal);
      }
    }

    // 3. Direct match on clientObj
    if (clientObj[rawKey] !== undefined && clientObj[rawKey] !== null) {
      return String(clientObj[rawKey]);
    }
    if (clientObj[rawKeyLower] !== undefined && clientObj[rawKeyLower] !== null) {
      return String(clientObj[rawKeyLower]);
    }

    // 4. Normalized alias / semantic matching
    const cleaned = rawKeyLower.replace(/[^a-z0-9]/g, "");
    const todayFormatted = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Name matches
    if (
      cleaned === "name" ||
      cleaned === "fullname" ||
      cleaned === "clientname" ||
      cleaned === "patientname" ||
      cleaned === "customername" ||
      cleaned === "patient" ||
      cleaned === "client"
    ) {
      return clientObj.name || "Sarah Johnson";
    }

    // ID matches (Patient ID, PCompanyId, Client ID, etc.)
    if (
      cleaned === "id" ||
      cleaned === "clientid" ||
      cleaned === "patientid" ||
      cleaned === "pcompanyid" ||
      cleaned === "companyid" ||
      cleaned === "pid" ||
      cleaned === "regno" ||
      cleaned === "registrationnumber" ||
      cleaned === "recordid"
    ) {
      return clientObj.id || "CL-001";
    }

    // Voucher / Document / Invoice / Receipt number
    if (
      cleaned.includes("voucher") ||
      cleaned.includes("documentnumber") ||
      cleaned.includes("docnumber") ||
      cleaned.includes("invoicenumber") ||
      cleaned.includes("voucherno") ||
      cleaned.includes("docno") ||
      cleaned.includes("invoiceno") ||
      cleaned.includes("receiptno")
    ) {
      const numericId = String(clientObj.id || "001").replace(/[^0-9]/g, "").padStart(3, "0") || "001";
      return `VCH-${new Date().getFullYear()}-${numericId}`;
    }

    // Age matches
    if (cleaned === "age" || cleaned === "patientage" || cleaned === "clientage") {
      return clientObj.age || (clientObj as any).age || "32";
    }

    // Gender matches
    if (cleaned === "gender" || cleaned === "sex" || cleaned === "patientgender" || cleaned === "clientgender") {
      return clientObj.gender || (clientObj as any).gender || "Female";
    }

    // Date / Bill Date / Voucher Date
    if (
      cleaned.includes("date") ||
      cleaned.includes("bill") ||
      cleaned === "today" ||
      cleaned === "now" ||
      cleaned === "issueddate" ||
      cleaned === "createdat" ||
      cleaned === "submissiondate"
    ) {
      return todayFormatted;
    }

    // Address / Location
    if (
      cleaned.includes("address") ||
      cleaned.includes("location") ||
      cleaned.includes("city") ||
      cleaned.includes("delivery") ||
      cleaned === "companyrequisitedeliveryaddresstext"
    ) {
      return clientObj.location || clientObj.address || "New York, NY";
    }

    // Email
    if (cleaned.includes("email") || cleaned === "mail") {
      return clientObj.email || "sarah.j@email.com";
    }

    // Phone / Contact
    if (cleaned.includes("phone") || cleaned.includes("mobile") || cleaned.includes("contact") || cleaned.includes("tel")) {
      return clientObj.phone || "5551234567";
    }

    // Company / Organization
    if (cleaned.includes("company") || cleaned.includes("organization") || cleaned.includes("org")) {
      return clientObj.companyName || "TechCorp Inc.";
    }

    // Job Position / Designation
    if (cleaned.includes("position") || cleaned.includes("title") || cleaned.includes("designation") || cleaned.includes("role")) {
      return clientObj.jobPosition || "Client Representative";
    }

    // Responsible / Doctor / Attending
    if (
      cleaned.includes("responsible") ||
      cleaned.includes("doctor") ||
      cleaned.includes("physician") ||
      cleaned.includes("specialist") ||
      cleaned.includes("provider") ||
      cleaned.includes("staff")
    ) {
      return clientObj.responsible || "John Smith";
    }

    // Status
    if (cleaned.includes("status")) {
      return clientObj.status || "Active";
    }

    // Consent / Signature
    if (cleaned.includes("signature") || cleaned.includes("consent")) {
      return clientObj.name || "Sarah Johnson";
    }

    // Allergies
    if (cleaned.includes("allerg")) {
      return "None Reported";
    }

    // Medical notes / History / Diagnosis / Chief Complaint
    if (cleaned.includes("diagno") || cleaned.includes("complaint") || cleaned.includes("medical") || cleaned.includes("history") || cleaned.includes("notes")) {
      return "Regular Consultation";
    }

    // Emergency contact
    if (cleaned.includes("emergency")) {
      return clientObj.phone || "—";
    }

    // Fallback: Return empty string instead of raw placeholder name
    return "";
  };

  // Helper to compute field values for a specific source ID
  const getSourceFieldValues = (sourceId: string, tpl: DocumentTemplate | null): Record<string, string> => {
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const defaultValues: Record<string, string> = {
      client_name: client.name || "Sarah Johnson",
      name: client.name || "Sarah Johnson",
      email: client.email || "sarah.j@email.com",
      phone: client.phone || "5551234567",
      company_name: client.companyName || "TechCorp Inc.",
      companyName: client.companyName || "TechCorp Inc.",
      job_position: client.jobPosition || "Client Representative",
      jobPosition: client.jobPosition || "Client Representative",
      location: client.location || "New York, NY",
      responsible: client.responsible || "John Smith",
      status: client.status || "Active",
      date: dateStr,
      current_date: dateStr,
      consent_signature: client.name || "Sarah Johnson",
      allergies: "None Reported",
      medical_notes: "Regular Consultation",
      emergency_contact: client.phone || "5551234567",
      tax_id: "TAX-998823",
      payment_terms: "Net 30 Days",
      service_name: "Healthcare Consultation",
      price: "$150.00",
      tax_rate: "5%",
      age: (client as any).age || "32",
      gender: (client as any).gender || "Female",
      id: client.id || "CL-001",
      document_number: `VCH-${new Date().getFullYear()}-${String(client.id || "001").replace(/[^0-9]/g, "").padStart(3, "0") || "001"}`,
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
          wfValues[k] = v;
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
    const rawSourceVals = getSourceFieldValues(newSourceId, selectedTemplate);
    const resolvedVals: Record<string, string> = { ...rawSourceVals };

    const placeholders = Array.from(new Set([
      ...(selectedTemplate?.extractedFields || []),
      ...extractTemplateFields(selectedTemplate?.templateText || ""),
      ...(selectedTemplate?.fieldMappings || []).map((m) => m.templateField),
    ])).filter(Boolean);

    placeholders.forEach((field) => {
      resolvedVals[field] = resolvePlaceholderValue(field, client, rawSourceVals, selectedTemplate);
    });

    setFieldValues(resolvedVals);

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
    setIsDocxRendered(false);
    setIsGeneratingDoc(true);

    const rawSourceVals = getSourceFieldValues(selectedSourceId, tpl);
    const resolvedVals: Record<string, string> = { ...rawSourceVals };

    const placeholders = Array.from(new Set([
      ...(tpl?.extractedFields || []),
      ...extractTemplateFields(tpl?.templateText || ""),
      ...(tpl?.fieldMappings || []).map((m) => m.templateField),
    ])).filter(Boolean);

    placeholders.forEach((field) => {
      resolvedVals[field] = resolvePlaceholderValue(field, client, rawSourceVals, tpl);
    });

    setFieldValues(resolvedVals);

    // Simulate 750ms "Generating document..." loader animation
    setTimeout(() => {
      setIsGeneratingDoc(false);
    }, 750);
  };

  // Compute live rendered text based on current fieldValues
  const getRenderedText = (): string => {
    if (!selectedTemplate) return "";
    let text = selectedTemplate.templateText || "";

    // 1. Replace mapped fields
    if (selectedTemplate.fieldMappings) {
      selectedTemplate.fieldMappings.forEach((m) => {
        const val =
          fieldValues[m.templateField] !== undefined
            ? fieldValues[m.templateField]
            : fieldValues[m.mappedFieldKey] !== undefined
            ? fieldValues[m.mappedFieldKey]
            : "";
        const escaped = m.templateField.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi"), val);
        text = text.replace(new RegExp(`\\{\\s*${escaped}\\s*\\}`, "gi"), val);
        text = text.replace(new RegExp(`\\[\\s*${escaped}\\s*\\]`, "gi"), val);
        text = text.replace(new RegExp(`«\\s*${escaped}\\s*»`, "gi"), val);
      });
    }

    // 2. Replace all remaining fieldValues entries
    Object.keys(fieldValues).forEach((key) => {
      const val = fieldValues[key] !== undefined ? fieldValues[key] : "";
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "gi"), val);
      text = text.replace(new RegExp(`\\{\\s*${escaped}\\s*\\}`, "gi"), val);
      text = text.replace(new RegExp(`\\[\\s*${escaped}\\s*\\]`, "gi"), val);
      text = text.replace(new RegExp(`«\\s*${escaped}\\s*»`, "gi"), val);
    });

    // 3. Fallback: replace any remaining unfulfilled placeholders
    text = text.replace(/\{\{\s*([a-zA-Z0-9_\- ]+?)\s*\}\}/g, (match, p1) => {
      const trimmed = p1.trim();
      return fieldValues[trimmed] !== undefined ? fieldValues[trimmed] : "";
    });
    text = text.replace(/\{\s*([a-zA-Z0-9_\- ]+?)\s*\}/g, (match, p1) => {
      const trimmed = p1.trim();
      return fieldValues[trimmed] !== undefined ? fieldValues[trimmed] : "";
    });
    text = text.replace(/«\s*([a-zA-Z0-9_\- ]+?)\s*»/g, (match, p1) => {
      const trimmed = p1.trim();
      return fieldValues[trimmed] !== undefined ? fieldValues[trimmed] : "";
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

      const valueBySource =
        selectedSourceId === "current"
          ? "Client Profile Data"
          : selectedSourceId.startsWith("webform_")
            ? `WebForm Response #${selectedSourceId.replace("webform_", "")}`
            : selectedSourceId.startsWith("transcript_")
              ? `AI Scribe Transcript #${selectedSourceId.replace("transcript_", "")}`
              : "Client Profile Data";

      if (format === "pdf") {
        const pdfResult = await generateClientPdf(selectedTemplate, renderedText, client);
        const blobUrl = URL.createObjectURL(pdfResult.blob);

        const newDoc: StoredClientDocument = {
          id: `doc-${Date.now()}`,
          clientId: client.id,
          name: `${baseName}.pdf`,
          category: selectedTemplate.category || "General",
          valueBy: valueBySource,
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
        if (selectedTemplate.rawDocxBase64) {
          // Process the authentic uploaded DOCX file and substitute tokens inside Word OpenXML
          const populatedDocxBlob = await generatePopulatedDocx(
            selectedTemplate.rawDocxBase64,
            fieldValues,
            selectedTemplate.fieldMappings
          );
          const blobUrl = URL.createObjectURL(populatedDocxBlob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `${baseName}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        } else {
          // Fallback for canvas templates created without an uploaded docx
          downloadAsWordDoc(`${baseName}.docx`, renderedText);
        }

        const newDoc: StoredClientDocument = {
          id: `doc-${Date.now()}`,
          clientId: client.id,
          name: `${baseName}.docx`,
          category: selectedTemplate.category || "General",
          valueBy: valueBySource,
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

  // Print Document with 1:1 layout fidelity (logos, positions, backgrounds, tables)
  const handlePrintDocument = () => {
    if (!selectedTemplate) return;
    try {
      // 1. If docx-preview is rendered, print the authentic Word canvas directly
      const docxContainer = docxContainerRef.current;
      if (docxContainer && isDocxRendered && selectedTemplate.rawDocxBase64 && docxContainer.innerHTML.trim().length > 0) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${selectedTemplate.name}</title>
                <style>
                  @page { size: auto; margin: 10mm; }
                  body { margin: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .docx-doc-viewer { width: 100% !important; margin: 0 auto !important; }
                  section.docx { box-shadow: none !important; margin: 0 auto !important; border: none !important; }
                </style>
              </head>
              <body>
                ${docxContainer.innerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 400);
          toast.info("Opened print dialog for Word document");
          return;
        }
      }

      // 2. High-fidelity print for styled HTML / table templates
      const renderedText = getRenderedText();
      const isHtml = /<[a-z][\s\S]*>/i.test(renderedText);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${selectedTemplate.name}</title>
              <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: Calibri, Arial, -apple-system, sans-serif; color: #111; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { width: 100%; border-collapse: collapse; margin: 14px 0; }
                th, td { border: 1px solid #000; padding: 6px 10px; font-size: 13px; text-align: left; }
                th { background: #f2f2f2; font-weight: bold; }
                h1 { font-size: 22px; color: #2E75B6; margin-bottom: 8px; font-weight: bold; }
                h2 { font-size: 16px; color: #2E75B6; margin-top: 14px; font-weight: bold; }
                p { font-size: 13px; line-height: 1.5; margin: 6px 0; }
                hr { border: 0; border-top: 1px solid #ccc; margin: 14px 0; }
              </style>
            </head>
            <body>
              ${isHtml ? renderedText : `<div style="white-space:pre-wrap;">${renderedText}</div>`}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 400);
        toast.info("Opened print dialog");
      }
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to prepare printable view.");
    }
  };

  // Extract unique placeholders present in the selected template
  const activePlaceholders = selectedTemplate
    ? Array.from(new Set([
      ...(selectedTemplate.extractedFields || []),
      ...extractTemplateFields(selectedTemplate.templateText || ""),
      ...(selectedTemplate.fieldMappings || []).map((m) => m.templateField),
    ])).filter(Boolean)
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
                        <div className="flex items-center gap-1">
                          <span>Template Name</span>
                          <div className="group relative inline-flex items-center">
                            <Info className="w-3.5 h-3.5 text-slate-300 hover:text-white cursor-pointer" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-44 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit font-normal border border-slate-700">
                              Name and title of the document template
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <div className="flex items-center gap-1">
                          <span>Category</span>
                          <div className="group relative inline-flex items-center">
                            <Info className="w-3.5 h-3.5 text-slate-300 hover:text-white cursor-pointer" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-44 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit font-normal border border-slate-700">
                              Assigned functional template category
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <div className="flex items-center gap-1">
                          <span>Fillable Fields</span>
                          <div className="group relative inline-flex items-center">
                            <Info className="w-3.5 h-3.5 text-slate-300 hover:text-white cursor-pointer" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-44 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit font-normal border border-slate-700">
                              Total dynamic placeholders populated from client data
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        <div className="flex items-center gap-1">
                          <span>Created Date</span>
                          <div className="group relative inline-flex items-center">
                            <Info className="w-3.5 h-3.5 text-slate-300 hover:text-white cursor-pointer" />
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-44 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit font-normal border border-slate-700">
                              Date when this template was created
                            </div>
                          </div>
                        </div>
                      </th>
                      <th className="px-3 py-2 text-right font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 italic text-sm">
                          No matching document templates found. Click "Create New Template" to add one.
                        </td>
                      </tr>
                    ) : (
                      filteredTemplates.map((tpl, idx) => (
                        <tr
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`cursor-pointer transition-colors hover:bg-slate-100/60 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            }`}
                        >
                          <td className="px-3 py-3 font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            {tpl.name}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {tpl.category || "General"}
                            </span>
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
              <div className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-3 min-w-0">
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
                  <div
                    ref={previewOuterRef}
                    className="border border-slate-300 rounded-2xl bg-slate-200/80 p-4 sm:p-6 min-h-[560px] animate-in fade-in-50 duration-150 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-230px)] shadow-inner flex flex-col items-center"
                  >
                    {/* Zoom & Canvas Scale Bar */}
                    <div className="w-full flex items-center justify-between mb-3 px-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        A4 Page View
                      </span>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setPreviewScale((s) => Math.max(0.35, Number((s - 0.05).toFixed(2))))}
                          className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs cursor-pointer"
                          title="Zoom Out"
                        >
                          -
                        </button>
                        <span className="font-mono text-[11px] font-bold text-slate-800 min-w-[34px] text-center">
                          {Math.round(previewScale * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewScale((s) => Math.min(1.2, Number((s + 0.05).toFixed(2))))}
                          className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs cursor-pointer"
                          title="Zoom In"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewOuterRef.current) {
                              const targetWidth = Math.max(280, previewOuterRef.current.clientWidth - 48);
                              setPreviewScale(Math.min(1, Math.max(0.4, Number((targetWidth / 816).toFixed(2)))));
                            }
                          }}
                          className="ml-1 text-[10px] text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
                        >
                          Fit
                        </button>
                      </div>
                    </div>

                    {/* Scaled Authentic Word Document Canvas Container */}
                    <div
                      className={`w-full flex justify-center overflow-visible ${
                        isDocxRendered && selectedTemplate?.rawDocxBase64 ? "flex" : "hidden"
                      }`}
                      style={{
                        minHeight: `calc(1056px * ${previewScale})`,
                      }}
                    >
                      <div
                        ref={docxContainerRef}
                        className="docx-preview-wrapper transition-transform duration-100 [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-0 [&_.docx-wrapper]:w-full [&_.docx-wrapper]:flex [&_.docx-wrapper]:justify-center [&_section.docx]:shadow-2xl [&_section.docx]:rounded-xl [&_section.docx]:mx-auto [&_section.docx]:border [&_section.docx]:border-slate-300"
                        style={{
                          width: "816px",
                          minWidth: "816px",
                          maxWidth: "816px",
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top center",
                        }}
                      />
                    </div>

                    {/* Styled A4 Paper Sheet Frame (Always active fallback when docx is not rendered or for HTML/text templates) */}
                    {(!isDocxRendered || !selectedTemplate?.rawDocxBase64) && (
                      <div
                        className="bg-white border border-slate-300/80 rounded-xl shadow-xl p-8 sm:p-10 pb-16 min-h-[580px] w-full max-w-[620px] text-slate-900 transition-all text-left animate-in fade-in-50 box-border overflow-hidden"
                        style={{
                          fontFamily: "Calibri, Arial, -apple-system, sans-serif",
                          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        }}
                      >
                        {/<[a-z][\s\S]*>/i.test(getRenderedText()) ? (
                          <div
                            className="word-doc-preview text-slate-900 leading-normal break-words text-left w-full overflow-hidden
                              [&_*]:!max-w-full [&_*]:!box-border
                              [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-[#2E75B6] [&_h1]:mb-1.5 [&_h1]:text-left [&_h1]:tracking-tight
                              [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-[#2E75B6] [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-left
                              [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:text-[#1F4E78] [&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-left
                              [&_p]:mb-2.5 [&_p]:text-[13px] [&_p]:text-slate-800 [&_p]:leading-relaxed
                              [&_p.subtitle]:text-[13px] [&_p.subtitle]:text-[#595959] [&_p.subtitle]:italic [&_p.subtitle]:mb-4
                              [&_em]:italic [&_em]:text-[#595959]
                              [&_table]:!w-full [&_table]:!border-collapse [&_table]:my-4 [&_table]:!border [&_table]:!border-slate-400 [&_table]:!table-fixed
                              [&_th]:!border [&_th]:!border-slate-400 [&_th]:!bg-slate-50 [&_th]:!p-2.5 [&_th]:!font-bold [&_th]:!text-[12px] [&_th]:!text-black [&_th]:!text-left [&_th]:!break-words
                              [&_td]:!border [&_td]:!border-slate-300 [&_td]:!p-2.5 [&_td]:!text-[13px] [&_td]:!text-slate-900 [&_td]:!align-middle [&_td]:!break-words
                              [&_tr>td:first-child]:!font-bold [&_tr>td:first-child]:!text-slate-800 [&_tr>td:first-child]:!w-[30%]
                              [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-300 [&_hr]:my-4
                              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5
                              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5
                              [&_img]:!max-w-full [&_img]:!h-auto"
                            dangerouslySetInnerHTML={{ __html: getRenderedText() }}
                          />
                        ) : (
                          <div className="word-doc-preview text-slate-900 space-y-4 text-left">
                            {(() => {
                              const raw = getRenderedText();
                              const lines = raw.split("\n").map((l) => l.trim());
                              const headerLines: string[] = [];
                              const tableRows: { label: string; value: string }[] = [];
                              const footerLines: string[] = [];

                              let state: "header" | "table" | "footer" = "header";

                              for (let i = 0; i < lines.length; i++) {
                                const line = lines[i];
                                if (!line) continue;

                                if (
                                  line.toLowerCase().includes("automatically") ||
                                  line.toLowerCase().includes("generated automatically")
                                ) {
                                  state = "footer";
                                  footerLines.push(line);
                                  continue;
                                }

                                const colonIdx = line.indexOf(":");
                                if (colonIdx > 0 && colonIdx < 40) {
                                  state = "table";
                                  tableRows.push({
                                    label: line.slice(0, colonIdx).trim(),
                                    value: line.slice(colonIdx + 1).trim(),
                                  });
                                } else if (state === "header" && tableRows.length === 0) {
                                  headerLines.push(line);
                                } else if (state === "table" && i + 1 < lines.length && !lines[i + 1].includes(":")) {
                                  tableRows.push({
                                    label: line,
                                    value: lines[i + 1] || "",
                                  });
                                  i++;
                                } else if (state === "footer") {
                                  footerLines.push(line);
                                } else {
                                  tableRows.push({
                                    label: line,
                                    value: "",
                                  });
                                }
                              }

                              return (
                                <div className="space-y-3">
                                  {headerLines.length > 0 && (
                                    <div className="space-y-1 mb-3">
                                      <h1 className="text-[24px] font-bold text-[#2E75B6] tracking-tight leading-tight">
                                        {headerLines[0]}
                                      </h1>
                                      {headerLines.slice(1).map((hl, hIdx) => (
                                        <p key={hIdx} className="text-[13px] italic text-[#595959] mb-2">
                                          {hl}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {tableRows.length > 0 && (
                                    <table className="w-full border-collapse border border-black my-3.5 text-xs">
                                      <tbody>
                                        {tableRows.map((row, rIdx) => (
                                          <tr key={rIdx}>
                                            <td className="border border-black p-1.5 px-2.5 font-bold text-black w-[28%] min-w-[110px] text-[13px]">
                                              {row.label}
                                            </td>
                                            <td className="border border-black p-1.5 px-2.5 text-slate-900 text-[13px]">
                                              {row.value}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}

                                  {footerLines.length > 0 && (
                                    <div className="pt-2">
                                      <hr className="border-0 border-t border-slate-300 my-3.5" />
                                      {footerLines.map((fl, fIdx) => (
                                        <p key={fIdx} className="text-[11px] text-[#666666] leading-normal">
                                          {fl}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT PANEL: Extracted Filled Fields Editor (Sticky to top) */}
              <div className="col-span-12 lg:col-span-5 xl:col-span-4 space-y-3 min-w-0 sticky top-0 self-start z-10">
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
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit border border-slate-700">
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
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit border border-slate-700">
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
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${selectedSourceType === "current" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
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
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${selectedSourceType === "webform" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
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
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${selectedSourceType === "transcript" ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
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
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit border border-slate-700">
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
                                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${isSelected ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
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
                                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${isSelected ? "bg-slate-100 text-slate-900 font-bold" : "hover:bg-slate-50 text-slate-700"
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


