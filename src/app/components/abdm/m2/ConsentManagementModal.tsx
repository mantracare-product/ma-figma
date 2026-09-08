import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  FileText,
  Lock,
  ExternalLink,
} from "lucide-react";
import { abdmService, ConsentRecord } from "../../../services/abdmService";
import { toast } from "sonner";

interface ConsentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsentManagementModal: React.FC<ConsentManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [consents, setConsents] = useState<ConsentRecord[]>(() => abdmService.getConsents());
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);

  if (!isOpen) return null;

  const handleRevoke = async (id: string) => {
    try {
      await abdmService.revokeConsent(id);
      setConsents(abdmService.getConsents());
      if (selectedConsent?.id === id) {
        setSelectedConsent((prev) => (prev ? { ...prev, status: "REVOKED" } : null));
      }
      toast.success("Consent revoked successfully");
    } catch (err) {
      toast.error("Failed to revoke consent");
    }
  };

  const getStatusBadge = (status: ConsentRecord["status"]) => {
    switch (status) {
      case "GRANTED":
        return (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Granted ✓
          </span>
        );
      case "PENDING":
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        );
      case "EXPIRED":
        return (
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            Expired
          </span>
        );
      case "REVOKED":
      case "DENIED":
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-[620px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Consent Management
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Manage patient permissions for accessing and sharing health records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Active Consents List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Consent Artefacts & Requests ({consents.length})
              </span>
              <span className="text-slate-400 text-[11px]">Audit Verified</span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
              {consents.map((c) => (
                <div
                  key={c.id}
                  className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-2 hover:border-[#1456f0]/40 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 font-display">
                        Patient: {c.patientName}
                      </h4>
                      <span className="text-[11px] font-semibold text-[#1456f0]">
                        {c.abhaAddress}
                      </span>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400 text-[10.5px]">Requester:</span>
                      <span className="font-bold text-slate-800">{c.requesterName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400 text-[10.5px]">Purpose:</span>
                      <span className="font-bold text-slate-800">{c.purpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400 text-[10.5px]">Duration:</span>
                      <span>{c.fromDate} to {c.toDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Artefact: {c.artefactId || "ARTF-PENDING"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedConsent(c)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View Details</span>
                      </button>
                      {c.status === "GRANTED" && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consent Artefact Detail Drawer/Card */}
          {selectedConsent && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-lg border border-slate-800 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold font-display uppercase tracking-wider text-blue-400">
                    Consent Artefact Object ({selectedConsent.artefactId || "N/A"})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConsent(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Patient</span>
                  <span className="font-bold">{selectedConsent.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">ABHA Address</span>
                  <span className="font-semibold text-blue-400">{selectedConsent.abhaAddress}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Requester</span>
                  <span className="font-semibold">{selectedConsent.requesterName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Granted Period</span>
                  <span>{selectedConsent.fromDate} – {selectedConsent.toDate}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold mb-1">
                  Requested Health Information Categories
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedConsent.recordTypes.map((rt, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-semibold text-blue-300 border border-slate-700">
                      • {rt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
