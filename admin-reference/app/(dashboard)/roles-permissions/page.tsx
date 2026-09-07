"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Menu,
  ShieldCheck,
  X,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { RoleStudioModal } from "@/components/roles/RoleStudioModal";

export interface RoleItem {
  id: string;
  roleName: string;
  categoryId?: string;
  categoryName: string;
  industryId?: string;
  industryName: string;
  createdAt: string;
  isSystem?: boolean;
}

const INITIAL_ROLES_DATA: RoleItem[] = [
  {
    id: "role-1",
    roleName: "Super Administrator",
    categoryId: "all",
    categoryName: "Global / Cross-Domain",
    industryId: "all",
    industryName: "All Industries",
    createdAt: "2025-01-15T10:00:00.000Z",
    isSystem: true,
  },
  {
    id: "role-2",
    roleName: "Clinical Intake Coordinator",
    categoryId: "cat-healthcare",
    categoryName: "Healthcare",
    industryId: "ind-clinics",
    industryName: "Hospital & Clinics",
    createdAt: "2025-03-12T14:30:00.000Z",
  },
  {
    id: "role-3",
    roleName: "Dealership Service Advisor",
    categoryId: "cat-automotive",
    categoryName: "Automobile",
    industryId: "ind-dealership",
    industryName: "Car Dealerships & Service Centers",
    createdAt: "2025-04-18T09:15:00.000Z",
  },
  {
    id: "role-4",
    roleName: "Property Leasing Manager",
    categoryId: "cat-realestate",
    categoryName: "Real Estate",
    industryId: "ind-property-management",
    industryName: "Property Management & Leasing",
    createdAt: "2025-05-20T11:45:00.000Z",
  },
  {
    id: "role-5",
    roleName: "Legal Case Compliance Lead",
    categoryId: "cat-coaching",
    categoryName: "Coaching & Advisory",
    industryId: "ind-legal",
    industryName: "Legal & Practice Advisory",
    createdAt: "2025-06-08T16:20:00.000Z",
  },
  {
    id: "role-6",
    roleName: "IT Technical Support Agent",
    categoryId: "cat-it-tech",
    categoryName: "IT/Tech",
    industryId: "ind-saas",
    industryName: "Software & SaaS Support",
    createdAt: "2025-07-25T13:10:00.000Z",
  },
  {
    id: "role-7",
    roleName: "Field Service Dispatcher",
    categoryId: "cat-household",
    categoryName: "Household Care",
    industryId: "ind-hvac",
    industryName: "HVAC & Home Services",
    createdAt: "2025-08-14T08:50:00.000Z",
  },
];

