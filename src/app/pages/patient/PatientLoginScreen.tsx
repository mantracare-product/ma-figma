import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Calendar,
  FileText,
  CreditCard,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Phone,
  Mail,
  User,
  Sparkles,
  HeartPulse,
  UserPlus,
  AlertCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getStoredClients, saveStoredClients, Client } from "../../../lib/clientsStore";
import maLogo from "../../../imports/ma_logo-1.png";

export default function PatientLoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramClientId = searchParams.get("clientId") || searchParams.get("id");

  const [clients, setClients] = useState<Client[]>(getStoredClients);

  // Sync clients store
  useEffect(() => {
    setClients(getStoredClients());
  }, []);

  const initialClient = paramClientId ? clients.find((c) => c.id === paramClientId) : null;

  // Step state: "identifier" | "otp" | "register" | "register_otp"
  const [step, setStep] = useState<"identifier" | "otp" | "register" | "register_otp">("identifier");

  // Identifier state
  const [identifier, setIdentifier] = useState(() => (initialClient?.email || initialClient?.phone || ""));
  const [matchedClient, setMatchedClient] = useState<Client | null>(initialClient || null);

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");

  // OTP State (6 digits)
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Helpers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus first OTP input when entering OTP steps
  useEffect(() => {
    if (step === "otp" || step === "register_otp") {
      setOtpValues(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Quick Client Match Finder
  const findMatchingClient = (rawInput: string): Client | null => {
    const clean = rawInput.trim().toLowerCase();
    const cleanDigits = rawInput.replace(/\D/g, "");

    return (
      clients.find((c) => {
        if (c.id.toLowerCase() === clean) return true;
        if (c.email && c.email.toLowerCase() === clean) return true;
        const cDigits = (c.phone || (c as any).phoneNumber || "").replace(/\D/g, "");
        if (cleanDigits && cDigits && (cDigits === cleanDigits || cDigits.endsWith(cleanDigits) || cleanDigits.endsWith(cDigits))) {
          return true;
        }
        return false;
      }) || null
    );
  };

  // Step 1: Identifier Submission
  const handleIdentifierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("Please enter your phone number or email address");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const match = findMatchingClient(trimmed);

      if (match) {
        setMatchedClient(match);
        setStep("otp");
      } else {
        setMatchedClient(null);
        // Pre-populate either phone or email in register screen
        if (trimmed.includes("@")) {
          setRegEmail(trimmed);
          setRegPhone("");
        } else {
          setRegPhone(trimmed);
          setRegEmail("");
        }
        setStep("register");
      }
    }, 300);
  };

  // Step 2: Register Form Submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName.trim() || regName.trim().length < 2) {
      setError("Please enter your full legal name");
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim() || !emailRegex.test(regEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("register_otp");
    }, 250);
  };

  // Handle OTP Slot Inputs
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newValues = [...otpValues];
    newValues[index] = val.slice(-1);
    setOtpValues(newValues);
    setError(null);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setOtpValues(newValues);

    const focusIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // Complete Login
  const completeLogin = (client: Client) => {
    sessionStorage.setItem("patient_portal_active_client_id", client.id);
    localStorage.setItem("patient_portal_active_client_id", client.id);
    window.dispatchEvent(new CustomEvent("patient_portal_client_changed", { detail: client.id }));
    toast.success(`Welcome to MantraCare, ${client.name}!`);
    navigate(`/patient/${encodeURIComponent(client.id)}`);
  };

  // Handle OTP Verification Submit (Clicking verify moves forward immediately)
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      if (step === "otp") {
        const clientToLogin = matchedClient || clients[0];
        if (clientToLogin) {
          completeLogin(clientToLogin);
        } else {
          setError("Session expired. Please start over.");
          setStep("identifier");
        }
      } else if (step === "register_otp") {
        // Create new patient record
        const newId = `CL-${String(Math.floor(100 + Math.random() * 900))}`;
        const newClient: Client = {
          id: newId,
          name: regName.trim() || "New Patient",
          email: regEmail.trim().toLowerCase() || `${(regName || "patient").toLowerCase().replace(/\s+/g, ".")}@example.com`,
          phone: regPhone.trim() || "5551234567",
          country: "US",
          countryCode: "+1",
          countryFlag: "🇺🇸",
          processes: ["Patient Care Journey", "Client Intake", "Appointment Scheduling"],
          stage: "Client Checked In",
          status: "Active",
          source: "Self Gen",
          lastContact: new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          location: "New York, NY",
        };

        const updated = [newClient, ...clients];
        saveStoredClients(updated);
        setClients(updated);

        completeLogin(newClient);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white relative overflow-hidden">
      {/* ── LEFT COLUMN: Companion Brand & Showcase (50% Width) ── */}
      <div
        className="hidden lg:flex w-full lg:w-1/2 relative overflow-hidden flex-col justify-between"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
        }}
      >
        {/* Subtle Ambient Glow Overlays */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#3B82F6]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3B82F6]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 2xl:p-14 w-full h-full">
          {/* 1. Logo with Companion Text in Front */}
          <div className="flex items-center gap-2.5">
            <img
              src={maLogo}
              alt="MantraAssist"
              className="h-8 w-auto drop-shadow-md"
              style={{ filter: "brightness(0) invert(1)" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="h-4 w-px bg-white/25" />
            <span
              className="text-white/80 font-bold text-sm tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Companion
            </span>
          </div>

          {/* 2 & 3. Main Content: Headline & Subtext */}
          <div className="my-auto py-6 max-w-2xl">
            <h1
              className="font-bold text-white text-3xl sm:text-4xl xl:text-[46px] 2xl:text-[52px] leading-[1.15] tracking-tight mb-4"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 800 }}
            >
              Your AI Care{" "}
              <span className="text-[#3B82F6] underline decoration-2 underline-offset-8 decoration-[#3B82F6]">
                Companion
              </span>
              <br />
              for Better Health.
            </h1>

            <p
              className="text-[#D6DCE5] text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              From booking appointments to reviewing lab reports and digital prescriptions, MantraAssist Companion empowers patients with a seamless, 24/7 personalized care experience.
            </p>

            {/* 4. Row of 3 Glass Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
              {/* Card 1 */}
              <div
                className="p-5 rounded-[22px] border border-white/8 backdrop-blur-md shadow-xl flex flex-col justify-between"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 bg-[#3B82F6]/15 border border-[#3B82F6]/20">
                    <Calendar className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    APPOINTMENTS
                  </div>
                  <h3
                    className="text-sm font-bold text-white mb-1.5"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Smart Scheduling
                  </h3>
                  <p
                    className="text-xs text-[#D6DCE5] leading-relaxed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Book, reschedule, and check in to doctor visits dynamically in real-time.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div
                className="p-5 rounded-[22px] border border-white/8 backdrop-blur-md shadow-xl flex flex-col justify-between"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 bg-[#3B82F6]/15 border border-[#3B82F6]/20">
                    <FileText className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    HEALTH RECORDS
                  </div>
                  <h3
                    className="text-sm font-bold text-white mb-1.5"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Records & Forms
                  </h3>
                  <p
                    className="text-xs text-[#D6DCE5] leading-relaxed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Access prescriptions, lab results, and pre-visit intake forms with total privacy.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div
                className="p-5 rounded-[22px] border border-white/8 backdrop-blur-md shadow-xl flex flex-col justify-between"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
                }}
              >
                <div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 bg-[#3B82F6]/15 border border-[#3B82F6]/20">
                    <CreditCard className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    FINANCIAL
                  </div>
                  <h3
                    className="text-sm font-bold text-white mb-1.5"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Digital Billing
                  </h3>
                  <p
                    className="text-xs text-[#D6DCE5] leading-relaxed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    View itemized clinic charges, insurance claims, and settle copays instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Bottom Wide Glass Stats Bar */}
            <div
              className="p-4 px-5 rounded-[20px] border border-white/8 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#3B82F6]/15 border border-[#3B82F6]/20 shrink-0">
                  <TrendingUp className="w-4.5 h-4.5 text-[#3B82F6]" />
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9EB5]">
                      CARE RESPONSE
                    </div>
                    <div className="text-lg font-extrabold text-white flex items-center gap-1 leading-tight">
                      &lt; 2 min <span className="text-[#3B82F6] text-sm">↑</span>
                    </div>
                  </div>

                  <div className="h-7 w-px bg-white/10 shrink-0" />

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9EB5]">
                      CLINIC CONNECTIVITY
                    </div>
                    <div className="text-lg font-extrabold text-white leading-tight">
                      24/7 <span className="text-xs font-normal text-[#D6DCE5]">AI Assist</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="text-white/70 text-xs font-medium flex items-center gap-1.5"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>

          {/* 6. Footer Links */}
          <div
            className="flex items-center gap-3 text-xs text-[#8E9EB5]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <button type="button" className="hover:text-white transition-colors cursor-pointer">
              English
            </button>
            <span className="text-white/20">•</span>
            <button type="button" className="hover:text-white transition-colors cursor-pointer">
              Accessibility
            </button>
            <span className="text-white/20">•</span>
            <button type="button" className="hover:text-white transition-colors cursor-pointer">
              Privacy & Security
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Clean Authentication Flow (50% Equal Width) ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-gradient-to-br from-gray-50 to-white min-h-screen overflow-y-auto">
        {/* Mobile Logo Bar - Clean without organization text */}
        <div className="lg:hidden flex items-center justify-start mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <img src={maLogo} alt="MantraAssist" className="h-6 w-auto object-contain" />
            <div className="h-4 w-px bg-slate-300" />
            <span
              className="text-slate-600 font-bold text-sm tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Companion
            </span>
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          {/* Header */}
          <div className="mb-8">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 tracking-tight"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              {step === "identifier" && "Get started"}
              {step === "otp" && "Enter verification code"}
              {step === "register" && "Create your account"}
              {step === "register_otp" && "Verify your account"}
            </h2>

            <p
              className="text-sm sm:text-base text-gray-600"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}
            >
              {step === "identifier" && "Log in with your phone number or email address"}
              {step === "otp" && `We've sent a 6-digit verification code to ${identifier}`}
              {step === "register" && "Looks like you're new here. Fill in your details to create your patient profile."}
              {step === "register_otp" && `We've sent a 6-digit code to ${regEmail || regPhone}`}
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {/* ── FLOW STEP 1: Email or Phone Number ── */}
          {step === "identifier" && (
            <form onSubmit={handleIdentifierSubmit} className="space-y-6">
              <div>
                <label
                  className="block text-sm font-bold mb-2.5 text-gray-900"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 5551234567 or sarah.j@email.com"
                  className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs hover:border-gray-300 font-medium text-slate-900"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── FLOW STEP 2: Clean OTP Verification (Clicking verify moves forward) ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900 shadow-2xs"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── FLOW STEP 3: Register New Patient ── */}
          {step === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label
                  className="block text-sm font-bold mb-1.5 text-gray-900"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 shadow-2xs"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  autoFocus
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label
                  className="block text-sm font-bold mb-1.5 text-gray-900"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 shadow-2xs"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label
                  className="block text-sm font-bold mb-1.5 text-gray-900"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 shadow-2xs"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── FLOW STEP 4: Registration OTP Verification (Clean) ── */}
          {step === "register_otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-slate-900 shadow-2xs"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Complete Registration</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
