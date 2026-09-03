import React from "react";
import DrawerShell from "../ui/DrawerShell";
import { Encounter } from "../../types/rcmTypes";
import { useEncounters } from "../../context/RcmContext";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Shield,
  FileText,
  AlertCircle,
  Stethoscope,
} from "lucide-react";

interface EncounterDetailDrawerProps {
  encounter: Encounter | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EncounterDetailDrawer({
  encounter,
  isOpen,
  onClose,
}: EncounterDetailDrawerProps) {
  const { lockEncounterDocumentation } = useEncounters();

  if (!encounter) return null;

  const handleLockDocumentation = () => {
    lockEncounterDocumentation(encounter.id, "manual");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={`Encounter ${encounter.id}`}
      subtitle={`Patient: ${encounter.clientName} • Service Date: ${encounter.serviceDate}`}
      icon={<FileCheck className="w-5 h-5 text-blue-600" />}
      width="max-w-[720px]"
      headerRight={
        <div className="flex items-center gap-2">
          {encounter.status === "ready_to_bill" || encounter.status === "billed" ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-mono">
              Ready to Bill
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 font-mono">
              Pending Documentation
            </span>
          )}
        </div>
      }
    >
      <div className="p-6 space-y-6 h-full overflow-y-auto" style={{ fontFamily: "DM Sans, sans-serif" }}>
        {/* Documentation Status Card & Manual Override */}
        <div
          className={`p-4 rounded-xl border ${
            encounter.documentationLocked
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
              : "bg-amber-50/70 border-amber-200 text-amber-950"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {encounter.documentationLocked ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {encounter.documentationLocked
                    ? `Documentation Signed (${encounter.documentationSource})`
                    : "Documentation Locked Required"}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {encounter.documentationLocked
                    ? "Clinical note verified. Encounter is eligible for automated claim scrubbing and submission."
                    : "Per RCM compliance rules, claims cannot be submitted until attending notes are locked."}
                </p>
              </div>
            </div>

            {!encounter.documentationLocked && (
              <button
                type="button"
                onClick={handleLockDocumentation}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex-shrink-0"
              >
                Mark Complete (Manual Override)
              </button>
            )}
          </div>

          {encounter.notes && (
            <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 font-mono">
              Note: {encounter.notes}
            </div>
          )}
        </div>

        {/* Patient & Visit Metadata */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" /> Encounter Metadata
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Patient Name</span>
              <span className="font-bold text-slate-900">{encounter.clientName}</span>
              <span className="text-[11px] font-mono text-slate-400 block">{encounter.clientId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Rendering Clinician</span>
              <span className="font-bold text-slate-900">{encounter.providerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Appointment Link</span>
              <span className="font-bold text-slate-900">
                {encounter.appointmentTitle || `Appointment #${encounter.appointmentId}`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Total Estimated Charges</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                ${(encounter.totalCharges || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Procedures & Diagnosis */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" /> Recorded CPT & Diagnosis Codes
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">CPT Procedures:</span>
              <div className="flex flex-wrap gap-1.5">
                {encounter.cptCodes.map((code) => (
                  <span
                    key={code}
                    className="px-2.5 py-1 bg-blue-50 text-blue-800 font-mono font-bold rounded-lg border border-blue-200 text-xs"
                  >
                    CPT {code}
                  </span>
                ))}
              </div>
            </div>

            {encounter.diagnosisCodes && encounter.diagnosisCodes.length > 0 && (
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">ICD-10 Diagnoses:</span>
                <div className="flex flex-wrap gap-1.5">
                  {encounter.diagnosisCodes.map((dx) => (
                    <span
                      key={dx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-semibold rounded-lg border border-slate-200 text-xs"
                    >
                      {dx}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linked Claims */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" /> Generated Claims
          </h3>
          {encounter.claimIds.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
              No claim generated yet. Locks documentation to generate 837P claim draft.
            </div>
          ) : (
            <div className="space-y-2">
              {encounter.claimIds.map((cid) => (
                <div
                  key={cid}
                  className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs"
                >
                  <div>
                    <span className="font-bold font-mono text-blue-900">{cid}</span>
                    <span className="text-slate-500 text-[11px] ml-2">Standard In-Network Submission</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 font-mono">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
