import React, { useState, useEffect, useMemo, useRef } from "react";
import { useOutletContext } from "react-router";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  Pill,
  Upload,
  Plus,
  X,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  Filter,
  FileCheck,
  Search,
  ExternalLink,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "../../../lib/clientsStore";
import {
  StoredClientDocument,
  getStoredClientDocuments,
  saveClientDocument,
  deleteClientDocument,
  CLIENT_DOCUMENTS_EVENT,
} from "../../../lib/clientDocumentsStore";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientDocumentsScreen() {
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  const [filterTab, setFilterTab] = useState<"all" | "clinic" | "uploads">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [storeTick, setStoreTick] = useState(0);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("Photo ID / Identification");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document preview modal state
  const [previewDoc, setPreviewDoc] = useState<StoredClientDocument | null>(null);

  // Reactive listener to document store
  useEffect(() => {
    const handleSync = () => setStoreTick((t) => t + 1);
    window.addEventListener(CLIENT_DOCUMENTS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(CLIENT_DOCUMENTS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Default seed documents if none exist yet for this client
  const defaultDocs = useMemo<StoredClientDocument[]>(() => {
    if (!activeClient) return [];
    const clientName = activeClient.name || "Patient";
    const doctorName = activeClient.responsible || "Dr. Rajesh Patel";

    return [
      {
        id: `seed-rx-${activeClient.id}`,
        clientId: activeClient.id,
        name: "Outpatient_Prescription_Medication_Schedule.pdf",
        category: "Prescription",
        fileType: "pdf",
        fileSize: "420 KB",
        uploadedDate: "2026-10-10 14:30",
        uploadedBy: doctorName,
        status: "Verified",
        notes: "Prescribed Amoxicillin & Ibuprofen for 7 days post-consultation.",
      },
      {
        id: `seed-summary-${activeClient.id}`,
        clientId: activeClient.id,
        name: "Clinical_Consultation_Summary_and_Vitals.pdf",
        category: "Clinical Summary",
        fileType: "pdf",
        fileSize: "850 KB",
        uploadedDate: "2026-10-10 14:00",
        uploadedBy: doctorName,
        status: "Verified",
        notes: "Comprehensive routine assessment with normal BP and heart rate.",
      },
      {
        id: `seed-ins-${activeClient.id}`,
        clientId: activeClient.id,
        name: "Insurance_Verification_and_Benefits_Assignment.pdf",
        category: "Consent forms",
        fileType: "pdf",
        fileSize: "520 KB",
        uploadedDate: "2026-09-15 10:15",
        uploadedBy: "Mantra Billing Desk",
        status: "Verified",
        notes: "Payer coverage active under Blue Cross PPO with zero deductible copay.",
      },
    ];
  }, [activeClient]);

  // Load client documents
  const allDocuments: StoredClientDocument[] = useMemo(() => {
    if (!activeClient?.id) return [];
    const stored = getStoredClientDocuments(activeClient.id);

    // If store already has docs for this client, merge with seed if seed not yet in store
    const map = new Map<string, StoredClientDocument>();
    defaultDocs.forEach((d) => map.set(d.id, d));
    stored.forEach((d) => map.set(d.id, d));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()
    );
  }, [activeClient?.id, defaultDocs, storeTick]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter((doc) => {
      // Tab filter
      const isPatientUpload =
        doc.status === "Pending Review" ||
        doc.uploadedBy.toLowerCase() === (activeClient?.name || "").toLowerCase() ||
        doc.uploadedBy.toLowerCase().includes("patient");

      if (filterTab === "clinic" && isPatientUpload) return false;
      if (filterTab === "uploads" && !isPatientUpload) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchCat = doc.category.toLowerCase().includes(q);
        const matchBy = doc.uploadedBy.toLowerCase().includes(q);
        return matchName || matchCat || matchBy;
      }

      return true;
    });
  }, [allDocuments, filterTab, searchQuery, activeClient?.name]);

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    setSelectedFile(file);
    if (!documentTitle) {
      // Auto-populate document title from file name
      setDocumentTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }

    // Read base64 preview
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    if (!selectedFile && !documentTitle.trim()) {
      toast.error("Please provide a file or title for the document");
      return;
    }

    setIsSubmittingUpload(true);

    try {
      const fileName =
        selectedFile?.name ||
        `${documentTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const fileType: "pdf" | "image" | "doc" | "sheet" =
        ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp"
          ? "image"
          : ext === "xlsx" || ext === "csv"
          ? "sheet"
          : ext === "docx" || ext === "doc"
          ? "doc"
          : "pdf";

      const formattedFileSize = selectedFile
        ? selectedFile.size > 1024 * 1024
          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(selectedFile.size / 1024)} KB`
        : "1.2 MB";

      const now = new Date();
      const uploadedDateStr = `${now.toISOString().split("T")[0]} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newDoc: StoredClientDocument = {
        id: `doc-pt-${Date.now()}`,
        clientId: activeClient.id,
        name: fileName,
        category: uploadCategory,
        fileType,
        fileSize: formattedFileSize,
        uploadedDate: uploadedDateStr,
        uploadedBy: activeClient.name || "Patient",
        status: "Pending Review",
        notes: documentNotes.trim() || `Patient self-uploaded ${uploadCategory} for review.`,
        pdfBase64: fileBase64 || undefined,
      };

      saveClientDocument(newDoc);
      setStoreTick((t) => t + 1);

      toast.success(
        "Document uploaded successfully! It is now pending clinic verification."
      );

      // Reset state and close modal
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setFileBase64(null);
      setDocumentTitle("");
      setDocumentNotes("");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setIsSubmittingUpload(false);
    }
  };

  const getDocIcon = (cat: string, fType: string) => {
    if (cat === "Prescription") {
      return <Pill className="w-5 h-5 text-indigo-600" />;
    }
    if (fType === "image") {
      return <FileImage className="w-5 h-5 text-purple-600" />;
    }
    if (fType === "sheet") {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Documents &amp; Records
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Access medical records, prescriptions, and upload insurance cards or photo IDs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented Tab Filter */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 max-w-sm">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({allDocuments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("clinic")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "clinic"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Clinic Records
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("uploads")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterTab === "uploads"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Uploads
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* ── Document List ── */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Documents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No documents matching "${searchQuery}". Try a different search term.`
                : filterTab === "uploads"
                ? "You haven't uploaded any documents yet. Use the Upload Document button above to submit photo ID or insurance cards."
                : "No clinical documents currently on file."}
            </p>
            {filterTab === "uploads" && (
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Now</span>
              </button>
            )}
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isPending = doc.status === "Pending Review";
            const isVerified = doc.status === "Verified";

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      doc.category === "Prescription"
                        ? "bg-indigo-50 border-indigo-100"
                        : isPending
                        ? "bg-amber-50 border-amber-100"
                        : "bg-blue-50 border-blue-100"
                    }`}
                  >
                    {getDocIcon(doc.category, doc.fileType)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase tracking-wider">
                        {doc.category}
                      </span>

                      {/* Status Pill */}
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Pending Clinic Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Verified</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-mono">
                        {doc.fileSize}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {doc.name}
                    </h3>

                    <p className="text-xs text-slate-500 font-medium">
                      Uploaded by {doc.uploadedBy} • {doc.uploadedDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Downloading ${doc.name}...`);
                    }}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── UPLOAD DOCUMENT MODAL ─────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Document</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Upload medical documents, photo IDs, or insurance cards
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUploadSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Category Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Document Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Photo ID / Identification">Photo ID / Driver's License</option>
                  <option value="Insurance Card">Insurance Card (Front &amp; Back)</option>
                  <option value="Medical History & Prior Records">Medical History &amp; Prior Records</option>
                  <option value="Lab & Diagnostics">Lab &amp; Diagnostic Reports</option>
                  <option value="Prescription">Prescription / Medication List</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Document Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g. Driver's License or BlueCross Card"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              {/* File Dropzone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Select File (PDF, Image, PNG, JPG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center bg-slate-50/60 hover:bg-blue-50/20 cursor-pointer transition-all space-y-2"
                >
                  {selectedFile ? (
                    <div className="space-y-1">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {selectedFile.size > 1024 * 1024
                          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${Math.round(selectedFile.size / 1024)} KB`}
                      </p>
                      <span className="text-[11px] font-bold text-blue-600 inline-block mt-1">
                        Click to choose a different file
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Click to browse or drag file here
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports PDF, PNG, JPG, DOCX (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Notes for Clinical Team (Optional)
                </label>
                <textarea
                  rows={2}
                  value={documentNotes}
                  onChange={(e) => setDocumentNotes(e.target.value)}
                  placeholder="e.g. Scanned copy of my updated insurance card for upcoming appointment"
                  className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Uploaded files will be marked <strong>"Pending Review"</strong> until verified by your clinical team.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpload || (!selectedFile && !documentTitle.trim())}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUpload ? "Uploading..." : "Save & Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── DOCUMENT PREVIEW MODAL ───────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {previewDoc.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {previewDoc.id} • {previewDoc.fileSize}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Document Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  previewDoc.status === "Pending Review"
                    ? "bg-amber-50/60 border-amber-200 text-amber-900"
                    : "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {previewDoc.status === "Pending Review" ? (
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">
                      {previewDoc.status === "Pending Review"
                        ? "Pending Clinical Review"
                        : "Verified Medical Record"}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {previewDoc.status === "Pending Review"
                        ? "Clinic staff will review and approve this document shortly."
                        : "Approved and securely linked to your medical chart."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Document Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Category
                  </span>
                  <p className="font-semibold text-slate-800">{previewDoc.category}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Upload Date
                  </span>
                  <p className="font-semibold text-slate-800">{previewDoc.uploadedDate}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Uploaded By / Provider
                  </span>
                  <p className="font-semibold text-slate-800">{previewDoc.uploadedBy}</p>
                </div>

                {previewDoc.notes && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Clinical Notes
                    </span>
                    <p className="font-medium text-slate-700 leading-relaxed">
                      {previewDoc.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Simulated Document Viewer Canvas */}
              {previewDoc.pdfBase64 && previewDoc.fileType === "image" ? (
                <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 flex items-center justify-center max-h-60 overflow-hidden">
                  <img
                    src={previewDoc.pdfBase64}
                    alt={previewDoc.name}
                    className="max-h-56 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Standard Clinical PDF Document</p>
                  <p className="text-[11px] text-slate-400">
                    256-bit encrypted transmission • HIPAA compliant storage
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.success(`Downloading ${previewDoc.name}...`);
                }}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
