import React, { useState, useEffect } from "react";
import {
  FileText,
  Pill,
  ClipboardList,
  CheckCircle2,
  X,
  Upload,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  getStoredClientDocuments,
  saveClientDocument,
  StoredClientDocument,
  CLIENT_DOCUMENTS_EVENT,
} from "../../../lib/clientDocumentsStore";
import { toast } from "sonner";

interface PatientDocumentsProps {
  clientId: string;
  clientName: string;
}

export default function PatientDocuments({ clientId, clientName }: PatientDocumentsProps) {
  const [documents, setDocuments] = useState<StoredClientDocument[]>(() =>
    getStoredClientDocuments(clientId)
  );

  // Form completion state for Pre-Procedure Eye & Allergy Assessment (Flow 6)
  const [isPreOpFormCompleted, setIsPreOpFormCompleted] = useState<boolean>(() => {
    return localStorage.getItem("ramesh_preop_form_completed") === "true";
  });

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Form inputs
  const [eyeSymptoms, setEyeSymptoms] = useState("Blurry vision in right eye, glare under sunlight");
  const [allergies, setAllergies] = useState("None known");
  const [currentDrops, setCurrentDrops] = useState("Moxifloxacin 0.5% (as prescribed)");
  const [previousSurgeries, setPreviousSurgeries] = useState("No");

  // Upload inputs
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Form");

  useEffect(() => {
    const handleSync = () => {
      setDocuments(getStoredClientDocuments(clientId));
    };

    window.addEventListener(CLIENT_DOCUMENTS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(CLIENT_DOCUMENTS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [clientId]);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPreOpFormCompleted(true);
    localStorage.setItem("ramesh_preop_form_completed", "true");
    setIsFormModalOpen(false);
    toast.success("Pre-Procedure Assessment submitted and verified");
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    const newDoc: StoredClientDocument = {
      id: `doc-up-${Date.now()}`,
      clientId: clientId || "CL-001",
      name: uploadTitle.trim(),
      category: uploadCategory,
      fileType: "pdf",
      fileSize: "1.1 MB",
      uploadedDate: new Date().toISOString().split("T")[0],
      uploadedBy: clientName || "Ramesh Iyer",
      status: "Verified",
    };

    saveClientDocument(newDoc);
    setIsUploadModalOpen(false);
    setUploadTitle("");
    toast.success("Document uploaded successfully");
  };

  // Additional user uploaded documents (Flow 7)
  const uploadedDocs = documents.filter((d) => d.id.startsWith("doc-up-"));

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header — Rule 0 & §3: Header "Documents and Forms" with no subtext. "Upload document" as plain text link */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-white">
          Documents and Forms
        </h1>

        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="cursor-pointer text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline inline-flex items-center gap-1 py-1"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload document</span>
        </button>
      </div>

      {/* One "Needs Attention" Callout: shown once, never duplicated below (§3) */}
      {!isPreOpFormCompleted && (
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11px] font-semibold text-[#1456f0] uppercase tracking-wider">
              Action Needed
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              Pre-Procedure Eye &amp; Allergy Assessment
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFormModalOpen(true)}
            className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <span>Start form</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Flat List Below (§3): Pending form above does NOT appear here */}
      <div className="space-y-2">
        {/* Item 1: Prescription */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1456f0] flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                Nuclear Cataract Grade II (Right Eye)
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Prescription · Dr. Meera Nair · <span className="font-medium">Aug 24, 2026</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRxModalOpen(true)}
            className="cursor-pointer shrink-0 text-xs font-semibold text-[#1456f0] hover:text-blue-700 hover:underline px-2.5 py-1.5 rounded-lg"
          >
            Open Rx
          </button>
        </div>

        {/* Item 2: General Medical History & Intake (Completed) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                General Medical History &amp; Intake
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Form · New-patient onboarding · <span className="font-medium">Aug 20, 2026</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Completed</span>
          </div>
        </div>

        {/* If Pre-Op Form was completed via Flow 6, it moves here */}
        {isPreOpFormCompleted && (
          <div className="p-4 rounded-2xl bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  Pre-Procedure Eye &amp; Allergy Assessment
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Form · Pre-operative clearance · <span className="font-medium">Sept 21, 2026</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Completed</span>
            </div>
          </div>
        )}

        {/* User-uploaded documents (Flow 7) */}
        {uploadedDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-2xl bg-white dark:bg-[#151c24] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                  {doc.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {doc.category} · {doc.uploadedDate}
                </div>
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium shrink-0">
              Uploaded
            </span>
          </div>
        ))}
      </div>

      {/* Prescription Modal (RX-001) */}
      {isRxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setIsRxModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[11px] font-semibold text-[#1456f0] uppercase tracking-wider">
                Prescription · RX-001
              </span>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                Nuclear Cataract Grade II (Right Eye)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dr. Meera Nair · Ophthalmologist · Aug 24, 2026
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                Prescribed Eye Drop Schedule:
              </div>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white">Moxifloxacin 0.5% Drops:</strong> 1 drop in Right Eye, 4 times daily
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white">Carboxymethylcellulose 1%:</strong> 1 drop in Right Eye, 3 times daily
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 flex justify-between pt-1">
              <span>Patient: <strong>{clientName}</strong> (62)</span>
              <span className="text-emerald-600 font-semibold">Status: Verified</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Completion Modal: Pre-Procedure Eye & Allergy Assessment (Flow 6) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[11px] font-semibold text-[#1456f0] uppercase tracking-wider">
                Clinical Form
              </span>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-0.5">
                Pre-Procedure Eye &amp; Allergy Assessment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Required before Sept 21 surgery · Dr. Meera Nair
              </p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Eye Symptoms *
                </label>
                <textarea
                  required
                  rows={2}
                  value={eyeSymptoms}
                  onChange={(e) => setEyeSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Known Drug Allergies *
                </label>
                <input
                  type="text"
                  required
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Latex, None"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Eye Drops / Medications
                </label>
                <input
                  type="text"
                  value={currentDrops}
                  onChange={(e) => setCurrentDrops(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Previous Eye Surgeries
                </label>
                <select
                  value={previousSurgeries}
                  onChange={(e) => setPreviousSurgeries(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
                >
                  Submit Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal (Flow 7) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151c24] rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 border border-slate-200 dark:border-slate-800 text-left relative">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Upload document
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add an external record to your profile
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Previous Eye Prescription"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="Prescription">Prescription</option>
                  <option value="Form">Form</option>
                  <option value="Lab result">Lab result</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                <Upload className="w-5 h-5 mx-auto text-slate-400" />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Select PDF or image
                </div>
                <div className="text-[10px] text-slate-400">PDF, JPG up to 10MB</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1456f0] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
                >
                  Confirm Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
