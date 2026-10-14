import React, { useState } from "react";
import { useOutletContext } from "react-router";
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  FileSignature,
  Pill,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "../../../lib/clientsStore";
import ActionCard from "./components/ActionCard";
import DigitalSignaturePad from "./components/DigitalSignaturePad";

interface OutletContextType {
  activeClient?: Client;
}

interface PatientDoc {
  id: string;
  title: string;
  category: "Intake & Consent" | "Clinical Summary" | "Lab & Diagnostics" | "Prescription";
  date: string;
  provider: string;
  status: "Completed" | "Pending Signature" | "Verified";
  fileSize: string;
}

export default function PatientDocumentsScreen() {
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  // Form completion state for pending intake
  const [isIntakeCompleted, setIsIntakeCompleted] = useState<boolean>(() => {
    if (!activeClient?.id) return false;
    return localStorage.getItem(`intake_completed_${activeClient.id}`) === "true";
  });

  const [isSigningConsent, setIsSigningConsent] = useState(false);

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
      id: "RX-1042",
      title: "Outpatient Prescription & Medication Schedule",
      category: "Prescription",
      date: "2026-10-10",
      provider: activeClient?.responsible || "Dr. Rajesh Patel",
      status: "Verified",
      fileSize: "420 KB",
    },
    {
      id: "DOC-8834",
      title: "Clinical Consultation Summary & Vitals",
      category: "Clinical Summary",
      date: "2026-10-10",
      provider: activeClient?.responsible || "Dr. Rajesh Patel",
      status: "Verified",
      fileSize: "850 KB",
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

  const handleDownload = (doc: PatientDoc) => {
    toast.success(`Opening ${doc.title} (${doc.fileSize})...`);
  };

  const handleConsentSaved = (signatureDataUrl: string) => {
    if (activeClient?.id) {
      localStorage.setItem(`intake_completed_${activeClient.id}`, "true");
    }
    setIsIntakeCompleted(true);
    setIsSigningConsent(false);
    toast.success("Medical assessment & consent signed successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header (Clean, Zero AI Slop) ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>HIPAA Verified</span>
        </div>
      </div>

      {/* ── One Action Needed Callout (Never Duplicated Below) ── */}
      {!isIntakeCompleted && (
        <ActionCard
          label="Assessment Pending"
          description="Pre-procedure clinical questionnaire and allergy assessment pending completion."
          actionText="Start Form"
          onAction={() => setIsSigningConsent(true)}
          variant="blue"
        />
      )}

      {/* ── Digital Consent Modal ── */}
      {isSigningConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <DigitalSignaturePad
            title="Pre-Procedure Assessment & Consent"
            subtitle={`Verification for ${activeClient?.name || "Patient"}`}
            onSave={handleConsentSaved}
            onCancel={() => setIsSigningConsent(false)}
          />
        </div>
      )}

      {/* ── Flat List of Verified Documents ── */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Verified Medical Records
        </div>

        <div className="space-y-3">
          {mockDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  {doc.category === "Prescription" ? (
                    <Pill className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {doc.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{doc.id}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium">
                    Issued by {doc.provider} • {doc.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
