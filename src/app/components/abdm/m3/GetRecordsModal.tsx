import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { abdmService, ABHAPatientRecord, ConsentRecord } from "../../../services/abdmService";
import { toast } from "sonner";

interface GetRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestConsent?: () => void;
}

type FetchState = "idle" | "preparing" | "fetching" | "processing" | "success";

export const GetRecordsModal: React.FC<GetRecordsModalProps> = ({
  isOpen,
  onClose,
  onRequestConsent,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(null);
  const [consentGate, setConsentGate] = useState<{ valid: boolean; consent?: ConsentRecord; reason?: string } | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("idle");

  const records = abdmService.getRecords();
  if (!isOpen) return null;

  const handleReset = () => {
    setSearchQuery("");
    setSelectedPatient(null);
    setConsentGate(null);
    setFetchState("idle");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const filteredPatients = records.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.abhaAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mobile.includes(searchQuery)
  );

  const handleSelectPatient = (patient: ABHAPatientRecord) => {
    setSelectedPatient(patient);
    const gate = abdmService.verifyConsentStatus(patient.abhaAddress);
    setConsentGate(gate);
    setFetchState("idle");
  };

  const handleStartFetch = () => {
    if (!selectedPatient || !consentGate?.valid) return;
    setFetchState("preparing");

    setTimeout(() => {
      setFetchState("fetching");
    }, 700);

    setTimeout(() => {
      setFetchState("processing");
    }, 1600);

    setTimeout(() => {
      setFetchState("success");
      toast.success("Health records retrieved via ABDM Gateway!");
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative w-full max-w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Get Health Records (HIU)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Consent-Gated Health Information Retrieval
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {!selectedPatient ? (
              <motion.div
                key="select-p"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                    Select Patient to Retrieve Records
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search patient name, ABHA or mobile..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-hide">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs hover:border-blue-300 cursor-pointer"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 font-display">{p.name}</h4>
                        <span className="text-blue-600 font-semibold">{p.abhaAddress}</span>
                      </div>
                      <span className="text-blue-600 font-bold">Select →</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : fetchState === "idle" ? (
              <motion.div
                key="consent-check"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Target Patient
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-display">
                      {selectedPatient.name}
                    </h4>
                    <span className="text-xs font-semibold text-blue-600">
                      {selectedPatient.abhaAddress}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* CONSENT SECURITY GATE */}
                {consentGate?.valid ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Valid Patient Consent Granted ✓</span>
                    </div>
                    <p className="text-[11.5px] text-emerald-700">
                      Artefact: <span className="font-mono font-bold">{consentGate.consent?.artefactId}</span>
                      <br />
                      Purpose: {consentGate.consent?.purpose}
                    </p>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-rose-900 font-display">
                          Cannot Retrieve Health Records
                        </h4>
                        <p className="text-[11.5px] text-rose-700 mt-0.5">
                          {consentGate?.reason}
                        </p>
                      </div>
                    </div>

                    {onRequestConsent && (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onRequestConsent();
                        }}
                        className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Request Consent Now</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="w-1/3 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  {consentGate?.valid && (
                    <button
                      type="button"
                      onClick={handleStartFetch}
                      className="flex-1 h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      <span>Get Health Records</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ) : fetchState !== "success" ? (
              <motion.div
                key="fetching-states"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-4"
              >
                <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    {fetchState === "preparing" && "Preparing secure request..."}
                    {fetchState === "fetching" && "Retrieving authorized health records via ABDM..."}
                    {fetchState === "processing" && "Processing FHIR health information..."}
                  </h4>
                  <p className="text-xs text-slate-400">
                    HIU Gateway Verification & Decryption
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="fetch-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5"
              >
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Health Records Retrieved!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    3 health records retrieved for{" "}
                    <span className="font-bold text-slate-800">{selectedPatient?.name}</span>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  View in Medical History
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
