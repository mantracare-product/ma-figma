/**
 * AdminIndustries.tsx
 * Path: src/app/pages/admin/AdminIndustries.tsx
 *
 * Dedicated Admin Console for Industries & Industry Categories.
 * Consolidates Industries and Industry Category into a single view with two tabs:
 * 1. Industries: Browse, filter by category, add/edit/duplicate industries
 * 2. Industry Category: Manage macro classifications and attached industries
 */

import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  X,
  Check,
  Building,
  FolderTree,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  type IndustryCategory,
  type IndustryItem,
  INITIAL_CATEGORIES,
  INITIAL_INDUSTRIES,
} from "../../../data/industryReferenceData";

export type { IndustryCategory, IndustryItem };


export function AdminIndustries() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"categories" | "industries">(() => {
    if (location.pathname === "/admin/industries") return "industries";
    return "categories";
  });

  useEffect(() => {
    if (location.pathname === "/admin/industries") {
      setActiveTab("industries");
    } else if (location.pathname === "/admin/industry-category") {
      setActiveTab("categories");
    }
  }, [location.pathname]);

  // Shared Data State
  const [categories, setCategories] = useState<IndustryCategory[]>(INITIAL_CATEGORIES);
  const [industries, setIndustries] = useState<IndustryItem[]>(INITIAL_INDUSTRIES);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Expanded Categories tracking
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Industry Modal/Drawer State
  const [industryModalOpen, setIndustryModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<IndustryItem | null>(null);
  const [industryForm, setIndustryForm] = useState({
    name: "",
    category: "Healthcare",
    description: "",
    isActive: true,
  });

  // Category Modal/Drawer State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IndustryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    isActive: true,
  });

  // Delete Target Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "industry" | "category";
    id: string;
    name: string;
  } | null>(null);

  // ── Filtered Industries ──
  const filteredIndustries = useMemo(() => {
    return industries.filter((ind) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ind.name.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q);

      const matchCategory =
        selectedCategoryFilter === "All" || ind.category === selectedCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [industries, searchQuery, selectedCategoryFilter]);

  // ── Filtered Categories ──
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.industries.some((ind) => ind.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // ── Handlers: Industry ──
  const handleOpenCreateIndustry = (preselectedCategory?: string) => {
    setEditingIndustry(null);
    setIndustryForm({
      name: "",
      category: preselectedCategory || categories[0]?.name || "Healthcare",
      description: "",
      isActive: true,
    });
    setIndustryModalOpen(true);
  };

  const handleOpenEditIndustry = (ind: IndustryItem) => {
    setEditingIndustry(ind);
    setIndustryForm({
      name: ind.name,
      category: ind.category,
      description: ind.description,
      isActive: ind.isActive,
    });
    setIndustryModalOpen(true);
  };

  const handleDuplicateIndustry = (item: IndustryItem) => {
    const duplicated: IndustryItem = {
      ...item,
      id: `ind-${Date.now()}`,
      idNumber: Math.floor(Math.random() * 900) + 10,
      name: `${item.name} (Copy)`,
      isSystemRecord: false,
    };
    setIndustries((prev) => [duplicated, ...prev]);

    // Also attach to category
    setCategories((prev) =>
      prev.map((c) =>
        c.name === item.category && !c.industries.includes(duplicated.name)
          ? { ...c, industries: [...c.industries, duplicated.name] }
          : c
      )
    );

    toast.success(`Duplicated "${item.name}"`);
  };

  const handleSaveIndustry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industryForm.name.trim()) {
      toast.error("Industry name is required");
      return;
    }

    if (editingIndustry) {
      setIndustries((prev) =>
        prev.map((ind) =>
          ind.id === editingIndustry.id
            ? {
                ...ind,
                name: industryForm.name.trim(),
                category: industryForm.category,
                description: industryForm.description.trim() || "No description provided.",
                isActive: industryForm.isActive,
              }
            : ind
        )
      );
      toast.success(`Updated "${industryForm.name}"`);
    } else {
      const newInd: IndustryItem = {
        id: `ind-${Date.now()}`,
        idNumber: Math.floor(Math.random() * 900) + 10,
        name: industryForm.name.trim(),
        category: industryForm.category,
        description: industryForm.description.trim() || "No description provided.",
        isSystemRecord: false,
        isActive: industryForm.isActive,
      };
      setIndustries((prev) => [newInd, ...prev]);

      // Attach to category
      setCategories((prev) =>
        prev.map((c) =>
          c.name === industryForm.category && !c.industries.includes(newInd.name)
            ? { ...c, industries: [...c.industries, newInd.name] }
            : c
        )
      );

      toast.success(`Created industry "${newInd.name}"`);
    }

    setIndustryModalOpen(false);
  };

  // ── Handlers: Category ──
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      description: "",
      isActive: true,
    });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: IndustryCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description,
      isActive: cat.isActive,
    });
    setCategoryModalOpen(true);
  };

  const handleDuplicateCategory = (cat: IndustryCategory) => {
    const duplicated: IndustryCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      idNumber: Math.floor(Math.random() * 900) + 10,
      name: `${cat.name} (Copy)`,
      industries: [...cat.industries],
    };
    setCategories((prev) => [duplicated, ...prev]);
    toast.success(`Duplicated category "${cat.name}"`);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim() || "No description provided.",
                isActive: categoryForm.isActive,
              }
            : c
        )
      );
      toast.success(`Updated category "${categoryForm.name}"`);
    } else {
      const newCat: IndustryCategory = {
        id: `cat-${Date.now()}`,
        idNumber: Math.floor(Math.random() * 900) + 10,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || "No description provided.",
        industries: [],
        isActive: categoryForm.isActive,
      };
      setCategories((prev) => [newCat, ...prev]);
      toast.success(`Created category "${newCat.name}"`);
    }

    setCategoryModalOpen(false);
  };

  // Delete Action Confirm
  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "industry") {
      setIndustries((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success(`Deleted industry "${deleteTarget.name}"`);
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success(`Deleted category "${deleteTarget.name}"`);
    }

    setDeleteTarget(null);
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Page Title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] leading-tight">Industries</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage industries, domain workflows, and industry categories for organization provisioning.
          </p>
        </div>
      </div>

      {/* ── Sub-nav Pill Toggle & Search Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pill Segmented Tabs */}
        <div className="inline-flex items-center gap-0 bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "categories"
                ? "bg-white text-[#111827] shadow-xs font-bold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Industry Category ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("industries")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "industries"
                ? "bg-white text-[#111827] shadow-xs font-bold"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Industries ({industries.length})
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5">
          {activeTab === "industries" && (
            <div className="relative">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-gray-700 cursor-pointer"
              >
                <option value="All">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === "industries"
                  ? "Search industries..."
                  : "Search categories or industries..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* New Item Action Button */}
          {activeTab === "industries" ? (
            <button
              type="button"
              onClick={handleOpenCreateIndustry}
              className="px-3.5 py-1.5 bg-[#111827] text-white rounded-lg text-xs font-semibold hover:bg-[#1f2937] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Industry
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateCategory}
              className="px-3.5 py-1.5 bg-[#111827] text-white rounded-lg text-xs font-semibold hover:bg-[#1f2937] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Category
            </button>
          )}
        </div>
      </div>

      {/* ── Main Unified Table Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* ── TAB 1: INDUSTRIES TABLE ── */}
        {activeTab === "industries" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Industry Name
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Industry Category
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    ID
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Record Type
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredIndustries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <p className="text-sm text-gray-500">No industries found.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your search criteria or click "New Industry" above to add one.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredIndustries.map((ind) => (
                    <tr
                      key={ind.id}
                      className="hover:bg-gray-50/60 transition-colors last:border-0"
                    >
                      {/* Industry Name */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditIndustry(ind)}
                          className="font-semibold text-sm text-[#111827] hover:text-blue-600 transition-colors text-center cursor-pointer"
                        >
                          {ind.name}
                        </button>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {ind.category}
                        </span>
                      </td>

                      {/* ID */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          #{ind.idNumber}
                        </span>
                      </td>

                      {/* Record Type */}
                      <td className="px-5 py-3.5 text-center">
                        {ind.isSystemRecord ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                            Custom
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        {ind.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                            <XCircle className="w-2.5 h-2.5 text-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditIndustry(ind)}
                            className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Industry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateIndustry(ind)}
                            className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Industry"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!ind.isSystemRecord ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "industry",
                                  id: ind.id,
                                  name: ind.name,
                                })
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Industry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="w-7" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: INDUSTRY CATEGORY TABLE ── */}
        {activeTab === "categories" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center w-[24%]">
                    Category Name
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center w-[42%]">
                    Attached Industries
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center w-[10%]">
                    ID
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center w-[12%]">
                    Status
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center w-[12%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <p className="text-sm text-gray-500">No industry categories found.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click "New Category" above to define one.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const isExpanded = expandedCategories[cat.id];
                    const visibleIndustries = isExpanded
                      ? cat.industries
                      : cat.industries.slice(0, 2);
                    const remainingCount = cat.industries.length - 2;

                    return (
                      <tr
                        key={cat.id}
                        className="hover:bg-gray-50/60 transition-colors last:border-0 align-middle"
                      >
                        {/* Category Name */}
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            className="font-semibold text-sm text-[#111827] hover:text-blue-600 transition-colors text-center cursor-pointer"
                          >
                            {cat.name}
                          </button>
                        </td>

                        {/* Attached Industries: only show 2 industries and rest X more, plus icon to add more */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {cat.industries && cat.industries.length > 0 ? (
                              <>
                                {visibleIndustries.map((indName) => (
                                  <span
                                    key={indName}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eaf0f7] text-[#334155] text-[11px] font-medium"
                                  >
                                    <span className="truncate max-w-[160px]">{indName}</span>
                                  </span>
                                ))}
                                {remainingCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleCategoryExpand(cat.id)}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer border border-blue-200/60"
                                    title={isExpanded ? "Collapse" : `View ${remainingCount} more industries`}
                                  >
                                    {isExpanded ? "Show less" : `+${remainingCount} more`}
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No industries attached</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenCreateIndustry(cat.name)}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 transition-all cursor-pointer"
                              title={`Add industry to ${cat.name}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="px-5 py-4 text-center">
                          <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            #{cat.idNumber}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          {cat.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                              <XCircle className="w-2.5 h-2.5 text-gray-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateCategory(cat)}
                              className="p-1.5 text-gray-400 hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Duplicate Category"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "category",
                                  id: cat.id,
                                  name: cat.name,
                                })
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Industry Right-Side Drawer ── */}
      {industryModalOpen && (
        <div className="fixed inset-0 z-50 flex" style={{ pointerEvents: "none" }}>
          <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          <div
            className="flex-1 bg-black/30 backdrop-blur-[1px]"
            style={{ pointerEvents: "auto" }}
            onClick={() => setIndustryModalOpen(false)}
          />
          <div
            className="flex flex-col bg-white"
            style={{
              width: 520,
              maxWidth: "100%",
              height: "100vh",
              boxShadow: "-4px 0 40px rgba(0,0,0,0.14)",
              animation: "slideInFromRight 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              pointerEvents: "auto",
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-[#111827]">
                    {editingIndustry ? "Edit Industry" : "Create Industry"}
                  </h2>
                  {editingIndustry && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                      Industry
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Specify category linkage, operational descriptions, and status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIndustryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveIndustry} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Industry Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={industryForm.name}
                    onChange={(e) => setIndustryForm({ ...industryForm, name: e.target.value })}
                    placeholder="e.g. Pediatric Cardiology"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Industry Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={industryForm.category}
                    onChange={(e) => setIndustryForm({ ...industryForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    value={industryForm.description}
                    onChange={(e) => setIndustryForm({ ...industryForm, description: e.target.value })}
                    placeholder="Brief summary of clinical workflows and specialties covered..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <div className="text-xs font-semibold text-gray-800">Active Status</div>
                    <div className="text-[11px] text-gray-500">Enable industry for provisioning</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIndustryForm({ ...industryForm, isActive: !industryForm.isActive })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      industryForm.isActive ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        industryForm.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIndustryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!industryForm.name.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {editingIndustry ? "Save Changes" : "Save Industry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create / Edit Category Right-Side Drawer ── */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex" style={{ pointerEvents: "none" }}>
          <style>{`@keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          <div
            className="flex-1 bg-black/30 backdrop-blur-[1px]"
            style={{ pointerEvents: "auto" }}
            onClick={() => setCategoryModalOpen(false)}
          />
          <div
            className="flex flex-col bg-white"
            style={{
              width: 520,
              maxWidth: "100%",
              height: "100vh",
              boxShadow: "-4px 0 40px rgba(0,0,0,0.14)",
              animation: "slideInFromRight 220ms cubic-bezier(0.16, 1, 0.3, 1)",
              pointerEvents: "auto",
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-[#111827]">
                    {editingCategory ? "Edit Industry Category" : "Create Industry Category"}
                  </h2>
                  {editingCategory && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                      Category
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Define macro classifications and service boundaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveCategory} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g. Wellness & Lifestyle"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Overview of workflows and domains covered by this category..."
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div>
                    <div className="text-xs font-semibold text-gray-800">Active Status</div>
                    <div className="text-[11px] text-gray-500">Enable category for new registrations</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, isActive: !categoryForm.isActive })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      categoryForm.isActive ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        categoryForm.isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Pinned Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!categoryForm.name.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-[#1f2937] rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {editingCategory ? "Save Changes" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Delete {deleteTarget.type === "industry" ? "Industry" : "Category"}?
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-gray-900 font-semibold">"{deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminIndustries;