export default function RolesAndPermissionsPage({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const { categories, bundles, getIndustriesByCategory } = useIndustryTemplateStore();

  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES_DATA);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");
  const [activeMenuRoleId, setActiveMenuRoleId] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    roleName: "",
    categoryName: "",
    industryName: "",
  });

  // Dynamic industry list based on selected category in filter
  const currentCategoryIndustries = useMemo(() => {
    return getIndustriesByCategory(selectedCategoryFilter);
  }, [selectedCategoryFilter, getIndustriesByCategory]);

  // Industry Category Dropdown Options
  const categoryOptions = useMemo(() => {
    return [
      { value: "All", label: `All Categories (${categories.length})` },
      ...categories.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    ];
  }, [categories]);

  // Industry Dropdown Options
  const industryOptions = useMemo(() => {
    return [
      { value: "All", label: "All Industries" },
      ...currentCategoryIndustries.map((ind) => ({
        value: ind.name,
        label: ind.name,
      })),
    ];
  }, [currentCategoryIndustries]);

  // Format date
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

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const matchCategory =
        selectedCategoryFilter === "All" ||
        r.categoryName === selectedCategoryFilter ||
        r.categoryName === "Global / Cross-Domain";

      const matchIndustry =
        selectedIndustryFilter === "All" ||
        r.industryName === selectedIndustryFilter ||
        r.industryName === "All Industries";

      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.roleName.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.industryName.toLowerCase().includes(q);

      return matchCategory && matchIndustry && matchSearch;
    });
  }, [roles, selectedCategoryFilter, selectedIndustryFilter, searchQuery]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingRoleId(null);
    setFormData({
      roleName: "",
      categoryName: categories[0]?.name || "Healthcare",
      industryName: bundles[0]?.industryName || "Hospital & Clinics",
    });
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (role: RoleItem) => {
    setEditingRoleId(role.id);
    setFormData({
      roleName: role.roleName,
      categoryName: role.categoryName,
      industryName: role.industryName,
    });
    setIsModalOpen(true);
    setActiveMenuRoleId(null);
  };

  // Selected role to edit object
  const selectedRoleToEdit = useMemo(() => {
    if (!editingRoleId) return null;
    return roles.find((r) => r.id === editingRoleId) || null;
  }, [editingRoleId, roles]);

  // Handle duplicate
  const handleDuplicate = (role: RoleItem) => {
    const newRole: RoleItem = {
      ...role,
      id: `role-${Date.now()}`,
      roleName: `${role.roleName} (Copy)`,
      createdAt: new Date().toISOString(),
      isSystem: false,
    };
    setRoles((prev) => [newRole, ...prev]);
    setActiveMenuRoleId(null);
  };

  // Handle delete
  const handleDelete = (roleId: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      setActiveMenuRoleId(null);
    }
  };

  // Handle save from RoleStudioModal
  const handleSaveFromStudio = (savedRole: {
    id?: string;
    roleName: string;
    categoryName: string;
    industryName: string;
  }) => {
    if (savedRole.id) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === savedRole.id
            ? {
                ...r,
                roleName: savedRole.roleName,
                categoryName: savedRole.categoryName,
                industryName: savedRole.industryName,
              }
            : r
        )
      );
    } else {
      const created: RoleItem = {
        id: `role-${Date.now()}`,
        roleName: savedRole.roleName,
        categoryName: savedRole.categoryName || "General",
        industryName: savedRole.industryName || "All Industries",
        createdAt: new Date().toISOString(),
        isSystem: false,
      };
      setRoles((prev) => [created, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Roles & Permissions"
        subtitle="Manage role-based access control, security policies, and granular module permissions across your workspace."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Controls Row: Search + Category Filter + Industry Filter + Create Role Button */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles by title, category, or industry..."
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

            {/* Create Role Button */}
            <Pill
              variant="navy"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Create Role
            </Pill>
          </div>
        </div>

        {/* Roles & Permissions Data Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[36%]">
                    Role
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[22%]">
                    Industry Category
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[24%]">
                    Industry
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[12%]">
                    Created At
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[6%]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No roles match your search criteria. Click &quot;Create Role&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr
                      key={role.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 1. Role (Clean typography, no description) */}
                      <td className="px-5 py-3.5 align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(role)}
                          className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-[#1456f0] transition-colors text-left group-hover:underline truncate block max-w-full cursor-pointer"
                        >
                          {role.roleName}
                        </button>
                      </td>

                      {/* 2. Industry Category */}
                      <td className="px-4 py-3.5 align-middle text-slate-700">
                        <span className="truncate block font-medium">
                          {role.categoryName || "General / Global"}
                        </span>
                      </td>

                      {/* 3. Industry */}
                      <td className="px-4 py-3.5 align-middle text-slate-700">
                        <span className="truncate block font-medium">
                          {role.industryName || "All Industries"}
                        </span>
                      </td>

                      {/* 4. Created At */}
                      <td className="px-4 py-3.5 align-middle text-slate-500 font-medium">
                        {formatDate(role.createdAt)}
                      </td>

                      {/* 5. Action (Hamburger Dropdown) */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuRoleId(
                                activeMenuRoleId === role.id ? null : role.id
                              )
                            }
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              activeMenuRoleId === role.id
                                ? "bg-[#1456f0] text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#181e25]"
                            }`}
                            title="Role Actions"
                          >
                            <Menu className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuRoleId === role.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMenuRoleId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 text-left">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(role)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-all text-left cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                  Edit Role
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(role)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-all text-left cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  Duplicate
                                </button>
                                {!role.isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(role.id)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    Delete Role
                                  </button>
                                )}
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

      {/* CREATE / EDIT ROLE STUDIO MODAL */}
      <RoleStudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roleToEdit={selectedRoleToEdit}
        onSave={handleSaveFromStudio}
      />
    </div>
  );
}

