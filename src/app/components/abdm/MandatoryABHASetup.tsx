import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  CreditCard,
  AtSign,
  Phone,
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Download,
  Copy,
  Check,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { abdmService, ABHAPatientRecord } from "../../services/abdmService";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import nhaLogo from "../../../assets/abdm/NHA.b7adfb67b258bee7ddf57b57969e2749.svg";
import mantraLogo from "../../../assets/abdm/logo.png";
import { toast } from "sonner";

interface MandatoryABHASetupProps {
  onComplete: (patient: ABHAPatientRecord) => void;
  onOpenCardModal?: (patient: ABHAPatientRecord) => void;
}

type MainMode = "choice" | "verify" | "create";
type VerificationMethod = "number" | "address" | "mobile" | "aadhaar";
type CreateStep = "aadhaar" | "otp" | "address" | "success";

export const MandatoryABHASetup: React.FC<MandatoryABHASetupProps> = ({
  onComplete,
  onOpenCardModal,
}) => {
  const [mode, setMode] = useState<MainMode>("choice");

  // ── Verification States ──
  const [verifyMethod, setVerifyMethod] = useState<VerificationMethod>("number");
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyOtpStep, setVerifyOtpStep] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState(["", "", "", "", "", ""]);
  const [verifyTimer, setVerifyTimer] = useState(60);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifiedPatient, setVerifiedPatient] = useState<ABHAPatientRecord | null>(null);

  // ── Creation States ──
  const [createStep, setCreateStep] = useState<CreateStep>("aadhaar");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [consent, setConsent] = useState(true);
  const [txnId, setTxnId] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [createOtp, setCreateOtp] = useState(["", "", "", "", "", ""]);
  const [createTimer, setCreateTimer] = useState(60);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Creation Step 3 & 4 data
  const [patientTempData, setPatientTempData] = useState<any>(null);
  const [suggestedAbhaNumber, setSuggestedAbhaNumber] = useState("");
  const [abhaAddressInput, setAbhaAddressInput] = useState("");
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [addressStatus, setAddressStatus] = useState<"idle" | "available" | "unavailable">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [createdRecord, setCreatedRecord] = useState<ABHAPatientRecord | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Timer effect for Verification OTP
  useEffect(() => {
    let interval: any;
    if (verifyOtpStep && verifyTimer > 0) {
      interval = setInterval(() => setVerifyTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [verifyOtpStep, verifyTimer]);

  // Timer effect for Creation OTP
  useEffect(() => {
    let interval: any;
    if (createStep === "otp" && createTimer > 0) {
      interval = setInterval(() => setCreateTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [createStep, createTimer]);

  // Reset to initial choice screen
  const handleResetToChoice = () => {
    setMode("choice");
    setVerifyInput("");
    setVerifyOtpStep(false);
    setVerifyOtp(["", "", "", "", "", ""]);
    setVerifyError("");
    setVerifyLoading(false);
    setVerifiedPatient(null);

    setCreateStep("aadhaar");
    setAadhaarNumber("");
    setConsent(true);
    setCreateOtp(["", "", "", "", "", ""]);
    setCreateError("");
    setCreateLoading(false);
    setCreatedRecord(null);
  };

  // ──────────────────────────────────────────
  // VERIFY HANDLERS
  // ──────────────────────────────────────────
  const handleVerifyMethodChange = (m: VerificationMethod) => {
    setVerifyMethod(m);
    setVerifyInput("");
    setVerifyOtpStep(false);
    setVerifyOtp(["", "", "", "", "", ""]);
    setVerifyError("");
    setVerifiedPatient(null);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");

    if (verifyMethod === "number") {
      const clean = verifyInput.replace(/[-\s]/g, "");
      if (clean.length !== 14) {
        setVerifyError("Please enter a valid 14-digit ABHA Number (XX-XXXX-XXXX-XXXX)");
        return;
      }
      try {
        setVerifyLoading(true);
        const res = await abdmService.verifyByAbhaNumber(verifyInput);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          toast.success(res.message);
        }
      } catch (err: any) {
        setVerifyError(err.message || "We couldn't verify this ABHA. Please check the details and try again.");
      } finally {
        setVerifyLoading(false);
      }
    } else if (verifyMethod === "address") {
      if (!verifyInput.trim() || verifyInput.length < 4) {
        setVerifyError("Please enter a valid ABHA address (e.g. name@abdm)");
        return;
      }
      try {
        setVerifyLoading(true);
        const res = await abdmService.verifyByAbhaAddress(verifyInput);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          toast.success(res.message);
        }
      } catch (err: any) {
        setVerifyError(err.message || "ABHA Address not found. Please try again.");
      } finally {
        setVerifyLoading(false);
      }
    } else if (verifyMethod === "mobile") {
      const clean = verifyInput.replace(/\D/g, "");
      if (clean.length !== 10) {
        setVerifyError("Please enter a valid 10-digit mobile number");
        return;
      }
      try {
        setVerifyLoading(true);
        await abdmService.sendMobileOtp(verifyInput);
        setVerifyOtpStep(true);
        setVerifyTimer(60);
        toast.success("OTP sent to your registered mobile number");
      } catch (err: any) {
        setVerifyError(err.message || "Failed to send OTP");
      } finally {
        setVerifyLoading(false);
      }
    } else if (verifyMethod === "aadhaar") {
      const clean = verifyInput.replace(/\D/g, "");
      if (clean.length !== 12) {
        setVerifyError("Please enter a valid 12-digit Aadhaar number");
        return;
      }
      try {
        setVerifyLoading(true);
        await abdmService.sendAadhaarOtp(verifyInput);
        setVerifyOtpStep(true);
        setVerifyTimer(60);
        toast.success("Aadhaar OTP sent to registered mobile number");
      } catch (err: any) {
        setVerifyError(err.message || "Failed to send Aadhaar OTP");
      } finally {
        setVerifyLoading(false);
      }
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    const entered = verifyOtp.join("");
    if (entered.length !== 6) {
      setVerifyError("The OTP is incorrect. Please enter all 6 digits.");
      return;
    }

    try {
      setVerifyLoading(true);
      if (verifyMethod === "mobile") {
        const res = await abdmService.verifyMobileOtp(entered, verifyInput);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          toast.success("Mobile OTP verified successfully!");
        }
      } else if (verifyMethod === "aadhaar") {
        const res = await abdmService.verifyAadhaarOtp("TXN-VERIFY", entered, verifyInput);
        if (res.patient) {
          setVerifiedPatient(res.patient);
          toast.success("Aadhaar verified successfully!");
        }
      }
    } catch (err: any) {
      setVerifyError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...verifyOtp];
    newOtp[index] = val.slice(-1);
    setVerifyOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`m-verify-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verifyOtp[index] && index > 0) {
      const prevInput = document.getElementById(`m-verify-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // ──────────────────────────────────────────
  // CREATE HANDLERS
  // ──────────────────────────────────────────
  const handleAadhaarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!consent) {
      setCreateError("You must give consent to proceed with Aadhaar verification");
      return;
    }

    const clean = aadhaarNumber.replace(/\D/g, "");
    if (clean.length !== 12) {
      setCreateError("Please enter a valid 12-digit Aadhaar number");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await abdmService.sendAadhaarOtp(aadhaarNumber);
      setTxnId(res.txnId);
      setMaskedMobile(res.maskedMobile);
      setCreateStep("otp");
      setCreateTimer(60);
      toast.success("Aadhaar OTP sent successfully");
    } catch (err: any) {
      setCreateError(err.message || "Failed to send OTP");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    const entered = createOtp.join("");
    if (entered.length !== 6) {
      setCreateError("Please enter 6-digit OTP");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await abdmService.verifyAadhaarOtp(txnId, entered, aadhaarNumber);
      setPatientTempData(res.patientData);
      setSuggestedAbhaNumber(res.suggestedAbhaNumber);

      const baseUsername = (res.patientData.name || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);
      const year = res.patientData.dob?.split("-")[0] || "92";
      setAbhaAddressInput(`${baseUsername}.${year}@abdm`);
      setSuggestions([
        `${baseUsername}.${year}@abdm`,
        `${baseUsername}${year}@abdm`,
        `${baseUsername}.health@abdm`,
      ]);

      setCreateStep("address");
      toast.success("Aadhaar authentication successful!");
    } catch (err: any) {
      setCreateError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...createOtp];
    newOtp[index] = val.slice(-1);
    setCreateOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`m-create-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCreateKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !createOtp[index] && index > 0) {
      const prevInput = document.getElementById(`m-create-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCheckAddressAvailability = async () => {
    if (!abhaAddressInput.trim()) return;
    setIsCheckingAddress(true);
    try {
      const res = await abdmService.checkAbhaAddressAvailability(abhaAddressInput);
      setAddressStatus(res.available ? "available" : "unavailable");
      if (!res.available && res.suggestions) {
        setSuggestions(res.suggestions);
      }
    } catch {
      setAddressStatus("available");
    } finally {
      setIsCheckingAddress(false);
    }
  };

  const handleFinalizeCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!abhaAddressInput.includes("@abdm")) {
      setCreateError("ABHA address must end with @abdm");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await abdmService.createAbhaAddress({
        txnId,
        abhaAddress: abhaAddressInput,
        tempData: patientTempData,
      });

      setCreatedRecord(res.record);
      setCreateStep("success");
      toast.success("ABHA created successfully!");
    } catch (err: any) {
      setCreateError(err.message || "Failed to finalize ABHA creation");
    } finally {
      setCreateLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // COMPLETE WORKFLOW & UNLOCK WORKSPACE
  // ──────────────────────────────────────────
  const handleProceedToWorkspace = (patient: ABHAPatientRecord) => {
    abdmService.setAbhaVerified(true, patient);
    onComplete(patient);
    toast.success("Welcome to ABDM Workspace! M1, M2 & M3 are now ready.");
  };

  return (
    <div className="w-full flex items-center justify-center min-h-[calc(100vh-140px)] p-2 sm:p-4">
      {/* Centered Healthcare Identity Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-[490px] bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden"
      >
        {/* Top Accent Line - MantraAssist primary brand gradient */}
        <div className="h-[3.5px] w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Logos & Title */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <img
                  src={abdmLogo}
                  alt="ABDM Logo"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-[11px] font-bold tracking-wider text-[#1456f0] uppercase font-display">
                  AYUSHMAN BHARAT DIGITAL MISSION
                </span>
              </div>

              {mode !== "choice" && (
                <button
                  type="button"
                  onClick={handleResetToChoice}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <h2
              className="text-2xl font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {mode === "choice" && "Verify or create your ABHA"}
              {mode === "verify" && (verifiedPatient ? "ABHA Verified" : "Verify Existing ABHA")}
              {mode === "create" && (createStep === "success" ? "ABHA Created" : "Create New ABHA")}
            </h2>

            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {mode === "choice" &&
                "Your ABHA identity is required to access ABDM health record and consent features."}
              {mode === "verify" &&
                (verifiedPatient
                  ? "Your ABHA identity has been verified successfully."
                  : "Verify your ABHA identity using your preferred M1 verification method.")}
              {mode === "create" &&
                (createStep === "success"
                  ? "Your 14-digit ABHA number and address are active and certified."
                  : "Generate a certified Ayushman Bharat Health Account via Aadhaar authentication.")}
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════
              VIEW 1: CHOICE SCREEN (2 Primary Options)
             ══════════════════════════════════════════════════════ */}
          {mode === "choice" && (
            <div className="space-y-4 pt-1">
              {/* Option 1: Verify Existing ABHA */}
              <button
                type="button"
                onClick={() => setMode("verify")}
                className="w-full p-4.5 rounded-2xl border-2 border-slate-200/90 hover:border-[#1456f0] bg-slate-50/60 hover:bg-blue-50/30 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center font-bold shadow-2xs group-hover:bg-[#1456f0] group-hover:text-white transition-colors">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display group-hover:text-[#1456f0] transition-colors">
                        Verify Existing ABHA
                      </h4>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        For users who already have an ABHA number or address
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1456f0] group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* Option 2: Create New ABHA */}
              <button
                type="button"
                onClick={() => setMode("create")}
                className="w-full p-4.5 rounded-2xl border-2 border-slate-200/90 hover:border-slate-800 bg-slate-50/60 hover:bg-slate-100/70 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shadow-2xs group-hover:bg-[#181e25] group-hover:text-white transition-colors">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display group-hover:text-slate-900 transition-colors">
                        Create New ABHA
                      </h4>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        Generate a new ABHA via instant Aadhaar OTP
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>

              {/* Security Banner */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 flex items-center gap-2.5 text-[#1456f0] text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#1456f0] flex-shrink-0" />
                <span>
                  Secure ABDM verification • Access to health records requires verified identity
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW 2: VERIFY EXISTING ABHA
             ══════════════════════════════════════════════════════ */}
          {mode === "verify" && (
            <div>
              {!verifiedPatient ? (
                <div className="space-y-5">
                  {/* Method Selector Tabs */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-display">
                      Choose verification method
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                      {(
                        [
                          { id: "number", label: "ABHA Number", icon: CreditCard },
                          { id: "address", label: "ABHA Address", icon: AtSign },
                          { id: "mobile", label: "Mobile", icon: Phone },
                          { id: "aadhaar", label: "Aadhaar", icon: Fingerprint },
                        ] as const
                      ).map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = verifyMethod === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleVerifyMethodChange(tab.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              isSelected
                                ? "bg-white text-[#1456f0] shadow-xs font-display"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="truncate">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Input Form (if OTP not triggered) */}
                  {!verifyOtpStep ? (
                    <form onSubmit={handleVerifySubmit} className="space-y-4">
                      {verifyMethod === "number" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                            ABHA Number
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={verifyInput}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "").slice(0, 14);
                                if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
                                if (val.length > 7) val = val.slice(0, 7) + "-" + val.slice(7);
                                if (val.length > 12) val = val.slice(0, 12) + "-" + val.slice(12);
                                setVerifyInput(val);
                              }}
                              placeholder="91-4821-9034-1182"
                              className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 font-mono text-sm tracking-wider text-slate-800 outline-none"
                            />
                            <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Enter the 14-digit ABHA ID provided by ABDM
                          </p>
                        </div>
                      )}

                      {verifyMethod === "address" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                            ABHA Address
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={verifyInput}
                              onChange={(e) => setVerifyInput(e.target.value)}
                              placeholder="priya.sharma@abdm"
                              className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 outline-none"
                            />
                            <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Enter the ABHA handle ending with @abdm
                          </p>
                        </div>
                      )}

                      {verifyMethod === "mobile" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                            Mobile Number
                          </label>
                          <div className="flex gap-2">
                            <span className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs flex items-center justify-center">
                              +91
                            </span>
                            <div className="relative flex-1">
                              <input
                                type="text"
                                required
                                value={verifyInput}
                                onChange={(e) =>
                                  setVerifyInput(e.target.value.replace(/\D/g, "").slice(0, 10))
                                }
                                placeholder="9820172818"
                                className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 text-sm text-slate-800 outline-none font-mono"
                              />
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            OTP will be sent to this registered mobile number
                          </p>
                        </div>
                      )}

                      {verifyMethod === "aadhaar" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                            Aadhaar Number
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={verifyInput}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "").slice(0, 12);
                                if (val.length > 4) val = val.slice(0, 4) + " " + val.slice(4);
                                if (val.length > 9) val = val.slice(0, 9) + " " + val.slice(9);
                                setVerifyInput(val);
                              }}
                              placeholder="XXXX XXXX 4821"
                              className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 font-mono text-sm tracking-widest text-slate-800 outline-none"
                            />
                            <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Your 12-digit Aadhaar number for UIDAI verification
                          </p>
                        </div>
                      )}

                      {verifyError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{verifyError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={verifyLoading}
                        className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {verifyLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>
                              {verifyMethod === "mobile" || verifyMethod === "aadhaar"
                                ? "Sending OTP..."
                                : "Verifying ABHA..."}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span>
                              {verifyMethod === "mobile" || verifyMethod === "aadhaar"
                                ? "Send OTP"
                                : "Verify ABHA"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* OTP Verification Step for Mobile/Aadhaar */
                    <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 font-display">
                            Enter 6-digit OTP
                          </label>
                          <span className="text-[11px] font-semibold text-[#1456f0]">
                            Sent to registered number
                          </span>
                        </div>

                        <div className="flex justify-between gap-1.5 sm:gap-2">
                          {verifyOtp.map((digit, idx) => (
                            <input
                              key={idx}
                              id={`m-verify-otp-${idx}`}
                              type="text"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleVerifyOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleVerifyKeyDown(idx, e)}
                              className="w-10 sm:w-12 h-12 text-center text-lg font-bold font-mono border-2 border-slate-200 rounded-xl focus:border-[#1456f0] focus:bg-blue-50/20 outline-none transition-all"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {verifyTimer > 0 ? (
                            `Resend OTP in ${verifyTimer}s`
                          ) : (
                            <button
                              type="button"
                              onClick={handleVerifySubmit}
                              className="text-[#1456f0] font-bold hover:underline cursor-pointer"
                            >
                              Resend OTP
                            </button>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyOtpStep(false);
                            setVerifyOtp(["", "", "", "", "", ""]);
                          }}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>

                      {verifyError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{verifyError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={verifyLoading}
                        className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {verifyLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Verifying OTP...</span>
                          </div>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify OTP & Unlock</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Verification Success State */
                <div className="space-y-5">
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#1456f0] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        ✓ ABHA Verified Successfully
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Patient identity verified and registered on ABDM network.
                      </p>
                    </div>
                  </div>

                  {/* Patient Details Snapshot */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Patient Name</span>
                      <span className="font-bold text-slate-800 font-display">
                        {verifiedPatient.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">ABHA Number</span>
                      <span className="font-mono font-bold text-[#1456f0]">
                        {verifiedPatient.abhaNumber}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">ABHA Address</span>
                      <span className="font-mono text-slate-700">
                        {verifiedPatient.abhaAddress}
                      </span>
                    </div>
                  </div>

                  {/* Mandatory Gateway Button */}
                  <button
                    type="button"
                    onClick={() => handleProceedToWorkspace(verifiedPatient)}
                    className="w-full h-12 rounded-2xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>Continue to ABDM</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              VIEW 3: CREATE NEW ABHA (3-Step Aadhaar Flow)
             ══════════════════════════════════════════════════════ */}
          {mode === "create" && (
            <div>
              {/* Step 1: Aadhaar Input */}
              {createStep === "aadhaar" && (
                <form onSubmit={handleAadhaarSubmit} className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                    <span>Step 1 of 3</span>
                    <span className="text-[#1456f0]">Aadhaar Authentication</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                      Enter Aadhaar Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={aadhaarNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "").slice(0, 12);
                          if (val.length > 4) val = val.slice(0, 4) + " " + val.slice(4);
                          if (val.length > 9) val = val.slice(0, 9) + " " + val.slice(9);
                          setAadhaarNumber(val);
                        }}
                        placeholder="XXXX XXXX 4821"
                        className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 font-mono text-sm tracking-widest text-slate-800 outline-none"
                      />
                      <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* UIDAI Consent Checkbox */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="m-aadhaar-consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#1456f0] focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="m-aadhaar-consent" className="cursor-pointer leading-relaxed">
                      I authorize NHA and MantraAssist to verify my Aadhaar with UIDAI to generate my ABHA
                      identity. Aadhaar number will not be permanently stored.
                    </label>
                  </div>

                  {createError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Sending OTP...</span>
                      </div>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Aadhaar OTP Verification */}
              {createStep === "otp" && (
                <form onSubmit={handleCreateOtpSubmit} className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                    <span>Step 2 of 3</span>
                    <span className="text-[#1456f0]">Verify Aadhaar OTP</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 font-display">
                        Verify Aadhaar OTP
                      </label>
                      <span className="text-[11px] font-semibold text-[#1456f0]">
                        {maskedMobile ? `Sent to ${maskedMobile}` : "Sent to registered mobile"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {createOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`m-create-otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCreateOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleCreateKeyDown(idx, e)}
                          className="w-10 sm:w-12 h-12 text-center text-lg font-bold font-mono border-2 border-slate-200 rounded-xl focus:border-[#1456f0] focus:bg-blue-50/20 outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {createTimer > 0 ? (
                        `Resend OTP in ${createTimer}s`
                      ) : (
                        <button
                          type="button"
                          onClick={handleAadhaarSubmit}
                          className="text-[#1456f0] font-bold hover:underline cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateStep("aadhaar")}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Change Aadhaar
                    </button>
                  </div>

                  {createError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Verifying & Authenticating...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 3: Create ABHA Address */}
              {createStep === "address" && (
                <form onSubmit={handleFinalizeCreate} className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                    <span>Step 3 of 3</span>
                    <span className="text-[#1456f0]">Choose ABHA Address</span>
                  </div>

                  {/* Authenticated UIDAI Snapshot */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Aadhaar Verified
                      </span>
                      <span className="font-bold text-slate-800 font-display">
                        {patientTempData?.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">
                        Generated ABHA
                      </span>
                      <span className="font-mono font-bold text-[#1456f0]">
                        {suggestedAbhaNumber}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 font-display">
                      Choose your ABHA Address
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          value={abhaAddressInput}
                          onChange={(e) => {
                            setAbhaAddressInput(e.target.value);
                            setAddressStatus("idle");
                          }}
                          placeholder="yourname@abdm"
                          className="w-full h-11 px-3.5 pl-10 rounded-xl border border-slate-300 focus:border-[#1456f0] focus:ring-2 focus:ring-blue-100 text-sm font-mono text-slate-800 outline-none"
                        />
                        <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckAddressAvailability}
                        disabled={isCheckingAddress}
                        className="h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingAddress ? "Checking..." : "Check"}
                      </button>
                    </div>

                    {addressStatus === "available" && (
                      <p className="text-[11px] font-bold text-[#1456f0] mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Address is available!</span>
                      </p>
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                        Suggested ABHA addresses:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAbhaAddressInput(s);
                              setAddressStatus("available");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-[#1456f0] border border-slate-200 text-xs font-mono text-slate-600 transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {createError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full h-11 rounded-xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Creating ABHA Address...</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Create ABHA Address</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 4: Creation Success & Card Download */}
              {createStep === "success" && createdRecord && (
                <div className="space-y-5">
                  <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#1456f0] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-display">
                        ✓ ABHA Created Successfully
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Your Ayushman Bharat Health Account has been activated and linked.
                      </p>
                    </div>
                  </div>

                  {/* Created Details Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">ABHA Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1456f0]">
                          {createdRecord.abhaNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(createdRecord.abhaNumber);
                            setCopiedNumber(true);
                            setTimeout(() => setCopiedNumber(false), 2000);
                          }}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {copiedNumber ? <Check className="w-3.5 h-3.5 text-[#1456f0]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">ABHA Address</span>
                      <span className="font-mono font-bold text-slate-800">
                        {createdRecord.abhaAddress}
                      </span>
                    </div>
                  </div>

                  {/* Download ABHA Card CTA */}
                  {onOpenCardModal && (
                    <button
                      type="button"
                      onClick={() => onOpenCardModal(createdRecord)}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download ABHA Card</span>
                    </button>
                  )}

                  {/* Mandatory Gateway Button */}
                  <button
                    type="button"
                    onClick={() => handleProceedToWorkspace(createdRecord)}
                    className="w-full h-12 rounded-2xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>Continue to ABDM</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Strictly 3 Approved Branding Badges at the bottom */}
          <div className="pt-4 border-t border-slate-100/90 flex items-center justify-between px-2">
            {/* 1. MantraAssist Logo */}
            <div className="flex items-center justify-center h-6 max-w-[95px]">
              <img
                src={mantraLogo}
                alt="MantraAssist"
                className="max-h-5 w-auto object-contain"
              />
            </div>

            {/* 2. ABDM Official Badge */}
            <div className="flex items-center justify-center h-6 max-w-[85px]">
              <img
                src={abdmLogo}
                alt="ABDM"
                className="max-h-5 w-auto object-contain"
              />
            </div>

            {/* 3. National Health Authority (NHA) Badge */}
            <div className="flex items-center justify-center h-6 max-w-[95px]">
              <img
                src={nhaLogo}
                alt="National Health Authority"
                className="max-h-5 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
