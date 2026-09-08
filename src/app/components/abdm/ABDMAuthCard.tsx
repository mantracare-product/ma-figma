import React, { useState } from "react";
import { motion } from "motion/react";
import { Phone, Fingerprint, ArrowRight, ShieldCheck } from "lucide-react";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import nhaLogo from "../../../assets/abdm/NHA.b7adfb67b258bee7ddf57b57969e2749.svg";
import mantraLogo from "../../../assets/abdm/logo.png";
import { toast } from "sonner";

interface ABDMAuthCardProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const ABDMAuthCard: React.FC<ABDMAuthCardProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [authMode, setAuthMode] = useState<"aadhaar" | "mobile">("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(45);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "mobile") {
      const clean = mobileNumber.replace(/\D/g, "");
      if (clean.length < 10) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
    } else {
      const clean = aadhaarNumber.replace(/\D/g, "");
      if (clean.length < 12) {
        toast.error("Please enter a valid 12-digit Aadhaar number");
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      toast.success("OTP sent to your registered mobile number");
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      toast.error("Please enter complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Healthcare Professional ID authenticated successfully!");
      onSuccess();
    }, 900);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`hpr-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`hpr-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const isInputValid =
    authMode === "mobile"
      ? mobileNumber.replace(/\D/g, "").length === 10
      : aadhaarNumber.replace(/\D/g, "").length === 12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={onCancel}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.96 }}
        className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 select-none"
      >
        {/* Top 3.5px MantraAssist Blue Accent Line */}
        <div className="h-[3.5px] w-full bg-gradient-to-r from-[#1456f0] via-[#3b82f6] to-[#181e25]" />

        <div className="p-7 pt-6 space-y-6">
          {/* Top Logo Badge */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs flex items-center justify-center p-2 mb-3.5">
              <img
                src={abdmLogo}
                alt="ABDM Symbol"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h2
              className="text-xl font-bold text-slate-900 leading-tight max-w-[280px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Continue with your Healthcare Professional ID
            </h2>
          </div>

          {step === "input" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Segmented Selector with Recommended Badge */}
              <div className="relative pt-2">
                <div className="absolute top-0 left-4 z-10">
                  <span className="text-[10px] font-bold tracking-wide text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase">
                    Recommended
                  </span>
                </div>
                <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode("aadhaar")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      authMode === "aadhaar"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                    <span>Aadhaar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("mobile")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      authMode === "mobile"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Input Field */}
              <div>
                {authMode === "mobile" ? (
                  <div className="flex items-center gap-2 border-2 border-blue-500/70 rounded-2xl px-3.5 py-2.5 bg-white shadow-xs focus-within:ring-3 focus-within:ring-blue-500/20">
                    <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
                      <span className="text-base">🇮🇳</span>
                      <span className="text-sm font-semibold text-slate-700">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Mobile Number"
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border-2 border-blue-500/70 rounded-2xl px-3.5 py-2.5 bg-white shadow-xs focus-within:ring-3 focus-within:ring-blue-500/20">
                    <Fingerprint className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={aadhaarNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
                        setAadhaarNumber(formatted);
                      }}
                      placeholder="XXXX XXXX XXXX (12-digit Aadhaar)"
                      className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 tracking-wider"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Terms and conditions notice */}
              <p className="text-center text-[11.5px] text-slate-500">
                By proceeding, you agree to{" "}
                <span className="text-blue-600 underline font-medium cursor-pointer">T&C</span>
              </p>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={!isInputValid || loading}
                className={`w-full h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isInputValid && !loading
                    ? "bg-[#1456f0] hover:bg-[#2563eb] text-white shadow-md shadow-blue-500/20 active:scale-[0.99]"
                    : "bg-slate-200/90 text-slate-400 cursor-not-allowed"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-400/40 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit OTP sent to{" "}
                  <span className="font-bold text-slate-800">
                    {authMode === "mobile" ? `+91 ${mobileNumber}` : `Aadhaar ending in ${aadhaarNumber.slice(-4)}`}
                  </span>
                </p>
                <span className="text-[11px] text-blue-600 font-semibold">(Demo OTP: 123456)</span>
              </div>

              {/* OTP 6 digits */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`hpr-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-10 h-12 text-center text-lg font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Resend OTP in {timer}s</span>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("New OTP sent (Code: 123456)");
                    setTimer(60);
                  }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={otp.join("").length !== 6 || loading}
                className="w-full h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Authenticate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("input")}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
              >
                ← Back to Mobile/Aadhaar
              </button>
            </form>
          )}

          {/* STRICT 3 Logos Branding at the bottom */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-2">
            {/* 1. MantraAssist Logo */}
            <div className="flex items-center justify-center h-6 max-w-[90px]">
              <img
                src={mantraLogo}
                alt="MantraAssist"
                className="max-h-5 w-auto object-contain"
              />
            </div>

            {/* 2. ABDM Badge */}
            <div className="flex items-center justify-center h-6 max-w-[80px]">
              <img
                src={abdmLogo}
                alt="ABDM"
                className="max-h-5 w-auto object-contain"
              />
            </div>

            {/* 3. National Health Authority (NHA) Badge */}
            <div className="flex items-center justify-center h-6 max-w-[90px]">
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
