import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate, Link } from "react-router";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  FileText,
  Calendar,
  AlertCircle,
  X,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "../../../lib/clientsStore";
import { INITIAL_FORMS, Form } from "../../../data/forms";
import {
  loadClientSubmissions,
  saveClientSubmissions,
  ClientFormSubmission,
} from "../../../data/submissionsStore";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientFormsScreen() {
  const navigate = useNavigate();
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [selectedSubmission, setSelectedSubmission] = useState<ClientFormSubmission | null>(null);
  const [storeTick, setStoreTick] = useState(0);

  // Re-sync submissions reactively
  useEffect(() => {
    const handleSync = () => setStoreTick((t) => t + 1);
    window.addEventListener("storage", handleSync);
    window.addEventListener("clientFormSubmissions_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("clientFormSubmissions_updated", handleSync);
    };
  }, []);

  // 1. All available forms (from sessionStorage or INITIAL_FORMS)
  const allForms: Form[] = useMemo(() => {
    try {
      const saved = sessionStorage.getItem("webForms");
      return saved ? JSON.parse(saved) : INITIAL_FORMS;
    } catch {
      return INITIAL_FORMS;
    }
  }, []);

  // 2. Client's submissions
  const clientSubmissions = useMemo(() => {
    if (!activeClient?.id) return [];
    const all = loadClientSubmissions();
    const cleanId = String(activeClient.id).trim().toLowerCase();
    return all.filter(
      (s) =>
        String(s.clientId).trim().toLowerCase() === cleanId ||
        String(s.clientId).replace(/\D/g, "") === cleanId.replace(/\D/g, "")
    );
  }, [activeClient?.id, storeTick]);

  // 3. Completed Submissions
  const completedSubmissions = useMemo(() => {
    return clientSubmissions.filter((s) => s.status === "completed");
  }, [clientSubmissions]);

  // 4. Forms To Complete (Pending assignments or clinical intake forms not yet completed)
  const pendingForms = useMemo(() => {
    if (!activeClient) return [];
    const completedFormIds = new Set(completedSubmissions.map((s) => s.formId));

    // A. Forms with an explicit pending submission record
    const pendingSubs = clientSubmissions.filter((s) => s.status === "pending");
    const pendingFromSubs = pendingSubs
      .map((s) => {
        const f = allForms.find((form) => form.id === s.formId);
        return f ? { form: f, subId: s.id, sentAt: s.sentAt } : null;
      })
      .filter(Boolean) as { form: Form; subId?: string; sentAt?: string }[];

    // B. Default clinical intake / consent forms if not yet filled by patient
    // e.g. Form 5: "Patient Intake Form"
    const intakeForms = allForms.filter(
      (f) =>
        (f.formType === "intake" || f.id === 5) &&
        !completedFormIds.has(f.id) &&
        !pendingFromSubs.some((p) => p.form.id === f.id)
    );

    const defaultPending = intakeForms.map((f) => ({
      form: f,
      subId: undefined,
      sentAt: new Date().toISOString().split("T")[0],
    }));

    return [...pendingFromSubs, ...defaultPending];
  }, [activeClient, allForms, clientSubmissions, completedSubmissions]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Forms &amp; Questionnaires
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete your clinical intake, medical history, and consent agreements online.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted HIPAA Intake</span>
        </div>
      </div>

      {/* ── Segmented Tab Switcher (To Complete vs Completed) ── */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200/80 max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "pending"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>To Complete</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              pendingForms.length > 0
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {pendingForms.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "completed"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>Completed</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              completedSubmissions.length > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {completedSubmissions.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: TO COMPLETE ───────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingForms.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">All Forms Completed!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have no pending clinical questionnaires or intake forms to fill out. You can
                review your past submissions in the Completed tab.
              </p>
            </div>
          ) : (
            pendingForms.map(({ form, sentAt }) => (
              <div
                key={form.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 hover:border-slate-300 transition-all shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 uppercase tracking-wider">
                        {form.formType === "intake" ? "Clinical Intake" : "Assigned Form"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {form.fields.length} Questions • ~3 min
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {form.name}
                    </h2>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      {form.description ||
                        "Please complete this form before your upcoming visit to ensure accurate clinical care."}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">
                    Requested on{" "}
                    {sentAt
                      ? new Date(sentAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(`/patient/forms/${form.id}`)}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-500/25 active:scale-[0.99]"
                  >
                    <span>Fill Form</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: COMPLETED FORMS ───────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────── */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          {completedSubmissions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Completed Submissions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Forms you fill out will appear here with your submitted responses and digital
                signatures.
              </p>
            </div>
          ) : (
            completedSubmissions.map((sub) => {
              const matchedForm = allForms.find((f) => f.id === sub.formId);
              const formTitle = matchedForm?.name || `Form #${sub.formId}`;
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 uppercase tracking-wider">
                          Completed
                        </span>
                        <span className="text-xs text-slate-400 font-mono">#{sub.id}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate">{formTitle}</h3>

                      <p className="text-xs text-slate-500 font-medium">
                        Submitted on {sub.submittedAt || "Recently"} •{" "}
                        {Object.keys(sub.fields || {}).length} responses recorded
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-[0.99]"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Responses</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── RESPONSES DETAIL MODAL ── */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {allForms.find((f) => f.id === selectedSubmission.formId)?.name ||
                    `Form #${selectedSubmission.formId}`}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Submission ID: {selectedSubmission.id} • Submitted on{" "}
                  {selectedSubmission.submittedAt}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-3.5">
              {Object.entries(selectedSubmission.fields || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {key}
                  </span>
                  {typeof val === "string" && val.startsWith("data:image") ? (
                    <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-center max-w-xs">
                      <img src={val} alt="Digital Signature" className="max-h-24 object-contain" />
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed break-words">
                      {val || "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
