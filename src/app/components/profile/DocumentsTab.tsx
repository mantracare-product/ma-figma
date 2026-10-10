import React, { useState, useEffect, useRef } from "react";
import {
  FileText, FileSpreadsheet, FileImage, Plus, Search, Eye, Download,
  Trash2, MoreVertical, ChevronDown, ChevronRight, Upload, PlusCircle, Sparkles,
  Folder, Tag, Info, User, Layers
} from "lucide-react";
import { toast } from "sonner";
import {
  StoredClientDocument,
  getStoredClientDocuments,
  saveClientDocument,
  deleteClientDocument,
  CLIENT_DOCUMENTS_EVENT,
} from "../../../lib/clientDocumentsStore";
import {
  DocumentTemplate,
  getStoredDocumentTemplates,
  DOCUMENT_TEMPLATES_EVENT,
  getStoredTemplateCategories,
  DOCUMENT_CATEGORIES_EVENT,
} from "../../../lib/documentTemplatesStore";
import GenerateDocumentDrawer from "./GenerateDocumentDrawer";
import DocumentPreviewDrawer from "./DocumentPreviewDrawer";
import AddDocumentTemplateDrawer from "./AddDocumentTemplateDrawer";
import { TableComponent, TableColumn } from "../ui/TableComponent";

export interface DocumentsTabProps {
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
  processName?: string;
  title?: string;
  entityType?: "client" | "process" | "appointment" | "invoice";
  entityId?: string;
  invoiceData?: any;
  hideClientDefaultDocs?: boolean;
}

function TabFieldTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center ml-1 align-middle">
      <Info className="w-3.5 h-3.5 text-slate-300 hover:text-white cursor-pointer" />
      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] font-normal rounded-lg shadow-2xl z-[99999] pointer-events-none text-center font-outfit leading-tight whitespace-normal border border-slate-700">
        {text}
      </span>
    </span>
  );
}

