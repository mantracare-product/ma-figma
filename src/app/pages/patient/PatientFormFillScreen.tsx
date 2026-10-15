import React, { useState, useMemo } from "react";
import { useParams, useNavigate, useOutletContext, Link } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle,
  PenLine,
  Eraser,
  Sparkles,
  Send,
  HelpCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "../../../lib/clientsStore";
import { INITIAL_FORMS, Form, FieldDef } from "../../../data/forms";
import {
  loadClientSubmissions,
  saveClientSubmissions,
  appendClientSubmission,
  ClientFormSubmission,
} from "../../../data/submissionsStore";
import DigitalSignaturePad from "./components/DigitalSignaturePad";

interface OutletContextType {
  activeClient?: Client;
}

export default function PatientFormFillScreen() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const context = useOutletContext<OutletContextType>();
  const activeClient = context?.activeClient;

  // 1. Find the target form definition
  const allForms: Form[] = useMemo(() => {
    try {
      const saved = sessionStorage.getItem("webForms");
      return saved ? JSON.parse(saved) : INITIAL_FORMS;
    } catch {
      return INITIAL_FORMS;
    }
  }, []);

  const targetForm = useMemo(() => {
    if (!formId) return null;
    const numId = Number(formId);
    return allForms.find((f) => f.id === numId) || null;
  }, [allForms, formId]);

  // 2. Initialize form responses with prefilled patient data
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (!targetForm) return {};
    const initial: Record<string, string> = {};

    targetForm.fields.forEach((field) => {
      const lbl = field.label.toLowerCase();
      if ((lbl.includes("full name") || lbl === "name" || lbl.includes("patient name")) && activeClient?.name) {
        initial[field.label] = activeClient.name;
      } else if (lbl.includes("email") && activeClient?.email) {
        initial[field.label] = activeClient.email;
      } else if (lbl.includes("phone") && activeClient?.phone) {
        initial[field.label] = activeClient.phone;
      } else if (lbl.includes("birth") || lbl.includes("dob")) {
        // e.g. "09/14/1990"
        initial[field.label] = "09/14/1990";
      } else if (lbl.includes("insurance")) {
        initial[field.label] = "Blue Cross Blue Shield";
      } else {
        initial[field.label] = "";
      }
    });

    return initial;
  });

  // Digital signature state
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
    if (validationErrors[label]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[label];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm) return;

    // Validate required fields
    const errors: Record<string, string> = {};
    targetForm.fields.forEach((field) => {
      if (field.required && !formData[field.label]?.trim()) {
        errors[field.label] = `${field.label} is required`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fill in all required fields marked with an asterisk (*)");
      return;
    }

    setIsSubmitting(true);

    try {
      const cid = activeClient?.id || "CL-001";
      const today = new Date().toISOString().split("T")[0];
      const displayDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Include signature if signed
      const submissionFields: Record<string, string> = { ...formData };
      if (signatureData) {
        submissionFields["Digital Signature"] = signatureData;
        submissionFields["Signed At"] = new Date().toLocaleString();
      }

      // Check if there was an existing pending submission for this form and client to fulfill
      const existingSubs = loadClientSubmissions();
      const pendingMatch = existingSubs.find(
        (s) =>
          String(s.clientId).trim().toLowerCase() === String(cid).trim().toLowerCase() &&
          s.formId === targetForm.id &&
          s.status === "pending"
      );

      if (pendingMatch) {
        // Update the pending submission to completed
        const updatedSubs = existingSubs.map((s) =>
          s.id === pendingMatch.id
            ? {
                ...s,
                status: "completed" as const,
                submittedAt: displayDate,
                fields: submissionFields,
              }
            : s
        );
        saveClientSubmissions(updatedSubs);
      } else {
        // Append a new completed submission
        appendClientSubmission({
          clientId: cid,
          formId: targetForm.id,
          sentAt: today,
          submittedAt: displayDate,
          status: "completed",
          fields: submissionFields,
        });
      }

      // Update forms submission count in sessionStorage
      try {
        const saved = sessionStorage.getItem("webForms");
        if (saved) {
          const parsed: Form[] = JSON.parse(saved);
          const updated = parsed.map((f) =>
            f.id === targetForm.id ? { ...f, submissions: (f.submissions || 0) + 1 } : f
          );
          sessionStorage.setItem("webForms", JSON.stringify(updated));
        }
      } catch {}

      // Dispatch sync events
      window.dispatchEvent(new Event("clientFormSubmissions_updated"));
      window.dispatchEvent(new Event("storage"));

      toast.success(`${targetForm.name} completed successfully!`);
      navigate("/patient/forms");
    } catch (err) {
      console.error("Failed to submit form:", err);
      toast.error("An error occurred while saving your responses. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetForm) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Form Not Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The requested questionnaire or clinical form could not be located or may have been archived.
        </p>
        <Link
          to="/patient/forms"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Forms</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/patient/forms")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Forms</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Encrypted Submission</span>
        </div>
      </div>

      {/* ── Form Card ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Form Card Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-blue-50/40 via-white to-white border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-blue-100/70 text-blue-800 border border-blue-200 uppercase tracking-wider">
              {targetForm.formType === "intake" ? "Clinical Intake" : "Medical Questionnaire"}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {targetForm.fields.length} questions
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {targetForm.name}
          </h1>

          <p className="text-xs text-slate-600 leading-relaxed">
            {targetForm.description ||
              "Please review and answer the questions below. Your responses will be securely linked to your medical profile for your clinical care team."}
          </p>

          {activeClient && (
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Filing for: <strong className="text-slate-800">{activeClient.name}</strong> (ID: #{activeClient.id})
              </span>
            </div>
          )}
        </div>

        {/* ── Form Fields ── */}
        <div className="p-6 sm:p-8 space-y-6">
          {targetForm.fields.map((field, idx) => {
            const hasError = Boolean(validationErrors[field.label]);
            const val = formData[field.label] ?? "";

            return (
              <div key={idx} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={val}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50/40 focus:bg-white"
                    }`}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={val}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50/40 focus:bg-white"
                    }`}
                  >
                    <option value="">{field.placeholder || "Select an option..."}</option>
                    {field.options && field.options.length > 0 ? (
                      field.options.map((opt, oIdx) => (
                        <option key={oIdx} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Not Applicable">Not Applicable</option>
                      </>
                    )}
                  </select>
                ) : (
                  <input
                    type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                    value={val}
                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      hasError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/20"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50/40 focus:bg-white"
                    }`}
                  />
                )}

                {hasError && (
                  <p className="text-[11px] font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{validationErrors[field.label]}</span>
                  </p>
                )}
              </div>
            );
          })}

          {/* ── Embedded Digital Signature Pad ── */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Patient Electronic Signature
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign below to verify your responses and agree to clinical treatment consent.
                </p>
              </div>

              {signatureData && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signature Captured</span>
                </span>
              )}
            </div>

            {signatureData ? (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-36 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center overflow-hidden">
                    <img src={signatureData} alt="Signature" className="h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Verified Signature</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Timestamped: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSignatureData(null)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Change Signature
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <DigitalSignaturePad
                  title="Electronic Consent"
                  subtitle="Draw your signature with your finger, stylus, or mouse"
                  onSave={(dataUrl) => {
                    setSignatureData(dataUrl);
                    toast.success("Signature captured!");
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Form Card Footer / Submit ── */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/patient/forms")}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Submitting..." : "Submit Completed Form"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
