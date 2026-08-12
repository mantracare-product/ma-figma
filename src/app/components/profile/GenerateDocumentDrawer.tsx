import React, { useState, useEffect } from "react";
import { Search, Plus, FileText, CheckCircle2, ArrowRight, ShieldCheck, Printer, Loader2, User, Building, Mail, Phone, MapPin } from "lucide-react";
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
  onDocumentGenerated?: (doc: StoredClientDocument) => void;
}

export default function GenerateDocumentDrawer({
  isOpen,
  onClose,
  client,
  onDocumentGenerated,
}: GenerateDocumentDrawerProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // PDF Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddTemplateDrawer, setShowAddTemplateDrawer] = useState(false);

  // Listen to template store updates
  useEffect(() => {
    const handleUpdate = () => setTemplates(getStoredDocumentTemplates());
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    return () => window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
  }, []);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tpl) =>
    tpl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateMergedText = (tpl: DocumentTemplate): string => {
    let result = tpl.templateText;
    const nowStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const clientValues: Record<string, string> = {
      name: client.name || "Client Name",
      email: client.email || "client@email.com",
      phone: client.phone || "—",
      companyName: client.companyName || "Client Org",
      jobPosition: client.jobPosition || "Client Representative",
      location: client.location || "Location",
      responsible: client.responsible || "Staff Member",
      status: client.status || "Active",
      date: nowStr,
    };

    tpl.fieldMappings.forEach((m) => {
      const val = clientValues[m.mappedFieldKey] || (client as any)[m.mappedFieldKey] || "—";
      const regex = new RegExp(`\\{${m.templateField}\\}`, "g");
      result = result.replace(regex, val);
    });

    return result
      .replace(/\{client_name\}/g, client.name || "Client Name")
      .replace(/\{email\}/g, client.email || "client@email.com")
      .replace(/\{phone\}/g, client.phone || "—")
      .replace(/\{company_name\}/g, client.companyName || "Client Org")
      .replace(/\{job_position\}/g, client.jobPosition || "Client Representative")
      .replace(/\{location\}/g, client.location || "Location")
      .replace(/\{responsible\}/g, client.responsible || "Staff Member")
      .replace(/\{status\}/g, client.status || "Active")
      .replace(/\{current_date\}/g, nowStr)
      .replace(/\{date\}/g, nowStr);
  };

  const handleSaveDocument = async () => {
    if (!selectedTemplate) return;

    try {
      setIsGenerating(true);
      const mergedText = generateMergedText(selectedTemplate);

      // Generate authentic PDF using jsPDF
      const pdfResult = await generateClientPdf(selectedTemplate, mergedText, client);
      const blobUrl = URL.createObjectURL(pdfResult.blob);

      const docName = `${client.name.replace(/\s+/g, "_")}_${selectedTemplate.name.replace(/\s+/g, "_")}.pdf`;

      const newDoc: StoredClientDocument = {
        id: `doc-${Date.now()}`,
        clientId: client.id,
        name: docName,
        category: "General",
        fileType: "pdf",
        fileSize: `${(pdfResult.blob.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
        uploadedBy: client.responsible || "Admin User",
        status: "Verified",
        notes: `Generated from template: "${selectedTemplate.name}"`,
        templateId: selectedTemplate.id,
        generatedContent: mergedText,
        pdfBase64: pdfResult.base64,
        pdfBlobUrl: blobUrl,
      };

      saveClientDocument(newDoc);
      toast.success(`Generated PDF "${docName}" saved to ${client.name}'s profile!`);
      if (onDocumentGenerated) onDocumentGenerated(newDoc);
      onClose();
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!selectedTemplate) return;
    try {
      toast.info("Preparing PDF print preview...");
      const mergedText = generateMergedText(selectedTemplate);
      const pdfResult = await generateClientPdf(selectedTemplate, mergedText, client);
      const blobUrl = URL.createObjectURL(pdfResult.blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      toast.error("Failed to trigger PDF print.");
    }
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="Generate Document from Template"
        subtitle={
          selectedTemplate
            ? "Step 2 of 2 — Preview & Generate PDF"
            : "Step 1 of 2 — Select Document Template"
        }
        icon={<FileText className="w-5 h-5 text-blue-600" />}
        width="max-w-3xl"
        zIndex={650}
        isGenerating={isGenerating}
        footer={
          selectedTemplate ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
                disabled={isGenerating}
              >
                ← Back to Templates
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  disabled={isGenerating}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save to Client Documents</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {/* Persistent Selected Client Summary Strip */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {client.name}
                  </span>
                  {client.companyName && (
                    <span className="text-[11px] text-gray-500 font-medium px-2 py-0.5 bg-white border border-gray-200 rounded-md truncate">
                      {client.companyName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-[11px] mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {client.email}</span>
                  {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {client.phone}</span>}
                  {client.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /> {client.location}</span>}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-[11px] flex-shrink-0" style={{ fontFamily: "Outfit, sans-serif" }}>
              Officer: {client.responsible || "Staff Member"}
            </span>
          </div>

          {!selectedTemplate ? (
            /* STEP 1: Available Templates Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddTemplateDrawer(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors shadow-xs cursor-pointer flex-shrink-0"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Template</span>
                </button>
              </div>

              {/* Templates Table (No cards) */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "#1F2937", height: "42px" }} className="text-white">
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Template Name
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Fields Count
                      </th>
                      <th className="px-3 py-2 text-left font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Created
                      </th>
                      <th className="px-3 py-2 text-right font-semibold" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-400 italic text-sm">
                          No matching document templates found. Click "+ Add Template" to upload one.
                        </td>
                      </tr>
                    ) : (
                      filteredTemplates.map((tpl, idx) => (
                        <tr
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl)}
                          className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                        >
                          <td className="px-3 py-3 font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span>{tpl.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-600 font-mono">
                            {tpl.extractedFields.length} {"{fields}"}
                          </td>
                          <td className="px-3 py-3 text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {tpl.createdAt}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplate(tpl);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              <span>Select</span>
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
            /* STEP 2: Live PDF Preview Canvas */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  ← Choose a different template
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Field Merge
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 font-medium">{selectedTemplate.name}</span>
                </div>
              </div>

              {/* Styled PDF Letterhead Sheet */}
              <div className="border border-gray-300 rounded-2xl bg-white shadow-lg p-8 space-y-6 max-w-2xl mx-auto border-t-8 border-t-[#1F2937]">
                <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      MANTRACARE HEALTHCARE CRM
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Official Client Record & Document Services
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <p>Doc ID: DOC-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>

                <div className="text-center py-2 bg-gray-50 rounded-xl border border-gray-100">
                  <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {selectedTemplate.name}
                  </h2>
                </div>

                <div className="p-4 bg-white border border-gray-100 rounded-xl">
                  <pre
                    className="whitespace-pre-wrap text-xs text-gray-800 leading-relaxed font-sans"
                    style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px" }}
                  >
                    {generateMergedText(selectedTemplate)}
                  </pre>
                </div>

                <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-400 flex items-center justify-between" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span>Generated for {client.name} ({client.email})</span>
                  <span>MantraCare Authorized PDF Output</span>
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
            setSelectedTemplate(newTpl);
          }}
        />
      )}
    </>
  );
}
