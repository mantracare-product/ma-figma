/**
 * Pricing.tsx
 * Path: src/app/pages/Pricing.tsx
 *
 * Public SaaS Pricing Page for MantraAssist (/pricing).
 * - Public route: no login, no sidebar, no app shell.
 * - Dynamic data from admin (GET /api/public/pricing with direct store fallback).
 * - Monthly/Yearly cadence toggle with 20% discount badge.
 * - Product tab row: AI Receptionist, AI Scribe, AI EHR, AI RCM.
 * - Plan cards: Starter, Growth, Scale (and Custom if defined).
 * - Feature comparison table with dark section headers.
 * - Credit system: "How credits work" & "Top-up credit packs" (display-only).
 * - FAQ accordion with 6 questions.
 * - Closing CTA band scrolling back to plans.
 * - "Get started" button hands off selection to /signup?category=...&tier=...&cycle=...
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import {
  Check,
  Minus,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Coins,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import logo from "@/imports/ma_logo-1.png";
import {
  PublicPricingData,
  PublicPricingProduct,
  PublicPricingPlan,
  PublicComparisonGroup,
  getPublicPricingData,
} from "../../lib/plansBillingStore";

const FAQ_ITEMS = [
  {
    question: "What counts as a credit?",
    answer:
      "Credits power your practice's AI operations across telephony, messaging, and automations. For example: 1 outbound call minute = 1 credit, 1 inbound call minute = 2 credits, a missed call callback = 3 credits, 1 SMS or email = 1 credit, and 1 workflow execution = 1 credit. Audio transcription for AI Scribe is also covered by your monthly credit quota.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes, you can upgrade, downgrade, or switch products at any time directly from Billing > Plans. Upgrades take effect immediately with prorated billing, while downgrades take effect at the start of your next billing cycle.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No, there are zero setup fees or hidden activation charges on any of our plans. You can sign up, configure your AI receptionist and workflows, and start using MantraAssist right away.",
  },
  {
    question: "Do unused credits roll over?",
    answer:
      "Monthly plan credits refresh at the start of each billing cycle and do not roll over. However, any credits purchased through Top-up Credit Packs are permanent add-on credits that never expire and remain in your balance until used.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes! Every new practice gets started with our free exploration workspace with complimentary trial credits so you can test calls, review clinical templates, and explore all AI capabilities before choosing a paid tier.",
  },
  {
    question: "How does the yearly discount work?",
    answer:
      "When you choose yearly billing, you receive an immediate 20% discount on the entire year compared to paying monthly. You are billed once annually for 12 months, saving significant costs for your practice while enjoying uninterrupted service.",
  },
];

const AUDIENCE_BY_TIER: Record<string, string> = {
  starter: "For solo clinics & emerging practices",
  growth: "For busy growing healthcare clinics",
  scale: "For multi-specialty & hospital networks",
  custom: "For large hospital health systems",
};

export default function Pricing() {
  const navigate = useNavigate();
  const plansSectionRef = useRef<HTMLDivElement>(null);

  // Cadence: monthly or yearly
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Selected product tab
  const [selectedProductId, setSelectedProductId] = useState<string>("receptionist");

  // Expanded FAQ items
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Data fetching state
  const [pricingData, setPricingData] = useState<PublicPricingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // First attempt to fetch from endpoint
      const res = await fetch("/api/public/pricing");
      if (res.ok) {
        const json: PublicPricingData = await res.json();
        if (json && json.products && json.products.length > 0) {
          setPricingData(json);
          setIsLoading(false);
          return;
        }
      }
      // Direct store fallback
      const fallback = getPublicPricingData();
      setPricingData(fallback);
      setIsLoading(false);
    } catch (err: any) {
      try {
        const fallback = getPublicPricingData();
        setPricingData(fallback);
        setIsLoading(false);
      } catch (innerErr) {
        setFetchError("Unable to load pricing plans. Please check your connection and try again.");
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScrollToPlans = () => {
    if (plansSectionRef.current) {
      plansSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleGetStarted = (plan: PublicPricingPlan, product: PublicPricingProduct) => {
    const catSlug = product.id; // "receptionist", "scribe", "ehr", "rcm"
    const tierSlug = plan.tier.toLowerCase(); // "starter", "growth", "scale", "custom"
    navigate(`/signup?category=${encodeURIComponent(catSlug)}&tier=${encodeURIComponent(tierSlug)}&cycle=${billingCycle}`);
  };

  // Find currently active product
  const activeProduct = pricingData?.products.find((p) => p.id === selectedProductId) || pricingData?.products[0];
  const comparisonGroups = activeProduct && pricingData?.comparisonGroups ? pricingData.comparisonGroups[activeProduct.id] || [] : [];
  const discountPercent = pricingData?.yearlyDiscountPercent ?? 20;

  return (
    <div
      className="min-h-screen w-full bg-[#FAFAFA] text-[#182230] antialiased select-none"
      style={{ fontFamily: "Inter, 'DM Sans', sans-serif" }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (Clean, Public, Uncolored Logo)
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-8 sm:h-9 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#182230] hover:bg-black text-white shadow-xs transition-all"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          LOADING SKELETON & ERROR STATES
          ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-pulse space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="h-6 w-24 bg-slate-200 rounded-full mx-auto" />
            <div className="h-10 w-3/4 bg-slate-200 rounded-2xl mx-auto" />
            <div className="h-4 w-1/2 bg-slate-200 rounded-lg mx-auto" />
          </div>
          <div className="h-12 w-96 bg-slate-200 rounded-full mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 bg-slate-200/80 rounded-3xl" />
            ))}
          </div>
        </main>
      ) : fetchError ? (
        <main className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Couldn't load plans</h2>
          <p className="text-sm text-slate-500">{fetchError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-6 py-2.5 bg-[#1456F0] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer"
          >
            Retry
          </button>
        </main>
      ) : (
        <main className="space-y-16 sm:space-y-24 pb-20">
          {/* ─────────────────────────────────────────────────────────────
              2. HERO SECTION
              ───────────────────────────────────────────────────────────── */}
          <section className="pt-12 sm:pt-16 pb-4 max-w-4xl mx-auto px-4 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#1456F0] border border-blue-200/70">
              PRICING
            </div>

            <h1
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]"
              style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
            >
              Simple plans that scale with your practice
            </h1>

            <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              From solo clinics to multi-location healthcare groups. AI that grows with you.
            </p>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              3. CONTROLS: CADENCE TOGGLE & PRODUCT TABS
              ───────────────────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Monthly / Yearly Cadence Toggle */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center p-1.5 bg-slate-100 rounded-full border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Monthly
                </button>

                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    billingCycle === "yearly"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Yearly</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1456F0] text-white">
                    {discountPercent}% OFF
                  </span>
                </button>
              </div>
            </div>

            {/* Product Tabs: AI Receptionist, AI Scribe, AI EHR, AI RCM */}
            <div className="flex items-center justify-center overflow-x-auto pb-2 scrollbar-none">
              <div className="inline-flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-full shadow-2xs">
                {pricingData?.products.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? "bg-[#182230] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {prod.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              4. PLAN CARDS (Starter, Growth, Scale + Custom)
              ───────────────────────────────────────────────────────────── */}
          <section
            ref={plansSectionRef}
            id="plans"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24"
          >
            {activeProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
                {activeProduct.plans.map((plan) => {
                  const isPopular = plan.isPopular;
                  const isCustom = plan.tier.toLowerCase() === "custom" || plan.tier.toLowerCase() === "enterprise";
                  const audience = AUDIENCE_BY_TIER[plan.tier.toLowerCase()] || "For scaling medical practices";
                  const displayPrice = billingCycle === "yearly" ? plan.discountedMonthlyPrice : plan.monthlyPrice;

                  return (
                    <div
                      key={plan.id}
                      className={`relative bg-white rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-200 ${
                        isPopular
                          ? "border-2 border-[#1456F0] shadow-[0_12px_40px_rgba(20,86,240,0.12)] ring-4 ring-[#1456F0]/5"
                          : "border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
                      }`}
                    >
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                          <span
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold bg-[#1456F0] text-white shadow-md tracking-wider uppercase whitespace-nowrap"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white fill-white" />
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="space-y-6">
                        {/* Header: Plan Name & Audience Line */}
                        <div>
                          <h3
                            className="text-2xl font-bold text-slate-900 tracking-tight"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                          >
                            {plan.name}
                          </h3>
                          <p className="text-xs sm:text-[13px] text-slate-500 mt-1 min-h-[34px] leading-relaxed">
                            {audience}
                          </p>
                        </div>

                        {/* Price Block */}
                        <div className="pt-1">
                          {isCustom ? (
                            <div className="flex items-baseline gap-1">
                              <span
                                className="text-4xl font-extrabold text-slate-900 tracking-tight"
                                style={{ fontFamily: "'Outfit', sans-serif" }}
                              >
                                Custom
                              </span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900">₹</span>
                                <span
                                  className="text-4xl sm:text-[42px] font-extrabold text-slate-900 tracking-tight"
                                  style={{ fontFamily: "'Outfit', sans-serif" }}
                                >
                                  {displayPrice.toLocaleString()}
                                </span>
                                <span className="text-sm font-medium text-slate-500 ml-1">/month</span>
                              </div>
                              {billingCycle === "yearly" && (
                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                  billed yearly ₹{plan.yearlyPrice.toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Highlighted Stats Box: Credits / mo & Team members */}
                        <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {plan.monthlyCredits.toLocaleString()} credits / month
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Users className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-600">
                              {plan.teamMembers}
                            </span>
                          </div>
                        </div>

                        {/* Feature List */}
                        <div className="space-y-3 pt-2">
                          {plan.tier.toLowerCase() === "growth" && (
                            <p className="text-xs font-bold text-slate-900">
                              Everything in Starter, plus:
                            </p>
                          )}
                          {plan.tier.toLowerCase() === "scale" && (
                            <p className="text-xs font-bold text-slate-900">
                              Everything in Growth, plus:
                            </p>
                          )}
                          <ul className="space-y-2.5">
                            {plan.addedFeatures.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-normal">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Card Button */}
                      <div className="pt-8 mt-6 border-t border-slate-100">
                        {isCustom ? (
                          <a
                            href="mailto:sales@mantraassist.com?subject=Enterprise%20Plan%20Inquiry"
                            className="w-full py-3 px-4 rounded-full text-xs sm:text-sm font-semibold border border-slate-300 hover:border-slate-800 text-slate-800 hover:bg-slate-50 text-center block transition-all"
                          >
                            Talk to Sales
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGetStarted(plan, activeProduct)}
                            className={`w-full py-3 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              isPopular
                                ? "bg-[#1456F0] hover:bg-[#2563EB] text-white shadow-md shadow-blue-500/25 active:scale-[0.99]"
                                : "border border-slate-300 hover:border-slate-800 text-slate-800 hover:bg-slate-50 active:scale-[0.99]"
                            }`}
                          >
                            <span>Get started</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────────────────────────
              5. COMPARISON TABLE ("Compare all features")
              ───────────────────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Compare all features
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Detailed breakdown of every capability included in {activeProduct?.name}.
              </p>
            </div>

            {/* Responsive Table Container with internal scroll */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  {/* Sticky Header with Tier names and prices */}
                  <thead className="sticky top-0 bg-white z-20 border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6 text-sm font-bold text-slate-800 w-1/3">
                        Features
                      </th>
                      {activeProduct?.plans.map((p) => {
                        const isPop = p.isPopular;
                        const price = billingCycle === "yearly" ? p.discountedMonthlyPrice : p.monthlyPrice;
                        return (
                          <th
                            key={p.id}
                            className={`py-4 px-6 text-center ${
                              isPop ? "bg-blue-50/40" : ""
                            }`}
                          >
                            <div className="text-sm font-bold text-slate-900">{p.tier}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {p.tier.toLowerCase() === "custom"
                                ? "Custom"
                                : `₹${price.toLocaleString()}/mo`}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonGroups.map((group, gIdx) => (
                      <React.Fragment key={gIdx}>
                        {/* Dark Section Header Bar */}
                        <tr className="bg-[#182230] text-white">
                          <td
                            colSpan={1 + (activeProduct?.plans.length || 3)}
                            className="py-2.5 px-6 text-xs font-bold uppercase tracking-wider"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                          >
                            {group.groupName}
                          </td>
                        </tr>

                        {/* Feature Rows */}
                        {group.features.map((feat, fIdx) => (
                          <tr
                            key={fIdx}
                            className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3.5 px-6 text-xs sm:text-[13px] text-slate-800 font-medium">
                              {feat.name}
                            </td>
                            {activeProduct?.plans.map((p) => {
                              const val = feat.tierValues[p.tier];
                              const isPop = p.isPopular;
                              return (
                                <td
                                  key={p.id}
                                  className={`py-3.5 px-6 text-center text-xs sm:text-[13px] ${
                                    isPop ? "bg-blue-50/30" : ""
                                  }`}
                                >
                                  {typeof val === "boolean" ? (
                                    val ? (
                                      <div className="flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center">
                                        <Minus className="w-4 h-4 text-slate-300" />
                                      </div>
                                    )
                                  ) : (
                                    <span className="font-semibold text-slate-800">
                                      {val || "—"}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              6. CREDIT SYSTEM: "How credits work" & "Top-up credit packs"
              ───────────────────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Simple, transparent credit system
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Credits are only deducted for actual work performed. Unused top-up credits never expire.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left: How credits work */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1456F0] flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">How credits work</h3>
                    <p className="text-xs text-slate-400">Fixed rate per operation</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {pricingData?.creditActions.map((act) => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-700 font-medium">{act.name}</span>
                      <span className="font-bold text-slate-900 px-2.5 py-1 bg-slate-100 rounded-lg">
                        {act.creditsDeducted} {act.creditsDeducted === 1 ? "credit" : "credits"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Top-up credit packs (Display only, no buy buttons) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Top-up credit packs</h3>
                    <p className="text-xs text-slate-400">Available in your billing portal anytime</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {pricingData?.topUpPacks.map((pack) => (
                    <div key={pack.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {pack.credits.toLocaleString()} credits
                        </span>
                        {pack.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {pack.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">
                          ₹{pack.price.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1.5">
                          (₹{pack.costPerCredit.toFixed(2)}/credit)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              7. FAQ ACCORDION (6 Questions)
              ───────────────────────────────────────────────────────────── */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="text-center space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Frequently asked questions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Everything you need to know about plans, billing and credits.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    >
                      <span className="text-sm sm:text-base font-bold text-slate-900">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 shrink-0 ${
                          isOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              8. CLOSING CTA BAND
              ───────────────────────────────────────────────────────────── */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-3xl p-8 sm:p-14 text-center text-white relative overflow-hidden shadow-xl"
              style={{
                background: "linear-gradient(135deg, #0F172A 0%, #182230 60%, #1E293B 100%)",
              }}
            >
              <div className="max-w-2xl mx-auto space-y-4 relative z-10">
                <h2
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Ready to transform your practice?
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join healthcare clinics saving hours every week with automated AI reception, dictation, and workflows.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleScrollToPlans}
                    className="px-8 py-3.5 bg-[#1456F0] hover:bg-[#2563EB] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-full shadow-lg shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Get started</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ─────────────────────────────────────────────────────────────
          9. FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="MantraAssist"
              className="h-6 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span>© 2026 MantraAssist. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-slate-800 transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-slate-800 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
