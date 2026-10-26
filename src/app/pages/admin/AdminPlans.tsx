/**
 * AdminPlans.tsx
 * Path: src/app/pages/admin/AdminPlans.tsx
 *
 * Dedicated Admin Console for Plans, Credits, Team Member Pricing, Credit Actions, and Plan Assignment.
 * Implements PRD: MantraAssist Billing: Plans, Packs and Credit Deduction.
 * Admin owns Plan and Credit Package creation/editing (FR-1 through FR-15).
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
  Users,
  Activity,
  Workflow,
  FileText,
  FormInput,
  PhoneCall,
  MessageSquare,
  Mail,
  Zap,
  Save,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  IndustryPlan,
  CreditPackage,
  TeamMemberPack,
  GlobalBillingSettings,
  CreditAction,
  PlanLinkedTemplate,
  PlanTier,
  CountryPricing,
  getStoredPlans,
  clearAllStoredPlans,
  savePlan,
  deletePlan,
  getStoredCreditPackages,
  saveCreditPackage,
  deleteCreditPackage,
  getStoredTeamMemberPacks,
  saveTeamMemberPack,
  deleteTeamMemberPack,
  getStoredGlobalBillingSettings,
  saveGlobalBillingSettings,
  getStoredCreditActions,
  saveCreditAction,
  deleteCreditAction,
  getStoredSubscriptions,
  getWorkspaceSubscription,
  assignPlanToWorkspace,
  getAvailablePlansForWorkspace,
  AVAILABLE_PLAN_MODULES,
  PLAN_AVAILABLE_TEMPLATES,
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY_PRICING,
  PLANS_BILLING_CHANGED_EVENT,
} from "../../../lib/plansBillingStore";
import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";
import { TableComponent, TableColumn, TableRowAction } from "../../components/ui/TableComponent";
import { useOrganization } from "../../context/OrganizationContext";
import PageHeader from "../../components/layout/PageHeader";
import PageTopBar from "../../components/layout/PageTopBar";
import { AdminScopingRulesEditor } from "./components/AdminScopingRulesEditor";
import type { ScopingRule } from "../../context/FieldRegistryContext";

type AdminBillingTab = "plans" | "credit-pricing" | "team-pricing" | "credit-actions" | "assignment";

export default function AdminPlans() {
  const { organizations } = useOrganization();
  const [activeTab, setActiveTab] = useState<AdminBillingTab>("plans");

  // Stores
  const [plans, setPlans] = useState<IndustryPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [teamPacks, setTeamPacks] = useState<TeamMemberPack[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalBillingSettings>(getStoredGlobalBillingSettings());
  const [creditActions, setCreditActions] = useState<CreditAction[]>([]);
  const [subscriptions, setSubscriptions] = useState(getStoredSubscriptions());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive" | "Internal">("All");

  // Plan Drawer State
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IndustryPlan | null>(null);
  const [planDrawerTab, setPlanDrawerTab] = useState<"general" | "features" | "templates" | "pricing">("general");

  // Plan Form State (FR-1, FR-2, FR-3, FR-4)
  const [planForm, setPlanForm] = useState<Omit<IndustryPlan, "id" | "createdAt" | "updatedAt">>({
    name: "",
    tier: "Starter",
    targetCategory: "Global",
    scopingRules: [],
    description: "",
    includedSeats: 2, // FR-1
    monthlyCredits: 1000,
    yearlyCredits: 12000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: ["2 team members included", "1,000 voice & workflow credits", "AI Voice Receptionist"],
    modules: ["telephony", "clients", "appointments"],
    moduleFeatures: {
      telephony: ["24/7 AI Voice Answering Agent", "Inbound & Outbound Calling"],
      clients: ["Contact Management & History"],
      appointments: ["Online Booking Widget"],
    },
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [...DEFAULT_COUNTRY_PRICING],
  });
  const [rawFeaturesText, setRawFeaturesText] = useState("");

  // Template Tab Filter state inside Plan Drawer
  const [templateTypeFilter, setTemplateTypeFilter] = useState<"all" | "process" | "workflow" | "document" | "webform">("all");
  const [templateIndustryFilter, setTemplateIndustryFilter] = useState<string>("all");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Credit Package Drawer State
  const [isCreditDrawerOpen, setIsCreditDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);
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

  // Team Member Pack Drawer State
  const [isTeamPackDrawerOpen, setIsTeamPackDrawerOpen] = useState(false);
  const [editingTeamPack, setEditingTeamPack] = useState<TeamMemberPack | null>(null);
  const [teamPackForm, setTeamPackForm] = useState<Omit<TeamMemberPack, "id" | "createdAt">>({
    name: "",
    members: 5,
    totalPrice: 90,
    currencySymbol: "$",
    badge: "",
    isActive: true,
  });

  // Credit Action Edit Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<CreditAction | null>(null);
  const [actionForm, setActionForm] = useState<CreditAction>({
    id: "",
    name: "",
    unitLabel: "per unit",
    creditsDeducted: 1,
    linkedFeature: "Calls",
    description: "",
  });

  // Plan Assignment Modal State (FR-10)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const loadData = () => {
    setPlans(getStoredPlans());
    setCreditPackages(getStoredCreditPackages());
    setTeamPacks(getStoredTeamMemberPacks());
    setGlobalSettings(getStoredGlobalBillingSettings());
    setCreditActions(getStoredCreditActions());
    setSubscriptions(getStoredSubscriptions());
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
        (categoryFilter === "Global" &&
          (!p.scopingRules || p.scopingRules.length === 0 || p.targetCategory === "Global")) ||
        Boolean(p.scopingRules && p.scopingRules.some((r) => r.industryCategory?.toLowerCase() === categoryFilter.toLowerCase())) ||
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

  // Filtered Team Member Packs
  const filteredTeamPacks = useMemo(() => {
    if (!searchQuery.trim()) return teamPacks;
    const q = searchQuery.toLowerCase();
    return teamPacks.filter((p) => p.name.toLowerCase().includes(q) || String(p.members).includes(q));
  }, [teamPacks, searchQuery]);

  // Filtered Credit Actions
  const filteredCreditActions = useMemo(() => {
    if (!searchQuery.trim()) return creditActions;
    const q = searchQuery.toLowerCase();
    return creditActions.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.linkedFeature.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [creditActions, searchQuery]);

  // Filtered Templates in Plan Drawer
  const filteredDrawerTemplates = useMemo(() => {
    return PLAN_AVAILABLE_TEMPLATES.filter((tpl) => {
      const matchType = templateTypeFilter === "all" || tpl.type === templateTypeFilter;
      const matchIndustry =
        templateIndustryFilter === "all" ||
        tpl.industry === "All" ||
        tpl.industry.toLowerCase() === templateIndustryFilter.toLowerCase();
      const matchQuery =
        !templateSearchQuery.trim() ||
        tpl.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        tpl.industry.toLowerCase().includes(templateSearchQuery.toLowerCase());
      return matchType && matchIndustry && matchQuery;
    });
  }, [templateTypeFilter, templateIndustryFilter, templateSearchQuery]);

  // ── PLAN HANDLERS ──
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    const initialFeats = [
      "2 team members included",
      "1,000 Included Voice & Chat Credits / mo",
      "AI Voice Receptionist agent",
      "Multi-channel Chat & Call logs",
      "Automated Scheduling & Confirmations",
    ];
    setPlanForm({
      name: "",
      tier: "Starter",
      targetCategory: "Global",
      scopingRules: [],
      description: "",
      includedSeats: 2,
      monthlyCredits: 1000,
      yearlyCredits: 12000,
      isActive: true,
      isPopular: false,
      isInternalStaffOnly: false,
      features: initialFeats,
      modules: ["telephony", "clients", "appointments"],
      moduleFeatures: {
        telephony: ["24/7 AI Voice Answering Agent", "Inbound & Outbound Calling"],
        clients: ["Contact Management & History"],
        appointments: ["Online Booking Widget"],
      },
      linkedTemplates: [PLAN_AVAILABLE_TEMPLATES[0], PLAN_AVAILABLE_TEMPLATES[1]],
      linkedProcessTemplates: ["proc-1", "proc-2"],
      countryPricing: JSON.parse(JSON.stringify(DEFAULT_COUNTRY_PRICING)),
    });
    setRawFeaturesText(initialFeats.join(", "));
    setPlanDrawerTab("general");
    setIsPlanDrawerOpen(true);
  };

  const handleOpenEditPlan = (plan: IndustryPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      tier: plan.tier,
      targetCategory: plan.targetCategory,
      scopingRules: plan.scopingRules ? [...plan.scopingRules] : (plan.targetCategory && plan.targetCategory !== "Global" ? [{
        id: `rule_init_${Date.now()}`,
        industryCategory: plan.targetCategory,
        industries: [],
        locations: [],
      }] : []),
      description: plan.description,
      includedSeats: plan.includedSeats || 2,
      monthlyCredits: plan.monthlyCredits,
      yearlyCredits: plan.yearlyCredits,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      isInternalStaffOnly: plan.isInternalStaffOnly,
      features: [...plan.features],
      modules: plan.modules ? [...plan.modules] : ["telephony", "clients"],
      moduleFeatures: plan.moduleFeatures ? JSON.parse(JSON.stringify(plan.moduleFeatures)) : {},
      linkedTemplates: plan.linkedTemplates ? [...plan.linkedTemplates] : [],
      linkedProcessTemplates: [...plan.linkedProcessTemplates],
      countryPricing: JSON.parse(JSON.stringify(plan.countryPricing)),
    });
    setRawFeaturesText(plan.features.join(", "));
    setPlanDrawerTab("general");
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

    const primaryCat = (!planForm.scopingRules || planForm.scopingRules.length === 0) ? "Global" : (planForm.scopingRules[0]?.industryCategory || "Global");
    const planToSave: IndustryPlan = {
      ...planForm,
      targetCategory: primaryCat,
      scopingRules: planForm.scopingRules || [],
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

  // Sync features raw text and list (FR-3)
  const handleRawFeaturesChange = (raw: string) => {
    setRawFeaturesText(raw);
    const parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
    setPlanForm((prev) => ({ ...prev, features: parsed.length ? parsed : [""] }));
  };

  const handleFeatureItemChange = (index: number, val: string) => {
    const next = [...planForm.features];
    next[index] = val;
    setPlanForm((prev) => ({ ...prev, features: next }));
    setRawFeaturesText(next.filter(Boolean).join(", "));
  };

  const handleAddFeatureItem = () => {
    const next = [...planForm.features, ""];
    setPlanForm((prev) => ({ ...prev, features: next }));
  };

  const handleRemoveFeatureItem = (index: number) => {
    const next = planForm.features.filter((_, i) => i !== index);
    setPlanForm((prev) => ({ ...prev, features: next.length ? next : [""] }));
    setRawFeaturesText(next.filter(Boolean).join(", "));
  };

  // Module toggle (FR-2)
  const handleToggleModule = (moduleId: string) => {
    setPlanForm((prev) => {
      const currentModules = prev.modules || [];
      const hasModule = currentModules.includes(moduleId);
      const nextModules = hasModule ? currentModules.filter((m) => m !== moduleId) : [...currentModules, moduleId];

      const nextModuleFeatures = { ...(prev.moduleFeatures || {}) };
      if (hasModule) {
        delete nextModuleFeatures[moduleId];
      } else {
        const found = AVAILABLE_PLAN_MODULES.find((m) => m.id === moduleId);
        if (found) {
          nextModuleFeatures[moduleId] = [...found.features];
        }
      }
      return { ...prev, modules: nextModules, moduleFeatures: nextModuleFeatures };
    });
  };

  const handleToggleModuleFeature = (moduleId: string, featureName: string) => {
    setPlanForm((prev) => {
      const currentFeats = prev.moduleFeatures?.[moduleId] || [];
      const hasFeat = currentFeats.includes(featureName);
      const nextFeats = hasFeat ? currentFeats.filter((f) => f !== featureName) : [...currentFeats, featureName];
      return {
        ...prev,
        moduleFeatures: {
          ...(prev.moduleFeatures || {}),
          [moduleId]: nextFeats,
        },
      };
    });
  };

  // Template toggle (FR-4)
  const handleToggleTemplate = (template: PlanLinkedTemplate) => {
    setPlanForm((prev) => {
      const current = prev.linkedTemplates || [];
      const exists = current.some((t) => t.id === template.id);
      const next = exists ? current.filter((t) => t.id !== template.id) : [...current, template];
      return { ...prev, linkedTemplates: next };
    });
  };

  const handleSelectAllMatchingTemplates = () => {
    setPlanForm((prev) => {
      const current = prev.linkedTemplates || [];
      const newItems = filteredDrawerTemplates.filter((ft) => !current.some((c) => c.id === ft.id));
      return { ...prev, linkedTemplates: [...current, ...newItems] };
    });
    toast.success(`Attached ${filteredDrawerTemplates.length} matching templates`);
  };

  // Country pricing helper
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

  // ── CREDIT PACKAGE HANDLERS (FR-6) ──
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageForm({
      name: "",
      credits: 1000,
      pricePerCredit: globalSettings.defaultPricePerCredit,
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

  // ── TEAM MEMBER PACK HANDLERS (FR-8) ──
  const handleOpenCreateTeamPack = () => {
    setEditingTeamPack(null);
    setTeamPackForm({
      name: "",
      members: 5,
      totalPrice: 90,
      currencySymbol: "$",
      badge: "Most Popular",
      isActive: true,
    });
    setIsTeamPackDrawerOpen(true);
  };

  const handleOpenEditTeamPack = (pack: TeamMemberPack) => {
    setEditingTeamPack(pack);
    setTeamPackForm({
      name: pack.name,
      members: pack.members,
      totalPrice: pack.totalPrice,
      currencySymbol: pack.currencySymbol,
      badge: pack.badge || "",
      isActive: pack.isActive,
    });
    setIsTeamPackDrawerOpen(true);
  };

  const handleSaveTeamPackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamPackForm.name.trim()) {
      toast.error("Please enter a pack name");
      return;
    }

    const packToSave: TeamMemberPack = {
      ...teamPackForm,
      id: editingTeamPack ? editingTeamPack.id : `team-pack-${Date.now()}`,
      createdAt: editingTeamPack ? editingTeamPack.createdAt : new Date().toISOString(),
    };

    saveTeamMemberPack(packToSave);
    setIsTeamPackDrawerOpen(false);
    toast.success(editingTeamPack ? `Team Pack "${packToSave.name}" updated ✓` : `Team Pack "${packToSave.name}" created ✓`);
  };

  const handleDeleteTeamPackConfirm = (id: string, name: string) => {
    if (confirm(`Delete team member pack "${name}"?`)) {
      deleteTeamMemberPack(id);
      toast.success(`Pack "${name}" deleted`);
    }
  };

  // ── CREDIT ACTIONS HANDLERS (FR-13) ──
  const handleOpenEditAction = (action: CreditAction) => {
    setEditingAction(action);
    setActionForm({ ...action });
    setIsActionModalOpen(true);
  };

  const handleSaveActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.name.trim()) {
      toast.error("Action name is required");
      return;
    }
    saveCreditAction(actionForm);
    setIsActionModalOpen(false);
    toast.success(`Credit rate for "${actionForm.name}" updated ✓`);
  };

  // ── PLAN ASSIGNMENT HANDLERS (FR-10) ──
  const selectedOrg = useMemo(() => {
    return organizations.find((o) => o.id === selectedOrgId) || organizations[0];
  }, [organizations, selectedOrgId]);

  const availablePlansForSelectedOrg = useMemo(() => {
    if (!selectedOrg) return [];
    return getAvailablePlansForWorkspace(plans, {
      industryCategory: selectedOrg.industryCategory,
      industry: selectedOrg.industry,
      country: selectedOrg.country || selectedOrg.location || "United States",
    });
  }, [plans, selectedOrg]);

  const handleOpenAssignModal = (orgId?: string) => {
    const targetOrgId = orgId || organizations[0]?.id || "demo";
    setSelectedOrgId(targetOrgId);
    const org = organizations.find((o) => o.id === targetOrgId) || organizations[0];
    const available = org
      ? getAvailablePlansForWorkspace(plans, {
          industryCategory: org.industryCategory,
          industry: org.industry,
          country: org.country || org.location || "United States",
        })
      : [];
    const sub = getWorkspaceSubscription(targetOrgId);
    const hasExistingAvailable = available.some((a) => a.plan.id === sub.planId);
    setSelectedPlanId(hasExistingAvailable ? sub.planId : (available[0]?.plan.id || ""));
    setSelectedBillingCycle(sub.billingCycle || "monthly");
    setIsAssignModalOpen(true);
  };

  const handleAssignPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !selectedPlanId) {
      toast.error("Please select both an organisation and an available plan");
      return;
    }
    const targetOrg = organizations.find((o) => o.id === selectedOrgId);
    const currency = targetOrg?.currency || "USD";
    const updated = assignPlanToWorkspace(selectedOrgId, selectedPlanId, selectedBillingCycle, currency);
    setSubscriptions(getStoredSubscriptions());
    setIsAssignModalOpen(false);
    toast.success(`Assigned plan "${updated.planName}" to organization! ✓`);
  };

  // ── GLOBAL SETTINGS UPDATE (FR-5, FR-8) ──
  const handleSaveGlobalPricing = (newPricePerCredit: number, newPricePerMember: number) => {
    const updated: GlobalBillingSettings = {
      ...globalSettings,
      defaultPricePerCredit: newPricePerCredit,
      defaultPricePerExtraMember: newPricePerMember,
    };
    saveGlobalBillingSettings(updated);
    setGlobalSettings(updated);
    toast.success("Global billing unit prices updated ✓");
  };

  // ── TABLE COLUMNS: PLANS ──
  const planColumns: TableColumn<IndustryPlan>[] = useMemo(
    () => [
      {
        id: "name",
        header: "PLAN NAME",
        align: "left",
        width: "22%",
        render: (plan) => (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span
              onClick={() => handleOpenEditPlan(plan)}
              className="font-semibold text-gray-900 text-xs sm:text-[13px] hover:text-blue-600 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {plan.name}
            </span>
          </div>
        ),
      },
      {
        id: "tier",
        header: "TIER",
        align: "left",
        width: "10%",
        render: (plan) => {
          const t = (plan.tier || "").toUpperCase();
          const colorClass =
            t === "CUSTOM"
              ? "bg-amber-100/70 text-amber-700 border-amber-200"
              : t === "PROFESSIONAL"
              ? "bg-indigo-100/70 text-indigo-700 border-indigo-200"
              : "bg-blue-100/70 text-blue-700 border-blue-200";
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border uppercase ${colorClass}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {t || "STARTER"}
            </span>
          );
        },
      },
      {
        id: "category",
        header: "ADMIN SCOPE",
        align: "left",
        width: "18%",
        render: (plan) => {
          const rules = plan.scopingRules || [];
          if (rules.length === 0 && (!plan.targetCategory || plan.targetCategory === "Global")) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                <Globe className="w-3 h-3 text-gray-500" />
                <span>All Orgs (Global)</span>
              </span>
            );
          }

          const categories = rules.length > 0
            ? Array.from(new Set(rules.map((r) => r.industryCategory || "Global")))
            : [plan.targetCategory];

          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.slice(0, 2).map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                >
                  <Globe className="w-2.5 h-2.5 text-blue-500" />
                  <span>{cat}</span>
                </span>
              ))}
              {categories.length > 2 && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  +{categories.length - 2}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "seats",
        header: "INCLUDED SEATS (FR-1)",
        align: "left",
        width: "14%",
        render: (plan) => (
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{plan.includedSeats || 2} Seats</span>
          </div>
        ),
      },
      {
        id: "includedCredits",
        header: "INCLUDED CREDITS",
        align: "left",
        width: "14%",
        render: (plan) => (
          <div className="flex flex-col text-xs leading-snug">
            <span className="font-bold text-gray-900">
              {(plan.monthlyCredits || 0).toLocaleString()} / mo
            </span>
            <span className="text-[11px] text-gray-400">
              {(plan.yearlyCredits || 0).toLocaleString()} / yr
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "STATUS",
        align: "left",
        width: "10%",
        render: (plan) => {
          if (plan.isInternalStaffOnly) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Staff Only
              </span>
            );
          }
          if (plan.isActive) {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Inactive
            </span>
          );
        },
      },
    ],
    []
  );

  const planRowActions: TableRowAction<IndustryPlan>[] = useMemo(
    () => [
      {
        label: "Edit Plan",
        icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (plan) => handleOpenEditPlan(plan),
      },
      {
        label: "Duplicate Plan",
        icon: <Copy className="w-3.5 h-3.5 text-gray-600" />,
        onClick: (plan) => handleDuplicatePlan(plan),
      },
      {
        label: "Toggle Active",
        icon: <Eye className="w-3.5 h-3.5 text-gray-600" />,
        onClick: (plan) => handleTogglePlanActive(plan),
      },
      {
        label: "Delete Plan",
        icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
        isDanger: true,
        onClick: (plan) => handleDeletePlanConfirm(plan.id, plan.name),
      },
    ],
    []
  );

  // ── TABLE COLUMNS: CREDIT PACKS ──
  const packageColumns: TableColumn<CreditPackage>[] = useMemo(
    () => [
      {
        id: "name",
        header: "PACKAGE NAME",
        align: "left",
        width: "24%",
        render: (pkg) => (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => handleOpenEditPackage(pkg)}
                className="font-semibold text-gray-900 text-xs sm:text-[13px] hover:text-blue-600 transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {pkg.name}
              </span>
              {pkg.badge && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                  {pkg.badge}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "country",
        header: "COUNTRY / CURRENCY",
        align: "left",
        width: "20%",
        render: (pkg) => (
          <span className="text-xs text-gray-700 font-medium">
            {pkg.country} ({pkg.currency})
          </span>
        ),
      },
      {
        id: "credits",
        header: "INCLUDED CREDITS",
        align: "left",
        width: "18%",
        render: (pkg) => (
          <span className="font-bold text-gray-900 text-xs">
            +{pkg.credits.toLocaleString()} credits
          </span>
        ),
      },
      {
        id: "totalPrice",
        header: "PACK COST (FIXED)",
        align: "left",
        width: "18%",
        render: (pkg) => (
          <span className="font-bold text-gray-900 text-xs font-mono">
            {pkg.currencySymbol}{pkg.totalPrice.toLocaleString()}
          </span>
        ),
      },
      {
        id: "status",
        header: "STATUS",
        align: "left",
        width: "10%",
        render: (pkg) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              pkg.isActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
            {pkg.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    []
  );

  const packageRowActions: TableRowAction<CreditPackage>[] = useMemo(
    () => [
      {
        label: "Edit Package",
        icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (pkg) => handleOpenEditPackage(pkg),
      },
      {
        label: "Delete Package",
        icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
        isDanger: true,
        onClick: (pkg) => handleDeletePackageConfirm(pkg.id, pkg.name),
      },
    ],
    []
  );

  // ── TABLE COLUMNS: TEAM MEMBER PACKS ──
  const teamPackColumns: TableColumn<TeamMemberPack>[] = useMemo(
    () => [
      {
        id: "name",
        header: "PACK NAME",
        align: "left",
        width: "30%",
        render: (pack) => (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => handleOpenEditTeamPack(pack)}
                className="font-semibold text-gray-900 text-xs sm:text-[13px] hover:text-blue-600 transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {pack.name}
              </span>
              {pack.badge && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-full">
                  {pack.badge}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "members",
        header: "EXTRA SEATS",
        align: "left",
        width: "20%",
        render: (pack) => (
          <span className="font-bold text-gray-900 text-xs">
            +{pack.members} Team Members
          </span>
        ),
      },
      {
        id: "price",
        header: "PACK COST",
        align: "left",
        width: "20%",
        render: (pack) => (
          <span className="font-bold text-gray-900 text-xs font-mono">
            {pack.currencySymbol}{pack.totalPrice.toLocaleString()} / mo
          </span>
        ),
      },
      {
        id: "status",
        header: "STATUS",
        align: "left",
        width: "15%",
        render: (pack) => (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              pack.isActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pack.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
            {pack.isActive ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    []
  );

  const teamPackRowActions: TableRowAction<TeamMemberPack>[] = useMemo(
    () => [
      {
        label: "Edit Pack",
        icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (p) => handleOpenEditTeamPack(p),
      },
      {
        label: "Delete Pack",
        icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
        isDanger: true,
        onClick: (p) => handleDeleteTeamPackConfirm(p.id, p.name),
      },
    ],
    []
  );

  // ── TABLE COLUMNS: CREDIT ACTIONS (FR-13) ──
  const actionColumns: TableColumn<CreditAction>[] = useMemo(
    () => [
      {
        id: "name",
        header: "ACTION EVENT",
        align: "left",
        width: "35%",
        render: (act) => (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <p
                onClick={() => handleOpenEditAction(act)}
                className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {act.name}
              </p>
              {act.description && <p className="text-[11px] text-gray-500 line-clamp-1">{act.description}</p>}
            </div>
          </div>
        ),
      },
      {
        id: "linkedFeature",
        header: "LINKED FEATURE (FR-15)",
        align: "left",
        width: "20%",
        render: (act) => {
          const colors: Record<string, string> = {
            Calls: "bg-blue-50 text-blue-700 border-blue-200",
            SMS: "bg-emerald-50 text-emerald-700 border-emerald-200",
            Email: "bg-indigo-50 text-indigo-700 border-indigo-200",
            Workflows: "bg-purple-50 text-purple-700 border-purple-200",
            "AI Scribe": "bg-amber-50 text-amber-700 border-amber-200",
          };
          return (
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                colors[act.linkedFeature] || "bg-gray-100 text-gray-700"
              }`}
            >
              {act.linkedFeature}
            </span>
          );
        },
      },
      {
        id: "unitLabel",
        header: "UNIT BASIS",
        align: "left",
        width: "20%",
        render: (act) => <span className="text-xs text-gray-600 font-medium">{act.unitLabel}</span>,
      },
      {
        id: "creditsDeducted",
        header: "CREDITS DEDUCTED (FR-13)",
        align: "left",
        width: "20%",
        render: (act) => (
          <span className="inline-flex items-center gap-1 text-xs font-black text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <Coins className="w-3 h-3 text-amber-500" />
            <span>{act.creditsDeducted} credit{act.creditsDeducted > 1 ? "s" : ""}</span>
          </span>
        ),
      },
    ],
    []
  );

  const actionRowActions: TableRowAction<CreditAction>[] = useMemo(
    () => [
      {
        label: "Edit Rate",
        icon: <Edit2 className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (act) => handleOpenEditAction(act),
      },
    ],
    []
  );

  // ── TABLE COLUMNS: PLAN ASSIGNMENT (FR-10) ──
  interface OrgAssignmentRow {
    orgId: string;
    orgName: string;
    industry: string;
    planName: string;
    tier: string;
    billingCycle: string;
    seatsTotal: number;
    creditsTotal: number;
    status: string;
    hasPlan: boolean;
  }

  const assignmentRows: OrgAssignmentRow[] = useMemo(() => {
    return organizations.map((org) => {
      const sub = getWorkspaceSubscription(org.id);
      const hasPlan = Boolean(sub.planId && sub.planName && sub.planName !== "No Plan Assigned");
      return {
        orgId: org.id,
        orgName: org.name,
        industry: org.industryCategory || "General",
        planName: hasPlan ? sub.planName : "No Plan Assigned",
        tier: hasPlan ? sub.tier : "—",
        billingCycle: hasPlan ? sub.billingCycle : "—",
        seatsTotal: hasPlan ? (sub.includedSeats || 0) + (sub.extraSeatsPurchased || 0) : 0,
        creditsTotal: hasPlan ? sub.totalCredits : 0,
        status: hasPlan ? (sub.status || "Active") : "Unassigned",
        hasPlan,
      };
    });
  }, [organizations, subscriptions]);

  const filteredAssignmentRows = useMemo(() => {
    if (!searchQuery.trim()) return assignmentRows;
    const q = searchQuery.toLowerCase();
    return assignmentRows.filter(
      (r) =>
        r.orgName.toLowerCase().includes(q) ||
        r.industry.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
    );
  }, [assignmentRows, searchQuery]);

  const assignmentColumns: TableColumn<OrgAssignmentRow>[] = useMemo(
    () => [
      {
        id: "orgName",
        header: "ORGANISATION",
        align: "left",
        width: "25%",
        render: (row) => (
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{row.orgName}</p>
              <p className="text-[11px] text-gray-500">{row.industry}</p>
            </div>
          </div>
        ),
      },
      {
        id: "planName",
        header: "ACTIVE PLAN (FR-10)",
        align: "left",
        width: "25%",
        render: (row) =>
          row.hasPlan ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-blue-600">{row.planName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase font-semibold">
                {row.tier}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic font-medium">No Plan Assigned</span>
          ),
      },
      {
        id: "billingCycle",
        header: "BILLING CYCLE",
        align: "left",
        width: "15%",
        render: (row) => (
          <span className="text-xs capitalize font-medium text-gray-700">
            {row.hasPlan ? row.billingCycle : "—"}
          </span>
        ),
      },
      {
        id: "seatsTotal",
        header: "ALLOWED SEATS",
        align: "left",
        width: "15%",
        render: (row) => (
          <span className="text-xs font-bold text-gray-800">
            {row.hasPlan ? `${row.seatsTotal} members` : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "STATUS",
        align: "left",
        width: "10%",
        render: (row) =>
          row.hasPlan ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {row.status}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Unassigned
            </span>
          ),
      },
    ],
    []
  );

  const assignmentRowActions: TableRowAction<OrgAssignmentRow>[] = useMemo(
    () => [
      {
        label: "Assign Plan",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />,
        onClick: (row) => handleOpenAssignModal(row.orgId),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-10 sm:px-12 py-7.5 sm:py-8 w-full space-y-7 animate-in fade-in duration-200">
        {/* Top Header - Portals directly into the topbar */}
        <PageHeader
          title="Plans & Credits"
          subtitle="Admin control console for subscription tiers, included quotas, add-on packs, credit actions, and plan assignment (PRD FR-1 to FR-15)."
        />

        {/* Action Bar powered by PageTopBar with sub-navigation modes, search, and quick actions */}
        <PageTopBar
          modes={[
            { id: "plans", label: "Industry Plans", icon: <CreditCard className="w-3.5 h-3.5" /> },
            { id: "credit-pricing", label: "Credit Packs & Pricing", icon: <Coins className="w-3.5 h-3.5" /> },
            { id: "team-pricing", label: "Team Member Pricing", icon: <Users className="w-3.5 h-3.5" /> },
            { id: "credit-actions", label: "Credit Actions (FR-13)", icon: <Zap className="w-3.5 h-3.5" /> },
            { id: "assignment", label: "Plan Assignment (FR-10)", icon: <Building2 className="w-3.5 h-3.5" /> },
          ]}
          activeMode={activeTab}
          onModeChange={(m) => {
            setActiveTab(m as AdminBillingTab);
            setSearchQuery("");
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTab === "plans"
              ? "Search plans by name or admin scope..."
              : activeTab === "credit-pricing"
              ? "Search credit packs..."
              : activeTab === "team-pricing"
              ? "Search team member packs..."
              : activeTab === "credit-actions"
              ? "Search credit action items..."
              : "Search organizations or plans..."
          }
          secondaryActions={
            activeTab === "plans" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="h-[36px] pl-3 pr-7 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 appearance-none"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="All">All Tiers</option>
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-[36px] pl-3 pr-7 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none cursor-pointer shadow-2xs hover:border-gray-300 appearance-none"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="All">All Scopes</option>
                    <option value="Global">Global</option>
                    {INITIAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {plans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete all plans?")) {
                        clearAllStoredPlans();
                        setPlans([]);
                        toast.success("All plans deleted ✓");
                      }
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Delete All
                  </button>
                )}
              </div>
            ) : undefined
          }
          primaryAction={
            activeTab === "plans"
              ? {
                  label: "Create Industry Plan",
                  icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
                  onClick: handleOpenCreatePlan,
                }
              : activeTab === "credit-pricing"
              ? {
                  label: "Create Credit Pack",
                  icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
                  onClick: handleOpenCreatePackage,
                }
              : activeTab === "team-pricing"
              ? {
                  label: "Create Team Pack",
                  icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
                  onClick: handleOpenCreateTeamPack,
                }
              : activeTab === "assignment"
              ? {
                  label: "Assign Plan",
                  icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                  onClick: () => handleOpenAssignModal(),
                }
              : undefined
          }
        />

        {/* ── TAB 1: INDUSTRY PLANS ── */}
        {activeTab === "plans" && (
          <div className="space-y-4">
            {/* Plans Table */}
            <TableComponent<IndustryPlan>
              data={filteredPlans}
              columns={planColumns}
              getRowId={(p) => p.id}
              rowActions={planRowActions}
              actionIcon="menu"
              enableSelection={false}
              enableColumnCustomization={true}
              defaultRowsPerPage={20}
              pageSizeOptions={[20, 50, 100]}
              emptyMessage="No industry plans found matching criteria."
              tableId="admin-industry-plans-table"
            />
          </div>
        )}

        {/* ── TAB 2: CREDIT PACKS & PRICING (FR-5, FR-6) ── */}
        {activeTab === "credit-pricing" && (
          <div className="space-y-6">
            {/* Global Per-Credit Price Card (FR-5) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    FR-5 Base Rate
                  </span>
                  <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Price Per Custom Credit
                  </h3>
                </div>
                <p className="text-xs text-gray-500 max-w-xl">
                  The admin sets one cost per credit. It is the base unit price charged whenever a customer purchases a custom number of credits (e.g. 2,500 credits × $0.05 = $125).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-sm font-bold text-gray-700">{globalSettings.currencySymbol}</span>
                  <input
                    type="number"
                    step={0.005}
                    min={0.001}
                    value={globalSettings.defaultPricePerCredit}
                    onChange={(e) =>
                      handleSaveGlobalPricing(parseFloat(e.target.value) || 0.05, globalSettings.defaultPricePerExtraMember)
                    }
                    className="w-20 bg-transparent text-sm font-bold text-gray-900 outline-none font-mono"
                  />
                  <span className="text-xs text-gray-400">/ credit</span>
                </div>
              </div>
            </div>

            {/* Credit Packs Table (FR-6) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Predefined Credit Packs (FR-6)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Fixed credit bundles offered to clients next to the custom credit input. A pack cost does not have to equal credits × price per credit.
                  </p>
                </div>
              </div>

              <TableComponent<CreditPackage>
                data={filteredPackages}
                columns={packageColumns}
                getRowId={(pkg) => pkg.id}
                rowActions={packageRowActions}
                actionIcon="menu"
                enableSelection={false}
                defaultRowsPerPage={20}
                emptyMessage="No credit packs created yet."
                tableId="admin-credit-packages-table"
              />
            </div>
          </div>
        )}

        {/* ── TAB 3: TEAM MEMBER PRICING (FR-8, FR-9) ── */}
        {activeTab === "team-pricing" && (
          <div className="space-y-6">
            {/* Global Per-Member Rate Card (FR-8) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    FR-8 Base Rate
                  </span>
                  <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Cost Per Extra Team Member
                  </h3>
                </div>
                <p className="text-xs text-gray-500 max-w-xl">
                  Base monthly price charged whenever a customer adds custom individual seats beyond the plan&apos;s included team members (e.g. 3 extra members × $20 = $60/mo).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <span className="text-sm font-bold text-gray-700">{globalSettings.currencySymbol}</span>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    value={globalSettings.defaultPricePerExtraMember}
                    onChange={(e) =>
                      handleSaveGlobalPricing(globalSettings.defaultPricePerCredit, parseFloat(e.target.value) || 20)
                    }
                    className="w-20 bg-transparent text-sm font-bold text-gray-900 outline-none font-mono"
                  />
                  <span className="text-xs text-gray-400">/ member / mo</span>
                </div>
              </div>
            </div>

            {/* Team Member Packs Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Predefined Team Member Packs (FR-8)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Fixed team member bundles (e.g. 5 members for $90) offering volume discounts for scaling organizations.
                  </p>
                </div>
              </div>

              <TableComponent<TeamMemberPack>
                data={filteredTeamPacks}
                columns={teamPackColumns}
                getRowId={(p) => p.id}
                rowActions={teamPackRowActions}
                actionIcon="menu"
                enableSelection={false}
                defaultRowsPerPage={20}
                emptyMessage="No team member packs configured."
                tableId="admin-team-packs-table"
              />
            </div>
          </div>
        )}

        {/* ── TAB 4: CREDIT ACTIONS (FR-13) ── */}
        {activeTab === "credit-actions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Credit Deduction Actions &amp; Unit Rates (FR-13)
                </h3>
                <p className="text-xs text-gray-500">
                  Every action that consumes credits in MantraAssist. Modifying rates here immediately drives modular credit deduction across calls, SMS, workflows, and AI scribe.
                </p>
              </div>
            </div>

            <TableComponent<CreditAction>
              data={filteredCreditActions}
              columns={actionColumns}
              getRowId={(act) => act.id}
              rowActions={actionRowActions}
              actionIcon="menu"
              enableSelection={false}
              defaultRowsPerPage={20}
              emptyMessage="No credit actions found."
              tableId="admin-credit-actions-table"
            />
          </div>
        )}

        {/* ── TAB 5: PLAN ASSIGNMENT (FR-10) ── */}
        {activeTab === "assignment" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Active Workspace Plan Assignments (FR-10)
                </h3>
                <p className="text-xs text-gray-500">
                  Admins can assign any industry plan to any organisation. The assigned plan instantly becomes that organisation&apos;s active plan on the client side.
                </p>
              </div>
            </div>

            <TableComponent<OrgAssignmentRow>
              data={filteredAssignmentRows}
              columns={assignmentColumns}
              getRowId={(row) => row.orgId}
              rowActions={assignmentRowActions}
              actionIcon="menu"
              enableSelection={false}
              defaultRowsPerPage={20}
              emptyMessage="No organizations found."
              tableId="admin-plan-assignments-table"
            />
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT PLAN DRAWER (4 TABS) ── */}
      {isPlanDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 shrink-0 bg-gray-50/70">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create Industry Plan"}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configure seats, admin scope, modules, templates, features text, and country pricing matrix.
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

              {/* 4 Tabs Navigation */}
              <div className="flex gap-2 border-b border-gray-200 pb-1">
                {[
                  { id: "general", label: "1. General & Quotas" },
                  { id: "features", label: "2. Modules & Features (FR-2)" },
                  { id: "templates", label: "3. Templates (FR-4)" },
                  { id: "pricing", label: "4. Country Pricing" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPlanDrawerTab(t.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      planDrawerTab === t.id
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form id="plan-form" onSubmit={handleSavePlanSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: General & Quotas */}
              {planDrawerTab === "general" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Plan Name *</label>
                      <input
                        type="text"
                        required
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        placeholder="e.g. Starter Health Suite"
                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm"
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

                    {/* Admin Scope Rules (Unified Admin Scope System) */}
                    <div className="sm:col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-800">
                          Admin Scope *
                        </label>
                        <span className="text-[11px] font-semibold text-gray-500">
                          {(!planForm.scopingRules || planForm.scopingRules.length === 0)
                            ? "Universal (Global) · Visible to all workspaces"
                            : `${planForm.scopingRules.length} Rule${planForm.scopingRules.length > 1 ? "s" : ""} Active`}
                        </span>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-3 bg-white shadow-2xs">
                        <AdminScopingRulesEditor
                          rules={planForm.scopingRules || []}
                          onChange={(rules) => {
                            const primaryCat = rules[0]?.industryCategory || "Global";
                            setPlanForm({
                              ...planForm,
                              scopingRules: rules,
                              targetCategory: rules.length === 0 ? "Global" : primaryCat,
                            });
                          }}
                          showHeader={true}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {(!planForm.scopingRules || planForm.scopingRules.length === 0)
                          ? "Universal Admin Scope: available to all tenant workspaces worldwide"
                          : `Restricted Admin Scope: dynamically provisioned to tenant workspaces matching ${planForm.scopingRules.length} rule${planForm.scopingRules.length > 1 ? "s" : ""}.`}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={planForm.description}
                        onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                        placeholder="Short summary of this tier's target audience and benefits..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  {/* Quotas Section: Included Seats + Credits (FR-1) */}
                  <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Included Quotas &amp; Capacity</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* FR-1: Number of Seats */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Included Seats (Team Members) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={planForm.includedSeats || 2}
                          onChange={(e) =>
                            setPlanForm({ ...planForm, includedSeats: parseInt(e.target.value) || 1 })
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-blue-600"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Allowed with plan at no extra charge</p>
                      </div>

                      {/* Monthly Credits */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Monthly Credits *</label>
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
                        <p className="text-[11px] text-gray-500 mt-1">Renewed every month</p>
                      </div>

                      {/* Yearly Credits */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Yearly Credits *</label>
                        <input
                          type="number"
                          min={0}
                          value={planForm.yearlyCredits}
                          onChange={(e) =>
                            setPlanForm({ ...planForm, yearlyCredits: parseInt(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Annual included block</p>
                      </div>
                    </div>
                  </div>

                  {/* Visibility & Status Flags */}
                  <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Flags</h4>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isActive}
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs font-bold text-gray-900">Active (Visible to organizations)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isPopular}
                        onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-xs font-bold text-gray-900">Highlight as Popular (Ribbon on pricing card)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isInternalStaffOnly}
                        onChange={(e) => setPlanForm({ ...planForm, isInternalStaffOnly: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded border-gray-300"
                      />
                      <span className="text-xs font-bold text-amber-900">Internal / Staff Only (Hidden from client apps)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Modules & Features (FR-2 & FR-3) */}
              {planDrawerTab === "features" && (
                <div className="space-y-6">
                  {/* FR-2: Modules and features assignment */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>Assign Modules &amp; Module Features (FR-2)</span>
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Controls functional system access. An organisation with this plan only gets access to checked modules and features.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {AVAILABLE_PLAN_MODULES.map((mod) => {
                        const isAssigned = (planForm.modules || []).includes(mod.id);
                        const assignedFeats = planForm.moduleFeatures?.[mod.id] || [];

                        return (
                          <div
                            key={mod.id}
                            className={`border rounded-xl p-3 transition-colors ${
                              isAssigned ? "bg-white border-blue-200 shadow-2xs" : "bg-gray-50 border-gray-200 opacity-80"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => handleToggleModule(mod.id)}
                                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                                />
                                <span className="text-xs font-bold text-gray-900">{mod.name}</span>
                              </label>
                              <span className="text-[10px] font-semibold text-gray-500">
                                {isAssigned ? `${assignedFeats.length}/${mod.features.length} enabled` : "Disabled"}
                              </span>
                            </div>

                            {/* Features under module */}
                            {isAssigned && (
                              <div className="mt-3 pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                {mod.features.map((featName) => {
                                  const isChecked = assignedFeats.includes(featName);
                                  return (
                                    <label key={featName} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleModuleFeature(mod.id, featName)}
                                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                                      />
                                      <span className={isChecked ? "font-medium text-gray-900" : "text-gray-500"}>
                                        {featName}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* FR-3: Plan Display Text */}
                  <div className="space-y-3 pt-3 border-t border-gray-200">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span>Plan Display Content (FR-3)</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        The readable marketing text shown on the client card. Adding one-by-one and editing the raw comma-separated list stay in sync.
                      </p>
                    </div>

                    {/* Raw comma separated list */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Raw Comma-Separated List (Syncs automatically)
                      </label>
                      <textarea
                        rows={2}
                        value={rawFeaturesText}
                        onChange={(e) => handleRawFeaturesChange(e.target.value)}
                        placeholder="e.g. 2 team members, 1,000 credits/mo, 24/7 AI Receptionist"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                      />
                    </div>

                    {/* One-by-one feature adder */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">Feature Items Checklist</span>
                        <button
                          type="button"
                          onClick={handleAddFeatureItem}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          + Add Line Item
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {planForm.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feat}
                              onChange={(e) => handleFeatureItemChange(idx, e.target.value)}
                              placeholder={`Feature #${idx + 1}`}
                              className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFeatureItem(idx)}
                              className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Templates (FR-4) */}
              {planDrawerTab === "templates" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <Workflow className="w-4 h-4 text-indigo-600" />
                        <span>Provisioned Industry Templates (FR-4)</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Attach process, workflow, document, and web form templates provisioned automatically with this plan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAllMatchingTemplates}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer self-start sm:self-auto"
                    >
                      Select All Matching ({filteredDrawerTemplates.length})
                    </button>
                  </div>

                  {/* Filter by Type & Industry */}
                  <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <select
                      value={templateTypeFilter}
                      onChange={(e) => setTemplateTypeFilter(e.target.value as any)}
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-lg outline-none"
                    >
                      <option value="all">All Types</option>
                      <option value="process">Processes</option>
                      <option value="workflow">Workflows</option>
                      <option value="document">Documents</option>
                      <option value="webform">Web Forms</option>
                    </select>

                    <select
                      value={templateIndustryFilter}
                      onChange={(e) => setTemplateIndustryFilter(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-gray-200 rounded-lg outline-none"
                    >
                      <option value="all">All Industries</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="IT/Tech">IT/Tech</option>
                      <option value="Wellness & Lifestyle">Wellness &amp; Lifestyle</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search template name..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg outline-none"
                    />
                  </div>

                  {/* Templates List */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {filteredDrawerTemplates.map((tpl) => {
                      const isSelected = (planForm.linkedTemplates || []).some((t) => t.id === tpl.id);
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => handleToggleTemplate(tpl)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900">{tpl.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                  {tpl.type}
                                </span>
                                <span className="text-[10px] text-gray-400">Industry: {tpl.industry}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: Country Pricing */}
              {planDrawerTab === "pricing" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>Country Pricing Matrix</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Configure pricing in each supported country. Workspaces automatically see pricing matching their localized currency.
                      </p>
                    </div>

                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCountryPrice(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-bold border border-blue-300 text-blue-700 rounded-lg bg-blue-50"
                    >
                      <option value="">+ Add Country Rate</option>
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
                                <span className="text-gray-500 font-bold">{cp.currencySymbol}</span>
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
                                <span className="text-gray-500 font-bold">{cp.currencySymbol}</span>
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
                                className="text-gray-400 hover:text-rose-600 cursor-pointer"
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
              )}
            </form>

            {/* Drawer Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-gray-500 font-medium">
                Included Seats: <strong className="text-gray-900">{planForm.includedSeats || 2}</strong> · Credits:{" "}
                <strong className="text-gray-900">{(planForm.monthlyCredits || 0).toLocaleString()}</strong>
              </span>

              <div className="flex items-center gap-2">
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {editingPlan ? "Save Plan Changes" : "Create Industry Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT CREDIT PACKAGE DRAWER ── */}
      {isCreditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {editingPackage ? `Edit Credit Pack: ${editingPackage.name}` : "Create Credit Pack (FR-6)"}
                </h2>
                <p className="text-xs text-gray-500">Configure fixed credit bundle and cost</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreditDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="pkg-form" onSubmit={handleSavePackageSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Package Name *</label>
                <input
                  type="text"
                  required
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="e.g. 10,000 Credits Pack"
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
                    onChange={(e) => setPackageForm({ ...packageForm, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Pack Total Cost ({packageForm.currency}) *</label>
                  <div className="flex items-center gap-1.5">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge (Optional)</label>
                <input
                  type="text"
                  value={packageForm.badge || ""}
                  onChange={(e) => setPackageForm({ ...packageForm, badge: e.target.value })}
                  placeholder="e.g. Most Popular, Save 15%"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={packageForm.isActive}
                    onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-900">Active (Visible in client top-up modal)</span>
                </label>
              </div>
            </form>

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
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingPackage ? "Save Pack" : "Create Credit Pack"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT TEAM MEMBER PACK DRAWER ── */}
      {isTeamPackDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {editingTeamPack ? `Edit Team Pack: ${editingTeamPack.name}` : "Create Team Member Pack (FR-8)"}
                </h2>
                <p className="text-xs text-gray-500">Configure seat bundle and monthly cost</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamPackDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="team-form" onSubmit={handleSaveTeamPackSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pack Name *</label>
                <input
                  type="text"
                  required
                  value={teamPackForm.name}
                  onChange={(e) => setTeamPackForm({ ...teamPackForm, name: e.target.value })}
                  placeholder="e.g. 5 Team Members Pack"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Extra Members (Seats) *</label>
                  <input
                    type="number"
                    min={1}
                    value={teamPackForm.members}
                    onChange={(e) => setTeamPackForm({ ...teamPackForm, members: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Monthly Cost *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-bold">{teamPackForm.currencySymbol}</span>
                    <input
                      type="number"
                      step={1}
                      value={teamPackForm.totalPrice}
                      onChange={(e) => setTeamPackForm({ ...teamPackForm, totalPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge (Optional)</label>
                <input
                  type="text"
                  value={teamPackForm.badge || ""}
                  onChange={(e) => setTeamPackForm({ ...teamPackForm, badge: e.target.value })}
                  placeholder="e.g. Most Popular (Save 10%)"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamPackForm.isActive}
                    onChange={(e) => setTeamPackForm({ ...teamPackForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300"
                  />
                  <span className="text-xs font-bold text-gray-900">Active (Visible in client add seats drawer)</span>
                </label>
              </div>
            </form>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsTeamPackDrawerOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="team-form"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {editingTeamPack ? "Save Pack" : "Create Team Pack"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT CREDIT ACTION MODAL (FR-13) ── */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Edit Credit Rate for Action
                </h3>
                <p className="text-xs text-gray-500">Configure credits deducted per unit event</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Action Name</label>
                <input
                  type="text"
                  required
                  value={actionForm.name}
                  onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Credits Deducted</label>
                  <input
                    type="number"
                    min={1}
                    value={actionForm.creditsDeducted}
                    onChange={(e) => setActionForm({ ...actionForm, creditsDeducted: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-amber-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit Basis</label>
                  <input
                    type="text"
                    value={actionForm.unitLabel}
                    onChange={(e) => setActionForm({ ...actionForm, unitLabel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Linked Feature Category</label>
                <select
                  value={actionForm.linkedFeature}
                  onChange={(e) => setActionForm({ ...actionForm, linkedFeature: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                >
                  <option value="Calls">Calls (Voice & Telephony)</option>
                  <option value="SMS">SMS (Two-Way Messaging)</option>
                  <option value="Email">Email (Notifications & Campaigns)</option>
                  <option value="Workflows">Workflows (Automations)</option>
                  <option value="AI Scribe">AI Scribe (Clinical Transcription)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Save Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PLAN ASSIGNMENT MODAL (FR-10) ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Assign Plan to Organisation (FR-10)
                </h3>
                <p className="text-xs text-gray-500">Brings back direct plan provisioning by admins</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignPlanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Organisation *</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    const newOrgId = e.target.value;
                    setSelectedOrgId(newOrgId);
                    const org = organizations.find((o) => o.id === newOrgId);
                    const available = org
                      ? getAvailablePlansForWorkspace(plans, {
                          industryCategory: org.industryCategory,
                          industry: org.industry,
                          country: org.country || org.location || "United States",
                        })
                      : [];
                    setSelectedPlanId(available[0]?.plan.id || "");
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.industryCategory || "General"})
                    </option>
                  ))}
                </select>
                {selectedOrg && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Admin Scope: <span className="font-semibold text-gray-700">{selectedOrg.industryCategory || "General"} · {selectedOrg.industry}</span> ({selectedOrg.country || selectedOrg.location || "United States"})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Plan to Assign (Available for this Scope) *
                </label>
                {availablePlansForSelectedOrg.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>No matching active plans available</span>
                    </p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      There are currently no active plans provisioned matching {selectedOrg?.name}&apos;s Admin Scope ({selectedOrg?.industryCategory || "General"}). Go to &quot;Industry Plans&quot; and create a plan with matching or Global scope first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold"
                  >
                    {availablePlansForSelectedOrg.map(({ plan: p, pricing, isIndustrySpecific }) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.tier} · {p.includedSeats || 2} seats · {p.monthlyCredits.toLocaleString()} credits/mo · {pricing.currencySymbol}{pricing.monthlyPrice}/mo] {isIndustrySpecific ? "(Scoped)" : "(Global)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Billing Cadence</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle("monthly")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      selectedBillingCycle === "monthly"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle("yearly")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                      selectedBillingCycle === "yearly"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    Yearly (20% Off)
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                <p>
                  <strong>Note:</strong> Once assigned, this plan will immediately become the organisation&apos;s active plan in Plan Overview. Included seats and plan credits will be provisioned according to the plan rules.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availablePlansForSelectedOrg.length === 0 || !selectedPlanId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Confirm &amp; Assign Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
