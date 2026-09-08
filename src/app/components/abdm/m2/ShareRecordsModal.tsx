import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share2,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Lock,
  Send,
  Building,
} from "lucide-react";
import { abdmService, ABHAPatientRecord, ConsentRecord } from "../../../services/abdmService";
import { toast } from "sonner";

interface ShareRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "select-patient" | "consent-gate" | "package-data" | "transfer" | "success";

export const ShareRecordsModal: React.FC<ShareRecordsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<Step>("select-patient");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ABHAPatientRecord | null>(null);
  const [recipientName, setRecipientName] = useState("City Speciality Hospital");
  const [consentCheck, setConsentCheck] = useState<{ valid: boolean; consent?: ConsentRecord; reason?: string } | null>(null);
  const [pkgInfo, setPkgInfo] = useState<{ packageId: string; format: string; recordsCount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const records = abdmService.getRecords();
  if (!isOpen) return null;

  const handleReset = () => {
    setStep("select-patient");
    setSearchQuery("");
    setSelectedPatient(null);
    setRecipientName("City Speciality Hospital");
    setConsentCheck(null);
    setPkgInfo(null);
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
    // Verify consent gate
    const gate = abdmService.verifyConsentStatus(patient.abhaAddress);
    setConsentCheck(gate);
    setStep("consent-gate");
  };

  const handlePreparePackage = async () => {
    if (!selectedPatient || !consentCheck?.valid) return;
    try {
      setLoading(true);
      const pkg = await abdmService.packageHealthData(["CC-101", "CC-102"]);
      setPkgInfo(pkg);
      setStep("package-data");
    } catch (err) {
      toast.error("Data packaging failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedPatient || !pkgInfo) return;
    try {
      setLoading(true);
      await abdmService.transferHealthData(pkgInfo.packageId, recipientName, selectedPatient.abhaAddress);
      setStep("success");
      toast.success("Health records shared securely!");
    } catch (err) {
      toast.error("Transfer failed");
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
        className="relative w-full max-w-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Share Health Records
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Consent-Verified Encrypted FHIR Health Data Exchange
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

        {/* Body Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT PATIENT & RECIPIENT */}
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
                    Select Patient
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search patient name, ABHA or mobile..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Choose Patient
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
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
                          Check Consent →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: CONSENT VERIFICATION GATE (SECURITY GATE) */}
            {step === "consent-gate" && selectedPatient && (
              <motion.div
                key="step-consent-gate"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5"
              >
                {/* Patient Summary Header */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between">
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
                  <span className="text-xs text-slate-500 font-medium">
                    Mobile: {selectedPatient.mobile}
                  </span>
                </div>

                {/* CONSENT GATE CHECKLIST */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block font-display">
                    Consent Verification Gate
                  </span>

                  <div className="space-y-2 bg-slate-50/70 border border-slate-200 rounded-2xl p-4 text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Patient identified & ABHA verified</span>
                    </div>

                    <div className="flex items-center gap-2 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Encounters & care contexts selected (2 Records)</span>
                    </div>

                    {consentCheck?.valid ? (
                      <>
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Valid patient consent found ({consentCheck.consent?.artefactId})</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Purpose matches: "{consentCheck.consent?.purpose}"</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Consent is active & not expired</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium mt-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Sharing Unavailable</span>
                          <p className="text-[11.5px] text-rose-600">
                            {consentCheck?.reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient Selection */}
                {consentCheck?.valid && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                      Select Recipient Facility
                    </label>
                    <select
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="City Speciality Hospital">City Speciality Hospital (HRP)</option>
                      <option value="Apollo Diagnostics Center">Apollo Diagnostics Center</option>
                      <option value="Max Healthcare Network">Max Healthcare Network</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("select-patient")}
                    className="w-1/3 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  {consentCheck?.valid ? (
                    <button
                      type="button"
                      onClick={handlePreparePackage}
                      disabled={loading}
                      className="flex-1 h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Prepare Health Package</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 h-11 rounded-2xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed"
                      disabled
                    >
                      Consent Required to Share
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: PACKAGE DATA (FHIR STANDARDS) */}
            {step === "package-data" && pkgInfo && (
              <motion.div
                key="step-package-data"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5 text-center"
              >
                <div className="w-14 h-14 rounded-3xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Lock className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 font-display">
                    Prepare Health Records Package
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Health records are being standardized and encrypted into FHIR R4 format.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Package ID:</span>
                    <span className="font-mono font-bold text-slate-900">{pkgInfo.packageId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Format:</span>
                    <span className="font-bold text-indigo-600">{pkgInfo.format} Standard</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Recipient:</span>
                    <span className="font-bold text-slate-800">{recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Encryption:</span>
                    <span className="font-bold text-emerald-600">AES-256 GCM</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={loading}
                  className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transfer Health Records</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 4: SUCCESS CONFIRMATION */}
            {step === "success" && (
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
                    Health Records Shared Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Encrypted health records transferred securely to{" "}
                    <span className="font-bold text-slate-800">{recipientName}</span>.
                  </p>
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
