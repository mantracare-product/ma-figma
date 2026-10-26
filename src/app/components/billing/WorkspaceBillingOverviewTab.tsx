/**
 * WorkspaceBillingOverviewTab.tsx
 * Path: src/app/components/billing/WorkspaceBillingOverviewTab.tsx
 *
 * Plan Overview tab implementing PRD: MantraAssist Billing (FR-11, Rules 5.1 - 5.3).
 * Displays:
 * - Active Plan with included team members, display features, and "Manage" button.
 * - Billing Summary showing:
 *   - Included Seats vs. Extra Seats purchased
 *   - Current Plan Credits (renewed monthly) vs. Addon Credits (from top-ups)
 *   - Usage Status & Estimated Monthly Total
 * - Add-on purchase actions for:
 *   - Credit Packs or Custom Credit amounts (FR-6, FR-7)
 *   - Team Member Packs or Custom Member amounts (FR-8, FR-9)
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  Coins,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  Plus,
  X,
  CreditCard,
  Building2,
  Lock,
  AlertCircle,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  WorkspaceSubscription,
  CreditPackage,
  TeamMemberPack,
  GlobalBillingSettings,
  getStoredPlans,
  getStoredCreditPackages,
  getStoredTeamMemberPacks,
  getStoredGlobalBillingSettings,
  purchaseCreditPackageForWorkspace,
  purchaseCustomCreditsForWorkspace,
  purchaseTeamMemberPackForWorkspace,
  purchaseCustomTeamMembersForWorkspace,
  getWorkspaceSubscription,
  PLANS_BILLING_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { useOrganization } from "../../context/OrganizationContext";

interface WorkspaceBillingOverviewTabProps {
  subscription: WorkspaceSubscription | null;
  onNavigateToPlans: () => void;
  onNavigateToCredits: () => void;
}

export default function WorkspaceBillingOverviewTab({
  subscription: initialSub,
  onNavigateToPlans,
  onNavigateToCredits,
}: WorkspaceBillingOverviewTabProps) {
  const { activeOrganization } = useOrganization();
  const [sub, setSub] = useState<WorkspaceSubscription | null>(initialSub);

  // Add-on Modals state
  const [isCreditAddonOpen, setIsCreditAddonOpen] = useState(false);
  const [isMemberAddonOpen, setIsMemberAddonOpen] = useState(false);

  // Add-on selection states
  const [creditTabMode, setCreditTabMode] = useState<"pack" | "custom">("pack");
  const [selectedCreditPackId, setSelectedCreditPackId] = useState<string>("");
  const [customCreditQuantity, setCustomCreditQuantity] = useState<number>(2500);

  const [memberTabMode, setMemberTabMode] = useState<"pack" | "custom">("pack");
  const [selectedMemberPackId, setSelectedMemberPackId] = useState<string>("");
  const [customMemberQuantity, setCustomMemberQuantity] = useState<number>(3);

  // Loaded configuration stores
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [teamPacks, setTeamPacks] = useState<TeamMemberPack[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalBillingSettings>(getStoredGlobalBillingSettings());

  const loadData = () => {
    setCreditPackages(getStoredCreditPackages().filter((p) => p.isActive && !p.isInternalStaffOnly));
    setTeamPacks(getStoredTeamMemberPacks().filter((p) => p.isActive));
    setGlobalSettings(getStoredGlobalBillingSettings());
    if (activeOrganization?.id) {
      setSub(getWorkspaceSubscription(activeOrganization.id));
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

  useEffect(() => {
    if (initialSub) setSub(initialSub);
  }, [initialSub]);

  // Derived subscription values according to PRD FR-1, FR-11, Rule 5.3
  const hasPlan = Boolean(sub?.planId && sub?.status === "Active");
  const planName = sub?.planName || "Onboarding Plan";
  const currencySymbol = sub?.currencySymbol || "$";
  const planRate = sub?.amount ? `${currencySymbol}${sub.amount}` : "$0";
  const isYearly = sub?.billingCycle === "yearly";

  const includedSeats = sub?.includedSeats || 2;
  const extraSeats = sub?.extraSeatsPurchased || 0;
  const totalAllowedSeats = includedSeats + extraSeats;

  const planCredits = sub?.planCredits || 1000;
  const addonCredits = sub?.addonCredits || 0;
  const totalCredits = (sub?.totalCredits || planCredits + addonCredits);
  const consumedCredits = sub?.creditsUsed || 0;
  const usagePercentage = Math.min(100, Math.max(0.1, (consumedCredits / Math.max(1, totalCredits)) * 100)).toFixed(1);

  // Features list from assigned plan
  const storedPlans = getStoredPlans();
  const currentPlanObj = storedPlans.find((p) => p.id === sub?.planId);
  const features = currentPlanObj?.features || [
    `${includedSeats} team members included at no extra charge`,
    `${planCredits.toLocaleString()} included monthly voice & chat credits`,
    "AI Voice Receptionist agent with 24/7 call triage",
    "Multi-channel Chat, SMS & Call logs",
    "Automated Appointment Scheduling & Reminders",
  ];

  // Credit Purchase Handler (FR-6, FR-7, Rule 5.2)
  const handleConfirmCreditPurchase = () => {
    if (!activeOrganization?.id) return;
    if (!hasPlan) {
      toast.error("Please assign a plan first before purchasing add-on credits.");
      return;
    }

    if (creditTabMode === "pack") {
      const pack = creditPackages.find((p) => p.id === selectedCreditPackId) || creditPackages[0];
      if (!pack) {
        toast.error("Please select a credit pack");
        return;
      }
      const updated = purchaseCreditPackageForWorkspace(activeOrganization.id, pack);
      setSub(updated);
      setIsCreditAddonOpen(false);
      toast.success(`Purchased ${pack.name} (+${pack.credits.toLocaleString()} Add-on Credits) ✓`);
    } else {
      if (customCreditQuantity <= 0) {
        toast.error("Please enter a valid credit amount greater than 0");
        return;
      }
      const updated = purchaseCustomCreditsForWorkspace(activeOrganization.id, customCreditQuantity);
      setSub(updated);
      setIsCreditAddonOpen(false);
      toast.success(`Purchased +${customCreditQuantity.toLocaleString()} Custom Add-on Credits ✓`);
    }
  };

  // Team Member Purchase Handler (FR-8, FR-9, Rule 5.2)
  const handleConfirmMemberPurchase = () => {
    if (!activeOrganization?.id) return;
    if (!hasPlan) {
      toast.error("Please assign a plan first before adding extra team members.");
      return;
    }

    if (memberTabMode === "pack") {
      const pack = teamPacks.find((p) => p.id === selectedMemberPackId) || teamPacks[0];
      if (!pack) {
        toast.error("Please select a team member pack");
        return;
      }
      const updated = purchaseTeamMemberPackForWorkspace(activeOrganization.id, pack);
      setSub(updated);
      setIsMemberAddonOpen(false);
      toast.success(`Added ${pack.members} Team Members via ${pack.name} ✓`);
    } else {
      if (customMemberQuantity <= 0) {
        toast.error("Please enter at least 1 member");
        return;
      }
      const updated = purchaseCustomTeamMembersForWorkspace(activeOrganization.id, customMemberQuantity);
      setSub(updated);
      setIsMemberAddonOpen(false);
      toast.success(`Added +${customMemberQuantity} Custom Team Members ✓`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Plan Overview
          </h2>
          <p
            className="text-xs sm:text-sm text-slate-500 mt-0.5"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Manage included quotas, seats, and top-up add-ons for{" "}
            <strong className="text-slate-800">{activeOrganization?.name || "your organization"}</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMemberAddonOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Users className="w-3.5 h-3.5" />
            <span>+ Add Team Members</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreditAddonOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#181e25] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add Credits</span>
          </button>
        </div>
      </div>

      {/* ── Warning banner if no plan assigned (FR-10, Rule 5.1) ── */}
      {!hasPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">No active plan assigned</p>
              <p className="text-[11px] text-amber-700">
                Add-on purchases are locked until a plan is chosen or assigned by an admin (Rule 5.1).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToPlans}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
          >
            Choose a Plan
          </button>
        </div>
      )}

      {/* ── Two Column Overview Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Card 1: Active Plan Card (FR-11) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          {/* Header Row: Title & Manage Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {planName}
              </h3>
            </div>
            <button
              type="button"
              onClick={onNavigateToPlans}
              className="px-4 py-1.5 rounded-full bg-[#181e25] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Manage
            </button>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-4xl font-extrabold text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {planRate}
            </span>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              /{isYearly ? "year" : "month"} · includes {includedSeats} seats
            </span>
          </div>

          {/* Seats Badge (FR-1, FR-11) */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-900">Team Capacity:</span>
            </div>
            <span className="font-bold text-blue-950">
              {totalAllowedSeats} allowed ({includedSeats} included + {extraSeats} extra)
            </span>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Plan Features Section (FR-3, FR-11) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <h4
                  className="text-xs font-bold text-slate-900 uppercase tracking-wider"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Plan Features &amp; Quotas
                </h4>
              </div>
              <span className="text-[10px] text-gray-400 italic">For display &amp; access</span>
            </div>

            <ul className="space-y-2.5">
              {features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span
                    className="text-xs text-slate-700 font-medium"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Card 2: Billing Summary Card (FR-11, Rule 5.3) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          {/* Header Row: Title, Subtitle & Action Links */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Billing Summary
              </h3>
              <p
                className="text-xs text-slate-500 mt-0.5"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Subscription metrics &amp; add-on allocations
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToCredits}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Metrics Rows (FR-11) */}
          <div className="space-y-3.5">
            {/* Metric 1: Plan Rate */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Plan Rate
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Base rate ({isYearly ? "Billed annually" : "Billed monthly"})
                </p>
              </div>
              <span className="text-xs font-bold text-slate-900 font-mono" style={{ fontFamily: "Outfit, sans-serif" }}>
                {planRate} / {isYearly ? "year" : "month"}
              </span>
            </div>

            {/* Metric 2: Team Members Included vs. Extra */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Team Members (Seats)
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  {includedSeats} included + {extraSeats} add-on
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {totalAllowedSeats} allowed
                </span>
              </div>
            </div>

            {/* Metric 3: Current Plan Credits */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Current Plan Credits
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Renewed every month with plan
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {planCredits.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Metric 4: Addon Credits */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Addon Credits (Balance from Top-ups)
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Never expire, roll over month-to-month
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 font-mono" style={{ fontFamily: "Outfit, sans-serif" }}>
                  +{addonCredits.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Metric 5: Total Credits */}
            <div className="flex items-center justify-between py-1 border-t border-slate-50">
              <div>
                <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Total Credits
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  Plan Credits + Addon Credits
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 font-mono" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {totalCredits.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Metric 6: Usage Status (FR-15 connection) */}
            <div className="py-2 border-t border-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Usage Status ({usagePercentage}%)
                  </p>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Consumed: {consumedCredits.toLocaleString()} credits
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {consumedCredits.toLocaleString()} / {totalCredits.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(1.5, Number(usagePercentage)))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 pt-1" />

          {/* Bottom Estimated Monthly Total */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p
                className="text-xs font-bold text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Estimated Monthly Total
              </p>
              <p className="text-[11px] text-slate-400 font-normal">
                Base plan + recurring seats
              </p>
            </div>
            <span
              className="text-2xl font-black text-blue-600 font-mono"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {currencySymbol}
              {(
                (sub?.amount || 0) +
                extraSeats * (globalSettings.defaultPricePerExtraMember || 20)
              ).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: ADD CREDITS (FR-6, FR-7) ── */}
      {isCreditAddonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Add Extra Credits (Add-on)
                </h3>
                <p className="text-xs text-gray-500">
                  Choose a predefined pack or specify a custom credit quantity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditAddonOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Mode: Pack vs Custom (FR-6 vs FR-7) */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCreditTabMode("pack")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  creditTabMode === "pack" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                }`}
              >
                Choose Credit Pack (FR-6)
              </button>
              <button
                type="button"
                onClick={() => setCreditTabMode("custom")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  creditTabMode === "custom" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                }`}
              >
                Custom Credit Amount (FR-7)
              </button>
            </div>

            {/* Mode 1: Predefined Credit Packs */}
            {creditTabMode === "pack" && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {creditPackages.map((pkg) => {
                  const isSelected = selectedCreditPackId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedCreditPackId(pkg.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{pkg.name}</span>
                          {pkg.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              {pkg.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          +{pkg.credits.toLocaleString()} credits ({pkg.currencySymbol}{pkg.pricePerCredit}/credit)
                        </p>
                      </div>

                      <span className="text-sm font-extrabold text-gray-900 font-mono">
                        {pkg.currencySymbol}{pkg.totalPrice}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Custom Credits (FR-7) */}
            {creditTabMode === "custom" && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Enter Credit Amount</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={customCreditQuantity}
                    onChange={(e) => setCustomCreditQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Rate: {currencySymbol}{globalSettings.defaultPricePerCredit} per credit (set in admin)
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Calculated Charge:</span>
                  <span className="text-base font-extrabold text-amber-600 font-mono">
                    {currencySymbol}
                    {(customCreditQuantity * globalSettings.defaultPricePerCredit).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsCreditAddonOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreditPurchase}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Add-on Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD TEAM MEMBERS (FR-8, FR-9) ── */}
      {isMemberAddonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Add Extra Team Members (Seats)
                </h3>
                <p className="text-xs text-gray-500">
                  Expand your organization size beyond the plan&apos;s {includedSeats} included seats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberAddonOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Mode: Pack vs Custom (FR-8 vs FR-9) */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMemberTabMode("pack")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  memberTabMode === "pack" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                }`}
              >
                Choose Team Member Pack
              </button>
              <button
                type="button"
                onClick={() => setMemberTabMode("custom")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  memberTabMode === "custom" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500"
                }`}
              >
                Custom Member Count
              </button>
            </div>

            {/* Mode 1: Predefined Team Packs */}
            {memberTabMode === "pack" && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {teamPacks.map((pack) => {
                  const isSelected = selectedMemberPackId === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedMemberPackId(pack.id)}
                      className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-50/40 ring-1 ring-purple-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{pack.name}</span>
                          {pack.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                              {pack.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          +{pack.members} extra seats added to workspace
                        </p>
                      </div>

                      <span className="text-sm font-extrabold text-gray-900 font-mono">
                        {pack.currencySymbol}{pack.totalPrice} / mo
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Custom Members (FR-9) */}
            {memberTabMode === "custom" && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Number of Extra Team Members
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customMemberQuantity}
                    onChange={(e) => setCustomMemberQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Rate: {currencySymbol}{globalSettings.defaultPricePerExtraMember} per extra member / month
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Monthly Add-on Charge:</span>
                  <span className="text-base font-extrabold text-purple-600 font-mono">
                    {currencySymbol}
                    {(customMemberQuantity * globalSettings.defaultPricePerExtraMember).toFixed(2)} / mo
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsMemberAddonOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMemberPurchase}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Add Extra Seats
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
