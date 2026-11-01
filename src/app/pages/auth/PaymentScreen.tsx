import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrganizationContext";
import {
  CreditCard,
  Lock,
  Coins,
  Users,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Info,
} from "lucide-react";
import CenteredOnboardingShell from "./CenteredOnboardingShell";
import {
  getStoredPlans,
  assignPlanToWorkspace,
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
    if (!selectedPlan) return { monthlyPrice: 5998, yearlyPrice: 57581 };
    return (
      selectedPlan.countryPricing?.find((cp) => cp.currency === "INR") ||
      selectedPlan.countryPricing?.[0] || {
        monthlyPrice: 5998,
        yearlyPrice: 57581,
      }
    );
  }, [selectedPlan]);

  const amountDue = useMemo(() => {
    if (!inrPricing) return 5998;
    return billingCycle === "yearly" ? inrPricing.yearlyPrice : inrPricing.monthlyPrice;
  }, [inrPricing, billingCycle]);

  // Clean Plan & Tier formatting (e.g. "AI Receptionist · Starter", removing any duplicate tier)
  const planDisplayName = useMemo(() => {
    const category = selectedPlan?.category || "AI Receptionist";
    const tier = selectedPlan?.tier || "Starter";
    return `${category} · ${tier}`;
  }, [selectedPlan]);

  // Test mode detection for demo card link
  const isTestMode = useMemo(() => {
    try {
      return (
        localStorage.getItem("payment_gateway_test_mode") === "true" ||
        localStorage.getItem("mantra_payment_test_mode") === "true" ||
        localStorage.getItem("demo_mode") === "true"
      );
    } catch {
      return false;
    }
  }, []);

  // Payment form state - all fields start empty
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Setting up organization loader state
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleQuickFillCard = () => {
    setPaymentMethod("card");
    setCardNumber("1234 1234 1234 1234");
    setCardExpiry("12 / 28");
    setCardCvv("123");
    setCardName("Jane Doe");
    setFieldErrors({});
    setPaymentError(null);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!billingOrgName.trim()) {
      errors.orgName = "Please enter your organization name";
    }

    if (paymentMethod === "card") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      if (cleanNum.length < 15) {
        errors.cardNumber = "Please enter a valid card number (16 digits)";
      }
      if (!cardExpiry || !cardExpiry.includes("/")) {
        errors.cardExpiry = "Please enter a valid expiry date (MM / YY)";
      }
      if (!cardCvv || cardCvv.length < 3) {
        errors.cardCvv = "Please enter a valid 3 or 4-digit CVC";
      }
      if (!cardName.trim()) {
        errors.cardName = "Please enter the name on the card";
      }
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        errors.upiId = "Please enter a valid UPI ID (e.g. yourname@okhdfcbank)";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setPaymentError("Payment didn't go through. Check your details and try again.");
      return;
    }

    setFieldErrors({});
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
        setPaymentError("Payment didn't go through. Check your details and try again.");
      }
    }, 1200);
  };

  return (
    <CenteredOnboardingShell
      maxWidth={isSettingUp ? "max-w-none" : "max-w-[940px]"}
      cardClassName={
        isSettingUp
          ? ""
          : "!p-8 sm:!p-10 border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-[24px]"
      }
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
          <div className="border-b border-slate-100 pb-4">
            <h1
              className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Activate your workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review your plan and pay securely. Your workspace goes live as soon as payment completes.
            </p>
          </div>

          {/* Form wrapping both columns */}
          <form onSubmit={handleProcessPayment}>
            <div className="flex flex-col gap-5 lg:gap-8 lg:grid lg:grid-cols-12 items-start">
              {/* Left Column on Desktop: Payment Method & Buttons */}
              <div className="contents lg:flex lg:flex-col lg:col-span-7 lg:gap-5">
                {/* 1. Payment Method Block */}
                <div className="order-3 lg:order-1 p-6 rounded-2xl border border-slate-200/80 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium uppercase tracking-wider text-slate-400">
                      Payment method
                    </span>
                    {isTestMode && (
                      <button
                        type="button"
                        onClick={handleQuickFillCard}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 underline cursor-pointer"
                      >
                        Fill demo card
                      </button>
                    )}
                  </div>

                  {/* Segmented Control Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("card");
                        setPaymentError(null);
                      }}
                      className={`h-11 px-3 rounded-xl text-[13px] font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "card"
                          ? "bg-[#0f172a] text-white border-[#0f172a] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("upi");
                        setPaymentError(null);
                      }}
                      className={`h-11 px-3 rounded-xl text-[13px] font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "upi"
                          ? "bg-[#0f172a] text-white border-[#0f172a] shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>UPI / Net Banking</span>
                    </button>
                  </div>

                  {paymentMethod === "card" ? (
                    <div className="space-y-3.5 pt-1">
                      {/* Card Number */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Card number *
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                            const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
                            setCardNumber(formatted);
                            if (fieldErrors.cardNumber) {
                              setFieldErrors((prev) => ({ ...prev, cardNumber: "" }));
                            }
                          }}
                          placeholder="1234 1234 1234 1234"
                          maxLength={19}
                          className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 font-mono tabular-nums placeholder:text-slate-400 focus:outline-none transition-all ${
                            fieldErrors.cardNumber
                              ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          }`}
                        />
                        {fieldErrors.cardNumber && (
                          <p className="mt-1 text-xs text-rose-600">{fieldErrors.cardNumber}</p>
                        )}
                      </div>

                      {/* Expiry & CVC */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                            Expiry *
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                              if (val.length > 2) val = `${val.slice(0, 2)} / ${val.slice(2)}`;
                              setCardExpiry(val);
                              if (fieldErrors.cardExpiry) {
                                setFieldErrors((prev) => ({ ...prev, cardExpiry: "" }));
                              }
                            }}
                            placeholder="MM / YY"
                            maxLength={7}
                            className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 font-mono tabular-nums placeholder:text-slate-400 focus:outline-none transition-all ${
                              fieldErrors.cardExpiry
                                ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            }`}
                          />
                          {fieldErrors.cardExpiry && (
                            <p className="mt-1 text-xs text-rose-600">{fieldErrors.cardExpiry}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                            CVC *
                          </label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setCardCvv(val);
                              if (fieldErrors.cardCvv) {
                                setFieldErrors((prev) => ({ ...prev, cardCvv: "" }));
                              }
                            }}
                            placeholder="123"
                            maxLength={4}
                            className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 font-mono tabular-nums placeholder:text-slate-400 focus:outline-none transition-all ${
                              fieldErrors.cardCvv
                                ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            }`}
                          />
                          {fieldErrors.cardCvv && (
                            <p className="mt-1 text-xs text-rose-600">{fieldErrors.cardCvv}</p>
                          )}
                        </div>
                      </div>

                      {/* Name on Card */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                          Name on card *
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => {
                            setCardName(e.target.value);
                            if (fieldErrors.cardName) {
                              setFieldErrors((prev) => ({ ...prev, cardName: "" }));
                            }
                          }}
                          placeholder="Name as shown on card"
                          className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                            fieldErrors.cardName
                              ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                              : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          }`}
                        />
                        {fieldErrors.cardName && (
                          <p className="mt-1 text-xs text-rose-600">{fieldErrors.cardName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                        UPI ID / VPA *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => {
                          setUpiId(e.target.value);
                          if (fieldErrors.upiId) {
                            setFieldErrors((prev) => ({ ...prev, upiId: "" }));
                          }
                        }}
                        placeholder="yourname@okhdfcbank"
                        className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 font-mono tabular-nums placeholder:text-slate-400 focus:outline-none transition-all ${
                          fieldErrors.upiId
                            ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        }`}
                      />
                      {fieldErrors.upiId && (
                        <p className="mt-1 text-xs text-rose-600">{fieldErrors.upiId}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Action Buttons (Sticky on mobile, static on desktop) */}
                <div className="order-4 lg:order-2 space-y-3 sticky bottom-0 -mx-6 px-6 py-3 bg-white/95 backdrop-blur-sm border-t border-slate-200/70 sm:border-0 sm:static sm:bg-transparent sm:p-0 sm:mx-0 z-20">
                  {/* Error Notification Above Button */}
                  {paymentError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-medium flex items-center gap-2 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.history.length > 1) {
                          navigate(-1);
                        } else {
                          navigate("/login");
                        }
                      }}
                      className="h-[52px] px-6 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4 text-slate-500" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 h-[52px] bg-[#0f172a] hover:bg-[#1e293b] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing payment…</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-slate-300" />
                          <span>Pay and launch</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column on Desktop: Billing Details, Order Summary & Security Note */}
              <div className="contents lg:flex lg:flex-col lg:col-span-5 lg:gap-5 lg:sticky lg:top-6">
                {/* 1. Billing Details Block */}
                <div className="order-2 lg:order-1 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 space-y-4">
                  <div className="text-[12px] font-medium uppercase tracking-wider text-slate-400">
                    Billing details
                  </div>

                  {/* Organization Name Field */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                      Organization name *
                    </label>
                    <input
                      type="text"
                      value={billingOrgName}
                      onChange={(e) => {
                        setBillingOrgName(e.target.value);
                        if (fieldErrors.orgName) {
                          setFieldErrors((prev) => ({ ...prev, orgName: "" }));
                        }
                      }}
                      placeholder="e.g. Acme Health"
                      required
                      className={`w-full h-12 px-3.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                        fieldErrors.orgName
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                          : "border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      }`}
                    />
                    {fieldErrors.orgName && (
                      <p className="mt-1 text-xs text-rose-600">{fieldErrors.orgName}</p>
                    )}
                  </div>

                  {/* Billing Email Field (Read-only with Info Tooltip & Lock Icon) */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-[13px] font-medium text-slate-700">
                        Billing email
                      </label>
                      <div className="relative group inline-flex items-center">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center w-max max-w-[240px] px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-normal rounded-lg shadow-lg z-30 pointer-events-none transition-all">
                          Invoices and receipts are sent here
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        value={userEmail}
                        readOnly
                        tabIndex={-1}
                        className="w-full h-12 px-3.5 pr-10 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed select-none focus:outline-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 2. Order Summary Panel */}
                <div className="order-1 lg:order-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 space-y-4">
                  <div className="text-[12px] font-medium uppercase tracking-wider text-slate-400">
                    Order summary
                  </div>

                  {/* Plan & Billing rows */}
                  <div className="space-y-3 pb-4 border-b border-slate-200/80">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-500 font-medium">Plan</span>
                      <span className="font-semibold text-slate-900">
                        {planDisplayName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-slate-500 font-medium">Billing</span>
                      <span className="font-semibold text-slate-900 capitalize">
                        {billingCycle === "yearly" ? "Yearly" : "Monthly"}
                      </span>
                    </div>
                  </div>

                  {/* Two Stat Tiles */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                      <Coins className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {(billingCycle === "yearly"
                            ? selectedPlan?.yearlyCredits
                            : selectedPlan?.monthlyCredits || 1000
                          ).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">credits per month</div>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          Up to {selectedPlan?.includedSeats || 8}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">team members</div>
                      </div>
                    </div>
                  </div>

                  {/* Total Section with Thin Divider */}
                  <div className="pt-3.5 border-t border-slate-200/80 flex items-baseline justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-slate-700">Due today</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900 tracking-tight">
                        ₹{amountDue.toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Billed {billingCycle === "yearly" ? "yearly" : "monthly"} · incl. taxes
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Security Note */}
                <div className="order-5 lg:order-3 p-3.5 bg-slate-100/70 border border-slate-200/80 rounded-xl text-[12.5px] text-slate-600 flex items-start gap-2.5 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    Payments are encrypted and processed securely. Your workspace activates as soon as payment completes.
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </CenteredOnboardingShell>
  );
}
