import React, { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck,
  X,
  FileText,
} from "lucide-react";
import { INITIAL_FORMS, FormTemplate } from "../../../data/forms";
import {
  loadClientSubmissions,
  appendClientSubmission,
  type ClientFormSubmission,
} from "../../../data/submissionsStore";
import { QuietList, QuietRow } from "./components/QuietList";
import ActionCard from "./components/ActionCard";
import { toast } from "sonner";

interface PatientFormsProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

export default function PatientForms({
  clientId,
  clientName,
  clientEmail,
  clientPhone,
}: PatientFormsProps) {
  const [submissions, setSubmissions] = useState<ClientFormSubmission[]>(() =>
    loadClientSubmissions().filter(
      (s) => s.clientId === clientId || (clientId === "CL-001" && s.clientId === "CL-001")
    )
  );

  const [activeFormModal, setActiveFormModal] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const completedFormIds = submissions
    .filter((s) => s.status === "completed")
    .map((s) => s.formId);

  const enabledForms = INITIAL_FORMS.filter((f) => f.enabled && f.formType === "intake");
  const pendingForms = enabledForms.filter((f) => !completedFormIds.includes(f.id));

  const handleOpenForm = (form: FormTemplate) => {
    setActiveFormModal(form);
    setFormData({});
  };

  const handleSubmitForm = () => {
    if (!activeFormModal) return;

    appendClientSubmission({
      formId: activeFormModal.id,
      formTitle: activeFormModal.name || (activeFormModal as any).title || "General Intake Form",
      clientId,
      clientName,
      submittedAt: new Date().toISOString(),
      status: "completed",
      source: "patient-portal",
      answers: formData,
    });

    setSubmissions(
      loadClientSubmissions().filter(
        (s) => s.clientId === clientId || (clientId === "CL-001" && s.clientId === "CL-001")
      )
    );

    toast.success("Intake form submitted and saved to your chart");
    setActiveFormModal(null);
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1
          className="font-display font-semibold tracking-tight text-[#222222] dark:text-[#f4f6f8]"
          style={{ fontSize: "20px" }}
        >
          Clinical Intake Forms
        </h1>
        <p className="text-xs text-[#64748b] dark:text-[#93a1ad] mt-0.5">
          Pre-visit medical history questionnaires, lifestyle assessments, and consent waivers
        </p>
      </div>

      {/* Action Card: Pending Form Notice */}
      {pendingForms.length > 0 && (
        <ActionCard
          label="Intake Questionnaire Pending"
          description={`${pendingForms[0].name || (pendingForms[0] as any).title || "General Intake Form"} — please complete before your upcoming encounter.`}
          actionText="Fill out form"
          onAction={() => handleOpenForm(pendingForms[0])}
        />
      )}

      {/* Quiet List of Forms */}
      <QuietList title="Patient questionnaires & waivers">
        {enabledForms.map((form) => {
          const isDone = completedFormIds.includes(form.id);

          return (
            <QuietRow
              key={form.id}
              icon={<ClipboardList style={{ width: "16px", height: "16px" }} />}
              title={form.name || (form as any).title}
              subtitle={
                <>
                  {form.description || "Pre-consultation clinical questionnaire"} &nbsp;·&nbsp;{" "}
                  <span className="font-mono">Est. 3-5 mins</span>
                </>
              }
              right={
                isDone ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#047857]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenForm(form)}
                    className="text-xs font-semibold text-[#1456f0] hover:underline cursor-pointer"
                  >
                    Start form
                  </button>
                )
              }
              isRightMuted={isDone}
            />
          );
        })}
      </QuietList>

      {/* Form Filling Modal */}
      {activeFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181e25]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#181e25] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[rgba(24,30,37,0.07)] text-left relative max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setActiveFormModal(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-[#64748b] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="font-display text-base font-bold text-[#222222] dark:text-white">
                {activeFormModal.name || (activeFormModal as any).title}
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5">
                {activeFormModal.description || "Please answer all clinical questions accurately."}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#222222] dark:text-white block">
                  1. Current Symptoms / Reason for Visit
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe your current discomfort or concerns..."
                  value={formData["q1"] || ""}
                  onChange={(e) => setFormData({ ...formData, q1: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[rgba(24,30,37,0.1)] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#222222] dark:text-white block">
                  2. Known Allergies (Medications or Environmental)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, None"
                  value={formData["q2"] || ""}
                  onChange={(e) => setFormData({ ...formData, q2: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[rgba(24,30,37,0.1)] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#222222] dark:text-white block">
                  3. Are you currently taking any daily medications?
                </label>
                <input
                  type="text"
                  placeholder="e.g. Eye drops, Blood pressure pills, None"
                  value={formData["q3"] || ""}
                  onChange={(e) => setFormData({ ...formData, q3: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[rgba(24,30,37,0.1)] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(24,30,37,0.07)]">
              <button
                type="button"
                onClick={() => setActiveFormModal(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#64748b] hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForm}
                className="px-5 py-2 rounded-full bg-[#1456f0] text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95"
              >
                Submit Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
