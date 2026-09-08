import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Smartphone,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { abdmService, ABHAPatientRecord, CareContext } from "../../../services/abdmService";
import { toast } from "sonner";

interface LinkCareContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = "select-patient" | "care-context" | "notification" | "success";

export const LinkCareContextModal: React.FC<LinkCareContextModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>("select-patient");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(null);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>(["CC-101", "CC-102"]);
  const [notifState, setNotifState] = useState<"idle" | "sending" | "sent" | "approved">("idle");
  const [loading, setLoading] = useState(false);

  const records = abdmService.getRecords();
  const careContexts = abdmService.getCareContexts();

  if (!isOpen) return null;

  const handleReset = () => {
    setStep("select-patient");
    setSearchQuery("");
    setSelectedPatient(null);
    setSelectedContextIds(["CC-101", "CC-102"]);
    setNotifState("idle");
    setLoading(false);
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
    setStep("care-context");
  };

  const toggleContext = (id: string) => {
    setSelectedContextIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSendLinkingRequest = async () => {
    if (!selectedPatient) return;
    if (selectedContextIds.length === 0) {
      toast.error("Please select at least 1 care context to link");
      return;
    }

    setStep("notification");
    setNotifState("sending");

    setTimeout(() => {
      setNotifState("sent");
    }, 1000);

    setTimeout(() => {
      setNotifState("approved");
    }, 2800);
  };

  const handleFinalizeLinking = async () => {
    if (!selectedPatient) return;
    try {
      setLoading(true);
      await abdmService.linkCareContext(selectedPatient.abhaAddress, selectedContextIds);
      setStep("success");
      if (onSuccess) onSuccess();
      toast.success("Care Context linked to ABHA successfully!");
    } catch (err: any) {
      toast.error("Linking failed");
    } finally {
      setLoading(false);
    }
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
        className="relative w-full max-w-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Link Health Records
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                HIP-Initiated Care Context Linking to ABHA
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

        {/* Content Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT PATIENT */}
            {step === "select-patient" && (
              <motion.div
                key="step-select-patient"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                    Select Patient to Link Records
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, ABHA or mobile..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recent Patients
                  </span>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-3 bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 font-display">
                              {p.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-blue-600">
                              {p.abhaAddress}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                          Select →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CARE CONTEXT & HIP LINKING */}
            {step === "care-context" && selectedPatient && (
              <motion.div
                key="step-care-context"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {/* Patient Header */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Selected Patient
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-display">
                      {selectedPatient.name}
                    </h4>
                    <span className="text-xs font-semibold text-blue-600">
                      {selectedPatient.abhaAddress}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ABHA Linked
                  </span>
                </div>

                {/* Explainer Card: What is a Care Context? */}
                <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-3.5 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-900 leading-relaxed">
                    <span className="font-bold block">What is a Care Context?</span>
                    A care context represents a patient's specific encounter — such as an OPD consultation, diagnostic report, or prescription.
                  </div>
                </div>

                {/* Care Context Selection List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Select Encounter Care Contexts
                  </span>
                  <div className="space-y-2">
                    {careContexts.map((cc) => (
                      <div
                        key={cc.id}
                        onClick={() => toggleContext(cc.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedContextIds.includes(cc.id)
                            ? "bg-blue-50/80 border-blue-400 shadow-2xs"
                            : "bg-white border-slate-200/80 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedContextIds.includes(cc.id)}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                              {cc.encounterType} • {cc.date}
                            </span>
                            <h5 className="text-xs font-bold text-slate-800 font-display">
                              {cc.facilityName}
                            </h5>
                            <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                              {cc.summary}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {cc.doctorName || "Enc #102"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HIP-initiated notification notice */}
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>HIP Initiated by <b>MantraAssist Health Centre</b></span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("select-patient")}
                    className="w-1/3 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSendLinkingRequest}
                    className="flex-1 h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Send Linking Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PATIENT NOTIFICATION & APPROVAL */}
            {step === "notification" && selectedPatient && (
              <motion.div
                key="step-notification"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center"
              >
                <div className="w-14 h-14 rounded-3xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Smartphone className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 font-display">
                    Patient Mobile Notification
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    A notification was sent to {selectedPatient.name}'s registered PHR app (
                    <span className="font-semibold">{selectedPatient.mobile}</span>) to approve record linkage.
                  </p>
                </div>

                {/* Status Indicator Pill */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold">
                    {notifState === "sending" && (
                      <span className="text-amber-600 flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Sending Notification Request...
                      </span>
                    )}
                    {notifState === "sent" && (
                      <span className="text-blue-600 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        Notification Sent • Waiting for Patient Approval...
                      </span>
                    )}
                    {notifState === "approved" && (
                      <span className="text-emerald-600 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Approved by Patient via ABHA PHR App ✓
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={notifState !== "approved" || loading}
                  onClick={handleFinalizeLinking}
                  className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Finalizing Link...</span>
                    </div>
                  ) : (
                    <span>Finalize Record Linkage</span>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {step === "success" && selectedPatient && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5"
              >
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    Care Context Linked Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    The selected health records have been linked to{" "}
                    <span className="font-bold text-slate-800">{selectedPatient.name}</span>'s ABHA (
                    <span className="font-semibold text-blue-600">{selectedPatient.abhaAddress}</span>).
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-left text-xs text-emerald-950 space-y-1">
                  <span className="font-bold block">✓ HIP Linking Certificate Issued</span>
                  <span className="text-[11px] text-emerald-700 block">
                    DHIS Incentive (+₹20) added to facility wallet.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
