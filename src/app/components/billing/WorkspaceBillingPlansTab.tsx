/**
 * WorkspaceBillingPlansTab.tsx
 * Path: src/app/components/billing/WorkspaceBillingPlansTab.tsx
 *
 * Customer-facing Plans & Subscriptions view implementing PRD FR-12:
 * - Each plan displays:
 *   1. Included team members (FR-1)
 *   2. Included credits (resource allocation)
 *   3. Credit blocks (packs and custom option)
 *   4. Team member blocks (packs and custom option)
 *   5. What's Included feature list
 * - Scope-based visibility and instant plan switching.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Coins,
  Check,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  Building2,
  Clock,
  Shield,
  ArrowRight,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  TrendingUp,
  Receipt,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  TeamMemberPack,
  GlobalBillingSettings,
  WorkspaceSubscription,
  getStoredPlans,
  getStoredCreditPackages,
  getStoredTeamMemberPacks,
  getStoredGlobalBillingSettings,
  getWorkspaceSubscription,
  updateWorkspaceSubscription,
  assignPlanToWorkspace,
  purchaseCreditPackageForWorkspace,
  getAvailablePlansForWorkspace,
  getAvailableCreditPackagesForWorkspace,
  PLANS_BILLING_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { useOrganization } from "../../context/OrganizationContext";

export default function WorkspaceBillingPlansTab() {
  const { activeOrganization, organizations, setActiveOrganization } = useOrganization();

  const [plans, setPlans] = useState<IndustryPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [teamPacks, setTeamPacks] = useState<TeamMemberPack[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalBillingSettings>(getStoredGlobalBillingSettings());
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);

  // Billing interval toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  // Load data from single source of truth
  const loadData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
    setTeamPacks(getStoredTeamMemberPacks());
    setGlobalSettings(getStoredGlobalBillingSettings());
    if (activeOrganization?.id) {
      setSubscription(getWorkspaceSubscription(activeOrganization.id));
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
    window.addEventListener("organizationChanged", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
      window.removeEventListener("organizationChanged", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [activeOrganization?.id]);

  // Apply Scope-based visibility filtering
  const scopedPlanItems = useMemo(() => {
    return getAvailablePlansForWorkspace(plans, {
      id: activeOrganization.id,
      industryCategory: activeOrganization.industryCategory,
      country: activeOrganization.country || "United States",
      currency: activeOrganization.currency || "USD",
    });
  }, [plans, activeOrganization]);

  // Apply Scope-based credit package filtering
  const scopedCreditPackages = useMemo(() => {
    return getAvailableCreditPackagesForWorkspace(creditPackages, {
      country: activeOrganization.country || "United States",
      currency: activeOrganization.currency || "USD",
    });
  }, [creditPackages, activeOrganization]);

  // Handle plan selection / upgrade (FR-10, FR-12)
  const handleSelectPlan = (plan: IndustryPlan) => {
    if (!activeOrganization?.id) return;
    const currency = activeOrganization.currency || "USD";
    const updated = assignPlanToWorkspace(activeOrganization.id, plan.id, billingCycle, currency);
    setSubscription(updated);
    toast.success(`Switched to ${plan.name} (${billingCycle}) with ${plan.includedSeats || 2} included seats! ✓`);
  };

  const currencySymbol = scopedPlanItems[0]?.pricing.currencySymbol || "$";
  const userCountry = activeOrganization.country || "United States";
  const userCategory = activeOrganization.industryCategory || "Healthcare";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Centered Hero Header ── */}
      <div className="text-center max-w-2xl mx-auto space-y-2 pt-2 pb-2">
        <h2
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Plans &amp; <span className="text-[#2563EB]">Subscriptions</span>
        </h2>
        <p
          className="text-xs sm:text-sm text-slate-500 font-medium"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Included seats, feature access, and flexible add-on blocks for your organization.
        </p>
      </div>

      {/* ── Billing Frequency Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3
            className="text-base sm:text-lg font-bold text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Choose your billing cadence
          </h3>
          <p
            className="text-xs text-slate-500 mt-0.5"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Annual billing saves 20% on all plans. Extra add-on blocks can be added anytime.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-[#181e25] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span>Yearly</span>
              <span className="text-[10px] text-emerald-400 font-extrabold">20% OFF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Plan Cards Grid (FR-12: Seats, Credits, Blocks, Features) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {scopedPlanItems.map(({ plan, pricing }) => {
          const isYearly = billingCycle === "yearly";
          const isCurrentPlan = subscription?.planId === plan.id && subscription?.billingCycle === billingCycle;
          const isCurrentPlanDifferentCycle = subscription?.planId === plan.id && subscription?.billingCycle !== billingCycle;
          const displayPrice = isYearly ? pricing.yearlyPrice : pricing.monthlyPrice;
          const displayCadence = isYearly ? "/year" : "/month";
          const credits = isYearly ? plan.yearlyCredits : plan.monthlyCredits;
          const includedSeats = plan.includedSeats || 2;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between relative shadow-2xs hover:shadow-md ${
                isCurrentPlan
                  ? "border-blue-600 ring-2 ring-blue-600/10"
                  : isCurrentPlanDifferentCycle
                  ? "border-indigo-300 ring-1 ring-indigo-300/30"
                  : plan.isPopular
                  ? "border-blue-400 ring-1 ring-blue-400/20"
                  : "border-slate-200/90"
              }`}
            >
              {/* Badges */}
              {isCurrentPlan ? (
                <span className="absolute -top-3 left-5 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                  ✓ Current Plan
                </span>
              ) : isCurrentPlanDifferentCycle ? (
                <span className="absolute -top-3 left-5 px-3 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-full shadow-xs">
                  Active on {subscription?.billingCycle === "yearly" ? "Yearly" : "Monthly"}
                </span>
              ) : plan.isPopular ? (
                <span className="absolute -top-3 left-5 px-3 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                  ★ Most Popular
                </span>
              ) : null}

              <div className="space-y-4 pt-1">
                {/* Plan Title & Subtitle */}
                <div>
                  <h4
                    className="text-lg font-bold text-slate-900"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {plan.name}
                  </h4>
                  <p
                    className="text-xs text-slate-500 mt-1 min-h-[34px] leading-relaxed"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-3xl sm:text-4xl font-extrabold text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {pricing.currencySymbol}
                      {displayPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {displayCadence}
                    </span>
                  </div>
                  {isYearly ? (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        BILLED ANNUALLY • {pricing.currencySymbol}{pricing.yearlyPrice.toLocaleString()}/YEAR
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Approx. {pricing.currencySymbol}{Math.round(pricing.yearlyPrice / 12)}/month · 20% annual discount
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        BILLED MONTHLY • {pricing.currencySymbol}{pricing.monthlyPrice.toLocaleString()}/MONTH
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Flexible month-to-month billing
                      </p>
                    </div>
                  )}
                </div>

                {/* FR-12: Included Team Members Display */}
                <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-200/60 text-left space-y-0.5">
                  <div className="flex items-center gap-1.5 text-blue-900">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      INCLUDED TEAM MEMBERS
                    </span>
                  </div>
                  <span
                    className="text-xs font-extrabold text-blue-950 block"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {includedSeats} Seats Included at No Extra Charge
                  </span>
                </div>

                {/* FR-12: Resource Allocation (Included Credits) */}
                <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/60 text-left space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      RESOURCE ALLOCATION
                    </span>
                  </div>
                  <span
                    className="text-xs font-extrabold text-amber-950 block"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {credits.toLocaleString()} credits / {billingCycle === "yearly" ? "yr" : "mo"}
                  </span>
                </div>

                {/* FR-12: Add-on Blocks Info */}
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 space-y-1">
                  <p className="font-bold text-gray-800">Add-on Blocks Available:</p>
                  <p className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Credits: Packs or custom from {pricing.currencySymbol}{globalSettings.defaultPricePerCredit}/ea</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Seats: Packs or custom at {pricing.currencySymbol}{globalSettings.defaultPricePerExtraMember}/member</span>
                  </p>
                </div>

                {/* What's Included Features */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    WHAT&apos;S INCLUDED
                  </p>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]" />
                        <span
                          className="text-[11px] leading-relaxed text-slate-700 font-medium"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-5 border-t border-slate-100">
                {isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold cursor-default border border-blue-200 text-center"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    ✓ Your Current Plan
                  </button>
                ) : isCurrentPlanDifferentCycle ? (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs text-center"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Switch to {isYearly ? `Yearly (${pricing.currencySymbol}${pricing.yearlyPrice.toLocaleString()}/yr)` : `Monthly (${pricing.currencySymbol}${pricing.monthlyPrice.toLocaleString()}/mo)`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      plan.isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-[#181e25] hover:bg-black text-white"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Choose {plan.tier} ({pricing.currencySymbol}{displayPrice.toLocaleString()}{displayCadence})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scopedPlanItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            No Plans Configured Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All plans have been cleared. New plans can be designed in the Admin Console (Plans &amp; Credits &gt; Create Industry Plan).
          </p>
        </div>
      )}

      {/* ── Scope Intelligence Banner ── */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Globe className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Admin Scope Filtering Active
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Admin Scope: {userCategory}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Country: {userCountry} ({activeOrganization.currency || "USD"})
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Showing plans configured for <strong className="text-slate-900">{activeOrganization.name}</strong>. Rates calibrated in <strong className="text-slate-900">{currencySymbol} ({activeOrganization.currency || "USD"})</strong>.
            </p>
          </div>
        </div>

        {/* Quick Workspace Switcher */}
        <div className="shrink-0 flex items-center gap-2 bg-white/90 p-1.5 rounded-xl border border-blue-200/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 pl-2">Switch Workspace:</span>
          <select
            value={activeOrganization.id}
            onChange={(e) => {
              const selected = organizations.find((o) => o.id === e.target.value);
              if (selected) {
                setActiveOrganization(selected);
                toast.info(`Switched to ${selected.name}`);
              }
            }}
            className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-800 cursor-pointer focus:outline-none"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} [{org.industryCategory || "General"} · {org.country || "US"}]
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
