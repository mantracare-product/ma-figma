import React, { useState, useEffect, useRef } from "react";
import {
  FileText, FileSpreadsheet, FileImage, Plus, Search, Eye, Download,
  Trash2, MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import {
  StoredClientDocument,
  getStoredClientDocuments,
  deleteClientDocument,
  CLIENT_DOCUMENTS_EVENT,
} from "../../../lib/clientDocumentsStore";
import GenerateDocumentDrawer from "./GenerateDocumentDrawer";
import DocumentPreviewDrawer from "./DocumentPreviewDrawer";

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
}

export default function DocumentsTab({ client, processName }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<StoredClientDocument[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [selectedDocStatus, setSelectedDocStatus] = useState<string>("All");
  const [previewDoc, setPreviewDoc] = useState<StoredClientDocument | null>(null);
  const [showGenerateDocDrawer, setShowGenerateDocDrawer] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  // Sync documents list from store and default initial documents
  useEffect(() => {
    if (!client?.id) return;

    const refreshDocs = () => {
      const cName = client.name || "Client";
      const initialDocs: StoredClientDocument[] = [
        {
          id: `doc-1-${client.id}`,
          clientId: client.id,
          name: `${cName.replace(/\s+/g, "_")}_KYC_Identity.pdf`,
          category: "Identification",
          fileType: "pdf",
          fileSize: "2.4 MB",
          uploadedDate: "2024-05-24 11:30",
          uploadedBy: `${cName} (via WebForm)`,
          status: "Verified",
          notes: "Government photo ID & address verification matched.",
        },
        {
          id: `doc-2-${client.id}`,
          clientId: client.id,
          name: `Signed_Agreement_${(processName || "Service").replace(/\s+/g, "_")}.pdf`,
          category: "Contract",
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
          category: "Financial",
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
          category: "Medical / Intake",
          fileType: "doc",
          fileSize: "512 KB",
          uploadedDate: "2024-05-22 14:00",
          uploadedBy: "System",
          status: "Verified",
          notes: "Generated from WebForm response submission.",
        },
      ];

      const stored = getStoredClientDocuments(client.id);
      const storedMap = new Map<string, StoredClientDocument>();
      initialDocs.forEach((d) => storedMap.set(d.id, d));
      stored.forEach((d) => storedMap.set(d.id, d));

      setDocuments(Array.from(storedMap.values()));
    };

    refreshDocs();
    window.addEventListener(CLIENT_DOCUMENTS_EVENT, refreshDocs);
    return () => window.removeEventListener(CLIENT_DOCUMENTS_EVENT, refreshDocs);
  }, [client?.id, client?.name, client?.responsible, processName]);

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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (doc.notes && doc.notes.toLowerCase().includes(docSearchQuery.toLowerCase()));
    const matchesStatus = selectedDocStatus === "All" || doc.status === selectedDocStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white shadow-xs gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-gray-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {processName ? `${processName} Documents` : "Client Documents"}
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
              placeholder="Search documents..."
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 w-44"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>


          <button
            onClick={() => setShowGenerateDocDrawer(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F2937] hover:bg-gray-800 text-white font-medium text-xs rounded-lg transition-colors shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload / Generate Document</span>
          </button>
        </div>
      </div>

      {/* Available Documents Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#1F2937", height: "48px" }}>
              <th style={{ width: "44px" }} className="px-5 text-center">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              </th>
              <th className="px-5 text-left text-xs font-semibold uppercase tracking-wider text-white">
                Document Name
              </th>

              <th
                className="px-5 text-left text-xs font-semibold uppercase tracking-wider text-white"
                style={{ width: "180px" }}
              >
                Uploaded By
              </th>
              <th
                className="px-5 text-left text-xs font-semibold uppercase tracking-wider text-white"
                style={{ width: "150px" }}
              >
                Date
              </th>
              <th
                className="px-5 text-left text-xs font-semibold uppercase tracking-wider text-white"
                style={{ width: "90px" }}
              >
                Size
              </th>
              <th
                className="px-5 text-right text-xs font-semibold uppercase tracking-wider text-white"
                style={{ width: "70px" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 italic text-sm">
                  No documents found for this client.
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc, i) => {
                const isPdf = doc.fileType === "pdf";
                const isSheet = doc.fileType === "sheet";
                const isDoc = doc.fileType === "doc";
                const isImage = doc.fileType === "image";

                return (
                  <tr
                    key={doc.id}
                    style={{
                      height: "60px",
                      backgroundColor: i % 2 === 0 ? "#fff" : "#FAFAFA",
                      borderBottom: "1px solid #EEEEEE",
                    }}
                    className="hover:bg-[#F5F8FF] transition-colors"
                  >
                    <td className="px-5 text-center">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                    </td>
                    <td className="px-5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-xs"
                          style={{
                            backgroundColor: isPdf
                              ? "#FEF2F2"
                              : isSheet
                                ? "#ECFDF5"
                                : isDoc
                                  ? "#EFF6FF"
                                  : "#F3E8FF",
                            color: isPdf
                              ? "#EF4444"
                              : isSheet
                                ? "#10B981"
                                : isDoc
                                  ? "#3B82F6"
                                  : "#A855F7",
                          }}
                        >
                          {isSheet ? (
                            <FileSpreadsheet className="w-4 h-4" />
                          ) : isImage ? (
                            <FileImage className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="text-left font-medium text-sm text-gray-900 hover:text-blue-600 transition-colors truncate cursor-pointer"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {doc.name}
                        </button>
                      </div>
                    </td>

                    <td
                      className="px-5 text-xs whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif", color: "#424242" }}
                    >
                      {doc.uploadedBy}
                    </td>
                    <td className="px-5 text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {doc.uploadedDate}
                    </td>
                    <td className="px-5 text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {doc.fileSize}
                    </td>
                    <td className="px-5 text-right">
                      <div className="relative flex items-center justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === doc.id ? null : doc.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === doc.id && (
                          <div
                            className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <button
                              onClick={() => { setPreviewDoc(doc); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500" />
                              Preview
                            </button>
                            <button
                              onClick={() => { handleDownloadDoc(doc); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-gray-500" />
                              Download
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => { handleDeleteDoc(doc.id, doc.name); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Document Preview Drawer (Right-side drawer) */}
      {previewDoc && (
        <DocumentPreviewDrawer
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          document={previewDoc}
          clientName={client.name}
          onToggleStatus={handleToggleDocStatus}
        />
      )}

      {/* Generate Document Drawer (Right-side drawer) */}
      {showGenerateDocDrawer && (
        <GenerateDocumentDrawer
          isOpen={showGenerateDocDrawer}
          onClose={() => setShowGenerateDocDrawer(false)}
          client={client}
        />
      )}
    </div>
  );
}
