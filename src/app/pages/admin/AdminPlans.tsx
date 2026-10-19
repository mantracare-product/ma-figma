/**
 * AdminPlans.tsx
 * Path: src/app/pages/admin/AdminPlans.tsx
 *
 * Dedicated Admin Console for Plans & Credits.
 * Admin owns Plan and Credit Package creation/editing.
 * Changes here are the single source of truth for customer-facing MantraAssist workspaces.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Coins,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Globe,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  Tag,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  PlanTier,
  CountryPricing,
  getStoredPlans,
  savePlan,
  deletePlan,
  getStoredCreditPackages,
  saveCreditPackage,
  deleteCreditPackage,
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY_PRICING,
  PLANS_BILLING_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";

export default function AdminPlans() {
  const [activeTab, setActiveTab] = useState<"plans" | "credits">("plans");
  const [plans, setPlans] = useState<IndustryPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Internal">("All");

  // Plan Drawer State
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IndustryPlan | null>(null);

  // Credit Package Drawer State
  const [isCreditDrawerOpen, setIsCreditDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);

  // Form states for Plan
  const [planForm, setPlanForm] = useState<Omit<IndustryPlan, "id" | "createdAt" | "updatedAt">>({
    name: "",
    tier: "Starter",
    targetCategory: "Global",
    description: "",
    monthlyCredits: 500,
    yearlyCredits: 6000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [""],
    linkedProcessTemplates: [],
    countryPricing: [...DEFAULT_COUNTRY_PRICING],
  });

  // Form state for Credit Package
  const [packageForm, setPackageForm] = useState<Omit<CreditPackage, "id" | "createdAt">>({
    name: "",
    credits: 1000,
    pricePerCredit: 0.045,
    totalPrice: 45,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "",
  });

  const loadData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(PLANS_BILLING_CHANGED_EVENT, handleSync);
  }, []);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.targetCategory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory =
        categoryFilter === "All" ||
        (categoryFilter === "Global" && p.targetCategory === "Global") ||
        p.targetCategory.toLowerCase() === categoryFilter.toLowerCase();

      const matchTier = tierFilter === "All" || p.tier === tierFilter;

      let matchStatus = true;
      if (statusFilter === "Active") matchStatus = p.isActive && !p.isInternalStaffOnly;
      if (statusFilter === "Inactive") matchStatus = !p.isActive;
      if (statusFilter === "Internal") matchStatus = p.isInternalStaffOnly;

      return matchQuery && matchCategory && matchTier && matchStatus;
    });
  }, [plans, searchQuery, categoryFilter, tierFilter, statusFilter]);

  // Filtered Credit Packages
  const filteredPackages = useMemo(() => {
    return creditPackages.filter((pkg) => {
      const matchQuery =
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.currency.toLowerCase().includes(searchQuery.toLowerCase());

      let matchStatus = true;
      if (statusFilter === "Active") matchStatus = pkg.isActive && !pkg.isInternalStaffOnly;
      if (statusFilter === "Inactive") matchStatus = !pkg.isActive;
      if (statusFilter === "Internal") matchStatus = pkg.isInternalStaffOnly;

      return matchQuery && matchStatus;
    });
  }, [creditPackages, searchQuery, statusFilter]);

  // Plan Handlers
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: "",
      tier: "Starter",
      targetCategory: "Global",
      description: "",
      monthlyCredits: 1000,
      yearlyCredits: 12000,
      isActive: true,
      isPopular: false,
      isInternalStaffOnly: false,
      features: [
        "AI Voice Receptionist agent",
        "Multi-channel Chat & Call logs",
        "Automated Scheduling & Confirmations",
      ],
      linkedProcessTemplates: [],
      countryPricing: JSON.parse(JSON.stringify(DEFAULT_COUNTRY_PRICING)),
    });
    setIsPlanDrawerOpen(true);
  };

  const handleOpenEditPlan = (plan: IndustryPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      tier: plan.tier,
      targetCategory: plan.targetCategory,
      description: plan.description,
      monthlyCredits: plan.monthlyCredits,
      yearlyCredits: plan.yearlyCredits,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      isInternalStaffOnly: plan.isInternalStaffOnly,
      features: [...plan.features],
      linkedProcessTemplates: [...plan.linkedProcessTemplates],
      countryPricing: JSON.parse(JSON.stringify(plan.countryPricing)),
    });
    setIsPlanDrawerOpen(true);
  };

  const handleDuplicatePlan = (plan: IndustryPlan) => {
    const duplicated: IndustryPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      name: `${plan.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    savePlan(duplicated);
    toast.success(`Plan duplicated as "${duplicated.name}"`);
  };

  const handleSavePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      toast.error("Please enter a plan name");
      return;
    }

    const cleanedFeatures = planForm.features.map((f) => f.trim()).filter(Boolean);
    if (cleanedFeatures.length === 0) {
      toast.error("Please provide at least one feature item");
      return;
    }

    const planToSave: IndustryPlan = {
      ...planForm,
      features: cleanedFeatures,
      id: editingPlan ? editingPlan.id : `plan-${Date.now()}`,
      createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    savePlan(planToSave);
    setIsPlanDrawerOpen(false);
    toast.success(editingPlan ? `Plan "${planToSave.name}" updated ✓` : `Plan "${planToSave.name}" created ✓`);
  };

  const handleDeletePlanConfirm = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the plan "${name}"?`)) {
      deletePlan(id);
      toast.success(`Plan "${name}" removed`);
    }
  };

  const handleTogglePlanActive = (plan: IndustryPlan) => {
    const updated = { ...plan, isActive: !plan.isActive };
    savePlan(updated);
    toast.success(`Plan "${plan.name}" is now ${updated.isActive ? "Active" : "Inactive"}`);
  };

  // Credit Package Handlers
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: "",
      credits: 1000,
      pricePerCredit: 0.045,
      totalPrice: 45,
      country: "United States",
      currency: "USD",
      currencySymbol: "$",
      isActive: true,
      isInternalStaffOnly: false,
      badge: "Popular",
    });
    setIsCreditDrawerOpen(true);
  };

  const handleOpenEditPackage = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      credits: pkg.credits,
      pricePerCredit: pkg.pricePerCredit,
      totalPrice: pkg.totalPrice,
      country: pkg.country,
      currency: pkg.currency,
      currencySymbol: pkg.currencySymbol,
      isActive: pkg.isActive,
      isInternalStaffOnly: pkg.isInternalStaffOnly,
      badge: pkg.badge || "",
    });
    setIsCreditDrawerOpen(true);
  };

  const handleSavePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.name.trim()) {
      toast.error("Please enter a package name");
      return;
    }

    const pkgToSave: CreditPackage = {
      ...packageForm,
      id: editingPackage ? editingPackage.id : `cred-pkg-${Date.now()}`,
      createdAt: editingPackage ? editingPackage.createdAt : new Date().toISOString(),
    };

    saveCreditPackage(pkgToSave);
    setIsCreditDrawerOpen(false);
    toast.success(editingPackage ? `Package "${pkgToSave.name}" updated ✓` : `Package "${pkgToSave.name}" created ✓`);
  };

  const handleDeletePackageConfirm = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete package "${name}"?`)) {
      deleteCreditPackage(id);
      toast.success(`Package "${name}" deleted`);
    }
  };

  // Helper for country pricing updates
  const handleUpdateCountryPrice = (index: number, field: "monthlyPrice" | "yearlyPrice", value: number) => {
    setPlanForm((prev) => {
      const nextPricing = [...prev.countryPricing];
      nextPricing[index] = { ...nextPricing[index], [field]: value };
      return { ...prev, countryPricing: nextPricing };
    });
  };

  const handleAddCountryPrice = (countryName: string) => {
    const found = SUPPORTED_COUNTRIES.find((c) => c.country === countryName);
    if (!found) return;
    if (planForm.countryPricing.some((cp) => cp.country === countryName)) {
      toast.info(`${countryName} is already in the pricing table`);
      return;
    }
    const newEntry: CountryPricing = {
      country: found.country,
      currency: found.currency,
      currencySymbol: found.symbol,
      monthlyPrice: 99,
      yearlyPrice: 950,
    };
    setPlanForm((prev) => ({
      ...prev,
      countryPricing: [...prev.countryPricing, newEntry],
    }));
  };

  const handleRemoveCountryPrice = (countryName: string) => {
    if (planForm.countryPricing.length <= 1) {
      toast.error("Must maintain at least one country price");
      return;
    }
    setPlanForm((prev) => ({
      ...prev,
      countryPricing: prev.countryPricing.filter((cp) => cp.country !== countryName),
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Plans & Credits</h1>
              <p className="text-sm text-gray-500">
                Single source of truth for Industry Plans, Cross-Country Pricing, and Voice Credit Packages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "plans" ? (
            <button
              type="button"
              onClick={handleOpenCreatePlan}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Industry Plan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreatePackage}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Credit Package</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("plans")}
            className={`pb-3 px-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === "plans"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Industry Plans</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                {plans.length}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("credits")}
            className={`pb-3 px-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === "credits"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span>Credit Packages</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                {creditPackages.length}
              </span>
            </div>
          </button>
        </div>

        {/* Live Sync Badge */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Synced with MantraAssist Workspaces</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === "plans" ? "Search plans by name, category, features..." : "Search packages by country or credits..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "plans" && (
            <>
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Categories</option>
                <option value="Global">Global (All Workspaces)</option>
                {INITIAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Tier Filter */}
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Tiers</option>
                <option value="Starter">Starter</option>
                <option value="Professional">Professional</option>
                <option value="Custom">Custom</option>
              </select>
            </>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Customer Visible (Active)</option>
            <option value="Inactive">Inactive</option>
            <option value="Internal">Internal / Staff Only</option>
          </select>
        </div>
      </div>

      {/* ── TAB 1: INDUSTRY PLANS LIST ── */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const usPricing = plan.countryPricing.find((cp) => cp.country === "United States") || plan.countryPricing[0];
              const inPricing = plan.countryPricing.find((cp) => cp.country === "India");
              const ukPricing = plan.countryPricing.find((cp) => cp.country === "United Kingdom");

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md ${
                    plan.isPopular
                      ? "border-blue-500 ring-2 ring-blue-500/10"
                      : "border-gray-200/90"
                  } ${!plan.isActive ? "opacity-75 bg-gray-50/50" : ""}`}
                >
                  <div className="p-5 space-y-4">
                    {/* Badges Bar */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            plan.tier === "Starter"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : plan.tier === "Professional"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {plan.tier}
                        </span>

                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            plan.targetCategory === "Global"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {plan.targetCategory === "Global" ? "🌐 Global Scope" : `🏢 ${plan.targetCategory}`}
                        </span>

                        {plan.isPopular && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            ★ Popular
                          </span>
                        )}
                      </div>

                      {/* Visibility Status Badge */}
                      {plan.isInternalStaffOnly ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Staff Only
                        </span>
                      ) : !plan.isActive ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-300">
                          Inactive
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Visible
                        </span>
                      )}
                    </div>

                    {/* Plan Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                    </div>

                    {/* Credits Included */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-gray-700 font-semibold">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>Included Credits:</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {plan.monthlyCredits.toLocaleString()} /mo · {plan.yearlyCredits.toLocaleString()} /yr
                      </span>
                    </div>

                    {/* Country Pricing Pills */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Country Pricing Matrix:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {usPricing && (
                          <span className="text-xs font-mono bg-blue-50/70 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md font-semibold">
                            🇺🇸 ${usPricing.monthlyPrice}/mo
                          </span>
                        )}
                        {inPricing && (
                          <span className="text-xs font-mono bg-orange-50/70 border border-orange-200 text-orange-800 px-2 py-0.5 rounded-md font-semibold">
                            🇮🇳 ₹{inPricing.monthlyPrice.toLocaleString()}/mo
                          </span>
                        )}
                        {ukPricing && (
                          <span className="text-xs font-mono bg-indigo-50/70 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md font-semibold">
                            🇬🇧 £{ukPricing.monthlyPrice}/mo
                          </span>
                        )}
                        {plan.countryPricing.length > 3 && (
                          <span className="text-xs font-medium text-gray-500 px-1.5 py-0.5">
                            +{plan.countryPricing.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Features Snippet */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Features ({plan.features.length}):</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {plan.features.slice(0, 3).map((feat, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-[11px] text-gray-400 pl-5">+{plan.features.length - 3} more features</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTogglePlanActive(plan)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        plan.isActive
                          ? "text-gray-600 hover:bg-gray-200"
                          : "text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                      }`}
                      title={plan.isActive ? "Deactivate plan" : "Activate plan"}
                    >
                      {plan.isActive ? "Deactivate" : "Activate"}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicatePlan(plan)}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                        title="Duplicate Plan"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(plan)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlanConfirm(plan.id, plan.name)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPlans.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 p-8 space-y-3">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">No industry plans found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No plans matched your filter criteria. Try adjusting your search query, category, or status filter.
              </p>
              <button
                type="button"
                onClick={handleOpenCreatePlan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CREDIT PACKAGES LIST ── */}
      {activeTab === "credits" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  pkg.badge?.toLowerCase().includes("popular")
                    ? "border-blue-500 ring-2 ring-blue-500/10"
                    : "border-gray-200"
                } ${!pkg.isActive ? "opacity-60 bg-gray-50" : ""}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      {pkg.country}
                    </span>
                    {pkg.badge && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {pkg.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-gray-900">{pkg.name}</h4>
                    <p className="text-2xl font-black text-gray-900 mt-2">
                      {pkg.currencySymbol}
                      {pkg.totalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pkg.currencySymbol}
                      {pkg.pricePerCredit} per credit
                    </p>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-amber-900 font-semibold">Included Credits:</span>
                    <span className="font-mono font-bold text-amber-950">
                      +{pkg.credits.toLocaleString()}
                    </span>
                  </div>

                  {pkg.isInternalStaffOnly && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      🔒 Staff Only (Hidden in App)
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-4">
                  <span className={`text-[11px] font-bold ${pkg.isActive ? "text-emerald-600" : "text-gray-400"}`}>
                    {pkg.isActive ? "● Active in App" : "○ Inactive"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      title="Edit Package"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackageConfirm(pkg.id, pkg.name)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete Package"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPackages.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200/80 p-8 space-y-3">
              <Coins className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">No credit packages found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                No credit packages matched your search. Click below to create one.
              </p>
              <button
                type="button"
                onClick={handleOpenCreatePackage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Credit Package
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT PLAN DRAWER ── */}
      {isPlanDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create New Industry Plan"}
                </h2>
                <p className="text-xs text-gray-500">
                  Configure tier, scope category, credits, and country pricing matrix
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="plan-form" onSubmit={handleSavePlanSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Wellness Studio Growth Suite"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tier *</label>
                  <select
                    value={planForm.tier}
                    onChange={(e) => setPlanForm({ ...planForm, tier: e.target.value as PlanTier })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Target Category (Scope) *
                  </label>
                  <select
                    value={planForm.targetCategory}
                    onChange={(e) => setPlanForm({ ...planForm, targetCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="Global">Global (All Industries)</option>
                    {INITIAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {planForm.targetCategory === "Global"
                      ? "Appears for all workspaces worldwide"
                      : `Only appears for workspaces classified under "${planForm.targetCategory}"`}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Short summary of this tier's target audience and primary benefits..."
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Credits Allocation */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Included Voice & Workflow Credits</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Credits</label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.monthlyCredits}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          monthlyCredits: parseInt(e.target.value) || 0,
                          yearlyCredits: (parseInt(e.target.value) || 0) * 12,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Yearly Credits</label>
                    <input
                      type="number"
                      min={0}
                      value={planForm.yearlyCredits}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          yearlyCredits: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Flags / Checkboxes */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Visibility & Status Flags</h4>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.isActive}
                      onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900">Active</span>
                      <p className="text-[11px] text-gray-500">When checked, plan can be chosen by active workspaces.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.isPopular}
                      onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900">Highlight as Popular</span>
                      <p className="text-[11px] text-gray-500">Adds prominent ribbon & styling on customer pricing table.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.isInternalStaffOnly}
                      onChange={(e) => setPlanForm({ ...planForm, isInternalStaffOnly: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900">Internal / Staff Only (Hidden from Clients)</span>
                      <p className="text-[11px] text-amber-700">
                        Never shown in customer MantraAssist app, only available in Admin panel for internal testing.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Features Checklist *</label>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, features: [...planForm.features, ""] })}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    + Add Feature
                  </button>
                </div>
                <div className="space-y-2">
                  {planForm.features.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const nextFeats = [...planForm.features];
                          nextFeats[index] = e.target.value;
                          setPlanForm({ ...planForm, features: nextFeats });
                        }}
                        placeholder={`Feature #${index + 1}`}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextFeats = planForm.features.filter((_, i) => i !== index);
                          setPlanForm({ ...planForm, features: nextFeats });
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Country-wise Pricing Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>Country-Wise Pricing (Currency Specific)</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      MantraAssist automatically picks the pricing row matching the workspace country
                    </p>
                  </div>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCountryPrice(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="px-2 py-1 text-xs border border-blue-300 text-blue-700 rounded-lg bg-blue-50/50"
                  >
                    <option value="">+ Add Country</option>
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.country} value={c.country}>
                        {c.country} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5">Country / Currency</th>
                        <th className="p-2.5">Monthly Price</th>
                        <th className="p-2.5">Yearly Price</th>
                        <th className="p-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {planForm.countryPricing.map((cp, idx) => (
                        <tr key={cp.country}>
                          <td className="p-2.5 font-semibold text-gray-800">
                            {cp.country} ({cp.currency} {cp.currencySymbol})
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{cp.currencySymbol}</span>
                              <input
                                type="number"
                                min={0}
                                value={cp.monthlyPrice}
                                onChange={(e) =>
                                  handleUpdateCountryPrice(idx, "monthlyPrice", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold"
                              />
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">{cp.currencySymbol}</span>
                              <input
                                type="number"
                                min={0}
                                value={cp.yearlyPrice}
                                onChange={(e) =>
                                  handleUpdateCountryPrice(idx, "yearlyPrice", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold"
                              />
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCountryPrice(cp.country)}
                              className="text-gray-400 hover:text-rose-600"
                              title="Remove country"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlanDrawerOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="plan-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                {editingPlan ? "Save Plan Changes" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT CREDIT PACKAGE DRAWER ── */}
      {isCreditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingPackage ? `Edit Package: ${editingPackage.name}` : "Create Credit Package"}
                </h2>
                <p className="text-xs text-gray-500">Configure top-up credits pack, rate per credit, and currency</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form id="pkg-form" onSubmit={handleSavePackageSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="e.g. 1,000 Credits Pack"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country / Currency *</label>
                <select
                  value={packageForm.country}
                  onChange={(e) => {
                    const countryName = e.target.value;
                    const found = SUPPORTED_COUNTRIES.find((c) => c.country === countryName);
                    setPackageForm({
                      ...packageForm,
                      country: countryName,
                      currency: found ? found.currency : "USD",
                      currencySymbol: found ? found.symbol : "$",
                    });
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.country} ({c.currency} {c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Credits Included *</label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={packageForm.credits}
                    onChange={(e) => {
                      const creds = parseInt(e.target.value) || 0;
                      setPackageForm({
                        ...packageForm,
                        credits: creds,
                        totalPrice: parseFloat((creds * packageForm.pricePerCredit).toFixed(2)),
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price Per Credit</label>
                  <input
                    type="number"
                    step={0.001}
                    value={packageForm.pricePerCredit}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      setPackageForm({
                        ...packageForm,
                        pricePerCredit: rate,
                        totalPrice: parseFloat((packageForm.credits * rate).toFixed(2)),
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Total Price ({packageForm.currency}) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">{packageForm.currencySymbol}</span>
                  <input
                    type="number"
                    step={0.01}
                    value={packageForm.totalPrice}
                    onChange={(e) => setPackageForm({ ...packageForm, totalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge (Optional)</label>
                <input
                  type="text"
                  value={packageForm.badge || ""}
                  onChange={(e) => setPackageForm({ ...packageForm, badge: e.target.value })}
                  placeholder="e.g. Most Popular, Best Value, Quick Top-up"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageForm.isActive}
                    onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-900">Active (Visible in client top-up drawer)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageForm.isInternalStaffOnly}
                    onChange={(e) => setPackageForm({ ...packageForm, isInternalStaffOnly: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300"
                  />
                  <span className="text-xs font-bold text-amber-900">Internal Staff Only</span>
                </label>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreditDrawerOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="pkg-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                {editingPackage ? "Save Package" : "Create Package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
