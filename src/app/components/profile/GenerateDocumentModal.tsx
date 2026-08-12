import React, { useState, useEffect } from "react";
import { X, Search, Plus, FileText, CheckCircle2, Download, Eye, Sparkles, ArrowRight, ShieldCheck, Printer } from "lucide-react";
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
import AddDocumentTemplateDrawer from "./AddDocumentTemplateDrawer";

interface GenerateDocumentModalProps {
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

export default function GenerateDocumentModal({
  isOpen,
  onClose,
  client,
  onDocumentGenerated,
}: GenerateDocumentModalProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

  // Add template drawer state
  const [showAddTemplateDrawer, setShowAddTemplateDrawer] = useState(false);

  // Listen to template store updates
  useEffect(() => {
    const handleUpdate = () => setTemplates(getStoredDocumentTemplates());
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
    return () => window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, handleUpdate);
  }, []);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || tpl.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Helper to replace template variables with real client data
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

    // Fallback for unmapped variables
    result = result
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

    return result;
  };

  const handleSaveGeneratedDocument = () => {
    if (!selectedTemplate) return;

    const mergedContent = generateMergedText(selectedTemplate);
    const docName = `${client.name.replace(/\s+/g, "_")}_${selectedTemplate.name.replace(/\s+/g, "_")}.pdf`;

    const newDoc: StoredClientDocument = {
      id: `doc-${Date.now()}`,
      clientId: client.id,
      name: docName,
      category: selectedTemplate.category,
      fileType: "pdf",
      fileSize: `${(Math.random() * 1.5 + 0.8).toFixed(1)} MB`,
      uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      uploadedBy: client.responsible || "Admin User",
      status: "Verified",
      notes: `Generated from template: "${selectedTemplate.name}"`,
      templateId: selectedTemplate.id,
      generatedContent: mergedContent,
    };

    saveClientDocument(newDoc);
    toast.success(`Generated document "${docName}" saved to ${client.name}'s profile!`);
    if (onDocumentGenerated) onDocumentGenerated(newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden z-[660] flex flex-col max-h-[90vh]"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Generate Document from Template
              </h2>
              <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                Client: <strong className="text-gray-800">{client.name}</strong> • Select a template to extract and populate PDF fields
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {!selectedTemplate ? (
            /* STEP 1: Select Template Grid */
            <div className="space-y-5">
              {/* Search & Filter Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700 focus:outline-none focus:border-blue-500"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="All">All Categories</option>
                  <option value="Identification">Identification</option>
                  <option value="Contract">Contract</option>
                  <option value="Financial">Financial</option>
                  <option value="Medical / Intake">Medical / Intake</option>
                  <option value="General">General</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddTemplateDrawer(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Template</span>
                </button>
              </div>

              {/* Available Templates Grid */}
              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-gray-400 italic text-sm">
                    No matching document templates found. Click "+ Add Template" to upload one.
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className="p-4 border border-gray-200 hover:border-blue-500 rounded-xl bg-white hover:bg-blue-50/20 transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {tpl.category}
                          </span>
                          <span className="text-[11px] text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {tpl.extractedFields.length} {"{fields}"}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                          {tpl.name}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {tpl.fileName || "template.docx"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 text-xs">
                        <span className="text-gray-400 text-[11px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                          Created {tpl.createdAt}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                          Select Template <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: Generated PDF Preview Canvas */
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
              <div className="border border-gray-300 rounded-2xl bg-white shadow-lg p-8 space-y-6 max-w-3xl mx-auto border-t-8 border-t-[#1F2937]">
                {/* PDF Header Letterhead */}
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
                    <p className="font-bold text-gray-800">{selectedTemplate.category.toUpperCase()}</p>
                    <p>Doc ID: DOC-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>

                {/* PDF Document Title */}
                <div className="text-center py-2 bg-gray-50 rounded-xl border border-gray-100">
                  <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {selectedTemplate.name}
                  </h2>
                </div>

                {/* Merged Text Body */}
                <div className="p-4 bg-white border border-gray-100 rounded-xl">
                  <pre
                    className="whitespace-pre-wrap text-xs text-gray-800 leading-relaxed font-sans"
                    style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px" }}
                  >
                    {generateMergedText(selectedTemplate)}
                  </pre>
                </div>

                {/* PDF Footer Notice */}
                <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-400 flex items-center justify-between" style={{ fontFamily: "Outfit, sans-serif" }}>
                  <span>Generated for {client.name} ({client.email})</span>
                  <span>MantraCare Authorized System Document</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {selectedTemplate && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSelectedTemplate(null)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Back to Templates
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toast.info(`Printing preview PDF for ${client.name}...`)}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGeneratedDocument}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save to Client Documents</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Document Template Drawer */}
      {showAddTemplateDrawer && (
        <AddDocumentTemplateDrawer
          isOpen={showAddTemplateDrawer}
          onClose={() => setShowAddTemplateDrawer(false)}
          onTemplateCreated={(newTpl) => {
            setSelectedTemplate(newTpl);
          }}
        />
      )}
    </div>
  );
}