export default function DocumentsTab({
  client,
  processName,
  title,
  entityType,
  entityId,
  invoiceData,
  hideClientDefaultDocs,
}: DocumentsTabProps) {
  const [documents, setDocuments] = useState<StoredClientDocument[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [selectedDocStatus, setSelectedDocStatus] = useState<string>("All");
  const [previewDoc, setPreviewDoc] = useState<StoredClientDocument | null>(null);
  const [showGenerateDocDrawer, setShowGenerateDocDrawer] = useState(false);
  const [activeMenuDoc, setActiveMenuDoc] = useState<StoredClientDocument | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<any>>(new Set());

  // Upload & Template Dropdown State
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates);
  const [categories, setCategories] = useState<string[]>(getStoredTemplateCategories);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Invoices: true,
    Prescription: true,
    "Session Notes": true,
    "Consent forms": true,
    "Patient Intake form": true,
  });
  const [drawerInitialTemplate, setDrawerInitialTemplate] = useState<DocumentTemplate | null>(null);
  const [showAddTemplateDrawer, setShowAddTemplateDrawer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    if (!activeMenuDoc) return;
    const handler = () => {
      setActiveMenuDoc(null);
      setMenuPos(null);
    };
    window.addEventListener("click", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [activeMenuDoc]);

  const handleOpenDocMenu = (e: React.MouseEvent<HTMLButtonElement>, doc: StoredClientDocument) => {
    e.stopPropagation();
    if (activeMenuDoc?.id === doc.id) {
      setActiveMenuDoc(null);
      setMenuPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setActiveMenuDoc(doc);
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
  };

  // Sync templates and categories list
  useEffect(() => {
    const refreshTemplates = () => setAvailableTemplates(getStoredDocumentTemplates());
    const refreshCategories = () => setCategories(getStoredTemplateCategories());
    refreshTemplates();
    refreshCategories();
    window.addEventListener(DOCUMENT_TEMPLATES_EVENT, refreshTemplates);
    window.addEventListener(DOCUMENT_CATEGORIES_EVENT, refreshCategories);
    return () => {
      window.removeEventListener(DOCUMENT_TEMPLATES_EVENT, refreshTemplates);
      window.removeEventListener(DOCUMENT_CATEGORIES_EVENT, refreshCategories);
    };
  }, []);

  // Sync documents list from store and default initial documents
  useEffect(() => {
    if (!client?.id) return;

    const refreshDocs = () => {
      // 1. If scoped to an invoice, ONLY show documents for this invoice (NO client-level KYC/intake docs)
      if (entityType === "invoice" && entityId) {
        const allStored = getStoredClientDocuments();
        const invoiceDocs = allStored.filter(
          (d) =>
            d.invoiceId === entityId ||
            (d.entityType === "invoice" && d.entityId === entityId)
        );
        setDocuments(invoiceDocs);
        return;
      }

      // 2. If hideClientDefaultDocs is requested, only show actual saved docs
      if (hideClientDefaultDocs) {
        const stored = getStoredClientDocuments(client.id);
        setDocuments(stored);
        return;
      }

      // 3. Otherwise standard client documents
      const cName = client.name || "Client";
      const initialDocs: StoredClientDocument[] = [
        {
          id: `doc-1-${client.id}`,
          clientId: client.id,
          name: `${cName.replace(/\s+/g, "_")}_KYC_Identity.pdf`,
          category: "General",
          valueBy: "WebForm Response #wf-2",
          fileType: "pdf",
          fileSize: "2.4 MB",
          uploadedDate: "2024-05-24 11:30",
          uploadedBy: cName,
          status: "Verified",
          notes: "Government photo ID & address verification matched.",
        },
        {
          id: `doc-2-${client.id}`,
          clientId: client.id,
          name: `Signed_Agreement_${(processName || "Service").replace(/\s+/g, "_")}.pdf`,
          category: "Consent forms",
          valueBy: "Client Profile Data",
          fileType: "pdf",
          fileSize: "1.8 MB",
          uploadedDate: "2024-05-23 16:45",
          uploadedBy: client.responsible || "John Smith",
          status: "Verified",
          notes: "Standard terms and conditions e-signed.",
        },
        {
          id: `doc-3-${client.id}`,
          clientId: client.id,
          name: "Financial_Income_Statement.xlsx",
          category: "General",
          valueBy: "Manual File Upload",
          fileType: "sheet",
          fileSize: "840 KB",
          uploadedDate: "2024-05-25 09:15",
          uploadedBy: cName,
          status: "Pending Review",
          notes: "Submitted for financial clearance step.",
        },
        {
          id: `doc-4-${client.id}`,
          clientId: client.id,
          name: "Client_Intake_Medical_Form.docx",
          category: "Patient Intake form",
          valueBy: "WebForm Response #wf-1",
          fileType: "doc",
          fileSize: "512 KB",
          uploadedDate: "2024-05-22 14:00",
          uploadedBy: "System",
          status: "Verified",
          notes: "Generated from WebForm response submission.",
        },
      ];

      const stored = getStoredClientDocuments(client.id);
      const storedIds = new Set(stored.map((d) => d.id));
      const remainingInitial = initialDocs.filter((d) => !storedIds.has(d.id));

      setDocuments([...stored, ...remainingInitial]);
    };

    refreshDocs();
    window.addEventListener(CLIENT_DOCUMENTS_EVENT, refreshDocs);
    return () => window.removeEventListener(CLIENT_DOCUMENTS_EVENT, refreshDocs);
  }, [client?.id, client?.name, client?.responsible, processName, entityType, entityId, hideClientDefaultDocs]);

  const handleToggleDocStatus = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const nextStatus: StoredClientDocument["status"] =
            d.status === "Pending Review"
              ? "Verified"
              : d.status === "Verified"
                ? "Rejected"
                : "Pending Review";
          toast.info(`Status updated to "${nextStatus}"`);
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
  };

  const handleDeleteDoc = (docId: string, docName: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    deleteClientDocument(docId);
    if (previewDoc?.id === docId) setPreviewDoc(null);
    toast.success(`Document "${docName}" removed`);
  };

  const handleDownloadDoc = (doc: StoredClientDocument) => {
    const downloadUrl = doc.pdfBlobUrl || doc.pdfBase64;
    if (downloadUrl) {
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = doc.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success(`Downloaded "${doc.name}"!`);
    } else {
      const textBlob = new Blob([doc.generatedContent || doc.name], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(textBlob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success(`Downloaded "${doc.name}"!`);
    }
  };

  // Generate document for client from an available template
  const handleGenerateFromTemplate = (template: DocumentTemplate) => {
    const dateStr = new Date().toISOString().replace("T", " ").substring(0, 16);
    let generatedText = template.templateText || "";

    // If invoice data is provided, replace invoice-specific placeholders
    if (invoiceData) {
      const itemsList = (invoiceData.lineItems || [])
        .map(
          (li: any, i: number) =>
            `${i + 1}. ${li.description || li.product_name || "Item"} - Qty: ${li.quantity || 1} x $${Number(
              li.unit_price || li.rate || 0
            ).toFixed(2)} = $${Number(
              li.total || (li.quantity || 1) * (li.unit_price || li.rate || 0)
            ).toFixed(2)}`
        )
        .join("\n") || "1. Consultation / Service - $80.00";

      generatedText = generatedText
        .replace(/\{invoice_number\}/g, invoiceData.id || "")
        .replace(/\{due_date\}/g, invoiceData.dueDate || "")
        .replace(/\{subtotal\}/g, `$${Number(invoiceData.subtotal ?? (invoiceData.total ? invoiceData.total * 0.9 : 0)).toFixed(2)}`)
        .replace(/\{tax_amount\}/g, `$${Number(invoiceData.tax ?? (invoiceData.total ? invoiceData.total * 0.1 : 0)).toFixed(2)}`)
        .replace(/\{total_amount\}/g, `$${Number(invoiceData.total ?? 0).toFixed(2)}`)
        .replace(/\{payment_status\}/g, String(invoiceData.status || "DRAFT").toUpperCase())
        .replace(/\{line_items_summary\}/g, itemsList)
        .replace(/\{items\}/g, itemsList);
    }

    generatedText = generatedText
      .replace(/\{client_name\}/g, client.name || "Client")
      .replace(/\{email\}/g, client.email || "")
      .replace(/\{phone\}/g, client.phone || "")
      .replace(/\{company_name\}/g, client.companyName || "")
      .replace(/\{job_position\}/g, client.jobPosition || "")
      .replace(/\{location\}/g, client.location || "")
      .replace(/\{responsible\}/g, client.responsible || "Admin")
      .replace(/\{current_date\}/g, dateStr);

    const docName =
      entityType === "invoice" && entityId
        ? `${entityId}_${template.name.replace(/\s+/g, "_")}.pdf`
        : `${(client.name || "Client").replace(/\s+/g, "_")}_${template.name.replace(/\s+/g, "_")}.pdf`;

    const newDoc: StoredClientDocument = {
      id: `doc-gen-${Date.now()}`,
      clientId: client.id,
      invoiceId: entityType === "invoice" ? entityId : undefined,
      entityId,
      entityType,
      name: docName,
      category: template.category || (entityType === "invoice" ? "Invoices" : "General"),
      valueBy: entityType === "invoice" ? "Invoice Record Data" : "Client Profile Data",
      fileType: "pdf",
      fileSize: "1.6 MB",
      uploadedDate: dateStr,
      uploadedBy: client.responsible || "System Admin",
      status: "Verified",
      notes: `Generated using template: ${template.name}`,
      templateId: template.id,
      generatedContent: generatedText,
    };
    saveClientDocument(newDoc);
    toast.success(`Generated "${template.name}"!`);
  };

  // Upload custom document file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    let fileType: StoredClientDocument["fileType"] = "pdf";
    if (ext === "doc" || ext === "docx") fileType = "doc";
    else if (ext === "xls" || ext === "xlsx") fileType = "sheet";
    else if (ext === "jpg" || ext === "jpeg" || ext === "png") fileType = "image";

    const newDoc: StoredClientDocument = {
      id: `doc-upload-${Date.now()}`,
      clientId: client.id,
      invoiceId: entityType === "invoice" ? entityId : undefined,
      entityId,
      entityType,
      name: file.name,
      category: entityType === "invoice" ? "Invoices" : "General",
      valueBy: "Manual File Upload",
      fileType,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      uploadedBy: client.responsible || "Admin User",
      status: "Verified",
      notes: `Uploaded file (${file.name})`,
    };
    saveClientDocument(newDoc);
    toast.success(`Uploaded "${file.name}"!`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (doc.category && doc.category.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (doc.valueBy && doc.valueBy.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
      (doc.notes && doc.notes.toLowerCase().includes(docSearchQuery.toLowerCase()));
    const matchesStatus = selectedDocStatus === "All" || doc.status === selectedDocStatus;
    return matchesSearch && matchesStatus;
  });

  // Group templates by categories (Strictly 5 standard categories + custom ones, excluding legacy)
  const legacyToExclude = new Set(["identification", "contract", "financial"]);
  const allCategoryNames = Array.from(
    new Set([
      ...categories,
      ...availableTemplates.map((t) => t.category || "General"),
    ])
  ).filter((cat) => Boolean(cat) && !legacyToExclude.has(cat.toLowerCase()));

  const filteredCategoriesList = allCategoryNames.filter((catName) => {
    if (!templateSearchQuery.trim()) return true;
    const q = templateSearchQuery.toLowerCase();
    const catMatches = catName.toLowerCase().includes(q);
    const templatesInCat = availableTemplates.filter((t) => (t.category || "General").toLowerCase() === catName.toLowerCase());
    const templateMatches = templatesInCat.some((t) => t.name.toLowerCase().includes(q));
    return catMatches || templateMatches;
  });

  return (
    <div className="space-y-4">
      {/* Hidden file input for Upload Document */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
      />

      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white shadow-xs gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {title || (entityType === "invoice" ? "Invoice Documents" : processName ? `${processName} Documents` : "Client Documents")}
          </h3>
          <span
            className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {documents.length} files
          </span>
        </div>

        {/* Filter & Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents, category..."
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 w-48"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          {/* Upload / Generate Document Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionDropdown((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload / Generate Document</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActionDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Popover */}
            {showActionDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionDropdown(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-100"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {/* Available Templates Header & Search */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        TEMPLATES BY CATEGORY ({filteredCategoriesList.length})
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search category or template..."
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>

                   {/* Grouped Category Dropdown Accordions */}
                  <div className="max-h-64 overflow-y-auto">
                    {filteredCategoriesList.map((catName) => {
                      const templatesInCat = availableTemplates.filter(
                        (t) => (t.category || "General").toLowerCase() === catName.toLowerCase()
                      );
                      const isExpanded = expandedCategories[catName] ?? (templatesInCat.length > 0);

                      return (
                        <div key={catName}>
                          {/* Category Header — clearly a section label */}
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(catName)}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isExpanded
                                ? "bg-slate-100 border-l-2 border-slate-600"
                                : "hover:bg-slate-50 border-l-2 border-transparent"
                            }`}
                          >
                            <span className={`text-[11px] font-bold uppercase tracking-wide ${
                              isExpanded ? "text-slate-800" : "text-slate-500"
                            }`}>
                              {catName}
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 text-slate-400 transition-transform duration-150 shrink-0 ${
                                isExpanded ? "rotate-180 text-slate-600" : ""
                              }`}
                            />
                          </button>

                          {/* Templates List — visually subordinate to category */}
                          {isExpanded && (
                            <div className="bg-white border-l-2 border-slate-200 ml-0 animate-in fade-in-50 duration-100">
                              {templatesInCat.length === 0 ? (
                                <div className="py-2 px-4 flex items-center gap-2">
                                  <p className="text-[11px] text-slate-400 italic">No templates in this category.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowActionDropdown(false);
                                      setShowAddTemplateDrawer(true);
                                    }}
                                    className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                                  >
                                    + Add
                                  </button>
                                </div>
                              ) : (
                                templatesInCat.map((tpl) => (
                                  <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => {
                                      setShowActionDropdown(false);
                                      setDrawerInitialTemplate(tpl);
                                      setShowGenerateDocDrawer(true);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400 shrink-0 transition-colors" />
                                      <p className="text-xs text-slate-700 truncate group-hover:text-blue-700 font-medium">
                                        {tpl.name}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-1" />
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredCategoriesList.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-3">No matching categories found.</p>
                    )}
                  </div>

                  {/* Action Options (Text Only, Brand Slate Palette) */}
                  <div className="p-1.5 border-t border-slate-100 bg-slate-50/70 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionDropdown(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full py-1.5 px-3 text-left text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer block border border-slate-200/80 bg-white"
                    >
                      + Upload Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionDropdown(false);
                        setShowAddTemplateDrawer(true);
                      }}
                      className="w-full py-1.5 px-3 text-left text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer block border border-slate-200/80 bg-white"
                    >
                      + Create New Template
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Available Documents Table */}
      <TableComponent
        columns={[
          {
            id: "name",
            key: "name",
            header: "Document Name",
            accessorKey: "name",
            render: (doc) => (
              <button
                onClick={() => setPreviewDoc(doc)}
                className="text-left font-medium text-sm text-gray-900 hover:text-blue-600 transition-colors truncate cursor-pointer w-full block"
                style={{ fontFamily: "DM Sans, sans-serif" }}
                title={doc.name}
              >
                {doc.name}
              </button>
            ),
          },
          {
            id: "category",
            key: "category",
            header: "Category",
            accessorKey: "category",
            render: (doc) => (
              <span className="text-xs truncate text-slate-800 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {doc.category || "General"}
              </span>
            ),
          },
          {
            id: "valueBy",
            key: "valueBy",
            header: "Value By",
            render: (doc) => (
              <span className="text-xs truncate text-slate-700 font-medium" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {doc.valueBy || (doc.templateId ? "Client Profile Data" : doc.uploadedBy.includes("WebForm") ? "WebForm Submission" : "Manual Upload")}
              </span>
            ),
          },
          {
            id: "uploadedBy",
            key: "uploadedBy",
            header: "Uploaded By",
            accessorKey: "uploadedBy",
            render: (doc) => (
              <span className="text-xs truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#424242" }}>
                {doc.uploadedBy}
              </span>
            ),
          },
          {
            id: "uploadedDate",
            key: "uploadedDate",
            header: "Date",
            accessorKey: "uploadedDate",
            render: (doc) => (
              <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                {doc.uploadedDate}
              </span>
            ),
          },
          {
            id: "fileSize",
            key: "fileSize",
            header: "Size",
            accessorKey: "fileSize",
            render: (doc) => (
              <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                {doc.fileSize}
              </span>
            ),
          },
        ]}
        data={filteredDocuments}
        getRowId={(doc) => doc.id}
        enableSelection={true}
        selectedIds={selectedDocIds}
        onSelectionChange={setSelectedDocIds}
        enableColumnCustomization={true}
        tableId="client-profile-documents"
        emptyMessage={
          entityType === "invoice"
            ? "No documents attached to this invoice yet. Upload or generate a document to get started."
            : "No documents found for this client."
        }
        rowActions={[
          {
            label: "Preview",
            icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
            onClick: (doc) => setPreviewDoc(doc),
          },
          {
            label: "Download",
            icon: <Download className="w-3.5 h-3.5 text-slate-500" />,
            onClick: (doc) => handleDownloadDoc(doc),
          },
          {
            label: "Delete",
            icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
            onClick: (doc) => handleDeleteDoc(doc.id, doc.name),
            isDanger: true,
          },
        ]}
        pagination={true}
        defaultRowsPerPage={10}
      />

      {/* Document Preview Drawer (Opens same template view in non-editable read-only form) */}
      {previewDoc && (
        <GenerateDocumentDrawer
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          client={client}
          previewDoc={previewDoc}
          isReadOnly={true}
          entityType={entityType}
          entityId={entityId}
          invoiceData={invoiceData}
          onToggleStatus={handleToggleDocStatus}
        />
      )}

      {/* Full Document Generator Drawer */}
      {showGenerateDocDrawer && (
        <GenerateDocumentDrawer
          isOpen={showGenerateDocDrawer}
          onClose={() => {
            setShowGenerateDocDrawer(false);
            setDrawerInitialTemplate(null);
          }}
          client={client}
          initialTemplate={drawerInitialTemplate}
          entityType={entityType}
          entityId={entityId}
          invoiceData={invoiceData}
          onDocumentGenerated={(doc) => {
            setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
          }}
        />
      )}

      {/* Create New Template Drawer */}
      {showAddTemplateDrawer && (
        <AddDocumentTemplateDrawer
          isOpen={showAddTemplateDrawer}
          onClose={() => setShowAddTemplateDrawer(false)}
          onTemplateCreated={(newTpl) => {
            setAvailableTemplates(getStoredDocumentTemplates());
            toast.success(`Template "${newTpl.name}" created and added to templates!`);
          }}
        />
      )}
    </div>
  );
}

