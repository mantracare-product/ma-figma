import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CreditCard,
  AtSign,
  Phone,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  FileCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { abdmService, ABHAPatientRecord } from "../../services/abdmService";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import { toast } from "sonner";
import { useNavigate } from "react-router";

interface VerifyABHAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified?: (patient: ABHAPatientRecord) => void;
  onOpenCard?: (patient: ABHAPatientRecord) => void;
}

type VerificationMethod = "number" | "address" | "mobile" | "aadhaar";

export const VerifyABHAModal: React.FC<VerifyABHAModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  onOpenCard,
}) => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<VerificationMethod>("number");
  const [inputValue, setInputValue] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Verified result state
  const [verifiedPatient, setVerifiedPatient] = useState<ABHAPatientRecord | null>(null);
  const [isReturningPatient, setIsReturningPatient] = useState(false);

  useEffect(() => {
    let interval: any;
    if (otpStep && timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep, timer]);

  if (!isOpen) return null;

  const handleReset = () => {
    setInputValue("");
    setOtpStep(false);
    setOtp(["", "", "", "", "", ""]);
    setErrorMsg("");
    setLoading(false);
    setVerifiedPatient(null);
    setIsReturningPatient(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleMethodChange = (m: VerificationMethod) => {
    setMethod(m);
    setInputValue("");
    setOtpStep(false);
    setOtp(["", "", "", "", "", ""]);
    setErrorMsg("");
    setVerifiedPatient(null);
  };

  // Submit Primary Verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (method === "number") {
      const clean = inputValue.replace(/[-\s]/g, "");
      if (clean.length !== 14) {
        setErrorMsg("Please enter a valid 14-digit ABHA Number (XX-XXXX-XXXX-XXXX)");
        return;
      }
      try {
        setLoading(true);
        const res = await abdmService.verifyByAbhaNumber(inputValue);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          setIsReturningPatient(res.isExistingPatient);
          if (onVerified) onVerified(res.patient);
          toast.success(res.message);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "ABHA verification failed");
      } finally {
        setLoading(false);
      }
    } else if (method === "address") {
      if (!inputValue.trim() || inputValue.length < 4) {
        setErrorMsg("Please enter a valid ABHA address (e.g. name@abdm)");
        return;
      }
      try {
        setLoading(true);
        const res = await abdmService.verifyByAbhaAddress(inputValue);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          setIsReturningPatient(res.isExistingPatient);
          if (onVerified) onVerified(res.patient);
          toast.success(res.message);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    } else if (method === "mobile") {
      const cleanMobile = inputValue.replace(/\D/g, "");
      if (cleanMobile.length !== 10) {
        setErrorMsg("Please enter a 10-digit Indian mobile number");
        return;
      }
      try {
        setLoading(true);
        await abdmService.sendMobileVerificationOtp(inputValue);
        setOtpStep(true);
        setTimer(60);
        toast.success("OTP sent to mobile number");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    } else if (method === "aadhaar") {
      const cleanAadhaar = inputValue.replace(/\D/g, "");
      if (cleanAadhaar.length !== 12) {
        setErrorMsg("Please enter a 12-digit Aadhaar number");
        return;
      }
      try {
        setLoading(true);
        await abdmService.sendAadhaarOtp(inputValue);
        setOtpStep(true);
        setTimer(60);
        toast.success("OTP sent to Aadhaar linked mobile");
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to send OTP");
      } finally {
        setLoading(false);
      }
    }
  };

  // Submit OTP for Mobile / Aadhaar
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setErrorMsg("Please enter 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      let res;
      if (method === "mobile") {
        res = await abdmService.verifyMobileOtp("TXN", enteredOtp, inputValue);
      } else {
        res = await abdmService.verifyByAadhaarOtp("TXN", enteredOtp, inputValue);
      }

      setVerifiedPatient(res.patient);
      setIsReturningPatient(res.isExistingPatient);
      if (onVerified) onVerified(res.patient);
      toast.success("Patient identity verified via ABDM!");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid OTP code");
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
      document.getElementById(`verify-otp-${index + 1}`)?.focus();
    }
  };

  const handleCreatePatientRecord = () => {
    if (!verifiedPatient) return;
    try {
      const saved = sessionStorage.getItem("clients");
      const currentClients = saved ? JSON.parse(saved) : [];
      const newClient = {
        id: `CL-ABHA-${Date.now().toString().slice(-4)}`,
        name: verifiedPatient.name,
        email: `${verifiedPatient.abhaAddress.split("@")[0]}@email.com`,
        phone: verifiedPatient.mobile.replace(/\D/g, "").slice(-10),
        country: "IN",
        countryCode: "+91",
        countryFlag: "🇮🇳",
        processes: ["Patient Intake"],
        stage: "Initial Contact",
        responsible: "Dr. Sharma",
        lastContact: new Date().toISOString().split("T")[0],
        status: "Active",
        location: `${verifiedPatient.district}, ${verifiedPatient.state}`,
      };
      sessionStorage.setItem("clients", JSON.stringify([newClient, ...currentClients]));
      toast.success(`Client record created for ${verifiedPatient.name}`);
      handleClose();
      navigate("/clients");
    } catch (e) {
      toast.error("Failed to create client record");
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
                Verify Patient ABHA
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verify existing ABHA identity or search patient record
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
            {!verifiedPatient ? (
              <motion.div
                key="verify-inputs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Method Selector Tabs (STRICTLY 4 METHODS) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 font-display">
                    How would you like to find the patient?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMethodChange("number")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        method === "number"
                          ? "bg-blue-50/80 border-blue-500 text-[#1456f0] shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="truncate">ABHA Number</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodChange("address")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        method === "address"
                          ? "bg-blue-50/80 border-blue-500 text-[#1456f0] shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <AtSign className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="truncate">ABHA Address</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodChange("mobile")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        method === "mobile"
                          ? "bg-blue-50/80 border-blue-500 text-[#1456f0] shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">Mobile Number</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodChange("aadhaar")}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                        method === "aadhaar"
                          ? "bg-blue-50/80 border-blue-500 text-[#1456f0] shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <Fingerprint className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="truncate">Aadhaar Number</span>
                    </button>
                  </div>
                </div>

                {!otpStep ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Method 1: ABHA Number */}
                    {method === "number" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                          Enter ABHA Number (14 Digits)
                        </label>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
                            const parts = [];
                            if (raw.length > 0) parts.push(raw.slice(0, 2));
                            if (raw.length > 2) parts.push(raw.slice(2, 6));
                            if (raw.length > 6) parts.push(raw.slice(6, 10));
                            if (raw.length > 10) parts.push(raw.slice(10, 14));
                            setInputValue(parts.join("-"));
                            setErrorMsg("");
                          }}
                          placeholder="XX-XXXX-XXXX-XXXX"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 tracking-wider focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                          autoFocus
                        />
                        <p className="text-[11.5px] text-slate-400 mt-1.5">
                          Try demo: <span className="text-blue-600 font-mono font-bold cursor-pointer" onClick={() => setInputValue("91-4821-9034-1182")}>91-4821-9034-1182</span>
                        </p>
                      </div>
                    )}

                    {/* Method 2: ABHA Address */}
                    {method === "address" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                          Enter ABHA Address
                        </label>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value.toLowerCase().trim());
                            setErrorMsg("");
                          }}
                          placeholder="patient@abdm"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                          autoFocus
                        />
                        <p className="text-[11.5px] text-slate-400 mt-1.5">
                          Try demo: <span className="text-blue-600 font-bold cursor-pointer" onClick={() => setInputValue("priya.sharma@abdm")}>priya.sharma@abdm</span>
                        </p>
                      </div>
                    )}

                    {/* Method 3: Mobile */}
                    {method === "mobile" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                          Mobile Number
                        </label>
                        <div className="flex items-center gap-2 border-2 border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-500/15">
                          <span className="text-sm font-semibold text-slate-600 pr-1.5 border-r border-slate-200">
                            🇮🇳 +91
                          </span>
                          <input
                            type="tel"
                            value={inputValue}
                            onChange={(e) => {
                              setInputValue(e.target.value.replace(/\D/g, "").slice(0, 10));
                              setErrorMsg("");
                            }}
                            placeholder="98XXXXXXXX"
                            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                            autoFocus
                          />
                        </div>
                        <p className="text-[11.5px] text-slate-400 mt-1.5">
                          Try demo: <span className="text-blue-600 font-bold cursor-pointer" onClick={() => setInputValue("9820172818")}>9820172818</span>
                        </p>
                      </div>
                    )}

                    {/* Method 4: Aadhaar */}
                    {method === "aadhaar" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-display">
                          Aadhaar Number
                        </label>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                            const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
                            setInputValue(formatted);
                            setErrorMsg("");
                          }}
                          placeholder="XXXX XXXX XXXX"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 tracking-wider focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                          autoFocus
                        />
                      </div>
                    )}

                    {errorMsg && (
                      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!inputValue || loading}
                      className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Searching ABDM...</span>
                        </div>
                      ) : (
                        <>
                          <span>{method === "mobile" || method === "aadhaar" ? "Send OTP" : "Verify Patient"}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        Enter Verification OTP
                      </h4>
                      <p className="text-xs text-slate-500">
                        Enter 6-digit OTP sent for verification
                      </p>
                      <p className="text-[11px] text-blue-600 font-semibold">(Demo OTP: 123456)</p>
                    </div>

                    <div className="flex justify-center gap-2.5">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`verify-otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          className="w-11 h-13 text-center text-xl font-bold border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 outline-none transition-all"
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>Resend in {timer}s</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTimer(60);
                          toast.success("New OTP sent (Code: 123456)");
                        }}
                        className="text-blue-600 font-semibold hover:underline"
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
                        onClick={() => setOtpStep(false)}
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
                            <span>Verifying...</span>
                          </div>
                        ) : (
                          <span>Verify OTP</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            ) : (
              /* VERIFIED RESULT SCREEN — NEW VS RETURNING PATIENT */
              <motion.div
                key="verify-result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                {/* Result Status Banner */}
                {isReturningPatient ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                          Patient Found
                        </span>
                        <h4 className="text-sm font-bold text-emerald-950 font-display">
                          Returning Patient (Record Linked)
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-200/70 px-2.5 py-1 rounded-full">
                      Existing Record
                    </span>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                          ABHA Verified ✓
                        </span>
                        <h4 className="text-sm font-bold text-blue-950 font-display">
                          New Patient (No prior record)
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-200/70 px-2.5 py-1 rounded-full">
                      New Patient
                    </span>
                  </div>
                )}

                {/* Patient Details Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Patient Name
                      </span>
                      <h4 className="text-base font-bold text-slate-900 font-display">
                        {verifiedPatient.name}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {verifiedPatient.gender} • {verifiedPatient.dob}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        ABHA Number
                      </span>
                      <span className="font-extrabold text-slate-900 font-mono">
                        {verifiedPatient.abhaNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        ABHA Address
                      </span>
                      <span className="font-bold text-blue-600 truncate block">
                        {verifiedPatient.abhaAddress}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs pt-1 border-t border-slate-200/70 flex items-center justify-between text-slate-500">
                    <span>Mobile: {verifiedPatient.mobile}</span>
                    <span>Location: {verifiedPatient.district}, {verifiedPatient.state}</span>
                  </div>
                </div>

                {/* Decision Action Buttons */}
                <div className="space-y-2.5">
                  {isReturningPatient ? (
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Opened record for ${verifiedPatient.name}`);
                        handleClose();
                        navigate("/clients");
                      }}
                      className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>View Existing Patient Record</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreatePatientRecord}
                      className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Create Patient Record with ABHA</span>
                    </button>
                  )}

                  {onOpenCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCard(verifiedPatient);
                        handleClose();
                      }}
                      className="w-full h-10 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span>View & Download ABHA Card</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
                  >
                    Verify Another Patient
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
