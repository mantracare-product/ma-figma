import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useHowItWorks } from "../../context/HowItWorksContext";
import GuestRoute from "../../components/auth/GuestRoute";
import { Tooltip } from "../../components/ui/Tooltip";
import {
  CheckCircle,
  Clock,
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  Headphones,
  ArrowRight,
  ChevronDown,
  Search,
  Info,
  Zap,
  Share2,
} from "lucide-react";
import logo from "@/imports/ma_logo-1.png";

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const countries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
];

// Simulated database of registered emails
const registeredEmails = ["user@example.com", "admin@example.com", "test@example.com"];

const industries = [
  "Healthcare",
  "Dental",
  "Mental Health",
  "Physical Therapy",
  "Chiropractic",
  "Veterinary",
  "Other Medical Services",
];

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  stages: number;
  industry: string;
}

const processTemplates: ProcessTemplate[] = [
  { id: "1", name: "Patient Intake", description: "Initial patient onboarding and verification", stages: 4, industry: "Healthcare" },
  { id: "2", name: "Appointment Scheduling", description: "Schedule and confirm patient appointments", stages: 3, industry: "Healthcare" },
  { id: "3", name: "Follow-up Calls", description: "Post-visit patient follow-up workflow", stages: 3, industry: "Healthcare" },
  { id: "4", name: "Billing Support", description: "Payment and billing inquiry management", stages: 4, industry: "Healthcare" },
  { id: "5", name: "Dental Appointment", description: "Dental visit scheduling and reminders", stages: 3, industry: "Dental" },
  { id: "6", name: "Therapy Session Booking", description: "Mental health session management", stages: 3, industry: "Mental Health" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { triggerAutoOpen } = useHowItWorks();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "password" | "signup" | "otp">("email");
  const [signupStep, setSignupStep] = useState<"account" | "organization" | "template" | "complete">("account");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  // Signup fields - Account
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Signup fields - Organization
  const [mantraProviderEnabled, setMantraProviderEnabled] = useState(true);
  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [preferredCallingTime, setPreferredCallingTime] = useState("14:00");
  const [timeZone, setTimeZone] = useState("America/New_York");

  // Signup fields - Templates
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.dialCode.includes(countrySearch)
  );

  const filteredTemplates = processTemplates.filter((template) => template.industry === industry);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-select all templates when entering template step
  useEffect(() => {
    if (signupStep === "template" && industry && selectedTemplates.length === 0) {
      const templatesForIndustry = processTemplates.filter((template) => template.industry === industry);
      if (templatesForIndustry.length > 0) {
        const allTemplateIds = templatesForIndustry.map(t => t.id);
        setSelectedTemplates(allTemplateIds);
      }
    }
  }, [signupStep, industry, selectedTemplates.length]);

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        if (prev.length > 1) {
          return prev.filter(id => id !== templateId);
        }
        toast.error("At least one process must remain selected");
        return prev;
      } else {
        return [...prev, templateId];
      }
    });
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "email") {
      if (!email) {
        toast.error("Please enter your email address");
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }

      setLoading(true);
      // Simulate API call to check if email is registered
      setTimeout(() => {
        setLoading(false);
        const isRegistered = registeredEmails.includes(email.toLowerCase());
        if (isRegistered) {
          setIsNewUser(false);
          setStep("password");
        } else {
          setIsNewUser(true);
          setStep("signup");
          toast.info("Looks like you're new here. Let's create your account!");
        }
      }, 500);
    } else if (step === "password") {
      if (!password) {
        toast.error("Please enter your password");
        return;
      }

      setLoading(true);
      // Simulate API call to verify password and send OTP
      setTimeout(() => {
        setLoading(false);
        toast.success("OTP sent to your email");
        setStep("otp");
        setResendTimer(60);
      }, 1000);
    } else if (step === "signup") {
      if (signupStep === "account") {
        // Validate account details
        if (!name) {
          toast.error("Please enter your full name");
          return;
        }
        if (!email) {
          toast.error("Please enter your email address");
          return;
        }
        if (!password) {
          toast.error("Please create a password");
          return;
        }
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters");
          return;
        }
        if (!confirmPassword) {
          toast.error("Please confirm your password");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        if (!phone) {
          toast.error("Please enter your phone number");
          return;
        }
        if (!agreedToTerms) {
          toast.error("Please agree to the Terms of Service and Privacy Policy");
          return;
        }
        setSignupStep("organization");
      } else if (signupStep === "organization") {
        // Validate organization details
        if (!organizationName || !industry || !orgEmail || !orgPhone) {
          toast.error("Please fill all organization details");
          return;
        }
        setSignupStep("template");
      } else if (signupStep === "template") {
        // Validate template selection
        if (selectedTemplates.length === 0) {
          toast.error("Please select at least one process template");
          return;
        }
        setSignupStep("complete");
      } else if (signupStep === "complete") {
        setLoading(true);
        // Simulate API call to create account and send OTP
        setTimeout(() => {
          setLoading(false);
          toast.success("OTP sent to your email");
          setStep("otp");
          setResendTimer(60);
        }, 1000);
      }
    } else if (step === "otp") {
      if (!otp) {
        toast.error("Please enter the OTP");
        return;
      }

      setLoading(true);
      // Simulate API call to verify OTP
      setTimeout(() => {
        login();
        setLoading(false);
        if (isNewUser) {
          toast.success("Account created successfully!");
        } else {
          toast.success("Login successful");
        }
        navigate("/");
        // Trigger auto-open of How It Works modal
        setTimeout(() => triggerAutoOpen(), 500);
      }, 1500);
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;

    setLoading(true);
    // Simulate API call to resend OTP
    setTimeout(() => {
      setLoading(false);
      toast.success("OTP resent to your email");
      setResendTimer(60);
    }, 1000);
  };

  const features = [
    { text: "AI-powered patient support 24/7" },
    { text: "Automated scheduling & reminders" },
    { text: "Seamless healthcare system integration" },
    { text: "Reduce administrative workload" },
  ];

  return (
    <GuestRoute>
      <div className="min-h-screen flex">
        {/* Left Side - Brand & Features (Dark Slate/Navy Hero with Glass Cards) */}
        <div
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #141B24 0%, #1c2736 50%, #2A3A4D 100%)",
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
                        12.5 <span className="text-xs font-normal text-[#D6DCE5]">hrs/wk</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.open("https://mantracare.com/request-demo", "_blank")}
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
              <button type="button" className="hover:text-white transition-colors cursor-pointer">
                English
              </button>
              <span className="text-white/20">•</span>
              <button type="button" className="hover:text-white transition-colors cursor-pointer">
                Accessibility
              </button>
              <span className="text-white/20">•</span>
              <button type="button" className="hover:text-white transition-colors cursor-pointer">
                Privacy
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
          <div className="w-full max-w-lg">
            {/* Logo for mobile */}
            <div className="lg:hidden mb-10">
              <img
                src={logo}
                alt="MasterCare"
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            {/* Header */}
            <div className="mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-bold mb-3 text-gray-900 tracking-tight" style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                {step === "email"
                  ? "Get started"
                  : step === "password"
                  ? "Welcome back"
                  : step === "signup"
                  ? signupStep === "account"
                    ? "Create your account"
                    : signupStep === "organization"
                    ? "Organization Setup"
                    : signupStep === "template"
                    ? "Select Process Template"
                    : "All done!"
                  : "Verify your account"}
              </h2>
              <p className="text-lg text-gray-600" style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
                {step === "email"
                  ? "Log in with your email address"
                  : step === "password"
                  ? "Enter your password to continue"
                  : step === "signup"
                  ? signupStep === "account"
                    ? "Complete your profile to get started"
                    : signupStep === "organization"
                    ? "Set up your organization details"
                    : signupStep === "template"
                    ? "Choose the processes you need support with"
                    : "Your setup is complete and your workspace is ready. You can start making AI-powered calls right away."
                  : `We've sent a verification code to ${email}`}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleContinue} className="space-y-6">
              {step === "email" ? (
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-900" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
                    style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                    autoFocus
                  />
                </div>
              ) : step === "signup" ? (
                signupStep === "account" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-900" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-900" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Email
                      </label>
                      <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl shadow-sm">
                        <span className="text-base flex-1 text-gray-900 font-medium" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                          {email}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setStep("email");
                            setSignupStep("account");
                          }}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-900" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Create Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-3 text-gray-900" style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Verify Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm hover:border-gray-300"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                        Phone Number
                      </label>
                      <div className="flex gap-2">
                        <div className="relative w-32">
                          <button
                            type="button"
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            className="w-full px-3 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{selectedCountry.flag}</span>
                              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          </button>

                          {showCountryDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-80 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                              <div className="p-3 border-b border-gray-200">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => setCountrySearch(e.target.value)}
                                    placeholder="Search countries..."
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {filteredCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(country);
                                      setShowCountryDropdown(false);
                                      setCountrySearch("");
                                    }}
                                    className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                                  >
                                    <span className="text-lg">{country.flag}</span>
                                    <span className="flex-1 text-sm font-medium">{country.name}</span>
                                    <span className="text-sm text-gray-500">{country.dialCode}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="1234567890"
                          className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700" style={{ fontFamily: "Inter, sans-serif" }}>
                          I agree to the{" "}
                          <a href="#" className="font-medium hover:underline" style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="#" className="font-medium hover:underline" style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                    </div>
                  </div>
                ) : signupStep === "organization" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>MantraProvider</p>
                          <p className="text-sm" style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>Enhanced AI calling features</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMantraProviderEnabled(!mantraProviderEnabled)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                            mantraProviderEnabled ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                              mantraProviderEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                        Organization / Practitioner Name
                      </label>
                      <input
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="Acme Healthcare"
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                        Industry
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                      >
                        <option value="">Select industry</option>
                        {industries.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                        Organization Email
                      </label>
                      <input
                        type="email"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="contact@acme.com"
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                        Organization Phone
                      </label>
                      <input
                        type="tel"
                        value={orgPhone}
                        onChange={(e) => setOrgPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                      />
                    </div>

                    <div className="border-t-2 border-gray-200 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowMoreSettings(!showMoreSettings)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <span className="font-semibold" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>More Settings / Detailed View</span>
                        <div
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            showMoreSettings ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              showMoreSettings ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </div>
                      </button>

                      {showMoreSettings && (
                        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                              Preferred Calling Time
                            </label>
                            <input
                              type="time"
                              value={preferredCallingTime}
                              onChange={(e) => setPreferredCallingTime(e.target.value)}
                              className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}>
                              Time Zone
                            </label>
                            <select
                              value={timeZone}
                              onChange={(e) => setTimeZone(e.target.value)}
                              className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                            >
                              <option value="America/New_York">Eastern Time (ET)</option>
                              <option value="America/Chicago">Central Time (CT)</option>
                              <option value="America/Denver">Mountain Time (MT)</option>
                              <option value="America/Los_Angeles">Pacific Time (PT)</option>
                              <option value="Europe/London">London (GMT)</option>
                              <option value="Asia/Kolkata">India (IST)</option>
                              <option value="Asia/Dubai">Dubai (GST)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : signupStep === "template" ? (
                  <div className="space-y-4">
                    {!industry ? (
                      <div className="p-8 bg-gray-50 rounded-xl text-center">
                        <p style={{ color: "#64748B", fontFamily: "Inter, sans-serif" }}>Please select an industry in the previous step to see templates</p>
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="p-8 bg-gray-50 rounded-xl text-center">
                        <p style={{ color: "#64748B", fontFamily: "Inter, sans-serif" }}>No templates available for {industry}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-center" style={{ color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                          All processes are selected by default. Deselect any you do not need support with.
                        </p>
                        {filteredTemplates.map((template) => {
                          const isSelected = selectedTemplates.includes(template.id);
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => toggleTemplateSelection(template.id)}
                              className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className={`font-semibold ${isSelected ? "text-blue-600" : "text-gray-900"}`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                                  {template.name}
                                </h4>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm mb-3" style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>{template.description}</p>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-700"
                              }`} style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                                {template.stages} stages
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </div>
                    </div>

                    {selectedTemplates.length > 0 && (
                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <p className="text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                          {selectedTemplates.length} Process{selectedTemplates.length > 1 ? 'es' : ''} Selected
                        </p>
                        <div className="space-y-1">
                          {selectedTemplates.map(templateId => {
                            const template = processTemplates.find(t => t.id === templateId);
                            return template ? (
                              <p key={templateId} className="text-sm" style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                                • {template.name}
                              </p>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : step === "password" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl">
                      <span className="text-base flex-1" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                        {email}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      style={{ color: "#020817", fontFamily: "Inter, sans-serif" }}
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "24px", letterSpacing: "0.5em" }}
                    maxLength={6}
                    autoFocus
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setSignupStep("account");
                        setOtp("");
                        setResendTimer(0);
                      }}
                      className="text-sm font-medium hover:underline"
                      style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif" }}
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0}
                      className={`text-sm font-medium ${
                        resendTimer > 0 ? "text-gray-400 cursor-not-allowed" : "hover:underline"
                      }`}
                      style={{ color: resendTimer > 0 ? "#94a3b8" : "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {step === "email"
                      ? "Continue"
                      : step === "password"
                      ? "Continue"
                      : step === "signup"
                      ? signupStep === "account"
                        ? "Create Account"
                        : signupStep === "complete"
                        ? "Complete Setup"
                        : "Continue"
                      : "Verify & Sign In"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            {(step === "email" || step === "password") && (
              <div className="mt-8 text-center">
                <p className="text-sm" style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
                  {step === "email" ? (
                    <button
                      type="button"
                      onClick={() => {
                        login();
                        navigate("/");
                      }}
                      className="hover:underline"
                      style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                    >
                      Don't have an account? Just enter your email to get started
                    </button>
                  ) : ""}
                </p>
              </div>
            )}
            {step === "signup" && signupStep === "account" && (
              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: "#64748B", fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setSignupStep("account");
                      setName("");
                      setPassword("");
                      setConfirmPassword("");
                      setPhone("");
                      setAgreedToTerms(false);
                    }}
                    className="font-semibold hover:underline transition-all"
                    style={{ color: "#3b82f6", fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {/* Mobile Features Preview */}
            <div className="lg:hidden mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-base font-bold mb-4" style={{ color: "#020817", fontFamily: "Inter, sans-serif", fontWeight: 700 }}>
                Why join us?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700" style={{ fontFamily: "Inter, sans-serif" }}>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GuestRoute>
  );
}
