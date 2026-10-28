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
import CenteredOnboardingShell from "./CenteredOnboardingShell";
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

  return (
    <CenteredOnboardingShell maxWidth="max-w-[560px]">
      <div className="w-full">
        {/* Header */}
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold mb-1 text-slate-900 tracking-tight"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {step === 1
              ? "About your organization"
              : "How would you like to set up?"}
          </h2>
          <p
            className="text-[13px] text-slate-500 leading-normal"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {step === 1
              ? "We'll tailor your AI workflows to your business."
              : "Talk it through with our AI assistant, or answer a few questions by typing."}
          </p>
        </div>

        {/* Form */}
        {step === 1 ? (
          /* ── SCREEN 2: ABOUT YOUR ORGANIZATION ── */
          <form onSubmit={handleStep1Submit} className="space-y-4">
            {/* 1. Organization name */}
            <div>
              <label
                className="block text-[13px] font-semibold mb-1.5 text-slate-800"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Organization name
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Health Clinic"
                  className="w-full h-10 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  autoFocus
                />
              </div>
            </div>

            {/* 2. Country */}
            <div>
              <label
                className="block text-[13px] font-semibold mb-1.5 text-slate-800"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Country
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-[13px] appearance-none focus:outline-none focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-800 hover:border-slate-300 shadow-2xs pr-10 cursor-pointer"
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
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  className="block text-[13px] font-semibold text-slate-800"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Website or description
                </label>

                {/* Mode Selector Toggle: Website vs Description */}
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-full border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMode("website")}
                    className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
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
                    className={`px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
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
                <div className="space-y-1">
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="yourwebsite.com"
                      className="w-full h-10 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                  </div>
                  <p className="text-[12px] text-slate-500 leading-normal pl-1">
                    We'll read your public pages to set up your AI and knowledge base.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe what your organization does and the services you offer."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-3 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs resize-none"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  />
                  <p className="text-[12px] text-slate-500 leading-normal pl-1">
                    We'll use this to set up your AI and knowledge base.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Section: Centered "Next" Button */}
            <div className="pt-3 flex flex-col items-center">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-[280px] h-10 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              </button>
            </div>
          </form>
        ) : (
          /* ── SCREEN 1: HOW WOULD YOU LIKE TO SET UP? ── */
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Talk to our AI assistant */}
              <div
                onClick={() => setSetupMethod("voice")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  setupMethod === "voice"
                    ? "border-blue-600 bg-blue-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      setupMethod === "voice"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] font-semibold text-slate-900"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Talk to our AI assistant
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200/50">
                        Fastest
                      </span>
                    </div>
                    <p
                      className="text-[12px] text-slate-500 mt-0.5 leading-normal"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      A quick voice conversation, about 2 minutes.
                    </p>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    setupMethod === "voice"
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {setupMethod === "voice" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Option 2: Fill quick form */}
              <div
                onClick={() => setSetupMethod("type")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  setupMethod === "type"
                    ? "border-blue-600 bg-blue-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      setupMethod === "type"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <span
                      className="text-[13px] font-semibold text-slate-900"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Fill quick form
                    </span>
                    <p
                      className="text-[12px] text-slate-500 mt-0.5 leading-normal"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Answer a few quick sections at your own pace.
                    </p>
                  </div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    setupMethod === "type"
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {setupMethod === "type" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Centered Button + Back Link */}
            <div className="pt-3 flex flex-col items-center space-y-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-[280px] h-10 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {setupMethod === "voice"
                        ? "Start voice setup"
                        : "Start quick form"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer py-1"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </CenteredOnboardingShell>
  );
}
