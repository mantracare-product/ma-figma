"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { SideDrawer } from "@/components/ui/SideDrawer";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Menu,
  ChevronDown,
  X,
  Check,
} from "lucide-react";

export interface IndustryCategory {
  id: string;
  idNumber: number;
  name: string;
  description: string;
  industries: string[];
  isActive: boolean;
}

const INITIAL_CATEGORIES: IndustryCategory[] = [
  {
    id: "cat-1",
    idNumber: 8,
    name: "Automobile",
    description: "Services and workflows tied to buying, maintaining, and servicing vehicles.",
    industries: [
      "Accessory/Customization",
      "Automobile",
      "Electric Vehicle (EV) Specialization",
      "Fleet Maintenance & Servicing",
    ],
    isActive: true,
  },
  {
    id: "cat-2",
    idNumber: 6,
    name: "Coaching & Advisory",
    description:
      "Professional coaches and advisors guiding clients on personal, financial, or career matters.",
    industries: [
      "Career Coaching",
      "Executive Leadership Mentorship",
      "Life & Wellness Coaching",
    ],
    isActive: true,
  },
  {
    id: "cat-3",
    idNumber: 1,
    name: "Healthcare",
    description: "All healthcare related services",
    industries: [
      "Cardiologist",
      "Dentist",
      "Dermatologist",
      "Diagnostics",
      "Endocrinologist",
      "ENT Specialist",
      "Fertility/IVF Specialist",
      "Gastroenterologist",
      "General Physician",
      "General Surgery",
      "Gynecologist",
      "Nephrologist",
      "Neurosurgeon",
      "Nutrition",
      "Oncologist",
      "Ophthalmologist",
      "Orthopedic",
      "Pediatrician",
      "Pulmonologist (Lung)",
      "Rheumatologist",
      "Sexologist",
      "Therapist",
      "Psychiatrist",
      "Urologist",
    ],
    isActive: true,
  },
  {
    id: "cat-4",
    idNumber: 7,
    name: "Household Care",
    description:
      "On-demand visits where a professional comes to client's premises for cleaning or repairs.",
    industries: [
      "Plumbing & Water Systems",
      "Electrical & Smart Home Installation",
      "HVAC & Air Conditioning Repair",
      "Home Deep Cleaning",
    ],
    isActive: true,
  },
  {
    id: "cat-5",
    idNumber: 9,
    name: "IT/Tech",
    description: "Technical software, cloud architecture, automation, and cybersecurity consulting.",
    industries: [
      "AI/ML Strategy/ Model Development",
      "App Development",
      "Automation/Workflow Consultation",
      "Chatbot/Voice Agent Development",
      "Cloud Migration Consultation",
      "Cybersecurity Assessment",
      "Data/Infrastructure Audit",
    ],
    isActive: true,
  },
  {
    id: "cat-6",
    idNumber: 10,
    name: "Real Estate",
    description:
      "Services covering property buying, selling, renting, and the advisory work around a deal",
    industries: [
      "Residential Real Estate Brokerage",
      "Commercial Property Leasing",
      "Property Management & HOA",
    ],
    isActive: true,
  },
  {
    id: "cat-7",
    idNumber: 5,
    name: "Wellness & Lifestyle",
    description:
      "Non-clinical practitioners supporting physical and lifestyle health through nutrition, fitness, yoga, and mindfulness.",
    industries: [
      "Fitness & Personal Training",
      "Holistic Nutrition & Dietetics",
      "Yoga & Mindfulness Studio",
    ],
    isActive: true,
  },
];

