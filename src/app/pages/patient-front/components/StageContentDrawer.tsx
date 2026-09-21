import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  FileSignature,
  Upload,
  AlertCircle,
  Clock,
  MapPin,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PatientFacingStageContent } from "../../../../lib/useProcessStore";
import {
  getStoredStageProgress,
  saveStageChecklistItem,
  saveStageConsentSignature,
  uploadStageDocument,
  StageTaskProgress,
} from "../../../../lib/patientStageProgressStore";
import DigitalSignaturePad from "./DigitalSignaturePad";
import { toast } from "sonner";

interface StageContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  processId: string;
  processName: string;
  stageId: string;
  stageName: string;
  stageColor?: string;
  content: PatientFacingStageContent | null;
}

export default function StageContentDrawer({
  isOpen,
  onClose,
  clientId,
  clientName,
  processId,
  processName,
  stageId,
  stageName,
  stageColor = "#3B82F6",
  content,
}: StageContentDrawerProps) {
  const [progress, setProgress] = useState<StageTaskProgress>(() =>
    getStoredStageProgress(clientId, processId, stageId)
  );
  const [signingConsentId, setSigningConsentId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProgress(getStoredStageProgress(clientId, processId, stageId));
      setSigningConsentId(null);
      setUploadingDocId(null);
    }
  }, [isOpen, clientId, processId, stageId]);

  if (!isOpen) return null;

  const handleToggleChecklist = (itemId: string, currentVal: boolean) => {
    saveStageChecklistItem(clientId, processId, stageId, itemId, !currentVal);
    setProgress(getStoredStageProgress(clientId, processId, stageId));
    if (!currentVal) {
      toast.success("Checklist item confirmed");
    }
  };

  const handleConsentSaved = (signatureUrl: string) => {
    if (!content?.consent) return;
    saveStageConsentSignature(
      clientId,
      clientName,
      processId,
      processName,
      stageId,
      stageName,
      content.consent.id,
      content.consent.title,
      signatureUrl
    );
    setProgress(getStoredStageProgress(clientId, processId, stageId));
    setSigningConsentId(null);
    toast.success("Consent signed and verified!");
  };

  const handleSimulateUpload = (docRequestId: string, docTitle: string) => {
    uploadStageDocument(
      clientId,
      clientName,
      processId,
      stageId,
      docRequestId,
      docTitle,
      `${docTitle.replace(/\s+/g, "_")}.pdf`,
      "1.2 MB"
    );
    setProgress(getStoredStageProgress(clientId, processId, stageId));
    setUploadingDocId(null);
    toast.success("Document uploaded and saved to medical record");
  };

  const checklistItems = content?.checklist || [];
  const completedCount = checklistItems.filter((i) =>
    progress.completedChecklistIds.includes(i.id)
  ).length;
  const isConsentSigned = Boolean(content?.consent && progress.consentsSigned[content.consent.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#12181F] h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: stageColor }}
              />
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {processName}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {stageName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status badge and location banner */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {content?.badge && (
              <span className="px-2.5 py-1 font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {content.badge}
              </span>
            )}
            {content?.roomOrCounter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {content.roomOrCounter}
              </span>
            )}
            {content?.estimatedWaitTime && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {content.estimatedWaitTime}
              </span>
            )}
          </div>

          {/* Overview Info text */}
          {content?.infoText && (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-300 mb-0.5">
                    {stageId === "cat-4" ? "Surgeon & Status Update" : "Clinical Advisory"}
                  </div>
                  <div>{content.infoText}</div>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-step instructions or attendant notes */}
          {(() => {
            const instructionsList: string[] = Array.isArray(content?.instructions)
              ? content.instructions
              : typeof content?.instructions === "string" && (content.instructions as string).trim()
              ? [(content.instructions as string)]
              : [];

            if (instructionsList.length === 0) return null;

            return (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  {stageId === "cat-4" ? "Information for Attendant / Family" : "Next Steps for Patient"}
                </h3>
                <ol className="space-y-2.5">
                  {instructionsList.map((inst, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span>{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}

          {/* Checklist Section */}
          {checklistItems.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pre-Checklist Requirements
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {completedCount} / {checklistItems.length} completed
                </span>
              </div>
              <div className="space-y-2.5">
                {checklistItems.map((item) => {
                  const isChecked = progress.completedChecklistIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleChecklist(item.id, isChecked)}
                      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                        isChecked
                          ? "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/60"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`text-sm font-semibold ${
                            isChecked
                              ? "text-emerald-900 dark:text-emerald-300 line-through opacity-85"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {item.label}
                          {item.required && (
                            <span className="ml-1.5 text-xs text-rose-500 font-normal">
                              *Required
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consent Section */}
          {content?.consent && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Informed Consent Form
              </h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {content.consent.title}
                    </h4>
                  </div>
                  {isConsentSigned ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <ShieldCheck className="w-3 h-3" /> Signed
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending Signature
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  {content.consent.content}
                </p>

                {isConsentSigned ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                    <Check className="w-4 h-4" />
                    Signed by {clientName} on{" "}
                    {new Date(
                      progress.consentsSigned[content.consent.id].signedAt
                    ).toLocaleDateString()}
                  </div>
                ) : signingConsentId === content.consent.id ? (
                  <div className="mt-2">
                    <DigitalSignaturePad
                      title={content.consent.title}
                      onSave={handleConsentSaved}
                      onCancel={() => setSigningConsentId(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSigningConsentId(content.consent!.id)}
                    className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#1456f0] hover:bg-[#1d4ed8] text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSignature className="w-4 h-4" />
                    Review & Sign Digital Consent
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Document Upload Requests */}
          {content?.documentRequests && content.documentRequests.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 font-sans">
                Requested Documents
              </h3>
              <div className="space-y-3">
                {content.documentRequests.map((docReq) => {
                  const isUploaded = progress.uploadedDocIds.includes(docReq.id);
                  return (
                    <div
                      key={docReq.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <FileText className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {docReq.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {docReq.description || "Upload required clinical document"} •{" "}
                            {docReq.acceptedTypes || "PDF, JPG"}
                          </div>
                        </div>
                      </div>

                      {isUploaded ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <Check className="w-3.5 h-3.5" /> Uploaded
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulateUpload(docReq.id, docReq.title)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1456f0] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200 dark:border-blue-900/60"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#1456f0] hover:bg-[#1d4ed8] rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
