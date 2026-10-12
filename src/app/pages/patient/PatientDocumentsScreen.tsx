import React, { useState } from "react";
import { useOutletContext, Link } from "react-router";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "../../../lib/clientsStore";

interface OutletContextType {
  activeClient?: Client;
}

interface PatientDoc {
  id: string;
  title: string;
  category: "Intake & Consent" | "Clinical Summary" | "Lab & Diagnostics" | "Billing Receipt";
  date: string;
  provider: string;
  status: "Completed" | "Pending Signature" | "Verified";
  fileSize: string;
}

export default function PatientDocumentsScreen() {
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<PatientDoc | null>(null);

  const mockDocuments: PatientDoc[] = [
    {
      id: "DOC-8921",
      title: "Patient Medical Intake & Consent Form",
      category: "Intake & Consent",
      date: activeClient?.lastContact || "2026-10-12",
      provider: activeClient?.responsible ? `Dr. ${activeClient.responsible.replace(/^Dr\.\s*/i, "")}` : "Dr. John Smith",
      status: "Completed",
      fileSize: "1.4 MB",
    },
    {
      id: "DOC-8834",
      title: "Clinical Consultation Summary & Vitals",
      category: "Clinical Summary",
      date: "2026-10-10",
      provider: activeClient?.responsible ? `Dr. ${activeClient.responsible.replace(/^Dr\.\s*/i, "")}` : "Dr. John Smith",
      status: "Verified",
      fileSize: "850 KB",
    },
    {
      id: "DOC-7740",
      title: "Comprehensive Metabolic Panel (CMP) Results",
      category: "Lab & Diagnostics",
      date: "2026-09-28",
      provider: "Quest Diagnostics / Clinic Lab",
      status: "Verified",
      fileSize: "2.1 MB",
    },
    {
      id: "DOC-6512",
      title: "Health Insurance Verification & Assignment of Benefits",
      category: "Intake & Consent",
      date: "2026-09-15",
      provider: "Billing & Compliance Desk",
      status: "Completed",
      fileSize: "520 KB",
    },
  ];

  const filteredDocs = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleDownload = (doc: PatientDoc) => {
    toast.success(`Downloading ${doc.title} (${doc.fileSize})...`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Patient Documents & Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
            Secure digital access to clinic consent forms, medical summaries, and diagnostic reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>HIPAA Compliant Record Vault</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <option value="all">All Categories</option>
            <option value="Intake & Consent">Intake & Consent</option>
            <option value="Clinical Summary">Clinical Summary</option>
            <option value="Lab & Diagnostics">Lab & Diagnostics</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No documents found matching criteria</p>
            <p className="text-xs text-slate-400">All newly generated consultation notes will appear here.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      {doc.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      {doc.id}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                    <span>Category: {doc.category}</span>
                    <span>• Provider: {doc.provider}</span>
                    <span>• Issued: {doc.date}</span>
                    <span>• {doc.fileSize}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(doc)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedDoc.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{selectedDoc.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
              <p><strong>Patient Name:</strong> {activeClient?.name || "Client"}</p>
              <p><strong>Provider / Physician:</strong> {selectedDoc.provider}</p>
              <p><strong>Date Generated:</strong> {selectedDoc.date}</p>
              <p><strong>Status:</strong> {selectedDoc.status}</p>
              <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px] leading-relaxed">
                This document is digitally verified under electronic health record standards. All clinical notes and signed releases are encrypted and stored in Mantra Assist.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownload(selectedDoc);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
