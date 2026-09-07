"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import { FormTemplate } from "@/lib/types/industry-templates";
import { WebFormBuilderModal } from "@/components/industry-templates/WebFormBuilderModal";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Menu,
} from "lucide-react";

export default function FormsPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { allForms, saveFormTemplate, deleteFormTemplate, bundles, categories, getIndustriesByCategory } =
    useIndustryTemplateStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");
  const [activeMenuFormId, setActiveMenuFormId] = useState<string | null>(null);

  // Form Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);

  // Dynamic industry list based on selected category
  const currentCategoryIndustries = useMemo(() => {
    return getIndustriesByCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter, getIndustriesByCategory]);

  // Industry Category Dropdown Options (Text-only)
  const categoryOptions = useMemo(() => {
    return [
      { value: "All", label: `All Categories (${categories.length})` },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ];
  }, [categories]);

  // Industry Dropdown Options (Text-only, dynamic based on selected category)
  const industryOptions = useMemo(() => {
    return [
      { value: "All", label: "All Industries" },
      ...currentCategoryIndustries.map((ind) => ({
        value: ind.id,
        label: ind.name,
      })),
    ];
  }, [currentCategoryIndustries]);

  // Format creation date
  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // Filtered forms with newest first
  const filteredForms = useMemo(() => {
    return allForms
      .filter((f) => {
        const formTitle = f.title || "";
        const formDesc = f.description || "";
        const formInd = f.industryName || "";
        const formCat = f.categoryName || "";

        const matchCategory =
          selectedCategoryFilter === "All" ||
          f.categoryId === selectedCategoryFilter ||
          f.categoryName === selectedCategoryFilter ||
          categories.find((c) => c.id === selectedCategoryFilter)?.name === f.categoryName;

        const matchIndustry =
          selectedIndustryFilter === "All" ||
          f.industryId === selectedIndustryFilter ||
          f.industryName === selectedIndustryFilter ||
          bundles.find((b) => b.industryId === selectedIndustryFilter)?.industryName === f.industryName;

        const q = searchQuery.toLowerCase();
        const matchSearch =
          formTitle.toLowerCase().includes(q) ||
          formDesc.toLowerCase().includes(q) ||
          formInd.toLowerCase().includes(q) ||
          formCat.toLowerCase().includes(q);

        return matchCategory && matchIndustry && matchSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
  }, [allForms, selectedCategoryFilter, selectedIndustryFilter, searchQuery, categories, bundles]);

  const handleOpenCreateForm = () => {
    const newForm: FormTemplate = {
      id: `form-${Date.now()}`,
      categoryId: "",
      categoryName: "",
      industryId: "",
      industryName: "",
      title: "",
      category: "intake",
      description: "",
      estimatedMinutes: 3,
      submitButtonText: "Submit",
      successMessage: "Thank you for submitting!",
      autoCreateClient: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [],
    };
    setSelectedForm(newForm);
    setIsBuilderOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Web Forms"
        subtitle="Manage dynamic web intake, client registration, and custom forms connected directly to CRM pipelines."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Controls Row: Search + Category Filter + Industry Filter + Build New Form Button */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forms by title, category, or industry..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl placeholder:text-slate-400 text-[#222222] shadow-xs outline-none focus:ring-2 focus:ring-[#1456f0]/40"
            />
          </div>

          {/* Filters & Action Group in the SAME Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <FilterDropdown
              label="Category"
              options={categoryOptions}
              selectedValue={selectedCategoryFilter}
              onChange={(val) => {
                setSelectedCategoryFilter(val);
                setSelectedIndustryFilter("All");
              }}
              placeholder="Select Category"
            />

            {/* Industry Filter Dropdown */}
            <FilterDropdown
              label="Industry"
              options={industryOptions}
              selectedValue={selectedIndustryFilter}
              onChange={(val) => setSelectedIndustryFilter(val)}
              placeholder="Select Industry"
            />

            {/* Build New Form Button */}
            <Pill
              variant="navy"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateForm}
            >
              Build New Form
            </Pill>
          </div>
        </div>

        {/* Clean WebForms Data Table: No colorful capsules/boundaries/icons, clean typography, Created On column */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[28%]">
                    Form Title
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry Category
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[12%]">
                    Created On
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[11%]">
                    Sections
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[11%]">
                    Total Fields
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[6%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No form templates match your search criteria. Click &quot;Build New Form&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => {
                    const totalFields = form.sections.reduce((acc, s) => acc + s.fields.length, 0);

                    return (
                      <tr
                        key={form.id}
                        className="hover:bg-slate-50/70 transition-colors duration-150 group"
                      >
                        {/* 1. Form Title */}
                        <td className="px-5 py-3.5 align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForm(form);
                              setIsBuilderOpen(true);
                            }}
                            className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-[#1456f0] transition-colors text-left group-hover:underline truncate block max-w-full cursor-pointer"
                          >
                            {form.title}
                          </button>
                        </td>

                        {/* 2. Industry Category (Clean text, no colorful capsule) */}
                        <td className="px-4 py-3.5 align-middle text-slate-700">
                          <span className="truncate block">
                            {form.categoryName || "General"}
                          </span>
                        </td>

                        {/* 3. Industry (Clean text, no colorful capsule) */}
                        <td className="px-4 py-3.5 align-middle text-slate-700">
                          <span className="truncate block">
                            {form.industryName || "General / Universal"}
                          </span>
                        </td>

                        {/* 4. Created On */}
                        <td className="px-4 py-3.5 align-middle text-slate-500">
                          {formatDate(form.createdAt)}
                        </td>

                        {/* 5. Sections */}
                        <td className="px-4 py-3.5 align-middle text-slate-600">
                          {form.sections.length} Sections
                        </td>

                        {/* 6. Total Fields */}
                        <td className="px-4 py-3.5 align-middle text-slate-600 font-medium">
                          {totalFields} Fields
                        </td>

                        {/* 7. Actions (Hamburger Dropdown) */}
                        <td className="px-4 py-3.5 align-middle text-center">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuFormId(
                                  activeMenuFormId === form.id ? null : form.id
                                )
                              }
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                activeMenuFormId === form.id
                                  ? "bg-[#1456f0] text-white shadow-xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#181e25]"
                              }`}
                              title="Form Actions"
                            >
                              <Menu className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuFormId === form.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenuFormId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedForm(form);
                                      setIsBuilderOpen(true);
                                      setActiveMenuFormId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-all text-left cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                    <span>Edit Form</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const duplicated: FormTemplate = {
                                        ...form,
                                        id: `form-${Date.now()}`,
                                        title: `${form.title} (Copy)`,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                      };
                                      saveFormTemplate(duplicated);
                                      setActiveMenuFormId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-all text-left cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Duplicate</span>
                                  </button>

                                  <div className="h-[1px] bg-slate-100 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuFormId(null);
                                      if (confirm(`Delete form "${form.title}"?`)) {
                                        deleteFormTemplate(form.id);
                                      }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
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

      {/* Form Builder Side Drawer */}
      {isBuilderOpen && selectedForm && (
        <WebFormBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          form={selectedForm}
          onSave={(updatedForm) => {
            saveFormTemplate(updatedForm);
            setIsBuilderOpen(false);
          }}
        />
      )}
    </div>
  );
}
