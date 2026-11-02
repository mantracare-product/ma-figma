import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router";
import { toast } from "sonner";
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
import { getStoredPlans, type PlanTier } from "../../../lib/plansBillingStore";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const prefill = (location.state as any) || {};

  const [email, setEmail] = useState(prefill.email || "");
  const [website, setWebsite] = useState(prefill.website || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle plan selection from /pricing (Item 7)
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const tierParam = searchParams.get("tier");
    const cycleParam = searchParams.get("cycle") || "monthly";

    if (!categoryParam || !tierParam) {
      // If user navigated directly to /signup without pricing params, do not enforce pricing flow
      return;
    }

    const catLower = categoryParam.toLowerCase().trim();
    let normalizedCategory = "AI Receptionist";
    if (catLower.includes("scribe")) normalizedCategory = "AI Scribe";
    else if (catLower.includes("ehr")) normalizedCategory = "AI EHR";
    else if (catLower.includes("rcm")) normalizedCategory = "AI RCM";
    else if (catLower.includes("reception")) normalizedCategory = "AI Receptionist";
    else {
      localStorage.removeItem("pricing_flow_selection");
      return;
    }

    // Clear stale invite session when entering through public pricing flow
    localStorage.removeItem("active_invite_session");

    const tierLower = tierParam.toLowerCase().trim();
    let normalizedTier: PlanTier = "Starter";
    if (tierLower === "growth") normalizedTier = "Growth";
    else if (tierLower === "scale" || tierLower === "pro" || tierLower === "professional") normalizedTier = "Professional";
    else if (tierLower === "custom" || tierLower === "enterprise") normalizedTier = "Custom";
    else if (tierLower === "free") normalizedTier = "Free";
    else if (tierLower === "starter") normalizedTier = "Starter";
    else {
      normalizedTier = "Starter";
    }

    // Validate plan against active plans from admin
    const plans = getStoredPlans();
    const matchedPlan = plans.find((p) => {
      const pCat = (p.category || "").toLowerCase();
      const pTier = (p.tier || "").toLowerCase();
      const catMatch =
        (normalizedCategory === "AI Receptionist" && pCat.includes("reception")) ||
        (normalizedCategory === "AI Scribe" && pCat.includes("scribe")) ||
        (normalizedCategory === "AI EHR" && pCat.includes("ehr")) ||
        (normalizedCategory === "AI RCM" && pCat.includes("rcm"));
      const tierMatch =
        pTier === normalizedTier.toLowerCase() ||
        (normalizedTier === "Professional" && (pTier === "professional" || pTier === "scale")) ||
        (normalizedTier === "Growth" && pTier === "growth");
      return catMatch && tierMatch && p.isActive !== false;
    });

    const finalPlan =
      matchedPlan ||
      plans.find((p) => (p.category || "").toLowerCase().includes(catLower) && p.isActive !== false) ||
      plans[0];

    if (finalPlan) {
      const selection = {
        category: normalizedCategory,
        tier: finalPlan.tier,
        cycle: cycleParam === "yearly" ? "yearly" : "monthly",
        planId: finalPlan.id,
        planName: finalPlan.name,
      };
      localStorage.setItem("pricing_flow_selection", JSON.stringify(selection));
    } else {
      localStorage.removeItem("pricing_flow_selection");
    }
  }, [searchParams]);

  // Handle organization invite link (?invite=token) -> redirect to dedicated /invite screen
  useEffect(() => {
    const inviteParam = searchParams.get("invite") || searchParams.get("token");
    if (!inviteParam) return;
    navigate(`/invite?token=${inviteParam}`, { replace: true });
  }, [searchParams, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      toast.error("Please enter a valid organization email address");
      return;
    }

    if (!website.trim()) {
      toast.error("Please enter your organization website");
      return;
    }

    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const cleanEmail = email.trim().toLowerCase();

      const cleanWebsite = website.trim();

      // If invited organization, move status to "Onboarding" (Part 2, Item 4)
      const activeInviteRaw = localStorage.getItem("active_invite_session");
      if (activeInviteRaw) {
        try {
          const invite = JSON.parse(activeInviteRaw);
          const rawOrgs = localStorage.getItem("mantra_organizations_v1");
          if (rawOrgs) {
            const orgs = JSON.parse(rawOrgs);
            const updated = orgs.map((o: any) =>
              o.id === invite.orgId || o.inviteToken === invite.token || (o.email && o.email.toLowerCase() === cleanEmail)
                ? { ...o, status: "Onboarding" }
                : o
            );
            localStorage.setItem("mantra_organizations_v1", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("mantra_organization_changed"));
          }
        } catch { }
      }

      localStorage.setItem("verify_origin", "signup");
      localStorage.setItem("login_email", cleanEmail);
      if (cleanWebsite) {
        localStorage.setItem("signup_website", cleanWebsite);
      }
      localStorage.setItem(
        "user_data",
        JSON.stringify({
          email: cleanEmail,
          website: cleanWebsite,
          role: "SystemAdmin",
        })
      );

      toast.success("Verification code sent to your email");
      navigate("/verify", {
        state: {
          email: cleanEmail,
          website: cleanWebsite,
          from: "signup",
        },
      });
    }, 350);
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

        {/* Right Side - Signup Form (Centered horizontally and vertically, max-width 420px, 24px side padding on mobile) */}
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
                Get started
              </h2>
              <p
                className="text-[15px] text-slate-500 leading-normal text-left"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Create your account to start your free trial
              </p>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit}>
              {/* 1. Organization email */}
              <div>
                <label
                  className="block text-[13px] font-medium text-slate-700 mb-2 text-left"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Organization email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@eyemantra.com"
                  className="w-full h-[48px] px-4 bg-white border border-slate-200 rounded-[12px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all shadow-2xs hover:border-slate-300"
                  style={{ fontFamily: "Inter, sans-serif" }}
                  autoFocus
                />
              </div>

              {/* 2. Organization website (20px between fields) */}
              <div className="mt-5">
                <label
                  className="block text-[13px] font-medium text-slate-700 mb-2 text-left"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Organization website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. https://www.eyemantra.com"
                  className="w-full h-[48px] px-4 bg-white border border-slate-200 rounded-[12px] text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all shadow-2xs hover:border-slate-300"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>

              {/* 3. Password (20px between fields) */}
              <div className="mt-5">
                <label
                  className="block text-[13px] font-medium text-slate-700 mb-2 text-left"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Password
                </label>
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
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>

                <p
                  className="mt-5 text-sm text-slate-500 text-center"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-[#3B82F6] hover:text-blue-700 font-semibold hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>

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
    </GuestRoute>
  );
}
