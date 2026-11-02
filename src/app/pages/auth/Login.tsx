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

    const savedOrgs = localStorage.getItem("mantra_organizations_v1");
    if (savedOrgs) {
      try {
        const orgs = JSON.parse(savedOrgs);
        const targetEmail = cleanEmail.toLowerCase();
        const matched = orgs.find((o: any) => (o.email || "").toLowerCase() === targetEmail);
        if (matched && matched.status === "Suspended") {
          setLoading(false);
          toast.error("This organization has been suspended. Please contact support.");
          return;
        }
      } catch {}
    }

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

      if (localStorage.getItem("pending_onboarding_payment") === "true") {
        setLoading(false);
        navigate("/payment", { replace: true });
        return;
      }

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

    const currentEmail = (email || localStorage.getItem("login_email") || "user@example.com").toLowerCase();

    const savedOrgs = localStorage.getItem("mantra_organizations_v1");
    if (savedOrgs) {
      try {
        const orgs = JSON.parse(savedOrgs);
        const matched = orgs.find((o: any) => (o.email || "").toLowerCase() === currentEmail);
        if (matched && matched.status === "Suspended") {
          setLoading(false);
          isVerifyingRef.current = false;
          toast.error("This organization has been suspended. Please contact support.");
          return;
        }
      } catch {}
    }

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

      if (localStorage.getItem("pending_onboarding_payment") === "true") {
        navigate("/payment", { replace: true });
        return;
      }

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
        {/* Left Side - Brand & Features (Dark Slate/Navy Hero) */}
        <div
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-[56px] min-h-screen"
          style={{
            background:
              "linear-gradient(135deg, #141B24 0%, #1c2736 50%, #2A3A4D 100%)",
          }}
        >
          {/* Very soft radial blue glow behind heading (low opacity, no hard edges) */}
          <div className="absolute top-1/2 -translate-y-1/2 left-8 w-[540px] h-[540px] bg-[#3B82F6]/[0.06] rounded-full blur-[140px] pointer-events-none" />

          {/* Faint dot texture at 3 to 4% opacity */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              backgroundImage: "radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col justify-between w-full h-full">
            {/* Main Content: Logo, Heading & Subtitle block */}
            <div className="my-auto max-w-[520px] w-full flex flex-col items-start">
              {/* MantraAssist Brand Anchor Logo (moved from top-left, height 40px, same white asset, 40px gap to heading) */}
              <img
                src={logo}
                alt="MantraAssist"
                className="h-10 w-auto drop-shadow-md mb-10"
                style={{ filter: "brightness(0) invert(1)" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {/* Heading: about 56px, line-height 1.05, bold, letter-spacing -0.02em, pure white. Keep "Workforce" in brand blue with 2px underline & 6px offset. Gap to subtitle: 24px */}
              <h1
                className="font-bold text-white text-[42px] xl:text-[56px] leading-[1.05] tracking-[-0.02em] mb-6 text-left"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                The AI{" "}
                <span className="text-[#3B82F6] underline decoration-2 underline-offset-[6px] decoration-[#3B82F6]">
                  Workforce
                </span>
                <br />
                for Every Business.
              </h1>

              {/* Subtitle: 18px, line-height 1.6, slate-300 at about 75% opacity, max-width about 460px */}
              <p
                className="text-[18px] leading-[1.6] text-slate-300/75 max-w-[460px] text-left"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                From customer conversations to daily operations, MantraAssist automates what slows you down, so you can focus on growth.
              </p>
            </div>

            {/* Footer Links: 13px, muted slate, evenly spaced with small dot separators, aligned to baseline */}
            <div
              className="flex items-center gap-3.5 text-[13px] text-slate-400"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
              >
                English
              </button>
              <span className="text-white/20 text-xs">•</span>
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
              >
                Accessibility
              </button>
              <span className="text-white/20 text-xs">•</span>
              <button
                type="button"
                className="hover:text-white transition-colors cursor-pointer"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Form (Centered horizontally and vertically, max-width 420px, 24px side padding on mobile) */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:p-[56px] bg-gradient-to-br from-gray-50 to-white min-h-screen">
          <div className="w-full max-w-[420px] mx-auto">
            {/* Logo for mobile */}
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

            {/* Header: Heading about 32px bold, subtitle 15px muted slate. Heading to subtitle: 8px. Subtitle to first label: 32px */}
            <div className="mb-8 text-left">
              <h2
                className="text-[32px] font-bold text-gray-900 tracking-tight leading-tight mb-2 text-left"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {isVerifyRoute ? "Verify your account" : "Welcome Back"}
              </h2>
              <p
                className="text-[15px] text-slate-500 leading-normal text-left"
                style={{ fontFamily: "Inter, sans-serif" }}
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
              <form onSubmit={handleOtpSubmit}>
                <div>
                  <label
                    className="block text-[13px] font-medium text-slate-700 mb-2 text-left"
                    style={{ fontFamily: "Inter, sans-serif" }}
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
                    className="w-full h-[52px] border border-slate-200 rounded-[12px] text-center text-3xl font-bold font-mono tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all shadow-2xs text-gray-900 bg-white hover:border-slate-300"
                    style={{ letterSpacing: "0.45em" }}
                    maxLength={6}
                    autoFocus
                  />

                  <div className="mt-4 flex items-center justify-between text-sm">
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

                {/* Primary Button: Full width (52px tall, 12px radius, navy) */}
                <div className="mt-7">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] bg-[#141B24] hover:bg-[#0f172a] active:scale-[0.99] text-white text-sm font-semibold rounded-[12px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Submit</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── EMAIL & PASSWORD LOGIN VIEW ── */
              <form onSubmit={handleLoginSubmit}>
                {/* 1. Email Address */}
                <div>
                  <label
                    className="block text-[13px] font-medium text-slate-700 mb-2 text-left"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here"
                    className="w-full h-[48px] px-4 bg-white border border-slate-200 rounded-[12px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all shadow-2xs hover:border-slate-300"
                    style={{ fontFamily: "Inter, sans-serif" }}
                    autoFocus
                  />
                </div>

                {/* 2. Password (20px between fields) */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="block text-[13px] font-medium text-slate-700 text-left"
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
                      className="w-full h-[48px] pl-4 pr-12 bg-white border border-slate-200 rounded-[12px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all shadow-2xs hover:border-slate-300"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer flex items-center justify-center"
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

                {/* Last field to button: 28px. Button to sign-up line: 20px. Centered under button. */}
                <div className="mt-7 flex flex-col items-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[52px] bg-[#141B24] hover:bg-[#0f172a] active:scale-[0.99] text-white text-sm font-semibold rounded-[12px] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>

                  <p
                    className="mt-5 text-sm text-slate-500 text-center"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Don't have an account?{" "}
                    <Link
                      to="/signup"
                      className="text-[#3B82F6] hover:text-blue-700 font-semibold hover:underline transition-colors"
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
                className="text-base font-bold mb-4 text-gray-900 text-left"
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
