/**
 * WorkspaceBillingPlansTab.tsx
 * Path: src/app/components/billing/WorkspaceBillingPlansTab.tsx
 *
 * Customer-facing Plans & Subscriptions view matching reference UI:
 * - Header: "Configure your organization", "Select your billing frequency and seat count."
 * - Monthly / Yearly (20%) toggle
 * - Plan cards in 4-column grid with:
 *     - Title and description
 *     - Price and TOTAL FOR X USER
 *     - RESOURCE ALLOCATION box with Credits and Team Members
 *     - WHAT'S INCLUDED feature list
 *     - Get Started / Current Plan CTA button
 * - Below plans in a two-column layout:
 *     - Column 1: "Buy More Credits" card (collapsible, preset pills, custom input, monthly add-on summary, Buy Now)
 *     - Column 2: "Add More Team Members" card (collapsible, preset pills, custom input, monthly add-on summary, Add Now)
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Coins,
  Check,
  ShoppingCart,
  ShoppingBag,
  Users,
  ChevronDown,
  Globe,
  Sparkles,
  Trash2,
  X,
  Layers,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  TeamMemberPack,
  GlobalBillingSettings,
  WorkspaceSubscription,
  CartItem,
  PLAN_CATEGORIES,
  PlanCategory,
  getStoredPlans,
  getStoredCreditPackages,
  getStoredTeamMemberPacks,
  getStoredGlobalBillingSettings,
  getWorkspaceSubscription,
  assignPlanToWorkspace,
  purchaseCustomCreditsForWorkspace,
  purchaseCustomTeamMembersForWorkspace,
  getAvailablePlansForWorkspace,
  getAvailableCreditPackagesForWorkspace,
  getStoredCart,
  addToCart,
  removeFromCart,
  clearCart,
  checkoutCart,
  PLANS_BILLING_CHANGED_EVENT,
  CART_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { useOrganization } from "../../context/OrganizationContext";

export default function WorkspaceBillingPlansTab({ hideHeader = true }: { hideHeader?: boolean } = {}) {
  const { activeOrganization, organizations, setActiveOrganization } = useOrganization();

  const [plans, setPlans] = useState<IndustryPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [teamPacks, setTeamPacks] = useState<TeamMemberPack[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalBillingSettings>(getStoredGlobalBillingSettings());
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);

  // Category filter state (strictly category-wise: "AI Receptionist", "AI Scribe", "EHR", "RCM")
  const [selectedCategory, setSelectedCategory] = useState<string>(PLAN_CATEGORIES[0]);

  // Cart modal/slide-over state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Billing interval toggle
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Buy More Credits State
  const [isCreditSectionOpen, setIsCreditSectionOpen] = useState(true);
  const [selectedCreditAmount, setSelectedCreditAmount] = useState<number>(10000);
  const [customCreditAmount, setCustomCreditAmount] = useState<number>(10000);

  // Add More Team Members State
  const [isMemberSectionOpen, setIsMemberSectionOpen] = useState(true);
  const [selectedMemberAmount, setSelectedMemberAmount] = useState<number>(1);
  const [customMemberAmount, setCustomMemberAmount] = useState<number>(1);

  // Load data from single source of truth
  const loadData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
    setTeamPacks(getStoredTeamMemberPacks());
    setGlobalSettings(getStoredGlobalBillingSettings());
    if (activeOrganization?.id) {
      setSubscription(getWorkspaceSubscription(activeOrganization.id));
      setCartItems(getStoredCart(activeOrganization.id));
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
    window.addEventListener(CART_CHANGED_EVENT, handleSync);
    window.addEventListener("organizationChanged", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
      window.removeEventListener(CART_CHANGED_EVENT, handleSync);
      window.removeEventListener("organizationChanged", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [activeOrganization?.id]);

  // Tier positioning order: Starter (1) > Professional (2) > Custom (3)
  const TIER_ORDER: Record<string, number> = {
    starter: 1,
    professional: 2,
    custom: 3,
  };

  // Apply Scope-based visibility filtering & Tier positioning
  const scopedPlanItems = useMemo(() => {
    const available = getAvailablePlansForWorkspace(plans, {
      id: activeOrganization.id,
      industryCategory: activeOrganization.industryCategory,
      country: activeOrganization.country || "United States",
      currency: activeOrganization.currency || "USD",
    });

    // 1. Free plan is an onboarding plan and is NOT shown on the plans page
    let visiblePlans = available.filter(
      ({ plan }) => (plan.tier || "").toLowerCase() !== "free"
    );

    // Filter strictly by selected category ("AI Receptionist", "AI Scribe", "EHR", "RCM")
    if (selectedCategory) {
      visiblePlans = visiblePlans.filter(
        ({ plan }) => (plan.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 2. Tier decides the positioning of the cards: Starter > Professional > Enterprise > Custom
    return visiblePlans.sort((a, b) => {
      const tierA = (a.plan.tier || "").toLowerCase();
      const tierB = (b.plan.tier || "").toLowerCase();
      const orderA = TIER_ORDER[tierA] ?? 99;
      const orderB = TIER_ORDER[tierB] ?? 99;
      return orderA - orderB;
    });
  }, [plans, activeOrganization, selectedCategory]);

  // Handle plan selection / upgrade
  const handleSelectPlan = (plan: IndustryPlan) => {
    if (!activeOrganization?.id) return;
    const currency = activeOrganization.currency || "USD";
    const updated = assignPlanToWorkspace(activeOrganization.id, plan.id, billingCycle, currency);
    setSubscription(updated);
    toast.success(`Switched to ${plan.name} (${billingCycle}) with ${plan.includedSeats || 1} team seats! ✓`);
  };

  // Credit calculation
  const pricePerCredit = globalSettings?.defaultPricePerCredit || 0.04;
  const creditCost = parseFloat((customCreditAmount * pricePerCredit).toFixed(2));

  const handleBuyCredits = () => {
    if (!activeOrganization?.id) return;
    if (!subscription || subscription.status !== "Active" || !subscription.planId) {
      toast.error("Please assign an active plan first before purchasing add-on credits.");
      return;
    }
    if (customCreditAmount <= 0) {
      toast.error("Please enter a valid credit amount");
      return;
    }
    const updated = purchaseCustomCreditsForWorkspace(activeOrganization.id, customCreditAmount);
    setSubscription(updated);
    toast.success(`Purchased +${customCreditAmount.toLocaleString()} Credits! ✓`);
  };

  // Team Member calculation
  const pricePerMember = globalSettings?.defaultPricePerExtraMember || 20;
  const memberCost = parseFloat((customMemberAmount * pricePerMember).toFixed(2));

  const handleAddMembers = () => {
    if (!activeOrganization?.id) return;
    if (!subscription || subscription.status !== "Active" || !subscription.planId) {
      toast.error("Please assign an active plan first before adding extra team members.");
      return;
    }
    if (customMemberAmount <= 0) {
      toast.error("Please enter at least 1 member");
      return;
    }
    const updated = purchaseCustomTeamMembersForWorkspace(activeOrganization.id, customMemberAmount);
    setSubscription(updated);
    toast.success(`Added +${customMemberAmount} extra team seats! ✓`);
  };

  const currencySymbol = scopedPlanItems[0]?.pricing.currencySymbol || "$";
  const userCountry = activeOrganization.country || "United States";
  const userCategory = activeOrganization.industryCategory || "Healthcare";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Control Bar: Categories Filter (before Monthly/Yearly) + Cadence Toggle + Cart ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        {/* Categories selector pills placed BEFORE monthly / yearly */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {PLAN_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#1E293B] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right side: Billing Interval Toggle and Cart Button */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/80">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/70"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span>Yearly</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-200 text-[#1E293B]">
                20%
              </span>
            </button>
          </div>

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs text-xs font-bold transition-all cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <ShoppingCart className="w-4 h-4 text-[#1E293B]" />
            <span>Cart</span>
            {cartItems.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#1E293B] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                {cartItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Plan Cards Grid (3 Columns: 3 in One Row on Desktop) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch pt-3">
        {scopedPlanItems.map(({ plan, pricing }) => {
          const isYearly = billingCycle === "yearly";
          const isCurrentPlan = subscription?.planId === plan.id;
          const inCartItem = cartItems.find((ci) => ci.type === "plan" && ci.planId === plan.id);
          const displayPrice = isYearly ? pricing.yearlyPrice : pricing.monthlyPrice;
          const credits = isYearly ? plan.yearlyCredits : plan.monthlyCredits;
          const includedSeats = plan.includedSeats || (plan.tier === "Starter" ? 1 : plan.tier === "Professional" ? 5 : 20);
          const isPopular = plan.isPopular === true || (plan.isPopular as any) === "true";
          const planCategory = plan.category || "AI Receptionist";

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-[28px] border-2 transition-all duration-200 p-7 flex flex-col justify-between relative shadow-2xs hover:shadow-md ${
                isCurrentPlan
                  ? "border-[#1E293B] shadow-[0_6px_24px_rgba(30,41,59,0.14)] ring-1 ring-[#1E293B]/10"
                  : isPopular
                  ? "border-[#1E293B] shadow-[0_6px_24px_rgba(30,41,59,0.10)]"
                  : "border-slate-200/85 hover:border-slate-300"
              }`}
            >
              {/* Highlight as Popular - Ribbon on Pricing Card */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span
                    className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[11px] font-bold bg-[#1E293B] text-white shadow-md border border-slate-700 tracking-wider uppercase whitespace-nowrap"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    Popular
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {/* Plan Title & Description */}
                <div>
                  <h3
                    className="text-2xl font-bold text-slate-900 tracking-tight"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-sm text-slate-500 mt-1 min-h-[36px] leading-relaxed"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price Block */}
                <div>
                  {(plan.tier || "").toLowerCase() === "custom" ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className="text-4xl font-extrabold text-slate-900 tracking-tight"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          Custom
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-900">{pricing.currencySymbol}</span>
                        <span
                          className="text-4xl font-extrabold text-slate-900 tracking-tight"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-slate-500 font-medium ml-1">
                          /{isYearly ? "yr" : "mo"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resource Allocation Box with Icons */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-4.5 space-y-2.5 mt-5">
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                    <span
                      className="text-base font-bold text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {credits.toLocaleString()} credits
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-sm font-semibold text-slate-600">
                      {includedSeats} team member{includedSeats > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* WHAT'S INCLUDED Feature List */}
                <div className="space-y-3 pt-2">
                  <p
                    className="text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    WHAT&apos;S INCLUDED
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-[#1E293B] shrink-0 mt-0.5 stroke-[2.5]" />
                        <span
                          className="text-sm text-slate-700 font-medium leading-relaxed"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                {isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default text-center flex items-center justify-center gap-1.5 shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Active Plan</span>
                  </button>
                ) : inCartItem ? (
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="w-full py-3.5 rounded-full text-xs font-bold bg-[#1E293B] hover:bg-slate-900 text-white cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <ShoppingCart className="w-4 h-4 text-white" />
                    <span>In Cart (Review &amp; Pay)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeOrganization?.id) return;
                        addToCart(activeOrganization.id, {
                          type: "plan",
                          title: plan.name,
                          price: displayPrice,
                          currency: pricing.currency,
                          currencySymbol: pricing.currencySymbol,
                          billingCycle,
                          category: planCategory,
                          planId: plan.id,
                          planTier: plan.tier,
                          credits,
                          members: includedSeats,
                        });
                        toast.success(`Added ${plan.name} (${planCategory}) to cart! ✓`);
                      }}
                      className="flex-1 py-3 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-[#1E293B] border border-slate-300 hover:border-slate-400 cursor-pointer transition-all shadow-2xs flex items-center justify-center gap-1.5"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className="flex-1 py-3 rounded-full text-xs font-bold bg-[#1E293B] hover:bg-slate-900 text-white cursor-pointer transition-all shadow-xs text-center"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {(plan.tier || "").toLowerCase() === "custom" ? "Contact Us" : "Subscribe"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scopedPlanItems.length === 0 && (
        <div className="bg-white rounded-[28px] border border-slate-200 p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-[#1E293B] flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            No Plans Configured Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All plans have been cleared. New plans can be created in Admin Console (Plans &amp; Credits &gt; Create Industry Plan).
          </p>
        </div>
      )}

      {/* ── Two Column Add-ons Layout (Sidebar Highlighter #1E293B Theme with Lever) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 items-start">
        {/* Column 1: Buy More Credits */}
        <div className={`bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-7 shadow-2xs transition-all duration-200 ${isCreditSectionOpen ? "space-y-6 sm:space-y-7" : ""}`}>
          {/* Header with Cart icon and Chevron toggle (entire row clickable) */}
          <button
            type="button"
            onClick={() => setIsCreditSectionOpen(!isCreditSectionOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#1E293B] flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                <ShoppingCart className="w-5 h-5 text-[#1E293B]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-black transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Buy More Credits
                </h3>
                <p className="text-xs text-slate-500">Add voice and AI credits directly to your organization</p>
              </div>
            </div>
            <div className="p-2 text-slate-400 group-hover:text-slate-700 rounded-xl group-hover:bg-slate-100 transition-colors shrink-0">
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isCreditSectionOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {isCreditSectionOpen && (
            <div className="space-y-4 animate-in fade-in duration-150 pt-1">
              {/* Preset options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Quick Select Credits
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-0.5">
                  {[10000, 25000, 50000, 100000, 250000, 500000].map((amt) => {
                    const isSelected = selectedCreditAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedCreditAmount(amt);
                          setCustomCreditAmount(amt);
                        }}
                        className={`py-2 rounded-full text-xs font-bold transition-all cursor-pointer border text-center ${
                          isSelected
                            ? "border-[#1E293B] bg-[#1E293B] text-white shadow-2xs"
                            : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Value with Lever (Range Slider) */}
              <div className="bg-[#f8fafc] rounded-2xl p-4.5 border border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Custom Amount
                    </span>
                    <p className="text-[11px] text-slate-400">Drag lever or type value below</p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs">
                    <input
                      type="number"
                      min={1000}
                      max={500000}
                      step={1000}
                      value={customCreditAmount}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setCustomCreditAmount(val);
                        setSelectedCreditAmount(val);
                      }}
                      className="w-24 text-xs font-bold text-slate-900 outline-none text-right pr-1"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                    <span className="text-[11px] text-slate-400 font-semibold">credits</span>
                  </div>
                </div>

                {/* Lever Slider */}
                <div className="pt-1">
                  <input
                    type="range"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={customCreditAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomCreditAmount(val);
                      setSelectedCreditAmount(val);
                    }}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E293B]"
                  />
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-[#f8fafc] rounded-2xl p-4.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Monthly add-on</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-extrabold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      ${creditCost.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {customCreditAmount.toLocaleString()} credits · billed monthly · cancel anytime
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeOrganization?.id) return;
                      addToCart(activeOrganization.id, {
                        type: "custom_credits",
                        title: `${customCreditAmount.toLocaleString()} Voice & AI Credits`,
                        price: creditCost,
                        currency: activeOrganization.currency || "USD",
                        currencySymbol: currencySymbol,
                        credits: customCreditAmount,
                      });
                      toast.success(`Added ${customCreditAmount.toLocaleString()} Credits to Cart! ✓`);
                    }}
                    className="px-5 py-3 rounded-full bg-white hover:bg-slate-50 text-[#1E293B] border border-slate-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs text-center flex items-center gap-1.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyCredits}
                    className="px-6 py-3 rounded-full bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0 text-center"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Credits are added to your org wallet immediately after purchase and never expire. Charged to your default payment method on file.
              </p>
            </div>
          )}
        </div>

        {/* Column 2: Add More Team Members (Sidebar Highlighter #1E293B Theme with Lever) */}
        <div className={`bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-7 shadow-2xs transition-all duration-200 ${isMemberSectionOpen ? "space-y-6 sm:space-y-7" : ""}`}>
          {/* Header with Users icon and Chevron toggle (entire row clickable) */}
          <button
            type="button"
            onClick={() => setIsMemberSectionOpen(!isMemberSectionOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-[#1E293B] flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
                <Users className="w-5 h-5 text-[#1E293B]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-black transition-colors" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Add More Team Members
                </h3>
                <p className="text-xs text-slate-500">Expand team seats with instant access</p>
              </div>
            </div>
            <div className="p-2 text-slate-400 group-hover:text-slate-700 rounded-xl group-hover:bg-slate-100 transition-colors shrink-0">
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isMemberSectionOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {isMemberSectionOpen && (
            <div className="space-y-4 animate-in fade-in duration-150 pt-1">
              {/* Preset options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 leading-none" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Quick Select Team Seats
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  {[1, 3, 5, 10].map((amt) => {
                    const isSelected = selectedMemberAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedMemberAmount(amt);
                          setCustomMemberAmount(amt);
                        }}
                        className={`py-2 rounded-full text-xs font-bold transition-all cursor-pointer border text-center ${
                          isSelected
                            ? "border-[#1E293B] bg-[#1E293B] text-white shadow-2xs"
                            : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        +{amt} {amt === 1 ? "Member" : "Members"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Value with Lever (Range Slider) */}
              <div className="bg-[#f8fafc] rounded-2xl p-4.5 border border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Custom Seats
                    </span>
                    <p className="text-[11px] text-slate-400">Drag lever or type value below</p>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-2xs">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={customMemberAmount}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setCustomMemberAmount(val);
                        setSelectedMemberAmount(val);
                      }}
                      className="w-16 text-xs font-bold text-slate-900 outline-none text-right pr-1"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                    <span className="text-[11px] text-slate-400 font-semibold">seats</span>
                  </div>
                </div>

                {/* Lever Slider */}
                <div className="pt-1">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={customMemberAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomMemberAmount(val);
                      setSelectedMemberAmount(val);
                    }}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E293B]"
                  />
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-[#f8fafc] rounded-2xl p-4.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Monthly add-on</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-extrabold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      ${memberCost.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ month</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    +{customMemberAmount} extra team seats · billed monthly · cancel anytime
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeOrganization?.id) return;
                      addToCart(activeOrganization.id, {
                        type: "custom_seats",
                        title: `+${customMemberAmount} Extra Team Seats`,
                        price: memberCost,
                        currency: "USD",
                        currencySymbol: "$",
                        members: customMemberAmount,
                      });
                      toast.success(`Added +${customMemberAmount} Team Seats to Cart! ✓`);
                    }}
                    className="px-5 py-3 rounded-full bg-white hover:bg-slate-50 text-[#1E293B] border border-slate-300 text-xs font-bold cursor-pointer transition-colors shadow-2xs text-center flex items-center gap-1.5"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    className="px-6 py-3 rounded-full bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs text-center"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Add Now
                  </button>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Team seats are allocated immediately and allow new user invites to this workspace. Charged to your default payment method on file.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Cart Drawer / Slide-Over Modal ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#1E293B] flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Your Billing Cart
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {cartItems.length} {cartItems.length === 1 ? "item" : "items"} selected for checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Your cart is empty
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Add plans across categories (AI Scribe, AI Receptionist, EHR, RCM) or top-up credits to pay together in a single checkout.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-2 px-5 py-2 rounded-full bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Browse Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-100/90 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#1E293B] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      <strong>Single Active Plan:</strong> Any plan in your cart will become your active organization plan upon checkout. Credit packs and team seats will be added immediately.
                    </p>
                  </div>

                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.type === "plan"
                                ? "bg-slate-100 text-[#1E293B] border border-slate-300"
                                : item.type === "custom_credits" || item.type === "credit_pack"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {item.type === "plan" ? item.category || "Plan" : item.type.replace("_", " ")}
                          </span>
                          {item.billingCycle && (
                            <span className="text-[10px] text-slate-400 font-semibold capitalize">
                              {item.billingCycle}
                            </span>
                          )}
                        </div>

                        <h5 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {item.title}
                        </h5>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {item.credits && (
                            <p className="flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-500" />
                              <span>{item.credits.toLocaleString()} Credits</span>
                            </p>
                          )}
                          {item.members && (
                            <p className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span>{item.members} Team {item.members === 1 ? "Member" : "Members"}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!activeOrganization?.id) return;
                            const next = removeFromCart(activeOrganization.id, item.id);
                            setCartItems(next);
                            toast.info(`Removed ${item.title} from cart.`);
                          }}
                          className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="text-right">
                          <span className="text-sm font-extrabold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                            {item.currencySymbol || "$"}{item.price.toFixed(2)}
                          </span>
                          {item.billingCycle && (
                            <span className="text-[10px] text-slate-400 block font-medium">
                              /{item.billingCycle === "yearly" ? "yr" : "mo"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/70 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-semibold text-slate-800">
                      {cartItems[0]?.currencySymbol || "$"}
                      {cartItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-slate-800">$0.00</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Total Due Today</span>
                      <span className="text-xl font-extrabold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {cartItems[0]?.currencySymbol || "$"}
                        {cartItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeOrganization?.id) return;
                        clearCart(activeOrganization.id);
                        setCartItems([]);
                        toast.info("Cleared all items from cart.");
                      }}
                      className="text-xs text-slate-400 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
                    >
                      Clear Cart
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!activeOrganization?.id) return;
                    const count = cartItems.length;
                    const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
                    const updatedSub = checkoutCart(activeOrganization.id);
                    setSubscription(updatedSub);
                    setCartItems([]);
                    setIsCartOpen(false);
                    toast.success(`Payment successful ($${total.toFixed(2)})! All ${count} items have been activated. ✓`);
                  }}
                  className="w-full py-3.5 rounded-full bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <CreditCard className="w-4 h-4 text-slate-300" />
                  <span>Pay &amp; Activate All (${cartItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
