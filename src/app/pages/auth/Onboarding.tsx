import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { useHowItWorks } from "../../context/HowItWorksContext";
import { useAuth } from "../../context/AuthContext";
import {
  CheckCircle,
  Calendar,
  TrendingUp,
  ArrowRight,
  Zap,
  Share2,
  Globe,
  FileText,
  Sparkles,
  Building2,
  Mic,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import logo from "@/imports/ma_logo-1.png";
import VoiceOnboardingScreen from "./VoiceOnboardingScreen";
import QuickFormOnboardingScreen from "./QuickFormOnboardingScreen";
import { CollectedOnboardingData } from "./onboardingHelpers";
import {
  getStoredProcesses,
  saveStoredProcesses,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "United Arab Emirates",
  "Singapore",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Japan",
  "South Africa",
  "New Zealand",
  "Ireland",
  "Switzerland",
  "Netherlands",
  "Other",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addOrganization } = useOrganization();
  const { triggerAutoOpen } = useHowItWorks();

  const userEmail =
    (location.state as any)?.email ||
    localStorage.getItem("login_email") ||
    "";
  const userName = (location.state as any)?.name || "";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("United States");
  const [mode, setMode] = useState<"website" | "description">("website");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [setupMethod, setSetupMethod] = useState<"voice" | "type">("voice");
  const [loading, setLoading] = useState(false);

  // Validate step 1 and advance to step 2
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    if (!country.trim()) {
      toast.error("Please select your country");
      return;
    }

    if (mode === "website" && !websiteUrl.trim()) {
      toast.error("Please enter your organization's website URL");
      return;
    }

    if (mode === "description" && !description.trim()) {
      toast.error("Please provide a brief description of your organization");
      return;
    }

    setStep(2);
  };

  // Shared completion handler for both Voice and Quick Form onboarding
  const handleCollectedDataComplete = (
    collectedData: CollectedOnboardingData,
    method: "voice" | "form"
  ) => {
    const cleanOrgName = orgName.trim();
    const cleanWebsite = websiteUrl.trim();
    const cleanDesc = description.trim();

    const newOrgData = {
      name: cleanOrgName,
      industry: collectedData.industry || "Healthcare",
      industryCategory: collectedData.confirmedCategory,
      locations:
        collectedData.locations.length > 0
          ? collectedData.locations
          : [collectedData.primaryLocation || "Main Location"],
      primaryLocation: collectedData.primaryLocation || undefined,
      operatingHours: collectedData.operatingHours || undefined,
      country: country.trim() || "United States",
      currency: "USD",
      email: userEmail || "contact@mantraassist.com",
      phone: "+1 (555) 123-4567",
      status: "Active" as const,
      website: mode === "website" ? cleanWebsite : undefined,
      description: mode === "description" ? cleanDesc : undefined,
      callVolume: collectedData.callVolume || undefined,
      internationalCalls: collectedData.internationalCalls,
      teamSize: collectedData.teamSize,
      primaryRequirements: collectedData.requirements,
      uploadedDocuments: collectedData.uploadedDocuments,
      telephonyChoice: collectedData.telephony || undefined,
    };

    try {
      addOrganization(newOrgData);
    } catch (err) {
      console.warn("Could not add to context directly", err);
    }

    try {
      const allProcs = getStoredProcesses();
      const updatedProcs = allProcs.map((p) => {
        if (
          (p as any).categoryName === "Healthcare" ||
          p.industryCategory === "Healthcare" ||
          !p.industryCategory
        ) {
          return {
            ...p,
            industryCategory: collectedData.confirmedCategory,
            connectedToAiReceptionist: collectedData.requirements.includes("AI Reception"),
            receptionEnabled: collectedData.requirements.includes("AI Reception"),
          };
        }
        return p;
      });
      saveStoredProcesses(updatedProcs);
      window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
    } catch (e) {
      console.warn("Process mapping notice:", e);
    }

    localStorage.setItem("user_organization", JSON.stringify(newOrgData));
    localStorage.setItem("active_organization_name", cleanOrgName);
    localStorage.setItem("onboarding_setup_method", method);
    localStorage.removeItem("verify_origin");
    login();

    toast.success(
      method === "voice"
        ? "Voice setup complete! Welcome to MantraAssist."
        : "Practice setup complete! Welcome to MantraAssist."
    );
    navigate("/", { replace: true });

    setTimeout(() => {
      triggerAutoOpen();
    }, 500);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupMethod === "voice") {
      setStep(3);
      return;
    }
    setStep(4);
  };

  if (step === 3) {
    return (
      <VoiceOnboardingScreen
        orgName={orgName}
        country={country}
        mode={mode}
        websiteUrl={websiteUrl}
        description={description}
        userEmail={userEmail}
        onComplete={(collectedData: CollectedOnboardingData) =>
          handleCollectedDataComplete(collectedData, "voice")
        }
        onSwitchToTyping={() => {
          setSetupMethod("type");
          setStep(4);
          toast.info("Switched to quick form setup.");
        }}
        onBack={() => setStep(2)}
      />
    );
  }

  if (step === 4) {
    return (
      <QuickFormOnboardingScreen
        orgName={orgName}
        country={country}
        mode={mode}
        websiteUrl={websiteUrl}
        description={description}
        userEmail={userEmail}
        onComplete={(collectedData: CollectedOnboardingData) =>
          handleCollectedDataComplete(collectedData, "form")
        }
        onSwitchToVoice={() => {
          setSetupMethod("voice");
          setStep(3);
          toast.info("Switched to voice setup.");
        }}
        onBack={() => setStep(2)}
      />
    );
  }

  const features = [
    { text: "AI-powered patient support 24/7" },
    { text: "Automated scheduling & reminders" },
    { text: "Seamless healthcare system integration" },
    { text: "Reduce administrative workload" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Brand & Features (Identical to Login / Signup) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #141B24 0%, #1c2736 50%, #2A3A4D 100%)",
        }}
      >
        {/* Subtle Ambient Glow Overlays */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#3B82F6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 2xl:p-14 w-full h-full">
          {/* 1. Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-8 w-auto drop-shadow-md"
              style={{ filter: "brightness(0) invert(1)" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          {/* 2 & 3. Main Content: Platform Badge, Headline & Subtext */}
          <div className="my-auto py-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 backdrop-blur-sm rounded-full mb-6">
              <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse" />
              <span
                className="text-white text-xs font-semibold tracking-wide"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                AI Workforce Platform
              </span>
            </div>

            <h1
              className="font-bold text-white text-3xl sm:text-4xl xl:text-[46px] 2xl:text-[52px] leading-[1.15] tracking-tight mb-4"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 800 }}
            >
              The AI{" "}
              <span className="text-[#3B82F6] underline decoration-2 underline-offset-8 decoration-[#3B82F6]">
                Workforce
              </span>
              <br />
              for Every Business.
            </h1>

            <p
              className="text-[#D6DCE5] text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              From customer conversations to daily operations, MantraAssist automates what slows you down, so you can focus on growth.
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
                    <Zap className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    OMNICHANNEL
                  </div>
                  <h3
                    className="text-sm font-bold text-white mb-1.5"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Customer Conversations
                  </h3>
                  <p
                    className="text-xs text-[#D6DCE5] leading-relaxed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Automates conversations over voice, email, text, and chat with natural-language AI.
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
                    <Calendar className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    SCHEDULING
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
                    Books and manages appointments dynamically, syncing with your existing calendars.
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
                    <Share2 className="w-4.5 h-4.5 text-[#3B82F6]" />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] mb-1">
                    INTEGRATIONS
                  </div>
                  <h3
                    className="text-sm font-bold text-white mb-1.5"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Seamless Integrations
                  </h3>
                  <p
                    className="text-xs text-[#D6DCE5] leading-relaxed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Real-time, secure data flow with your CRM, helpdesk, and the tools you already use.
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
                      EFFICIENCY GAIN
                    </div>
                    <div className="text-lg font-extrabold text-white flex items-center gap-1 leading-tight">
                      40% <span className="text-[#3B82F6] text-sm">↑</span>
                    </div>
                  </div>

                    <div className="h-7 w-px bg-white/10 shrink-0" />

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#8E9EB5]">
                      TIME SAVED
                    </div>
                    <div className="text-lg font-extrabold text-white leading-tight">
                      12.5{" "}
                      <span className="text-xs font-normal text-[#D6DCE5]">
                        hrs/wk
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  window.open("https://mantracare.com/request-demo", "_blank")
                }
                className="px-4 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <span>Request a Demo</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#3B82F6]" />
              </button>
            </div>
          </div>

          {/* 6. Footer Links */}
          <div
            className="flex items-center gap-3 text-xs text-[#8E9EB5]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <button
              type="button"
              className="hover:text-white transition-colors cursor-pointer"
            >
              English
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              className="hover:text-white transition-colors cursor-pointer"
            >
              Accessibility
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Onboarding Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-10 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-2.5 text-gray-900 tracking-tight"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              {step === 1
                ? "About your organization"
                : "How would you like to set up?"}
            </h2>
            <p
              className="text-base text-gray-600 leading-relaxed"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}
            >
              {step === 1
                ? "We'll tailor your AI workflows to your business."
                : "Talk it through with our AI assistant, or answer a few questions by typing."}
            </p>
          </div>

          {/* Form */}
          {step === 1 ? (
            /* ── SCREEN 2: ABOUT YOUR ORGANIZATION ── */
            <form onSubmit={handleStep1Submit} className="space-y-6">
              {/* 1. Organization name */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2 text-slate-800"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Organization name
                </label>
                <div className="relative">
                  <Building2 className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Health Clinic"
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                    style={{ fontFamily: "Inter, sans-serif" }}
                    autoFocus
                  />
                </div>
              </div>

              {/* 2. Country (moved from signup) */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2 text-slate-800"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Country
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800 hover:border-slate-300 shadow-2xs pr-10 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 3. Website or description (Header + Toggle in front) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <label
                    className="block text-sm font-semibold text-slate-800"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Website or description
                  </label>

                  {/* Mode Selector Toggle: Website vs Description */}
                  <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-full border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setMode("website")}
                      className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        mode === "website"
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Website</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("description")}
                      className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        mode === "description"
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Description</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Input based on Mode */}
                {mode === "website" ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Globe className="w-4.5 h-4.5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="yourwebsite.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 leading-normal pl-1">
                      We'll read your public pages to set up your AI and knowledge base.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Briefly describe what your organization does and the services you offer."
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs resize-none"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    <p className="text-xs text-slate-500 leading-normal pl-1">
                      We'll use this to set up your AI and knowledge base.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Section: Centered "Next" Button */}
              <div className="pt-4 flex flex-col items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-80 max-w-full py-4 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-base font-semibold rounded-full shadow-md shadow-slate-900/15 hover:shadow-lg hover:shadow-slate-900/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <span>Next</span>
                  <ArrowRight className="w-4.5 h-4.5 text-blue-400" />
                </button>
              </div>
            </form>
          ) : (
            /* ── SCREEN 1: HOW WOULD YOU LIKE TO SET UP? ── */
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="grid grid-cols-1 gap-3.5">
                {/* Option 1: Talk to our AI assistant */}
                <div
                  onClick={() => setSetupMethod("voice")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    setupMethod === "voice"
                      ? "border-blue-600 bg-blue-50/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        setupMethod === "voice"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Mic className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold text-slate-900"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          Talk to our AI assistant
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200/50">
                          Fastest
                        </span>
                      </div>
                      <p
                        className="text-xs text-slate-500 mt-0.5 leading-normal"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        A quick voice conversation, about 2 minutes.
                      </p>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      setupMethod === "voice"
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {setupMethod === "voice" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                {/* Option 2: Fill quick form */}
                <div
                  onClick={() => setSetupMethod("type")}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    setupMethod === "type"
                      ? "border-blue-600 bg-blue-50/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        setupMethod === "type"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <FileText className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <span
                        className="text-sm font-semibold text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Fill quick form
                      </span>
                      <p
                        className="text-xs text-slate-500 mt-0.5 leading-normal"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Answer a few quick sections at your own pace.
                      </p>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      setupMethod === "type"
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {setupMethod === "type" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Centered Button + Back Link */}
              <div className="pt-4 flex flex-col items-center space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-80 max-w-full py-4 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-base font-semibold rounded-full shadow-md shadow-slate-900/15 hover:shadow-lg hover:shadow-slate-900/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {setupMethod === "voice"
                          ? "Start voice setup"
                          : "Start quick form"}
                      </span>
                      <ArrowRight className="w-4.5 h-4.5 text-blue-400" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>
            </form>
          )}

          {/* Mobile Features Preview */}
          <div className="lg:hidden mt-12 pt-8 border-t border-gray-200">
            <h3
              className="text-base font-bold mb-4 text-gray-900"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              Why join us?
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span
                    className="text-sm text-gray-700"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
