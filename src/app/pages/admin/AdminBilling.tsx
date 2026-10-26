/**
 * AdminBilling.tsx
 * Path: src/app/pages/admin/AdminBilling.tsx
 *
 * Admin Console for Workspace Billing & Subscriptions:
 * - View which plan and credit package each workspace is currently on
 * - Change / assign plans to workspaces
 * - Allocate / top-up voice and workflow credit packages
 * - Real-time synchronization with customer-facing MantraAssist app
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Building2,
  Coins,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Edit2,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  X,
  Sparkles,
  Calendar,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  WorkspaceSubscription,
  getStoredPlans,
  getStoredCreditPackages,
  getStoredSubscriptions,
  updateWorkspaceSubscription,
  purchaseCreditPackageForWorkspace,
  PLANS_BILLING_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { useOrganization, Organization } from "../../context/OrganizationContext";

export default function AdminBilling() {
  const { organizations } = useOrganization();
  const [plans, setPlans] = useState<IndustryPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, WorkspaceSubscription>>({});

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");

  // Plan Assignment Modal
  const [selectedOrgForPlan, setSelectedOrgForPlan] = useState<Organization | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>("");
  const [targetCycle, setTargetCycle] = useState<"monthly" | "yearly">("monthly");

  // Credit Top-Up Modal
  const [selectedOrgForCredits, setSelectedOrgForCredits] = useState<Organization | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

  const refreshData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
    setSubscriptions(getStoredSubscriptions());
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    let totalMRR = 0;
    let totalCredits = 0;
    let activeSubs = 0;

    organizations.forEach((org) => {
      const sub = subscriptions[org.id];
      if (sub) {
        if (sub.status === "Active") activeSubs++;
        totalCredits += sub.creditsRemaining || 0;
        const monthlyEquivalent = sub.billingCycle === "yearly" ? sub.amount / 12 : sub.amount;
        totalMRR += monthlyEquivalent || 0;
      }
    });

    return {
      totalWorkspaces: organizations.length,
      activeSubs,
      totalCredits,
      totalMRR: Math.round(totalMRR),
    };
  }, [organizations, subscriptions]);

  // Filtered Workspaces
  const filteredWorkspaces = useMemo(() => {
    return organizations.filter((org) => {
      const sub = subscriptions[org.id];
      const matchQuery =
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.industryCategory || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub?.planName || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        categoryFilter === "All" ||
        (org.industryCategory || "").toLowerCase() === categoryFilter.toLowerCase();

      const matchTier = tierFilter === "All" || sub?.tier === tierFilter;

      return matchQuery && matchCategory && matchTier;
    });
  }, [organizations, subscriptions, searchQuery, categoryFilter, tierFilter]);

  // Open Plan Change Modal
  const handleOpenChangePlan = (org: Organization) => {
    const currentSub = subscriptions[org.id];
    setSelectedOrgForPlan(org);
    setTargetPlanId(currentSub?.planId || plans[0]?.id || "");
    setTargetCycle(currentSub?.billingCycle || "monthly");
  };

  // Submit Plan Change
  const handleSavePlanAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForPlan) return;

    const chosenPlan = plans.find((p) => p.id === targetPlanId);
    if (!chosenPlan) {
      toast.error("Please select a valid plan");
      return;
    }

    // Determine price in workspace country
    const targetCountry = selectedOrgForPlan.country || "United States";
    const pricing =
      chosenPlan.countryPricing.find((cp) => cp.country.toLowerCase() === targetCountry.toLowerCase()) ||
      chosenPlan.countryPricing[0];

    const amount = targetCycle === "monthly" ? pricing.monthlyPrice : pricing.yearlyPrice;
    const includedCredits = targetCycle === "monthly" ? chosenPlan.monthlyCredits : chosenPlan.yearlyCredits;

    const existingSub = subscriptions[selectedOrgForPlan.id];
    const updatedSub: WorkspaceSubscription = {
      workspaceId: selectedOrgForPlan.id,
      planId: chosenPlan.id,
      planName: chosenPlan.name,
      tier: chosenPlan.tier,
      billingCycle: targetCycle,
      amount,
      currency: pricing.currency,
      currencySymbol: pricing.currencySymbol,
      status: "Active",
      nextRenewalDate: new Date(Date.now() + (targetCycle === "monthly" ? 30 : 365) * 86400000).toISOString().slice(0, 10),
      startDate: existingSub?.startDate || new Date().toISOString().slice(0, 10),
      userCount: existingSub?.userCount || 1,
      includedSeats: chosenPlan.includedSeats || (chosenPlan.tier === "Starter" ? 2 : chosenPlan.tier === "Professional" ? 5 : 20),
      extraSeatsPurchased: existingSub?.extraSeatsPurchased || 0,
      planCredits: includedCredits,
      addonCredits: existingSub?.addonCredits || 0,
      totalCredits: includedCredits + (existingSub?.addonCredits || 0),
      creditsUsed: existingSub?.creditsUsed || 0,
      creditsRemaining: includedCredits + (existingSub?.addonCredits || 0) - (existingSub?.creditsUsed || 0),
      recentPackages: existingSub?.recentPackages || [],
    };

    updateWorkspaceSubscription(selectedOrgForPlan.id, updatedSub);
    setSelectedOrgForPlan(null);
    toast.success(`Assigned "${chosenPlan.name}" (${targetCycle}) to ${selectedOrgForPlan.name} ✓`);
  };

  // Open Credits Top Up Modal
  const handleOpenTopUpCredits = (org: Organization) => {
    setSelectedOrgForCredits(org);
    const available = creditPackages.filter(
      (p) => !p.isInternalStaffOnly && (p.country === (org.country || "United States") || p.country === "United States")
    );
    setSelectedPackageId(available[0]?.id || creditPackages[0]?.id || "");
  };

  // Submit Credits Top Up
  const handleSaveCreditsTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForCredits) return;

    const chosenPkg = creditPackages.find((p) => p.id === selectedPackageId);
    if (!chosenPkg) {
      toast.error("Please select a credit package");
      return;
    }

    purchaseCreditPackageForWorkspace(selectedOrgForCredits.id, chosenPkg);
    setSelectedOrgForCredits(null);
    toast.success(`Allocated +${chosenPkg.credits.toLocaleString()} credits to ${selectedOrgForCredits.name} ✓`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workspace Billing & Subscriptions</h1>
            <p className="text-sm text-gray-500">
              Manage subscription tiers, plan assignments, and credit balances across all customer workspaces
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Workspaces</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalWorkspaces}</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> All connected
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.activeSubs}</p>
          <p className="text-xs text-blue-600 font-medium">
            {Math.round((metrics.activeSubs / (metrics.totalWorkspaces || 1)) * 100)}% coverage
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Available Credits</p>
          <p className="text-2xl font-bold text-amber-600">{metrics.totalCredits.toLocaleString()}</p>
          <p className="text-xs text-gray-500 font-medium">Voice & Workflow pool</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estimated MRR</p>
          <p className="text-2xl font-bold text-emerald-700">${metrics.totalMRR.toLocaleString()}/mo</p>
          <p className="text-xs text-emerald-600 font-medium">Annualized subscriptions normalized</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces by name, industry, or plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Wellness & Lifestyle">Wellness & Lifestyle</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Automobile">Automobile</option>
            <option value="IT/Tech">IT/Tech</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="All">All Tiers</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>

      {/* ── Workspaces Billing Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Workspace / Client</th>
                <th className="px-5 py-3.5">Category & Scope</th>
                <th className="px-5 py-3.5">Assigned Plan</th>
                <th className="px-5 py-3.5">Billing & Price</th>
                <th className="px-5 py-3.5">Credits Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWorkspaces.map((org) => {
                const sub = subscriptions[org.id] || {
                  workspaceId: org.id,
                  planId: "plan-global-starter",
                  planName: "Global Starter",
                  tier: "Starter",
                  billingCycle: "monthly",
                  amount: 49,
                  currency: "USD",
                  currencySymbol: "$",
                  status: "Active",
                  nextRenewalDate: "2026-05-01",
                  startDate: "2026-01-01",
                  userCount: 1,
                  totalCredits: 500,
                  creditsUsed: 120,
                  creditsRemaining: 380,
                };

                const creditsPercent = Math.min(
                  100,
                  Math.round(((sub.creditsRemaining || 0) / (sub.totalCredits || 1)) * 100)
                );

                return (
                  <tr key={org.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Org Info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{org.name}</span>
                            <span className="text-xs text-gray-400 font-mono font-normal">#{org.id}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {org.country || "United States"} · {org.currency || "USD"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category & Scope */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {org.industryCategory || "General"}
                        </span>
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{org.industry}</p>
                      </div>
                    </td>

                    {/* Assigned Plan */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              sub.tier === "Starter"
                                ? "bg-slate-100 text-slate-700"
                                : sub.tier === "Professional"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {sub.tier}
                          </span>
                          <span className="font-semibold text-gray-900 text-xs">{sub.planName}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Cycle: <span className="capitalize font-medium text-gray-600">{sub.billingCycle}</span>
                        </p>
                      </div>
                    </td>

                    {/* Billing & Price */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-gray-900 text-sm">
                          {sub.currencySymbol}
                          {sub.amount.toLocaleString()}/{sub.billingCycle === "yearly" ? "yr" : "mo"}
                        </span>
                        <p className="text-[11px] text-gray-400">Renews: {sub.nextRenewalDate}</p>
                      </div>
                    </td>

                    {/* Credits Balance with Progress Bar */}
                    <td className="px-5 py-4">
                      <div className="space-y-1.5 w-36">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-900">
                            {(sub.creditsRemaining || 0).toLocaleString()}
                          </span>
                          <span className="text-gray-400 text-[11px]">/ {(sub.totalCredits || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              creditsPercent < 20
                                ? "bg-rose-500"
                                : creditsPercent < 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${creditsPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenChangePlan(org)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Change Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTopUpCredits(org)}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          title="Allocate Credit Package"
                        >
                          + Credits
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CHANGE PLAN MODAL ── */}
      {selectedOrgForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Change Workspace Plan</h3>
                <p className="text-xs text-gray-500">
                  Assigning plan to: <strong className="text-gray-800">{selectedOrgForPlan.name}</strong> ({selectedOrgForPlan.industryCategory || "Global"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgForPlan(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Industry Plan</label>
                <select
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.tier}] {p.name} {p.targetCategory !== "Global" ? `(${p.targetCategory})` : "(Global)"} -{" "}
                      {p.isActive ? "Active" : "Inactive"}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Plans marked with category will only display in client workspaces within that scope.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetCycle("monthly")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      targetCycle === "monthly"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetCycle("yearly")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      targetCycle === "yearly"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Annual Billing (Discounted)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Instant Live Sync
                </p>
                <p className="text-blue-700 text-[11px]">
                  Updating this subscription will immediately update the active subscription badge and included credits in the workspace's customer-facing Settings &gt; Billing section.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrgForPlan(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm &amp; Assign Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOP UP CREDITS MODAL ── */}
      {selectedOrgForCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Allocate Credit Package</h3>
                <p className="text-xs text-gray-500">
                  Target: <strong className="text-gray-800">{selectedOrgForCredits.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgForCredits(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreditsTopUp} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Credit Package</label>
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
                >
                  {creditPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — +{pkg.credits.toLocaleString()} Credits ({pkg.currencySymbol}
                      {pkg.totalPrice}) [{pkg.country}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold">Note: </span>
                Credits will be added immediately to the workspace's remaining and total credit balance.
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrgForCredits(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Allocate Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
