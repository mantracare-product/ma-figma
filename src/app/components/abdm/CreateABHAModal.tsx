import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Download,
  Sparkles,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { abdmService, ABHAPatientRecord } from "../../services/abdmService";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import { toast } from "sonner";

interface CreateABHAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: ABHAPatientRecord) => void;
  onOpenCard?: (record: ABHAPatientRecord) => void;
}

type Step = "aadhaar" | "otp" | "address" | "success";

export const CreateABHAModal: React.FC<CreateABHAModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenCard,
}) => {
  const [step, setStep] = useState<Step>("aadhaar");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [consent, setConsent] = useState(true);
  const [txnId, setTxnId] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Step 3 data
  const [patientTempData, setPatientTempData] = useState<any>(null);
  const [suggestedAbhaNumber, setSuggestedAbhaNumber] = useState("");
  const [abhaAddressInput, setAbhaAddressInput] = useState("");
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [addressStatus, setAddressStatus] = useState<"idle" | "available" | "unavailable">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Step 4 final record
  const [createdRecord, setCreatedRecord] = useState<ABHAPatientRecord | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep("aadhaar");
    setAadhaarNumber("");
    setConsent(true);
    setOtp(["", "", "", "", "", ""]);
    setErrorMsg("");
    setLoading(false);
    setCreatedRecord(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Step 1: Submit Aadhaar
  const handleAadhaarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!consent) {
      setErrorMsg("You must give consent to proceed with Aadhaar verification");
      return;
    }

    try {
      setLoading(true);
      const res = await abdmService.sendAadhaarOtp(aadhaarNumber);
      setTxnId(res.txnId);
      setMaskedMobile(res.maskedMobile);
      setStep("otp");
      setTimer(60);
      toast.success("Aadhaar OTP sent successfully");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP");
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setErrorMsg("Please enter 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await abdmService.verifyAadhaarOtp(txnId, enteredOtp, aadhaarNumber);
      setPatientTempData(res.patientData);
      setSuggestedAbhaNumber(res.suggestedAbhaNumber);

      const defaultHandle = res.patientData.name.toLowerCase().replace(/\s+/g, ".") + "@abdm";
      setAbhaAddressInput(defaultHandle);

      // Check initial availability
      const avail = await abdmService.checkAbhaAddressAvailability(defaultHandle);
      setAddressStatus(avail.available ? "available" : "unavailable");
      setSuggestions(avail.suggestions);

      setStep("address");
      toast.success("Aadhaar verified successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid OTP");
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      document.getElementById(`create-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`create-otp-${index - 1}`)?.focus();
    }
  };

  // Step 3: Check Address Availability
  const handleCheckAddress = async (addrToTest?: string) => {
    const target = addrToTest || abhaAddressInput;
    if (!target) return;
    try {
      setIsCheckingAddress(true);
      const res = await abdmService.checkAbhaAddressAvailability(target);
      setAddressStatus(res.available ? "available" : "unavailable");
      setSuggestions(res.suggestions);
    } catch (err: any) {
      setAddressStatus("unavailable");
      toast.error(err.message || "Address check failed");
    } finally {
      setIsCheckingAddress(false);
    }
  };

  // Step 3: Finalize Address & Create ABHA
  const handleCreateAbhaAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addressStatus === "unavailable") {
      toast.error("Please choose an available ABHA address");
      return;
    }

    try {
      setLoading(true);
      const record = await abdmService.createAbhaRecord({
        abhaNumber: suggestedAbhaNumber,
        abhaAddress: abhaAddressInput.includes("@") ? abhaAddressInput : `${abhaAddressInput}@abdm`,
        patientData: patientTempData,
      });

      setCreatedRecord(record);
      setStep("success");
      onSuccess(record);
      toast.success("ABHA Created Successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create ABHA");
    } finally {
      setLoading(false);
    }
  };

  const copyAbhaNumber = () => {
    if (createdRecord) {
      navigator.clipboard.writeText(createdRecord.abhaNumber);
      setCopiedNumber(true);
      toast.success("ABHA Number copied");
      setTimeout(() => setCopiedNumber(false), 2000);
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
        className="relative w-full max-w-[480px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img src={abdmLogo} alt="ABDM" className="w-6 h-6 object-contain" />
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display leading-tight">
                Create ABHA Number
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Ayushman Bharat Digital Health Account
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

        {/* Step Indicator */}
        {step !== "success" && (
          <div className="px-6 pt-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600">
                Step {step === "aadhaar" ? "1" : step === "otp" ? "2" : "3"} of 3
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {step === "aadhaar"
                  ? "• Enter Aadhaar"
                  : step === "otp"
                  ? "• Verify OTP"
                  : "• Create ABHA Address"}
              </span>
            </div>
            <div className="flex gap-1.5">
              <div
                className={`h-1.5 w-6 rounded-full ${
                  step === "aadhaar" || step === "otp" || step === "address"
                    ? "bg-blue-600"
                    : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 w-6 rounded-full ${
                  step === "otp" || step === "address" ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 w-6 rounded-full ${
                  step === "address" ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: AADHAAR INPUT */}
            {step === "aadhaar" && (
              <motion.form
                key="step-aadhaar"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleAadhaarSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                    Enter Aadhaar Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Fingerprint className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
                        setAadhaarNumber(formatted);
                        setErrorMsg("");
                      }}
                      placeholder="XXXX XXXX XXXX"
                      className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 tracking-widest focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11.5px] text-slate-400 mt-1.5">
                    We will send a 6-digit OTP to your Aadhaar-linked mobile.
                  </p>
                </div>

                {/* Consent Checkbox */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="aadhaar-consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="aadhaar-consent"
                    className="text-xs text-slate-600 leading-relaxed cursor-pointer"
                  >
                    I consent to Aadhaar-based authentication to generate my ABHA number under the
                    Ayushman Bharat Digital Mission (ABDM).
                  </label>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={aadhaarNumber.replace(/\D/g, "").length !== 12 || !consent || loading}
                  className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Sending OTP...</span>
                    </div>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === "otp" && (
              <motion.form
                key="step-otp"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleOtpSubmit}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    Verify Aadhaar OTP
                  </h4>
                  <p className="text-xs text-slate-500">
                    We sent an OTP to your Aadhaar registered mobile (
                    <span className="font-semibold text-slate-700">{maskedMobile}</span>)
                  </p>
                  <p className="text-[11px] text-blue-600 font-semibold">(Demo OTP: 123456)</p>
                </div>

                {/* 6 OTP boxes */}
                <div className="flex justify-center gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`create-otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 text-center text-xl font-bold border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Resend in {timer}s</span>
                  <button
                    type="button"
                    disabled={timer > 0}
                    onClick={() => {
                      setTimer(60);
                      toast.success("New OTP sent (Code: 123456)");
                    }}
                    className={`font-semibold ${
                      timer > 0
                        ? "text-slate-400 cursor-not-allowed"
                        : "text-blue-600 hover:underline cursor-pointer"
                    }`}
                  >
                    Resend OTP
                  </button>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("aadhaar")}
                    className="w-1/3 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={otp.join("").length !== 6 || loading}
                    className="flex-1 h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Verifying OTP...</span>
                      </div>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: CREATE ABHA ADDRESS */}
            {step === "address" && (
              <motion.form
                key="step-address"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleCreateAbhaAddress}
                className="space-y-5"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-display">
                    Create your ABHA Address
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Your ABHA Address (e.g. name@abdm) helps you securely share and access your
                    health records across all facilities.
                  </p>
                </div>

                {/* Generated ABHA Number preview */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                      Generated ABHA Number
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono">
                      {suggestedAbhaNumber}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                {/* ABHA Address Input with Live Check */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                    Choose an ABHA Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={abhaAddressInput}
                        onChange={(e) => {
                          setAbhaAddressInput(e.target.value.toLowerCase().replace(/\s+/g, ""));
                          setAddressStatus("idle");
                        }}
                        placeholder="yourname@abdm"
                        className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCheckAddress()}
                      disabled={isCheckingAddress || !abhaAddressInput}
                      className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCheckingAddress ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>Check</span>
                    </button>
                  </div>

                  {/* Status feedback */}
                  <div className="mt-2">
                    {addressStatus === "available" && (
                      <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        This ABHA Address is available!
                      </p>
                    )}
                    {addressStatus === "unavailable" && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        This address is already taken. Please choose from suggestions below.
                      </p>
                    )}
                  </div>
                </div>

                {/* Suggestions chip list */}
                {suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Suggested handles:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setAbhaAddressInput(sug);
                            setAddressStatus("available");
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-[11px] font-medium text-slate-600 transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !abhaAddressInput}
                  className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Creating ABHA...</span>
                    </div>
                  ) : (
                    <>
                      <span>Create ABHA Address</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* STEP 4: SUCCESS SCREEN */}
            {step === "success" && createdRecord && (
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
                    ABHA Created Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ayushman Bharat Health Account has been issued for{" "}
                    <span className="font-bold text-slate-800">{createdRecord.name}</span>
                  </p>
                </div>

                {/* Identity Summary Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        ABHA Number
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 font-mono tracking-wider">
                        {createdRecord.abhaNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyAbhaNumber}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      title="Copy ABHA Number"
                    >
                      {copiedNumber ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      ABHA Address
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      {createdRecord.abhaAddress}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <span>Gender: {createdRecord.gender}</span>
                    <span>DOB: {createdRecord.dob}</span>
                    <span>{createdRecord.district}, {createdRecord.state}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCard) {
                        onOpenCard(createdRecord);
                      }
                      handleClose();
                    }}
                    className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ABHA Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full h-10 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Continue to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
