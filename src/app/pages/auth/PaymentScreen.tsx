import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrganizationContext";
import {
  CreditCard,
  Building2,
  Lock,
  Coins,
  Users,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Calendar,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import CenteredOnboardingShell from "./CenteredOnboardingShell";
import {
  getStoredPlans,
  assignPlanToWorkspace,
  IndustryPlan,
} from "../../../lib/plansBillingStore";
import { WorkspaceSetupLoader } from "../../components/auth/WorkspaceSetupLoader";

export default function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { updateOrganization } = useOrganization();

  // Load invite session or pricing selection
  const inviteSession = useMemo(() => {
    try {
      const raw = localStorage.getItem("active_invite_session");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const pricingSelection = useMemo(() => {
    try {
      const raw = localStorage.getItem("pricing_flow_selection");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  // Determine user email
  const userEmail = useMemo(() => {
    return (
      inviteSession?.email ||
      (location.state as any)?.email ||
      localStorage.getItem("login_email") ||
      "admin@healthcare.com"
    );
  }, [inviteSession, location.state]);

  // Determine Organization Name
  const initialOrgName = useMemo(() => {
    if (inviteSession?.confirmedData?.name) return inviteSession.confirmedData.name;
    const fromStorage = localStorage.getItem("active_organization_name");
    if (fromStorage && !fromStorage.includes("localhost") && !fromStorage.startsWith("http")) {
      return fromStorage;
    }
    return "My Organization";
  }, [inviteSession]);

  const [billingOrgName, setBillingOrgName] = useState(initialOrgName);

  // Identify assigned/selected plan
  const planId = inviteSession?.planId || pricingSelection?.planId;
  const plans = useMemo(() => getStoredPlans(), []);
  const selectedPlan = useMemo(() => {
    if (planId) {
      const found = plans.find((p) => p.id === planId);
      if (found) return found;
    }
    // Fallback if none found
    return (
      plans.find((p) => p.isActive !== false && p.category !== "Onboarding" && p.category !== "Internal") ||
      plans[0]
    );
  }, [plans, planId]);

  const billingCycle = pricingSelection?.cycle || "monthly";

  // Calculate pricing in INR
  const inrPricing = useMemo(() => {
    if (!selectedPlan) return null;
    return (
      selectedPlan.countryPricing?.find((cp) => cp.currency === "INR") ||
      selectedPlan.countryPricing?.[0] || {
        monthlyPrice: 4999,
        yearlyPrice: 47990,
      }
    );
  }, [selectedPlan]);

  const amountDue = useMemo(() => {
    if (!inrPricing) return 4999;
    return billingCycle === "yearly" ? inrPricing.yearlyPrice : inrPricing.monthlyPrice;
  }, [inrPricing, billingCycle]);

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Setting up organization loader state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStage, setSetupStage] = useState(0);

  const setupStages = [
    "your organization",
    "Workspace",
    "Knowledge base",
    "Schedule",
    "AI Reception",
  ];

  const handleQuickFillCard = () => {
    setPaymentMethod("card");
    setCardNumber("4532 8901 2345 6789");
    setCardExpiry("12/28");
    setCardCvv("888");
    setCardName(billingOrgName || "Practice Administrator");
    setPaymentError(null);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!billingOrgName.trim()) {
      setPaymentError("Please enter your organization name");
      return;
    }

    if (paymentMethod === "card") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      if (cleanNum.length < 15) {
        setPaymentError("Please enter a valid card number (16 digits)");
        return;
      }
      if (!cardExpiry || !cardExpiry.includes("/")) {
        setPaymentError("Please enter a valid expiry date (MM/YY)");
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setPaymentError("Please enter a valid 3 or 4-digit CVV");
        return;
      }
      if (!cardName.trim()) {
        setPaymentError("Please enter the name on the card");
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        setPaymentError("Please enter a valid UPI ID (e.g. yourname@okhdfcbank)");
        return;
      }
    }

    setPaymentError(null);
    setIsProcessing(true);

    setTimeout(() => {
      try {
        // Apply plan to organization workspace
        const currentOrgId =
          inviteSession?.orgId ||
          localStorage.getItem("mantra_active_org_id_v1") ||
          localStorage.getItem("signup_org_id") ||
          "demo";

        if (selectedPlan) {
          assignPlanToWorkspace(currentOrgId, selectedPlan.id, billingCycle, "INR");
        }

        const isFromAdminInvite = Boolean(inviteSession);

        // Update organization in mantra_organizations_v1
        try {
          const rawOrgs = localStorage.getItem("mantra_organizations_v1");
          if (rawOrgs) {
            const orgs = JSON.parse(rawOrgs);
            const updated = orgs.map((o: any) =>
              o.id === currentOrgId || (inviteSession && o.inviteToken === inviteSession.token) || (o.email && o.email.toLowerCase() === userEmail.toLowerCase())
                ? { ...o, name: billingOrgName.trim(), status: "Active" }
                : o
            );
            localStorage.setItem("mantra_organizations_v1", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent("mantra_organization_changed"));

            const targetOrg = updated.find(
              (o: any) => o.id === currentOrgId || (inviteSession && o.inviteToken === inviteSession.token)
            );
            if (targetOrg) {
              localStorage.setItem("user_organization", JSON.stringify(targetOrg));
            }
          }
        } catch {}

        // Clear pending payment flag
        localStorage.removeItem("pending_onboarding_payment");
        localStorage.setItem("active_organization_name", billingOrgName.trim());
        localStorage.setItem("onboarding_complete", "true");

        // Authenticate user
        login();

        setIsProcessing(false);
        setIsSettingUp(true);

        setTimeout(() => {
          if (isFromAdminInvite) {
            localStorage.removeItem("active_invite_session");
            toast.success("Payment successful! Welcome to MantraAssist.");
            navigate("/", { replace: true });
          } else {
            toast.success("Payment successful! Let's finish tailoring your workspace.");
            navigate("/onboarding", {
              replace: true,
              state: {
                email: userEmail,
                name: billingOrgName.trim(),
                website: inviteSession?.website || "",
                fromPayment: true,
              },
            });
          }
        }, 4200);
      } catch (err: any) {
        setIsProcessing(false);
        setIsSettingUp(false);
        setPaymentError(
          err?.message || "Payment processing failed. Please verify your card details and retry."
        );
      }
    }, 1200);
  };

  return (
    <CenteredOnboardingShell
      maxWidth={isSettingUp ? "max-w-none" : "max-w-4xl"}
      showLogo={!isSettingUp}
      showFooter={!isSettingUp}
      noCard={isSettingUp}
    >
      {isSettingUp ? (
        <div className="py-6 px-4">
          <WorkspaceSetupLoader orgName={billingOrgName} />
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="border-b border-slate-100 pb-5">
            <h1
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Complete your payment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review your plan, then pay to launch your workspace.
            </p>
          </div>

          {paymentError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Two-Part Layout: Form Left, Summary Right (On Mobile Summary First) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Order Summary (First on mobile, Right side on desktop) */}
            <div className="order-1 lg:order-2 lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-2xs space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Order Summary
                </div>

                <div className="space-y-3 pb-4 border-b border-slate-200/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Organization</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                      {billingOrgName || "My Organization"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Plan & Tier</span>
                    <span className="font-semibold text-slate-900">
                      {selectedPlan?.name} ({selectedPlan?.tier})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Billing Cycle</span>
                    <span className="font-medium text-slate-800 capitalize">
                      {billingCycle === "yearly" ? "Yearly (20% discount)" : "Monthly"}
                    </span>
                  </div>
                </div>

                {/* Quotas */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {(billingCycle === "yearly"
                          ? selectedPlan?.yearlyCredits
                          : selectedPlan?.monthlyCredits || 1000
                        ).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-400">credits / mo</div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/70 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        Up to {selectedPlan?.includedSeats || 8}
                      </div>
                      <div className="text-[10px] text-slate-400">team members</div>
                    </div>
                  </div>
                </div>

                {/* Total Due Now */}
                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Due Now
                    </div>
                    <div className="text-[10px] text-slate-400">Inclusive of all taxes</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">
                      ₹{amountDue.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Billed {billingCycle}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs text-blue-800 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Encrypted 256-bit bank-grade payment processing with instant workspace activation.
                </span>
              </div>
            </div>

            {/* Payment Form (Second on mobile, Left side on desktop) */}
            <div className="order-2 lg:order-1 lg:col-span-7">
              <form onSubmit={handleProcessPayment} className="space-y-4.5">
                {/* 1. Billing Details Block */}
                <div className="p-4.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Billing Details
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Organization name *
                    </label>
                    <input
                      type="text"
                      value={billingOrgName}
                      onChange={(e) => setBillingOrgName(e.target.value)}
                      placeholder="e.g. Eye Mantra Clinic"
                      required
                      className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Billing email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={userEmail}
                        readOnly
                        tabIndex={-1}
                        className="w-full h-10 px-3.5 pr-10 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed select-none shadow-2xs"
                      />
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 2. Payment Gateway Form */}
                <div className="p-4.5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Payment Method
                    </span>
                    <button
                      type="button"
                      onClick={handleQuickFillCard}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      Fill demo card
                    </button>
                  </div>

                  {/* Method selector tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("card");
                        setPaymentError(null);
                      }}
                      className={`h-10 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "card"
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Credit / Debit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("upi");
                        setPaymentError(null);
                      }}
                      className={`h-10 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "upi"
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>UPI / Net Banking</span>
                    </button>
                  </div>

                  {paymentMethod === "card" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Card number *
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 •••• •••• 6789"
                          maxLength={19}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-mono shadow-2xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1">
                            Expiry date *
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM / YY"
                            maxLength={5}
                            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-mono shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1">
                            CVV / CVC *
                          </label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-mono shadow-2xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-800 mb-1">
                          Name on card *
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="e.g. Dr. Sarah Patel"
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 shadow-2xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        UPI ID / VPA *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okhdfcbank"
                        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-mono shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.history.length > 1) {
                        navigate(-1);
                      } else {
                        navigate("/login");
                      }
                    }}
                    className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 max-w-sm h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing payment...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay ₹{amountDue.toLocaleString("en-IN")} and launch</span>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </CenteredOnboardingShell>
  );
}
