import React, { useState } from "react";
import {
  HeartHandshake,
  MapPin,
  Clock,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Trash2,
  Plus,
  FileSignature,
  Code,
  Eye,
  Lock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  PatientStageChecklistItem,
  PatientStageConsent,
} from "../../../lib/useProcessStore";
import { toast } from "sonner";

export const HTML_SNIPPET_TEMPLATES = [
  {
    label: "+ Advisory Callout",
    snippet: `<div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 14px 16px; border-radius: 0 12px 12px 0; margin: 12px 0;">
  <strong style="color: #1E40AF; display: block; margin-bottom: 4px;">ℹ️ Clinical Advisory</strong>
  <p style="color: #1E3A8A; font-size: 13px; margin: 0; line-height: 1.5;">Please rest comfortably in Waiting Lounge Bay B. Pupillary dilation drops take 15–20 minutes to take full effect.</p>
</div>`,
  },
  {
    label: "+ Warning Note",
    snippet: `<div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 14px 16px; border-radius: 12px; margin: 12px 0;">
  <strong style="color: #92400E; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">⚠️ Nil By Mouth (Fasting Required)</strong>
  <p style="color: #78350F; font-size: 13px; margin: 0; line-height: 1.5;">Strictly avoid food, water, or liquids until evaluated and cleared by Dr. Meera Nair's surgical team.</p>
</div>`,
  },
  {
    label: "+ Success / Cleared",
    snippet: `<div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; padding: 14px 16px; border-radius: 12px; margin: 12px 0;">
  <strong style="color: #065F46; display: block; margin-bottom: 4px;">✅ Verification Cleared</strong>
  <p style="color: #047857; font-size: 13px; margin: 0; line-height: 1.5;">Biometric lens calculation and consent signed. Patient is queued for theatre transfer.</p>
</div>`,
  },
  {
    label: "+ Numbered Steps",
    snippet: `<div style="margin: 12px 0; display: flex; flex-direction: column; gap: 8px;">
  <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
    <span style="width: 22px; height: 22px; background: #2563EB; color: #fff; font-weight: bold; font-size: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
    <span style="font-size: 13px; color: #1E293B;">Rest comfortably in the recliner chair with both eyes relaxed.</span>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
    <span style="width: 22px; height: 22px; background: #2563EB; color: #fff; font-weight: bold; font-size: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
    <span style="font-size: 13px; color: #1E293B;">Avoid rubbing or touching your marked eye. Nurse rounds occur every 10 mins.</span>
  </div>
</div>`,
  },
  {
    label: "+ Key Metric Cards",
    snippet: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
  <div style="padding: 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
    <span style="font-size: 11px; font-weight: bold; color: #15803D; text-transform: uppercase; display: block;">Attending Nurse</span>
    <span style="font-size: 13px; font-weight: 600; color: #14532D;">Sister Anjali (Ext. 204)</span>
  </div>
  <div style="padding: 12px; background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 10px;">
    <span style="font-size: 11px; font-weight: bold; color: #7E22CE; text-transform: uppercase; display: block;">Theatre Suite</span>
    <span style="font-size: 13px; font-weight: 600; color: #581C87;">OT Suite 2 · 2nd Floor</span>
  </div>
</div>`,
  },
  {
    label: "+ Helpline Link",
    snippet: `<div style="padding: 12px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin: 12px 0; display: flex; align-items: center; justify-content: space-between;">
  <div>
    <strong style="font-size: 13px; color: #0F172A; display: block;">Attendant Lounge Assistance</strong>
    <span style="font-size: 11px; color: #64748B;">For inquiries or family queries</span>
  </div>
  <a href="tel:+919811000000" style="font-size: 12px; font-weight: bold; color: #2563EB; text-decoration: none;">Call Desk →</a>
</div>`,
  },
];

interface PatientCompanionStageBuilderProps {
  visibleToPatient: boolean;
  onToggleVisible: (visible: boolean) => void;
  roomOrCounter: string;
  onRoomOrCounterChange: (val: string) => void;
  doctorName: string;
  onDoctorNameChange: (val: string) => void;
  estimatedWaitTime: string;
  onEstimatedWaitTimeChange: (val: string) => void;
  badge: string;
  onBadgeChange: (val: string) => void;
  htmlContent: string;
  onHtmlContentChange: (val: string) => void;
  infoText: string;
  onInfoTextChange: (val: string) => void;
  instructions: string[];
  onInstructionsChange: (val: string[]) => void;
  checklist: PatientStageChecklistItem[];
  onChecklistChange: (val: PatientStageChecklistItem[]) => void;
  consent: PatientStageConsent;
  onConsentChange: (val: PatientStageConsent) => void;
  consentEnabled: boolean;
  onConsentEnabledChange: (val: boolean) => void;
}

export default function PatientCompanionStageBuilder({
  visibleToPatient,
  onToggleVisible,
  roomOrCounter,
  onRoomOrCounterChange,
  doctorName,
  onDoctorNameChange,
  estimatedWaitTime,
  onEstimatedWaitTimeChange,
  badge,
  onBadgeChange,
  htmlContent,
  onHtmlContentChange,
  infoText,
  onInfoTextChange,
  instructions,
  onInstructionsChange,
  checklist,
  onChecklistChange,
  consent,
  onConsentChange,
  consentEnabled,
  onConsentEnabledChange,
}: PatientCompanionStageBuilderProps) {
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");
  const [activeSubTab, setActiveSubTab] = useState<"builder" | "checklist" | "consent" | "steps">("builder");

  // Draft inputs
  const [newStepInput, setNewStepInput] = useState("");
  const [newCheckLabel, setNewCheckLabel] = useState("");
  const [newCheckDesc, setNewCheckDesc] = useState("");
  const [newCheckRequired, setNewCheckRequired] = useState(true);

  const handleInsertSnippet = (snippet: string) => {
    const trimmed = htmlContent.trim();
    const updated = trimmed ? `${trimmed}\n\n${snippet}` : snippet;
    onHtmlContentChange(updated);
    toast.success("Snippet inserted into Custom HTML block");
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
      {/* 1. Main Toggle Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/8 via-teal-500/8 to-blue-500/8 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              visibleToPatient
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Visible in Patient Companion App
              </h4>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  visibleToPatient
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/80"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300/60"
                }`}
              >
                {visibleToPatient ? "Active · Live Sync" : "Internal Only"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
              Toggle whether patients and their attendants can view this stage, guidance, location, and progress on mobile (/patient-front).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={visibleToPatient}
              onChange={(e) => {
                const val = e.target.checked;
                onToggleVisible(val);
                toast.info(val ? "Stage enabled for Patient Companion" : "Stage hidden from Patient Companion (Internal only)");
              }}
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-emerald-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
      </div>

      {/* When Disabled: Quiet internal note */}
      {!visibleToPatient ? (
        <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>Internal Stage:</strong> This stage is hidden from patients and attendants. It will not appear on their timeline or visit tracker.
          </span>
        </div>
      ) : (
        /* When Enabled: Full Builder & Companion controls */
        <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-200">
          {/* Sub-Navigation Pills inside Builder */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab("builder")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === "builder"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>HTML & Content Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("checklist")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === "checklist"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Checklist ({checklist.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("consent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === "consent"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Consent Form ({consentEnabled ? "On" : "Off"})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab("steps")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeSubTab === "steps"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Step Instructions ({instructions.length})</span>
            </button>
          </div>

          {/* Glanceable Meta Row (Room, Doctor, Wait Time, Badge) */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Glanceable Stage Metadata</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Room / Bay / Counter
                </label>
                <input
                  type="text"
                  value={roomOrCounter}
                  onChange={(e) => onRoomOrCounterChange(e.target.value)}
                  placeholder="e.g. Lounge Bay 3"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attending Clinician
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => onDoctorNameChange(e.target.value)}
                  placeholder="e.g. Dr. Meera Nair"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Wait Time
                </label>
                <input
                  type="text"
                  value={estimatedWaitTime}
                  onChange={(e) => onEstimatedWaitTimeChange(e.target.value)}
                  placeholder="e.g. ~15 mins"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stage Status Badge
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => onBadgeChange(e.target.value)}
                  placeholder="e.g. In Prep Lounge"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* TAB 1: HTML & CUSTOM CONTENT BUILDER */}
          {activeSubTab === "builder" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Custom HTML & Guidance Builder</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Write rich HTML blocks, alerts, cards, or custom formatted advisories shown to patients during this stage.
                  </p>
                </div>

                {/* Switcher Edit / Preview */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditorTab("edit")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      editorTab === "edit"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Code / Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      editorTab === "preview"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live Preview</span>
                  </button>
                </div>
              </div>

              {/* Snippet Template Quick Insert Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Insert Snippets:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {HTML_SNIPPET_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertSnippet(tpl.snippet)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Tab View */}
              {editorTab === "edit" ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs focus-within:border-blue-500 transition-all">
                    <div className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>HTML / Rich Text Block</span>
                      <span>{htmlContent.length} chars</span>
                    </div>
                    <textarea
                      value={htmlContent}
                      onChange={(e) => onHtmlContentChange(e.target.value)}
                      placeholder="Write custom HTML tags (e.g. <div class='...'>, <strong>, <span>, <a>) or formatted guidance here..."
                      rows={8}
                      className="w-full p-3.5 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono focus:outline-none resize-y leading-relaxed"
                    />
                  </div>

                  {/* Fallback Info text input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Plain Summary Advisory (Fallback for SMS / Simple View):
                    </label>
                    <input
                      type="text"
                      value={infoText}
                      onChange={(e) => onInfoTextChange(e.target.value)}
                      placeholder="e.g. Pupillary numbing drops placed. Vision will blur slightly — this is expected."
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                /* Preview Tab View */
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      📱 Patient Companion Drawer Preview
                    </span>
                    <span>Live Rendering</span>
                  </div>

                  {htmlContent.trim() ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <Code className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p>No custom HTML content entered yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Click any template button above or switch to Code / Edit tab to add content.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHECKLIST */}
          {activeSubTab === "checklist" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Stage Verification Checklist ({checklist.length})</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tasks the patient or nursing staff must verify for this stage.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {checklist.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No checklist items configured yet.</p>
                ) : (
                  checklist.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {item.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = checklist.map((c) =>
                                c.id === item.id ? { ...c, required: !c.required } : c
                              );
                              onChecklistChange(updated);
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                              item.required
                                ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {item.required ? "Required" : "Optional"}
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = checklist.filter((c) => c.id !== item.id);
                          onChecklistChange(updated);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Checklist Form */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-855/50 border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add New Item:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newCheckLabel}
                    onChange={(e) => setNewCheckLabel(e.target.value)}
                    placeholder="Item title (e.g. Confirm Right Eye toric marking)"
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={newCheckDesc}
                    onChange={(e) => setNewCheckDesc(e.target.value)}
                    placeholder="Optional notes or details"
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCheckRequired}
                      onChange={(e) => setNewCheckRequired(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Required for stage completion</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCheckLabel.trim()) {
                        toast.error("Please enter a checklist label");
                        return;
                      }
                      const newItem: PatientStageChecklistItem = {
                        id: `chk-${Date.now()}`,
                        label: newCheckLabel.trim(),
                        description: newCheckDesc.trim() || undefined,
                        required: newCheckRequired,
                      };
                      onChecklistChange([...checklist, newItem]);
                      setNewCheckLabel("");
                      setNewCheckDesc("");
                      setNewCheckRequired(true);
                      toast.success("Checklist item added");
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INFORMED SURGICAL CONSENT */}
          {activeSubTab === "consent" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-purple-600" />
                    <span>Informed Procedure / Surgical Consent</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Requires the patient or attendant to digitally sign before entering this stage.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={consentEnabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onConsentEnabledChange(enabled);
                      toast.info(enabled ? "Informed consent enabled for this stage" : "Consent disabled");
                    }}
                  />
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {consentEnabled ? (
                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Consent Form Title
                    </label>
                    <input
                      type="text"
                      value={consent.title}
                      onChange={(e) => onConsentChange({ ...consent, title: e.target.value })}
                      placeholder="e.g. Informed Surgical Consent - Cataract Phacoemulsification"
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Summary Note
                    </label>
                    <input
                      type="text"
                      value={consent.description || ""}
                      onChange={(e) => onConsentChange({ ...consent, description: e.target.value })}
                      placeholder="e.g. Mandatory clinical authorization prior to entering the procedure area."
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Legal Authorization Text
                    </label>
                    <textarea
                      value={consent.content}
                      onChange={(e) => onConsentChange({ ...consent, content: e.target.value })}
                      rows={4}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">
                  Informed consent is disabled for this stage. Turn on the toggle above to require digital signing.
                </p>
              )}
            </div>
          )}

          {/* TAB 4: STEP INSTRUCTIONS */}
          {activeSubTab === "steps" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                    <span>Step-by-Step Instructions ({instructions.length})</span>
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ordered list of actions or instructions displayed to the patient.
                  </p>
                </div>
              </div>

              {/* Instructions List */}
              <div className="space-y-2">
                {instructions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No step instructions added yet.</p>
                ) : (
                  instructions.map((inst, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/80 dark:border-slate-800"
                    >
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={inst}
                        onChange={(e) => {
                          const updated = [...instructions];
                          updated[idx] = e.target.value;
                          onInstructionsChange(updated);
                        }}
                        className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = instructions.filter((_, i) => i !== idx);
                          onInstructionsChange(updated);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Remove step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Step */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newStepInput}
                  onChange={(e) => setNewStepInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newStepInput.trim()) {
                        onInstructionsChange([...instructions, newStepInput.trim()]);
                        setNewStepInput("");
                      }
                    }
                  }}
                  placeholder="Add new step instruction..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newStepInput.trim()) {
                      onInstructionsChange([...instructions, newStepInput.trim()]);
                      setNewStepInput("");
                    }
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
