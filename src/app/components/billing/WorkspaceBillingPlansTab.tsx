/**
 * WorkspaceBillingPlansTab.tsx
 * Path: src/app/components/billing/WorkspaceBillingPlansTab.tsx
 *
 * Customer-facing MantraAssist Billing Plans & Credit Packages view:
 * - Reads directly from Admin plans & credit packages (single source of truth).
 * - Applies strict Scope-Based Visibility:
 *   1. Active status only (inactive hidden)
 *   2. Non-internal only (internal/staff-only hidden)
 *   3. Category scope matching (Global + Workspace Industry Category)
 *   4. Country-wise pricing matching the workspace's country & currency
 * - Live upgrade/downgrade and credit top-up flows with instant store updates.
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
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  WorkspaceSubscription,
  getStoredPlans,
  getStoredCreditPackages,
  getWorkspaceSubscription,
  updateWorkspaceSubscription,
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
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);

  // Billing interval toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  // User Count Stepper
  const [userCount, setUserCount] = useState(2);

  // Load data from single source of truth
  const loadData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
    if (activeOrganization?.id) {
      setSubscription(getWorkspaceSubscription(activeOrganization.id));
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
    window.addEventListener("organizationChanged", handleSync);
    return () => {
      window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
      window.removeEventListener("organizationChanged", handleSync);
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

  // Handle plan selection / upgrade
  const handleSelectPlan = (plan: IndustryPlan, pricingMonthly: number, pricingYearly: number, currency: string, currencySymbol: string) => {
    if (!activeOrganization?.id) return;
    const isYearly = billingCycle === "yearly";
    const amount = isYearly ? pricingYearly : pricingMonthly;
    const includedCredits = isYearly ? plan.yearlyCredits : plan.monthlyCredits;

    const existingCreditsRemaining = subscription?.creditsRemaining || 0;
    const existingCreditsTotal = subscription?.totalCredits || 0;

    const updatedSub: WorkspaceSubscription = {
      workspaceId: activeOrganization.id,
      planId: plan.id,
      planName: plan.name,
      tier: plan.tier,
      billingCycle,
      amount,
      currency,
      currencySymbol,
      status: "Active",
      nextRenewalDate: new Date(Date.now() + (isYearly ? 365 : 30) * 86400000).toISOString().slice(0, 10),
      startDate: subscription?.startDate || new Date().toISOString().slice(0, 10),
      userCount,
      totalCredits: existingCreditsTotal + includedCredits,
      creditsUsed: subscription?.creditsUsed || 0,
      creditsRemaining: existingCreditsRemaining + includedCredits,
      recentPackages: subscription?.recentPackages || [],
    };

    updateWorkspaceSubscription(activeOrganization.id, updatedSub);
    setSubscription(updatedSub);
    toast.success(`Successfully switched to ${plan.name} (${billingCycle})! ✓`);
  };

  // Handle credit package purchase
  const handlePurchasePackage = (pkg: CreditPackage) => {
    if (!activeOrganization?.id) return;
    const updated = purchaseCreditPackageForWorkspace(activeOrganization.id, pkg);
    setSubscription(updated);
    toast.success(`Purchased +${pkg.credits.toLocaleString()} Voice Credits! Added to your balance. ✓`);
  };

  const currencySymbol = scopedPlanItems[0]?.pricing.currencySymbol || "$";
  const userCountry = activeOrganization.country || "United States";
  const userCategory = activeOrganization.industryCategory || "Healthcare";

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ── Scope Intelligence Banner ── */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Admin Scope Filtering Active
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Industry: {userCategory}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Country: {userCountry} ({activeOrganization.currency || "USD"})
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Showing plans scoped for <strong className="text-slate-900">{activeOrganization.name}</strong>. Only active, customer-visible plans for <strong className="text-blue-900">"{userCategory}"</strong> and <strong className="text-blue-900">Global</strong> are displayed, with pricing calibrated in <strong className="text-slate-900">{currencySymbol} ({activeOrganization.currency || "USD"})</strong>.
            </p>
          </div>
        </div>

        {/* Quick Workspace Switcher for Reviewing Scope Filter */}
        <div className="shrink-0 flex items-center gap-2 bg-white/90 p-1.5 rounded-xl border border-blue-200/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 pl-2">Switch Workspace:</span>
          <select
            value={activeOrganization.id}
            onChange={(e) => {
              const selected = organizations.find((o) => o.id === e.target.value);
              if (selected) {
                setActiveOrganization(selected);
                toast.info(`Switched to ${selected.name} (${selected.industryCategory || "General"})`);
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

      {/* ── Section A: Current Subscription ── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#111827]">Current Subscription</h3>
        <div className="border border-[#E5E7EB] bg-white rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h4 className="text-xl font-bold text-gray-900">
                  {subscription?.planName || "Global Professional"}
                </h4>
                <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
                  {subscription?.status || "Active"}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                  Tier: {subscription?.tier || "Professional"}
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Billing cycle: <span className="capitalize font-semibold text-gray-800">{subscription?.billingCycle || "Yearly"}</span> · Next auto-renewal on{" "}
                <strong className="text-gray-800">{subscription?.nextRenewalDate || "June 1, 2027"}</strong>
              </p>
            </div>

            <div className="text-right sm:border-l sm:pl-6 border-gray-100">
              <span className="text-2xl font-black text-gray-900">
                {subscription?.currencySymbol || currencySymbol}
                {(subscription?.amount || 1430).toLocaleString()}
              </span>
              <span className="text-xs text-[#6B7280]">
                /{subscription?.billingCycle === "yearly" ? "yr" : "mo"}
              </span>
            </div>
          </div>

          {/* Credits Balance Bar */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-500 block mb-0.5">Remaining Voice Credits</span>
              <span className="text-lg font-bold text-amber-600">
                {(subscription?.creditsRemaining ?? 2260).toLocaleString()}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-500 block mb-0.5">Total Credits Pool</span>
              <span className="text-lg font-bold text-gray-900">
                {(subscription?.totalCredits ?? 3500).toLocaleString()}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-gray-500 block mb-0.5">Assigned Team Seats</span>
              <span className="text-lg font-bold text-gray-900">{subscription?.userCount || 2} users</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section B: Available Scoped Plans ── */}
      <div className="border border-[#E5E7EB] rounded-2xl bg-white p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#111827]">Available Plans For Your Workspace</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Choose the tier that matches your call volume and workflow integration needs
            </p>
          </div>

          {/* Monthly / Annual Billing Toggle */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="relative">
              <span className="absolute -top-5 right-0 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-2xs">
                Save 20% Annual
              </span>
              <div className="flex border border-[#E5E7EB] rounded-xl overflow-hidden p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    billingCycle === "monthly"
                      ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === "yearly"
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] text-emerald-400 font-bold">20% off</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scopedPlanItems.map(({ plan, pricing, isIndustrySpecific }) => {
            const isCurrentPlan = subscription?.planId === plan.id;
            const price = billingCycle === "yearly" ? pricing.yearlyPrice : pricing.monthlyPrice;
            const credits = billingCycle === "yearly" ? plan.yearlyCredits : plan.monthlyCredits;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border transition-all duration-200 p-6 flex flex-col justify-between relative shadow-2xs hover:shadow-md ${
                  isCurrentPlan
                    ? "border-blue-600 ring-2 ring-blue-600/10 bg-white"
                    : plan.isPopular
                    ? "border-blue-500 ring-1 ring-blue-500/20 bg-white"
                    : "border-gray-200 bg-white"
                }`}
              >
                {/* Popular or Current Badge */}
                {isCurrentPlan ? (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 bg-blue-600 text-white text-[11px] font-bold rounded-full shadow-xs">
                    ✓ Current Plan
                  </span>
                ) : plan.isPopular ? (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold rounded-full shadow-xs">
                    ★ Most Popular
                  </span>
                ) : null}

                <div className="space-y-5">
                  {/* Category & Tier Ribbon */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        plan.tier === "Starter"
                          ? "bg-slate-100 text-slate-700"
                          : plan.tier === "Professional"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {plan.tier}
                    </span>

                    {isIndustrySpecific ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        {plan.targetCategory}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Global
                      </span>
                    )}
                  </div>

                  {/* Plan Name & Description */}
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                    <p className="text-xs text-gray-500 mt-1 min-h-[36px]">{plan.description}</p>
                  </div>

                  {/* Price Block */}
                  <div className="bg-gray-50/70 rounded-xl p-3.5 border border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">
                        {pricing.currencySymbol}
                        {price.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">
                        /{billingCycle === "yearly" ? "yr" : "mo"}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1 font-medium">
                      {billingCycle === "yearly"
                        ? `Equivalent to ~${pricing.currencySymbol}${Math.round(price / 12)}/month`
                        : `Billed monthly in ${pricing.currency}`}
                    </p>
                  </div>

                  {/* Included Credits */}
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/70">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>+{credits.toLocaleString()} Voice &amp; Chat Credits included</span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Included Features:</p>
                    <ul className="space-y-2 text-xs text-gray-700">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6 mt-6 border-t border-gray-100">
                  {isCurrentPlan ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold cursor-default border border-blue-200 text-center"
                    >
                      ✓ Your Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectPlan(
                          plan,
                          pricing.monthlyPrice,
                          pricing.yearlyPrice,
                          pricing.currency,
                          pricing.currencySymbol
                        )
                      }
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        plan.isPopular
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-gray-900 hover:bg-black text-white"
                      }`}
                    >
                      Choose {plan.tier}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {scopedPlanItems.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-2">
            <CreditCard className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="text-base font-bold text-gray-800">No scoped plans found</h4>
            <p className="text-xs text-gray-500">
              There are currently no active plans targeting "{userCategory}" or "Global". Add one in Admin &gt; Plans &amp; Credits.
            </p>
          </div>
        )}
      </div>

      {/* ── Section C: Available Credit Packages ── */}
      <div className="border border-[#E5E7EB] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Top-Up Voice &amp; Workflow Credits</h3>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Never miss a client call. Extra credits never expire and roll over with your subscription.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 self-start sm:self-auto">
            Currency: {userCountry} ({currencySymbol})
          </span>
        </div>

        {/* Credit Package Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {scopedCreditPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between transition-all shadow-2xs hover:shadow-md ${
                pkg.badge?.toLowerCase().includes("popular")
                  ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/20"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{pkg.name}</span>
                  {pkg.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {pkg.badge}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-2xl font-black text-gray-900">
                    {pkg.currencySymbol}
                    {pkg.totalPrice.toLocaleString()}
                  </span>
                  <p className="text-[11px] text-gray-500">
                    {pkg.currencySymbol}
                    {pkg.pricePerCredit} per credit
                  </p>
                </div>

                <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900">Credits:</span>
                  <span className="font-bold text-amber-950 font-mono">+{pkg.credits.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePurchasePackage(pkg)}
                className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                Purchase Credits
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
