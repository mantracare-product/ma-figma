import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  FileSignature,
  FileText,
  Info,
  ShieldCheck,
  Building2,
  Stethoscope,
  Clock,
  MapPin,
  Check,
} from "lucide-react";
import { Stage } from "../../../../lib/useProcessStore";
import DigitalSignaturePad from "./DigitalSignaturePad";
import { toast } from "sonner";

interface StageContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stage: Stage | null;
  processName?: string;
  clientName?: string;
  doctorName?: string;
  roomName?: string;
  renderedHtml?: string;
  onConsentSigned?: (signatureDataUrl: string) => void;
}

export default function StageContentDrawer({
  isOpen,
  onClose,
  stage,
  processName = "Patient Care Journey",
  clientName = "Patient",
  doctorName,
  roomName,
  renderedHtml,
  onConsentSigned,
}: StageContentDrawerProps) {
  const [isSigningConsent, setIsSigningConsent] = useState(false);
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});

  if (!isOpen || !stage) return null;

  const title = stage.portalReceptionSettings?.cardTitle || stage.name;
  const description = stage.portalReceptionSettings?.cardDescription || stage.description;

  // Checklist items if available or sample standard care instructions
  const checklistItems = [
    { id: "c1", label: "Identity & Admission Verification", desc: "Confirm patient name and photo identification with desk staff" },
    { id: "c2", label: "Clinical Vitals & Prep Completed", desc: "Baseline blood pressure, heart rate, and temperature verified" },
    { id: "c3", label: "Consultation & Care Plan Reviewed", desc: "Attending clinician has reviewed active symptoms and treatment steps" },
  ];

  const toggleChecklist = (id: string) => {
    setCompletedChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSignatureComplete = (dataUrl: string) => {
    setIsSigningConsent(false);
    if (onConsentSigned) {
      onConsentSigned(dataUrl);
    }
    toast.success("Digital consent signed and verified successfully");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-50 border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span>{processName}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Stage Guidance & Care Verification</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Metadata Badges */}
          {(doctorName || roomName) && (
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              {doctorName && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Doctor</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">{doctorName}</span>
                  </div>
                </div>
              )}
              {roomName && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Location</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">{roomName}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description / Instructions */}
          {description && (
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Stage Instructions</span>
              </div>
              <p>{description}</p>
            </div>
          )}

          {/* Rendered HTML Content (if configured via admin workflows) */}
          {renderedHtml && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs text-xs text-slate-600 leading-relaxed prose prose-slate max-w-none">
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
          )}

          {/* Care Checklist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Patient Care Checklist</span>
              <span className="text-[11px] text-slate-400 font-medium">
                {Object.values(completedChecklist).filter(Boolean).length} of {checklistItems.length} verified
              </span>
            </div>

            <div className="space-y-2">
              {checklistItems.map((item) => {
                const isChecked = Boolean(completedChecklist[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklist(item.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isChecked
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-white border-slate-200/90 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold ${isChecked ? "line-through opacity-80" : ""}`}>
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Digital Consent Signature Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <FileSignature className="w-4 h-4 text-blue-600" />
                <span>Informed Consent & Verification</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>HIPAA Verified</span>
              </span>
            </div>

            {isSigningConsent ? (
              <DigitalSignaturePad
                title="Sign Informed Consent"
                subtitle={`Verification for ${clientName} under ${processName}`}
                onSave={handleSignatureComplete}
                onCancel={() => setIsSigningConsent(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsSigningConsent(true)}
                className="w-full py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileSignature className="w-4 h-4" />
                <span>Provide Digital e-Signature</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
