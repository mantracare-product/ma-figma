"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import { IndustryStarterBundle } from "@/lib/types/industry-templates";
import { IndustryBundleCard } from "@/components/industry-templates/IndustryBundleCard";
import { MasterBundleStudioDrawer } from "@/components/industry-templates/MasterBundleStudioDrawer";
import { OnboardingProvisioningTester } from "@/components/industry-templates/OnboardingProvisioningTester";
import {
  LayoutTemplate,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  PhoneCall,
  CheckSquare,
  FileCode,
  ShieldCheck,
  Bot,
  Building2,
  RotateCcw,
  Zap,
  Trash2,
  Edit2,
  Eye,
  ChevronDown,
  Tag,
  Menu,
  X,
} from "lucide-react";

export default function IndustryTemplatesPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const {
    categories,
    bundles,
    workspaces,
    saveBundle,
    deleteBundle,
    resetToDefaults,
  } = useIndustryTemplateStore();

  const [activeMainTab, setActiveMainTab] = useState<
    "bundles" | "processes" | "forms" | "docs" | "provisioning_tester"
  >("bundles");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");

  // Master Studio Drawer State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<IndustryStarterBundle | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);

  const toggleStageExpand = (bundleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStages((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }));
  };

  // Filtered bundles
  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      const matchCat =
        selectedCategoryFilter === "All" || b.categoryName === selectedCategoryFilter;
      const matchInd =
        selectedIndustryFilter === "All" || b.industryName === selectedIndustryFilter;
      const matchSearch =
        b.industryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.processTemplate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.processTemplate.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchInd && matchSearch;
    });
  }, [bundles, selectedCategoryFilter, selectedIndustryFilter, searchQuery]);

  // Handle open studio
  const handleOpenStudio = (bundle?: IndustryStarterBundle) => {
    if (bundle) {
      setSelectedBundle(bundle);
    } else {
      const initialCategory = categories[0]?.name || "Healthcare & Medical";
      const initialIndustry =
        bundles.find((b) => b.categoryName === initialCategory)?.industryName ||
        bundles[0]?.industryName ||
        "Dental Practice";

      const newBundle: IndustryStarterBundle = {
        id: `bundle-${Date.now()}`,
        industryId: `ind-${Date.now()}`,
        industryName: initialIndustry,
        categoryName: initialCategory,
        slug: `new-industry-${Date.now()}`,
        version: "1.0.0",
        status: "draft",
        recommendedTone: "Professional, Helpful, Empathetic",
        badges: ["New"],
        processTemplate: {
          id: `proc-${Date.now()}`,
          industryId: `ind-${Date.now()}`,
          name: "",
          description: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          globalSettings: {
            aiModel: "deepseek-v3-flash",
            voiceSpeed: 1.0,
            voiceGender: "female",
            voiceTone: "Warm & Professional",
            recordCalls: true,
            maxDurationMinutes: 5,
            wrapUpWindowSeconds: 30,
            retryRules: { enabled: true, maxAttempts: 3, delayMinutes: 45 },
            skipDayRules: { enabled: true, skipDaysOfWeek: [0, 6], skipHolidays: true },
            voicemailDetection: { enabled: true, action: "hangup" },
          },
          stages: [
            {
              id: `stg-1-${Date.now()}`,
              stageOrder: 1,
              name: "",
              stageCode: "STG_1",
              description: "",
              statusColor: "#10b981",
              automaticCalling: true,
              defaultLanding: true,
              systemInstruction: "",
              aiModel: "deepseek-v3-flash",
              speechSpeed: 1.0,
              voiceEngine: "av-Vikas",
              webhooks: [],
              skipHolidays: true,
              duplicateLogic: false,
              retryLimit: 3,
              intervalDelayMinutes: 60,
              nextStageOnRetryExhausted: "",
            },
          ],
        },
        formTemplates: [
          {
            id: `form-1-${Date.now()}`,
            industryId: `ind-${Date.now()}`,
            title: "Client General Inquiry Form",
            category: "lead_capture",
            description: "Standard web lead capture form.",
            estimatedMinutes: 2,
            submitButtonText: "Submit Inquiry",
            successMessage: "Thank you for submitting your inquiry!",
            autoCreateClient: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sections: [
              {
                id: `sec-1`,
                title: "Contact Information",
                fields: [
                  {
                    id: `f-1`,
                    label: "Your Name",
                    name: "name",
                    type: "text",
                    isRequired: true,
                  },
                  {
                    id: `f-2`,
                    label: "Phone Number",
                    name: "phone",
                    type: "phone",
                    isRequired: true,
                  },
                ],
              },
            ],
          },
        ],
        documentTemplates: [
          {
            id: `doc-1-${Date.now()}`,
            industryId: `ind-${Date.now()}`,
            industryName: "New Industry",
            name: "Client Intake & Service Authorization Agreement",
            title: "Client Intake & Service Authorization Agreement",
            description: "Standard service authorization, terms of engagement, and consent document.",
            creationMethod: "custom",
            contentHtml: `<div style="padding: 20px; font-family: sans-serif;"><h2>Service Agreement</h2><p>Client: {{client_name}}</p><p>Doc #: {{doc_number}}</p></div>`,
            extractedFields: [
              { placeholder: "{{client_name}}", mappedVariable: "client_name", label: "Client Name", fieldSource: "system" },
              { placeholder: "{{doc_number}}", mappedVariable: "document_number", label: "Document Number", fieldSource: "system" },
            ],
            autoNumbering: {
              enabled: true,
              prefix: "DOC-",
              sequenceDigits: 4,
              currentNumber: 1001,
              suffix: "-2026",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        defaultServices: [
          {
            id: `srv-1-${Date.now()}`,
            name: "Initial Discovery Session",
            durationMinutes: 30,
            priceEstimate: 50,
            description: "30-minute consultation.",
            isPopular: true,
          },
        ],
        customFields: [
          {
            id: `cf-1-${Date.now()}`,
            name: "Referral Source",
            key: "referral_source",
            type: "Text",
            entity: "Client",
            isRequired: false,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSelectedBundle(newBundle);
    }
    setIsStudioOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Industry Templates"
        subtitle="Manage industry-tailored conversation blueprints, stages, and telephony configurations."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Studio Hub */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Action Header: Search on left + (Category & Industry Filters + Add Button) on right */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input on Left */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search template name, service, or category..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl placeholder:text-slate-400 text-[#222222] shadow-xs outline-none focus:ring-2 focus:ring-[#1456f0]/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Action Button Group on Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <FilterDropdown
              label="Category"
              selectedValue={selectedCategoryFilter}
              onChange={(val) => {
                setSelectedCategoryFilter(val);
                setSelectedIndustryFilter("All");
              }}
              options={[
                { value: "All", label: "All Categories" },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
              className="shrink-0"
            />

            {/* Industry Filter Dropdown */}
            <FilterDropdown
              label="Industry"
              selectedValue={selectedIndustryFilter}
              onChange={(val) => setSelectedIndustryFilter(val)}
              options={[
                { value: "All", label: "All Industries" },
                ...Array.from(
                  new Set(
                    bundles
                      .filter(
                        (b) =>
                          selectedCategoryFilter === "All" ||
                          b.categoryName === selectedCategoryFilter
                      )
                      .map((b) => b.industryName)
                  )
                ).map((name) => ({ value: name, label: name })),
              ]}
              className="shrink-0"
            />

            {/* New Template Button */}
            <Pill
              variant="navy"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenStudio()}
              className="shadow-sm shrink-0 self-start sm:self-auto"
            >
              New Template
            </Pill>
          </div>
        </div>

        {/* Proportional Mature Admin Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/50 backdrop-blur-md shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-left w-[24%]">
                    Template Name
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry Category
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[24%]">
                    Stages
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[14%]">
                    Created On
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[6%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBundles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No industry templates match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredBundles.map((b) => {
                    const stages = b.processTemplate?.stages || [];
                    const isExpanded = expandedStages[b.id];
                    const visibleStages = isExpanded ? stages : stages.slice(0, 3);
                    const remainingCount = stages.length - 3;

                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-white/80 transition-colors duration-150 group"
                      >
                        {/* 1. Template Name (No description) */}
                        <td className="px-6 py-5 align-middle">
                          <button
                            type="button"
                            onClick={() => handleOpenStudio(b)}
                            className="font-bold text-sm text-[#181e25] hover:text-[#1456f0] transition-colors text-left group-hover:underline block"
                          >
                            {b.processTemplate.name || `${b.industryName} Journey`}
                          </button>
                        </td>

                        {/* 2. Industry */}
                        <td className="px-5 py-5 align-middle">
                          <span className="font-semibold text-xs text-[#181e25]">
                            {b.industryName}
                          </span>
                        </td>

                        {/* 3. Industry Category */}
                        <td className="px-5 py-5 align-middle">
                          <span className="font-medium text-xs text-slate-600">
                            {b.categoryName}
                          </span>
                        </td>

                        {/* 4. Stages (Expandable container matching industry-category) */}
                        <td className="px-5 py-5 align-middle">
                          {stages && stages.length > 0 ? (
                            <div className="relative inline-flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs w-full max-w-[360px]">
                              {stages.length > 3 && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleStageExpand(b.id, e)}
                                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-[#1456f0] transition-colors p-0.5 rounded-md hover:bg-slate-200/60"
                                  title={isExpanded ? "Collapse" : "Expand all"}
                                >
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                      isExpanded ? "transform rotate-180 text-[#1456f0]" : ""
                                    }`}
                                  />
                                </button>
                              )}

                              {visibleStages.map((stg, idx) => {
                                const isLastOfThree =
                                  idx === 2 && !isExpanded && remainingCount > 0;

                                return (
                                  <div key={stg.id} className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-md bg-[#eaf0f7] hover:bg-[#dfe8f3] text-[#334155] text-[10.5px] font-bold uppercase tracking-wider transition-colors max-w-[230px]">
                                      <span className="truncate">{stg.name}</span>
                                      <span className="text-slate-400 text-xs font-normal leading-none hover:text-slate-600">
                                        ✕
                                      </span>
                                    </span>

                                    {isLastOfThree && (
                                      <button
                                        type="button"
                                        onClick={(e) => toggleStageExpand(b.id, e)}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#eaf0f7] hover:bg-blue-50 text-[#1456f0] border border-blue-200/60 font-bold text-[10px] uppercase tracking-wider transition-all duration-150 shadow-2xs hover:scale-105"
                                      >
                                        +{remainingCount} MORE
                                      </button>
                                    )}
                                  </div>
                                );
                              })}

                              {isExpanded && remainingCount > 0 && (
                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleStageExpand(b.id, e)}
                                    className="text-[10px] font-bold text-[#1456f0] hover:underline inline-flex items-center gap-1"
                                  >
                                    Show Less ▲
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No stages configured
                            </span>
                          )}
                        </td>

                        {/* 5. Created On */}
                        <td className="px-5 py-5 align-middle">
                          <span className="font-semibold text-xs text-slate-600">
                            {b.createdAt
                              ? new Date(b.createdAt).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "12 Jan 2026"}
                          </span>
                        </td>

                        {/* 5. Actions (Hamburger Dropdown) */}
                        <td className="px-4 py-5 align-middle text-center">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionDropdownId(
                                  activeActionDropdownId === b.id ? null : b.id
                                );
                              }}
                              className={`p-2 rounded-xl border transition-all ${
                                activeActionDropdownId === b.id
                                  ? "bg-[#181e25] text-white border-transparent shadow-xs"
                                  : "bg-white/80 hover:bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 shadow-2xs"
                              }`}
                              title="More Options"
                            >
                              <Menu className="w-4 h-4" />
                            </button>

                            {activeActionDropdownId === b.id && (
                              <>
                                {/* Transparent backdrop to dismiss on outside click */}
                                <div
                                  className="fixed inset-0 z-40 cursor-default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionDropdownId(null);
                                  }}
                                />

                                {/* Action Popover */}
                                <div
                                  className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      handleOpenStudio(b);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Template</span>
                                  </button>

                                  <div className="h-px bg-slate-100 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionDropdownId(null);
                                      if (confirm(`Delete template "${b.processTemplate.name}"?`)) {
                                        deleteBundle(b.id);
                                      }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 rounded-xl transition-colors text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Template</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      {/* Master Studio Drawer */}
      {isStudioOpen && selectedBundle && (
        <MasterBundleStudioDrawer
          isOpen={isStudioOpen}
          onClose={() => {
            setIsStudioOpen(false);
            setSelectedBundle(null);
          }}
          bundle={selectedBundle}
          onSave={(saved) => {
            saveBundle(saved);
            setIsStudioOpen(false);
            setSelectedBundle(null);
          }}
        />
      )}
    </div>
  );
}
