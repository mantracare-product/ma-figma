import React from "react";
import { Eye, Edit2, X, FileText, Link2, Copy, Mail } from "lucide-react";
import { FormFlow } from "../../../data/intakeFlows";
import { Form } from "../../../data/forms";
import { toast } from "sonner";

export interface FormFlowDrawerProps {
  flow: FormFlow | null;
  forms: Form[];
  onClose: () => void;
  onEdit: (fl: FormFlow) => void;
  onOpenPreview?: (fl: FormFlow) => void;
}

function getInitials(name?: string) {
  if (!name) return "MA";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function FormFlowDrawer({
  flow,
  forms,
  onClose,
  onEdit,
  onOpenPreview,
}: FormFlowDrawerProps) {
  if (!flow) return null;

  const flowUrl = `https://app.myaifrontdesk.com/flows/flow-${flow.id}`;
  const flowEmbedCode = `<iframe src="${flowUrl}" width="100%" height="700px" style="border: none; border-radius: 8px;"></iframe>`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[680px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-wrap bg-white shrink-0">
          <h2 className="text-base font-bold mr-1 truncate max-w-[280px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
            {flow.name}
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700" style={{ fontFamily: "Outfit, sans-serif" }}>
            Form Flow
          </span>
          <span className="text-xs ml-1" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
            Created {flow.createdAt}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onOpenPreview && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPreview(flow);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            )}
            <button
              onClick={() => {
                onClose();
                onEdit(flow);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-black text-white hover:bg-black/90 transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Edit2 className="w-3 h-3" /> Edit Steps
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#F8FAFC]">
          {/* Flow category & description */}
          {flow.description && (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                {flow.description}
              </p>
            </div>
          )}

          {/* Block 1 — Forms in Flow count + step list combined */}
          <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: "Outfit, sans-serif", color: "#94A3B8" }}>
                FORMS IN FLOW
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">
                <FileText className="w-3.5 h-3.5" />
                {flow.steps.length} {flow.steps.length === 1 ? "step" : "steps"}
              </div>
            </div>

            {flow.steps.length === 0 ? (
              <p className="text-xs text-slate-400 py-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                No forms in this flow yet. Click "Edit Steps" to add forms to this sequence.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {flow.steps.map((step, idx) => {
                  const sf = forms.find((f) => f.id === step.formId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div
                        className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0 text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-xs font-semibold flex-1 text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {sf?.name ?? `Form #${step.formId}`}
                      </span>
                      {step.required ? (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium shrink-0">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium shrink-0">
                          Optional
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Welcome message */}
          {flow.showWelcomeStep !== false && (
            <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                WELCOME MESSAGE
              </p>
              <p className="text-xs italic text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                "{flow.welcomeMessage}"
              </p>
            </div>
          )}

          {/* Thank you message */}
          {flow.showThankYouStep !== false && (
            <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                THANK YOU MESSAGE
              </p>
              <p className="text-xs italic text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                "{flow.thankYouMessage}"
              </p>
            </div>
          )}

          {/* Created By & On Card */}
          <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                CREATED BY
              </p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                  {getInitials(flow.senderName)}
                </div>
                <span className="text-xs font-medium text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {flow.senderName}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                CREATED ON
              </p>
              <span className="text-xs text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                {flow.createdAt}
              </span>
            </div>
          </div>

          {/* Share Link */}
          <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              SHARE LINK
            </p>
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-mono truncate flex-1 text-slate-600">
                {flowUrl}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(flowUrl);
                  toast.success("Flow link copied to clipboard");
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0 transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div className="p-4.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400" style={{ fontFamily: "Outfit, sans-serif" }}>
              EMBED CODE
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
              <code className="text-xs break-all leading-relaxed font-mono block text-slate-600">
                {flowEmbedCode}
              </code>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(flowEmbedCode);
                    toast.success("Flow embed code copied");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-black transition-colors cursor-pointer"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  <Copy className="w-3 h-3" /> Copy embed code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