export default function IndustryCategoryPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<IndustryCategory[]>(INITIAL_CATEGORIES);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState<string | null>(null);

  // Expanded categories tracking
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryExpand = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.industries.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [categories, searchQuery]);

  const handleOpenCreateDrawer = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      description: "",
      isActive: true,
    });
    setIsDrawerOpen(true);
    setActiveMenuCategoryId(null);
  };

  const handleOpenEditDrawer = (cat: IndustryCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      description: cat.description,
      isActive: cat.isActive,
    });
    setIsDrawerOpen(true);
    setActiveMenuCategoryId(null);
  };

  const handleDuplicateCategory = (cat: IndustryCategory) => {
    const duplicated: IndustryCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      idNumber: Math.floor(Math.random() * 900) + 10,
      name: `${cat.name} (Copy)`,
      industries: [...cat.industries],
    };
    setCategories([duplicated, ...categories]);
    setActiveMenuCategoryId(null);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    if (editingCategoryId) {
      setCategories(
        categories.map((c) =>
          c.id === editingCategoryId
            ? {
                ...c,
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim() || "No description provided.",
                isActive: categoryForm.isActive,
              }
            : c
        )
      );
    } else {
      const newCat: IndustryCategory = {
        id: `cat-${Date.now()}`,
        idNumber: Math.floor(Math.random() * 900) + 10,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || "No description provided.",
        industries: [],
        isActive: categoryForm.isActive,
      };
      setCategories([newCat, ...categories]);
    }

    setCategoryForm({ name: "", description: "", isActive: true });
    setEditingCategoryId(null);
    setIsDrawerOpen(false);
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter((c) => c.id !== catId));
      setActiveMenuCategoryId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Industry Categories"
        subtitle="Manage top-level macro classifications and industry groupings."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Action Header: Search Bar & Add Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category or industry name..."
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

          <Pill
            variant="navy"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateDrawer}
            className="shadow-sm shrink-0 self-start sm:self-auto"
          >
            New Category
          </Pill>
        </div>

        {/* Industry Categories Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[24%]">
                    Category Name
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[40%]">
                    Attached Industries
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[12%]">
                    ID
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[14%]">
                    Status
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[10%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No industry categories match your search query. Click &quot;New Category&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 1. Category Name */}
                      <td className="px-5 py-4 align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenEditDrawer(cat)}
                          className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-[#1456f0] transition-colors text-left group-hover:underline truncate block max-w-full cursor-pointer"
                        >
                          {cat.name}
                        </button>
                      </td>

                      {/* 2. Attached Industries (Original UI Box Structure) */}
                      <td className="px-5 py-4 align-middle">
                        {cat.industries && cat.industries.length > 0 ? (
                          (() => {
                            const isExpanded = expandedCategories[cat.id];
                            const visibleIndustries = isExpanded
                              ? cat.industries
                              : cat.industries.slice(0, 3);
                            const remainingCount = cat.industries.length - 3;

                            return (
                              <div className="relative inline-flex flex-col gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 shadow-2xs w-full max-w-[360px]">
                                {cat.industries.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleCategoryExpand(cat.id, e)}
                                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-[#1456f0] transition-colors p-0.5 rounded-md hover:bg-slate-200/60 cursor-pointer"
                                    title={isExpanded ? "Collapse" : "Expand all"}
                                  >
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                        isExpanded ? "transform rotate-180 text-[#1456f0]" : ""
                                      }`}
                                    />
                                  </button>
                                )}

                                {visibleIndustries.map((ind, idx) => {
                                  const isLastOfThree =
                                    idx === 2 && !isExpanded && remainingCount > 0;

                                  return (
                                    <div key={ind} className="flex items-center gap-2">
                                      <span className="inline-flex items-center justify-between gap-2 px-2.5 py-1 rounded-md bg-[#eaf0f7] hover:bg-[#dfe8f3] text-[#334155] text-[10.5px] font-bold uppercase tracking-wider transition-colors max-w-[230px]">
                                        <span className="truncate">{ind}</span>
                                        <span className="text-slate-400 text-xs font-normal leading-none hover:text-slate-600">
                                          ✕
                                        </span>
                                      </span>

                                      {isLastOfThree && (
                                        <button
                                          type="button"
                                          onClick={(e) => toggleCategoryExpand(cat.id, e)}
                                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#eaf0f7] hover:bg-blue-50 text-[#1456f0] border border-blue-200/60 font-bold text-[10px] uppercase tracking-wider transition-all duration-150 shadow-2xs hover:scale-105 cursor-pointer"
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
                                      onClick={(e) => toggleCategoryExpand(cat.id, e)}
                                      className="text-[10px] font-bold text-[#1456f0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      Show Less ▲
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No industries assigned
                          </span>
                        )}
                      </td>

                      {/* 3. ID */}
                      <td className="px-4 py-4 align-middle text-center">
                        <span className="font-mono text-xs text-slate-500 font-medium">
                          #{cat.idNumber}
                        </span>
                      </td>

                      {/* 4. Status */}
                      <td className="px-4 py-4 align-middle text-center">
                        <span className="font-medium text-slate-700 text-xs">
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* 5. Actions (Hamburger Dropdown) */}
                      <td className="px-4 py-4 align-middle text-center">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuCategoryId(
                                activeMenuCategoryId === cat.id ? null : cat.id
                              )
                            }
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              activeMenuCategoryId === cat.id
                                ? "bg-[#1456f0] text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#181e25]"
                            }`}
                            title="Actions"
                          >
                            <Menu className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuCategoryId === cat.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuCategoryId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl border border-slate-200 shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDrawer(cat)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1456f0] transition-colors text-left cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateCategory(cat)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1456f0] transition-colors text-left cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      {/* CREATE / EDIT INDUSTRY CATEGORY DRAWER */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCategoryId ? "Edit Industry Category" : "Create Industry Category"}
        subtitle="Categories group industries and plans together."
        width="lg"
      >
        <form onSubmit={handleSaveCategory} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Category Name *</label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Legal Services"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Brief description of the domain..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-medium resize-none"
            />
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Active Status</div>
              <div className="text-[11px] text-slate-500">Visible in tenant onboarding</div>
            </div>
            <button
              type="button"
              onClick={() => setCategoryForm({ ...categoryForm, isActive: !categoryForm.isActive })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                categoryForm.isActive ? "bg-[#1456f0]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  categoryForm.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Drawer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <Pill variant="navy" size="md" icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}>
              Save Category
            </Pill>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
