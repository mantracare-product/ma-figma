import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation, useSearchParams, useParams } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Calendar,
  Share2,
  TrendingUp,
  ArrowRight,
  Building2,
  Sparkles,
  Lock,
  Users,
  Headphones,
} from "lucide-react";
import logo from "@/imports/ma_logo-1.png";
import { getStoredPlans } from "../../../lib/plansBillingStore";
import { WorkspaceSetupLoader } from "../../components/auth/WorkspaceSetupLoader";

interface InviteData {
  token: string;
  orgId: string;
  email: string;
  website?: string;
  confirmedData?: any;
  planId?: string;
  isUsed?: boolean;
}

export default function InviteAcceptance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { login } = useAuth();

  // Extract invite token from query params or route params
  const token = useMemo(() => {
    return (
      searchParams.get("token") ||
      searchParams.get("invite") ||
      params.token ||
      ""
    );
  }, [searchParams, params]);

  // Validation state
  const [isValidating, setIsValidating] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [invalidReason, setInvalidReason] = useState<string>(
    "This invite link is no longer valid. Ask your admin for a new invite."
  );

  // Invite & Organization state
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [orgName, setOrgName] = useState<string>("your organization");
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  // Resolved plan and pricing type
  const assignedPlan = useMemo(() => {
    if (!inviteData?.planId) return null;
    const allPlans = getStoredPlans();
    return allPlans.find((p) => p.id === inviteData.planId) || null;
  }, [inviteData?.planId]);

  const assignedPlanName = useMemo(() => {
    return (
      assignedPlan?.name ||
      inviteData?.confirmedData?.assignedPlanName ||
      "AI Clinic Receptionist Pro"
    );
  }, [assignedPlan, inviteData]);

  const isPaidPlan = useMemo(() => {
    if (!assignedPlan) return false;
    if (
      assignedPlan.category === "Onboarding" ||
      assignedPlan.category === "Internal" ||
      assignedPlan.tier === "Free"
    ) {
      return false;
    }
    const inr = assignedPlan.countryPricing?.find((cp) => cp.currency === "INR");
    const price = inr ? inr.monthlyPrice : assignedPlan.countryPricing?.[0]?.monthlyPrice || 0;
    return price > 0;
  }, [assignedPlan]);

  // Form inputs
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // "Setting up your organization" loader state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStage, setSetupStage] = useState(0);

  // Verify the invite link on mount
  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setIsLinkValid(false);
      return;
    }

    try {
      // 1. Check if token was marked as used in localStorage
      const isTokenUsed =
        localStorage.getItem("mantra_invite_used_" + token) === "true";
      if (isTokenUsed) {
        setIsValidating(false);
        setIsLinkValid(false);
        return;
      }

      // 2. Load stored invite data
      const rawInvite = localStorage.getItem("mantra_invite_" + token);
      let parsedInvite: InviteData | null = null;
      if (rawInvite) {
        parsedInvite = JSON.parse(rawInvite);
      }

      // 3. Load organizations from storage to check active state & suspension
      const rawOrgs = localStorage.getItem("mantra_organizations_v1");
      const organizations = rawOrgs ? JSON.parse(rawOrgs) : [];

      let matchedOrg: any = null;
      if (parsedInvite?.orgId) {
        matchedOrg = organizations.find((o: any) => o.id === parsedInvite?.orgId);
      }
      if (!matchedOrg) {
        matchedOrg = organizations.find((o: any) => o.inviteToken === token);
      }

      // If org is deleted or not found
      if (!matchedOrg) {
        setIsValidating(false);
        setIsLinkValid(false);
        return;
      }

      // If org is Suspended, treat link as invalid
      if (matchedOrg.status === "Suspended") {
        setIsValidating(false);
        setIsLinkValid(false);
        return;
      }

      // If invite was already marked used on the org
      if (matchedOrg.inviteUsed || parsedInvite?.isUsed) {
        setIsValidating(false);
        setIsLinkValid(false);
        return;
      }

      // Reconstruct or update invite data
      const resolvedInvite: InviteData = {
        token,
        orgId: matchedOrg.id,
        email: matchedOrg.email,
        website: matchedOrg.website,
        confirmedData: matchedOrg,
        planId: matchedOrg.assignedPlanId || parsedInvite?.planId,
      };

      setInviteData(resolvedInvite);
      setOrgName(matchedOrg.name || "your organization");

      // Check if the invited email already has an account
      const invitedEmail = (matchedOrg.email || "").toLowerCase().trim();
      let hasAccount = false;
      try {
        const rawUsers = localStorage.getItem("mantra_users");
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (
            Array.isArray(users) &&
            users.some((u: any) => (u.email || "").toLowerCase() === invitedEmail)
          ) {
            hasAccount = true;
          }
        }
        const loggedIn = localStorage.getItem("login_email");
        if (loggedIn && loggedIn.toLowerCase() === invitedEmail) {
          hasAccount = true;
        }
        const rawUserData = localStorage.getItem("user_data");
        if (rawUserData) {
          const ud = JSON.parse(rawUserData);
          if (ud?.email && ud.email.toLowerCase() === invitedEmail) {
            hasAccount = true;
          }
        }
      } catch {}

      if (
        invitedEmail === "admin@healthcare.com" ||
        invitedEmail === "doctor@healthcare.com"
      ) {
        hasAccount = true;
      }

      setIsExistingAccount(hasAccount);
      setIsLinkValid(true);
      setIsValidating(false);
    } catch (err) {
      setIsValidating(false);
      setIsLinkValid(false);
    }
  }, [token]);

  // Live password validation rules
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = isExistingAccount || (password.length > 0 && passwordsMatch);

  // Setup loader stages simulation
  const setupStages = [
    "your organization",
    "Workspace",
    "Knowledge base",
    "Schedule",
    "AI Reception",
  ];

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLinkValid || !inviteData) return;

    if (!isExistingAccount) {
      if (!password.trim()) {
        setSubmitError("Please enter a password.");
        return;
      }
      if (!passwordsMatch) {
        setSubmitError("Passwords don't match. Please check and try again.");
        return;
      }
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Simulate account creation / saving
      const cleanEmail = (inviteData.email || "").toLowerCase().trim();

      // Store user account
      try {
        const rawUsers = localStorage.getItem("mantra_users");
        const existingUsers = rawUsers ? JSON.parse(rawUsers) : [];
        const updatedUsers = [
          ...existingUsers.filter((u: any) => (u.email || "").toLowerCase() !== cleanEmail),
          {
            id: "user_" + Date.now(),
            email: cleanEmail,
            role: "Admin",
            orgId: inviteData.orgId,
            createdAt: new Date().toISOString(),
          },
        ];
        localStorage.setItem("mantra_users", JSON.stringify(updatedUsers));
      } catch {}

      // Mark invite as used in localStorage
      localStorage.setItem("mantra_invite_used_" + token, "true");
      if (inviteData) {
        const updatedInvite = { ...inviteData, isUsed: true, usedAt: new Date().toISOString() };
        localStorage.setItem("mantra_invite_" + token, JSON.stringify(updatedInvite));
      }

      // Update organization status to "Onboarding"
      const rawOrgs = localStorage.getItem("mantra_organizations_v1");
      if (rawOrgs) {
        const orgs = JSON.parse(rawOrgs);
        const updated = orgs.map((o: any) =>
          o.id === inviteData.orgId || o.inviteToken === token || (o.email && o.email.toLowerCase() === cleanEmail)
            ? { ...o, status: "Onboarding", inviteUsed: true }
            : o
        );
        localStorage.setItem("mantra_organizations_v1", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("mantra_organization_changed"));
      }

      // Save user session & active invite session for Onboarding
      localStorage.setItem("login_email", cleanEmail);
      if (inviteData.website) {
        localStorage.setItem("signup_website", inviteData.website);
      }
      localStorage.setItem("active_invite_session", JSON.stringify(inviteData));
      localStorage.removeItem("pricing_flow_selection");
      localStorage.removeItem("pending_onboarding_payment");

      const namePart = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      localStorage.setItem(
        "user_data",
        JSON.stringify({
          name: formattedName || "Admin User",
          email: cleanEmail,
          role: "SystemAdmin",
          organizationId: inviteData.orgId,
        })
      );

      // Authenticate in context
      login();

      // If this is a paid plan (price above 0), redirect to the payment screen
      if (isPaidPlan) {
        localStorage.setItem("pending_onboarding_payment", "true");
        setIsSubmitting(false);
        navigate("/payment", {
          replace: true,
          state: {
            email: cleanEmail,
            name: orgName,
            website: inviteData.website || "",
            planId: inviteData.planId,
          },
        });
        return;
      }

      // Setup is ALREADY done in admin! Activate organization and complete onboarding
      localStorage.setItem("onboarding_complete", "true");
      try {
        const rawOrgs = localStorage.getItem("mantra_organizations_v1");
        if (rawOrgs) {
          const orgs = JSON.parse(rawOrgs);
          const updated = orgs.map((o: any) =>
            o.id === inviteData.orgId || o.inviteToken === token || (o.email && o.email.toLowerCase() === cleanEmail)
              ? { ...o, status: "Active", inviteUsed: true }
              : o
          );
          localStorage.setItem("mantra_organizations_v1", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("mantra_organization_changed"));

          const targetOrg = updated.find(
            (o: any) => o.id === inviteData.orgId || o.inviteToken === token
          );
          if (targetOrg) {
            localStorage.setItem("user_organization", JSON.stringify(targetOrg));
          }
        }
      } catch {}

      localStorage.setItem("active_organization_name", orgName);
      localStorage.removeItem("active_invite_session");

      setIsSubmitting(false);
      setIsSettingUp(true);

      // Transition straight to dashboard after loader completes
      setTimeout(() => {
        toast.success(`Welcome to MantraAssist! Your workspace is ready.`);
        navigate("/", { replace: true });
      }, 4200);
    } catch (err: any) {
      setIsSubmitting(false);
      setIsSettingUp(false);
      setSubmitError(
        err?.message || "Failed to create account. Please check details and try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL - BRAND & FEATURES
          Layout, cards, and bottom stats strip kept unchanged.
          Heading & Subtitle rewritten for organization invite.
          ───────────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #141B24 0%, #1c2736 50%, #2A3A4D 100%)",
        }}
      >
        {/* Ambient Glow Overlays */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#3B82F6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 2xl:p-14 w-full h-full">
          {/* Logo */}
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

          {/* Main Content: Platform Badge, Rewritten Headline & Subtitle */}
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
              for Modern Healthcare.
            </h1>

            <p
              className="text-[#D6DCE5] text-sm sm:text-base leading-relaxed mb-8 max-w-xl"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Your workspace for {orgName} is ready. Automate patient conversations, scheduling and documentation with MantraAssist.
            </p>

            {/* Row of 3 Feature Cards */}
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

            {/* Bottom Stats Strip */}
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

          {/* Footer Links */}
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

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL - FORM / INVALID STATE / SETUP LOADER
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-8 w-auto mb-6"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>

          {/* ── CASE 1: "Setting up your organization" Loader ── */}
          {isSettingUp ? (
            <div className="py-6 px-4">
              <WorkspaceSetupLoader orgName={orgName} />
            </div>
          ) : isValidating ? (
            /* ── Validating Token Spinner ── */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-600">
                Verifying invite link...
              </p>
            </div>
          ) : !isLinkValid ? (
            /* ── CASE 2: Invalid / Expired / Already-Used Link ── */
            <div className="text-center py-8 px-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-2xs">
                <AlertCircle className="w-7 h-7" />
              </div>

              <h2
                className="text-2xl font-bold text-gray-900 tracking-tight mb-2.5"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Invite Link Invalid
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-8">
                {invalidReason}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#182230] hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-xs text-center"
                >
                  Go to Login
                </Link>
                <button
                  type="button"
                  onClick={() => window.open("https://mantracare.com/support", "_blank")}
                  className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all text-center cursor-pointer"
                >
                  Contact Support
                </button>
              </div>
            </div>
          ) : (
            /* ── CASE 3: Active Invite Acceptance Form ── */
            <div className="animate-in fade-in duration-200">
              {/* Header */}
              <div className="mb-8">
                <h2
                  className="text-3xl sm:text-4xl font-bold mb-2.5 text-gray-900 tracking-tight"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
                >
                  {isExistingAccount ? `Join ${orgName}` : `Welcome, ${orgName}`}
                </h2>
                <p
                  className="text-sm sm:text-base text-gray-600 leading-relaxed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {isExistingAccount
                    ? `You already have a MantraAssist account. Accept the invite to join ${orgName}.`
                    : `Your MantraAssist workspace is ready. Create a password to secure your account and get started.`}
                </p>
                {!isExistingAccount && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Your plan: <strong className="text-slate-900 font-semibold">{assignedPlanName}</strong></span>
                  </div>
                )}
              </div>

              {/* Submit Error Alert */}
              {submitError && (
                <div className="p-3.5 mb-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAcceptInvite} className="space-y-4 sm:space-y-4.5">
                {/* Email Address (Pre-filled, read-only, not editable) */}
                <div>
                  <label
                    className="block text-xs sm:text-[13px] font-semibold mb-1.5 text-slate-800"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={inviteData?.email || ""}
                      readOnly
                      tabIndex={-1}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed select-none shadow-2xs pr-10 focus:outline-none"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This invite is securely tied to this email address.
                  </p>
                </div>

                {/* ── Existing Account Case: Show Message Box & Accept Invite Button ── */}
                {isExistingAccount ? (
                  <div className="pt-2 space-y-5">
                    <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            You already have an account
                          </h4>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            You are signed up as{" "}
                            <span className="font-semibold text-slate-900">
                              {inviteData?.email}
                            </span>
                            . Accepting this invite will connect you directly to {orgName} with your existing credentials.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>Accept Invite</span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* ── New Organization Case: Password & Confirm Password with live validation rules ── */
                  <>
                    {/* Password */}
                    <div>
                      <label
                        className="block text-xs sm:text-[13px] font-semibold mb-1.5 text-slate-800"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a secure password"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs pr-11"
                          style={{ fontFamily: "Inter, sans-serif" }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label
                        className="block text-xs sm:text-[13px] font-semibold mb-1.5 text-slate-800"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Confirm password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs pr-11 ${
                            confirmPassword.length > 0 && !passwordsMatch
                              ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500"
                              : "border-slate-200 focus:ring-slate-900/10 focus:border-slate-800 hover:border-slate-300"
                          }`}
                          style={{ fontFamily: "Inter, sans-serif" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                          title={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Confirm Password Mismatch Warning */}
                      {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Passwords don't match</span>
                        </p>
                      )}
                    </div>

                    {/* Primary Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className="w-full py-3.5 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span>{isPaidPlan ? "Continue to payment" : "Create account"}</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
