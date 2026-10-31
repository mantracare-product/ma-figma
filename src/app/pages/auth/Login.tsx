import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useHowItWorks } from "../../context/HowItWorksContext";
import GuestRoute from "../../components/auth/GuestRoute";
import {
  CheckCircle,
  Calendar,
  TrendingUp,
  ArrowRight,
  Zap,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react";
import logo from "@/imports/ma_logo-1.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { triggerAutoOpen } = useHowItWorks();

  const isVerifyRoute = location.pathname === "/verify";

  const [email, setEmail] = useState(() => {
    return (
      (location.state as any)?.email ||
      localStorage.getItem("login_email") ||
      ""
    );
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const isVerifyingRef = useRef(false);

  // If on /verify without an email, redirect back to /login
  useEffect(() => {
    if (isVerifyRoute && !email) {
      navigate("/login", { replace: true });
    }
  }, [isVerifyRoute, email, navigate]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (isVerifyRoute && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [isVerifyRoute, resendTimer]);

  // Handle direct Login with Email and Password
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login();
      const currentEmail = cleanEmail.toLowerCase();
      const namePart = currentEmail.split("@")[0].replace(/[._-]/g, " ");
      const formattedName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1);

      localStorage.setItem("login_email", currentEmail);
      localStorage.setItem(
        "user_data",
        JSON.stringify({
          name: formattedName || "Admin User",
          email: currentEmail,
          role: localStorage.getItem("user_role") || "SystemAdmin",
        })
      );

      setLoading(false);
      toast.success("Welcome back to MantraAssist!");
      navigate("/", { replace: true });

      setTimeout(() => {
        triggerAutoOpen();
      }, 500);
    }, 400);
  };

  // Complete verification (from signup) and navigate to Onboarding
  const completeVerification = (code: string) => {
    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;
    setLoading(true);

    setTimeout(() => {
      login();
      const currentEmail = email || localStorage.getItem("login_email") || "user@example.com";
      const namePart = currentEmail.split("@")[0].replace(/[._-]/g, " ");
      const formattedName =
        namePart.charAt(0).toUpperCase() + namePart.slice(1);

      localStorage.setItem(
        "user_data",
        JSON.stringify({
          name: formattedName || "Admin User",
          email: currentEmail,
          role: localStorage.getItem("user_role") || "SystemAdmin",
        })
      );

      setLoading(false);
      toast.success("Verification successful! Welcome to MantraAssist.");

      const signupWebsite =
        (location.state as any)?.website ||
        localStorage.getItem("signup_website") ||
        "";

      navigate("/onboarding", {
        replace: true,
        state: {
          email: currentEmail,
          name: (location.state as any)?.name || formattedName,
          website: signupWebsite,
        },
      });
    }, 450);
  };

  // Handle OTP input change (manual submission only via Submit button)
  const handleOtpChange = (val: string) => {
    const numericCode = val.replace(/\D/g, "").slice(0, 6);
    setOtp(numericCode);
  };

  // Handle OTP form submission via button or Enter key
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }
    completeVerification(otp);
  };

  // Handle Resend OTP
  const handleResendOtp = () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResendTimer(60);
      setOtp("");
      isVerifyingRef.current = false;
      toast.success("A new verification code has been sent to your email");
    }, 500);
  };

  const features = [
    { text: "AI-powered patient support 24/7" },
    { text: "Automated scheduling & reminders" },
    { text: "Seamless healthcare system integration" },
    { text: "Reduce administrative workload" },
  ];

  const content = (
    <div className="min-h-screen flex">
        {/* Left Side - Brand & Features (Dark Slate/Navy Hero with Glass Cards) */}
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

        {/* Right Side - Form (Email or Verification Code) */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
          <div className="w-full max-w-lg">
            {/* Logo for mobile */}
            <div className="lg:hidden mb-10">
              <img
                src={logo}
                alt="MantraAssist"
                className="h-12 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2
                className="text-4xl font-bold mb-3 text-gray-900 tracking-tight"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
              >
                {isVerifyRoute ? "Verify your account" : "Welcome Back"}
              </h2>
              <p
                className="text-base text-gray-600 leading-relaxed"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}
              >
                {isVerifyRoute ? (
                  <>
                    We've sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-gray-900">
                      {email}
                    </span>
                  </>
                ) : (
                  "Enter your email and password to access your account"
                )}
              </p>
            </div>

            {/* Main Form */}
            {isVerifyRoute ? (
              /* ── VERIFICATION CODE VIEW (FROM SIGNUP) ── */
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label
                    className="block text-sm font-semibold mb-2.5 text-gray-900"
                    style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                  >
                    Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    placeholder="000000"
                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-bold font-mono tracking-[0.45em] focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-gray-900 bg-white hover:border-gray-300"
                    style={{ letterSpacing: "0.45em" }}
                    maxLength={6}
                    autoFocus
                  />

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setOtp("");
                        isVerifyingRef.current = false;
                        navigate("/signup", {
                          state: {
                            email,
                            name: (location.state as any)?.name,
                            country: (location.state as any)?.country,
                          },
                        });
                      }}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                      style={{
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      Change email
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                      className={`text-sm font-medium transition-colors ${
                        resendTimer > 0 || loading
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-blue-600 hover:underline cursor-pointer font-semibold"
                      }`}
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {resendTimer > 0
                        ? `Resend code in ${resendTimer}s`
                        : "Resend code"}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
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
                        <span>Submit</span>
                        <ArrowRight className="w-4.5 h-4.5 text-blue-400" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── EMAIL & PASSWORD LOGIN VIEW ── */
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {/* 1. Email Address */}
                <div>
                  <label
                    className="block text-sm font-semibold mb-2 text-slate-800"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here"
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                    style={{ fontFamily: "Inter, sans-serif" }}
                    autoFocus
                  />
                </div>

                {/* 2. Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="block text-sm font-semibold text-slate-800"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password here"
                      className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs pr-11"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4.5 h-4.5" />
                      ) : (
                        <Eye className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Section: Centered "Sign in" button & "Don't have an account? Sign up" */}
                <div className="pt-3 flex flex-col items-center space-y-4">
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
                        <span>Sign in</span>
                        <ArrowRight className="w-4.5 h-4.5 text-blue-400" />
                      </>
                    )}
                  </button>

                  <p
                    className="text-sm text-gray-500 pt-1"
                    style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}
                  >
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                    >
                      Sign up
                    </Link>
                  </p>
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

  if (isVerifyRoute) {
    return content;
  }

  return <GuestRoute>{content}</GuestRoute>;
}
