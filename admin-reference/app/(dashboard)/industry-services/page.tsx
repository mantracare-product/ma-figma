"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Menu,
  X,
  Check,
  Tag,
} from "lucide-react";

// Types
export interface IndustryCategory {
  id: string;
  idNumber: number;
  name: string;
  description: string;
  isActive: boolean;
}

export interface IndustryItem {
  id: string;
  idNumber: number;
  name: string;
  category: string;
  description: string;
  isSystemRecord: boolean;
  isActive: boolean;
}

// Initial Data matching reference screenshots
const INITIAL_CATEGORIES: IndustryCategory[] = [
  {
    id: "cat-1",
    idNumber: 8,
    name: "Automobile",
    description: "Services and workflows tied to buying, maintaining, and servicing vehicles.",
    isActive: true,
  },
  {
    id: "cat-2",
    idNumber: 6,
    name: "Coaching & Advisory",
    description:
      "Professional coaches and advisors guiding clients on personal, financial, or legal matters outside clinical care.",
    isActive: true,
  },
  {
    id: "cat-3",
    idNumber: 1,
    name: "Healthcare",
    description: "All healthcare related clinical workflows and patient care specialties.",
    isActive: true,
  },
  {
    id: "cat-4",
    idNumber: 7,
    name: "Household Care",
    description:
      "On-demand visits where a professional comes to the client's home to fix, install, clean or improve something",
    isActive: true,
  },
  {
    id: "cat-5",
    idNumber: 9,
    name: "IT/Tech",
    description: "Technical software, cloud architecture, automation, and cybersecurity consulting.",
    isActive: true,
  },
  {
    id: "cat-6",
    idNumber: 10,
    name: "Real Estate",
    description:
      "Services covering property buying, selling, renting, and the advisory work around a deal",
    isActive: true,
  },
  {
    id: "cat-7",
    idNumber: 5,
    name: "Wellness & Lifestyle",
    description:
      "Non-clinical practitioners supporting physical and lifestyle health through nutrition, fitness, yoga, and mindfulness.",
    isActive: true,
  },
];

const INITIAL_INDUSTRIES: IndustryItem[] = [
  // 24 Healthcare Industries
  { id: "ind-h-1", idNumber: 101, name: "Cardiologist", category: "Healthcare", description: "Cardiovascular health, ECG/Echocardiogram, and cardiology consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-2", idNumber: 102, name: "Dentist", category: "Healthcare", description: "Oral hygiene, restorative dentistry, extractions, and smile design.", isSystemRecord: true, isActive: true },
  { id: "ind-h-3", idNumber: 103, name: "Dermatologist", category: "Healthcare", description: "Skin, hair, nails diagnosis, cosmetic dermatology, and biopsy procedures.", isSystemRecord: true, isActive: true },
  { id: "ind-h-4", idNumber: 104, name: "Diagnostics", category: "Healthcare", description: "Clinical laboratory testing, pathology, ultrasound, and radiology services.", isSystemRecord: true, isActive: true },
  { id: "ind-h-5", idNumber: 105, name: "Endocrinologist", category: "Healthcare", description: "Diabetes management, thyroid disorders, and hormonal metabolic therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-6", idNumber: 106, name: "ENT Specialist", category: "Healthcare", description: "Ear, nose, throat diagnostics, audiology screening, and sinus therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-7", idNumber: 107, name: "Fertility/IVF Specialist", category: "Healthcare", description: "Reproductive endocrinology, IVF cycles, and fertility consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-8", idNumber: 108, name: "Gastroenterologist", category: "Healthcare", description: "Digestive health, endoscopy/colonoscopy, and liver wellness.", isSystemRecord: true, isActive: true },
  { id: "ind-h-9", idNumber: 109, name: "General Physician", category: "Healthcare", description: "Primary care, routine wellness exams, and chronic condition management.", isSystemRecord: true, isActive: true },
  { id: "ind-h-10", idNumber: 110, name: "General Surgery", category: "Healthcare", description: "Pre-op evaluation, laparoscopic surgery, and post-operative recovery.", isSystemRecord: true, isActive: true },
  { id: "ind-h-11", idNumber: 111, name: "Gynecologist", category: "Healthcare", description: "Women's wellness, obstetric care, prenatal visits, and pelvic exams.", isSystemRecord: true, isActive: true },
  { id: "ind-h-12", idNumber: 112, name: "Nephrologist", category: "Healthcare", description: "Kidney disease management, hypertension care, and dialysis oversight.", isSystemRecord: true, isActive: true },
  { id: "ind-h-13", idNumber: 113, name: "Neurosurgeon", category: "Healthcare", description: "Brain and spine surgical evaluations, trauma care, and nerve decompression.", isSystemRecord: true, isActive: true },
  { id: "ind-h-14", idNumber: 114, name: "Nutrition", category: "Healthcare", description: "Clinical dietary therapy, meal planning, and metabolic weight guidance.", isSystemRecord: true, isActive: true },
  { id: "ind-h-15", idNumber: 115, name: "Oncologist", category: "Healthcare", description: "Cancer screening, chemotherapy planning, and oncology consultations.", isSystemRecord: true, isActive: true },
  { id: "ind-h-16", idNumber: 116, name: "Ophthalmologist", category: "Healthcare", description: "Vision health, cataract/refractive surgery, and retinal exams.", isSystemRecord: true, isActive: true },
  { id: "ind-h-17", idNumber: 117, name: "Orthopedic", category: "Healthcare", description: "Joint, bone, sports injury consultations, and physical rehabilitation.", isSystemRecord: true, isActive: true },
  { id: "ind-h-18", idNumber: 118, name: "Pediatrician", category: "Healthcare", description: "Infant, child, and adolescent healthcare and developmental milestones.", isSystemRecord: true, isActive: true },
  { id: "ind-h-19", idNumber: 119, name: "Pulmonologist (Lung)", category: "Healthcare", description: "Respiratory health, asthma, COPD, and pulmonary function testing.", isSystemRecord: true, isActive: true },
  { id: "ind-h-20", idNumber: 120, name: "Rheumatologist", category: "Healthcare", description: "Arthritis, autoimmune disease treatment, and joint pain therapy.", isSystemRecord: true, isActive: true },
  { id: "ind-h-21", idNumber: 121, name: "Sexologist", category: "Healthcare", description: "Sexual health counseling, intimacy therapy, and reproductive wellness.", isSystemRecord: true, isActive: true },
  { id: "ind-h-22", idNumber: 122, name: "Therapist", category: "Healthcare", description: "Mental health counseling, cognitive behavioral therapy, and emotional support.", isSystemRecord: true, isActive: true },
  { id: "ind-h-23", idNumber: 123, name: "Psychiatrist", category: "Healthcare", description: "Psychiatric evaluation, medication management, and clinical mental care.", isSystemRecord: true, isActive: true },
  { id: "ind-h-24", idNumber: 124, name: "Urologist", category: "Healthcare", description: "Urinary tract, bladder, kidney stones, and prostate health.", isSystemRecord: true, isActive: true },

  // Automobile
  { id: "ind-a-1", idNumber: 201, name: "Accessory/Customization", category: "Automobile", description: "Discussing add-ons or modifications.", isSystemRecord: true, isActive: true },
  { id: "ind-a-2", idNumber: 202, name: "Auto Dealership & Service", category: "Automobile", description: "Vehicle maintenance, diagnostics, and repairs workflow.", isSystemRecord: true, isActive: true },
  { id: "ind-a-3", idNumber: 203, name: "Electric Vehicle (EV) Specialization", category: "Automobile", description: "EV battery health, charging systems, and diagnostics.", isSystemRecord: true, isActive: true },
  { id: "ind-a-4", idNumber: 204, name: "Fleet Maintenance & Servicing", category: "Automobile", description: "Commercial fleet scheduling and maintenance log tracking.", isSystemRecord: true, isActive: true },

  // Coaching & Advisory
  { id: "ind-c-1", idNumber: 301, name: "Career Coaching", category: "Coaching & Advisory", description: "Guidance on job search, transitions, or career strategy.", isSystemRecord: true, isActive: true },
  { id: "ind-c-2", idNumber: 302, name: "Executive Leadership Mentorship", category: "Coaching & Advisory", description: "Executive mentorship, boardroom leadership, and scaling.", isSystemRecord: true, isActive: true },
  { id: "ind-c-3", idNumber: 303, name: "Life & Wellness Coaching", category: "Coaching & Advisory", description: "Personal development, habit transformation, and work-life balance.", isSystemRecord: true, isActive: true },

  // Household Care
  { id: "ind-hc-1", idNumber: 401, name: "Plumbing & Water Systems", category: "Household Care", description: "Pipe diagnostics, water heaters, and emergency leak response.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-2", idNumber: 402, name: "Electrical & Smart Home Installation", category: "Household Care", description: "Wiring, circuit breakers, EV chargers, and smart automation.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-3", idNumber: 403, name: "HVAC & Air Conditioning Repair", category: "Household Care", description: "Heating, cooling, ventilation repair, and seasonal tune-ups.", isSystemRecord: true, isActive: true },
  { id: "ind-hc-4", idNumber: 404, name: "Home Deep Cleaning", category: "Household Care", description: "Residential sanitation, move-in/out, and carpet care.", isSystemRecord: true, isActive: true },

  // IT/Tech
  { id: "ind-t-1", idNumber: 501, name: "AI/ML Strategy/ Model Development", category: "IT/Tech", description: "Scoping a custom AI or machine learning solution.", isSystemRecord: true, isActive: true },
  { id: "ind-t-2", idNumber: 502, name: "App Development", category: "IT/Tech", description: "Scoping mobile and web app builds.", isSystemRecord: true, isActive: true },
  { id: "ind-t-3", idNumber: 503, name: "Automation/Workflow Consultation", category: "IT/Tech", description: "Scoping AI-driven automation for business workflows.", isSystemRecord: true, isActive: true },
  { id: "ind-t-4", idNumber: 504, name: "Chatbot/Voice Agent Development", category: "IT/Tech", description: "Scoping conversational AI and voice agent implementations.", isSystemRecord: true, isActive: true },
  { id: "ind-t-5", idNumber: 505, name: "Cloud Migration Consultation", category: "IT/Tech", description: "Cloud infrastructure architecture and DevOps planning.", isSystemRecord: true, isActive: true },
  { id: "ind-t-6", idNumber: 506, name: "Cybersecurity Assessment", category: "IT/Tech", description: "Security posture reviews, pen-testing, and compliance.", isSystemRecord: true, isActive: true },
  { id: "ind-t-7", idNumber: 507, name: "Data/Infrastructure Audit", category: "IT/Tech", description: "Data warehousing, pipelines, and schema optimization.", isSystemRecord: true, isActive: true },

  // Real Estate
  { id: "ind-re-1", idNumber: 601, name: "Residential Real Estate Brokerage", category: "Real Estate", description: "Buyer/seller representation and property showings.", isSystemRecord: true, isActive: true },
  { id: "ind-re-2", idNumber: 602, name: "Commercial Property Leasing", category: "Real Estate", description: "Commercial lease negotiations, retail, and office spaces.", isSystemRecord: true, isActive: true },
  { id: "ind-re-3", idNumber: 603, name: "Property Management & HOA", category: "Real Estate", description: "Tenant screening, maintenance dispatch, and HOA administration.", isSystemRecord: true, isActive: true },

  // Wellness & Lifestyle
  { id: "ind-w-1", idNumber: 701, name: "Fitness & Personal Training", category: "Wellness & Lifestyle", description: "Strength coaching, body composition assessments, and gym memberships.", isSystemRecord: true, isActive: true },
  { id: "ind-w-2", idNumber: 702, name: "Holistic Nutrition & Dietetics", category: "Wellness & Lifestyle", description: "Nutritional guidance, meal plans, and metabolic coaching.", isSystemRecord: true, isActive: true },
  { id: "ind-w-3", idNumber: 703, name: "Yoga & Mindfulness Studio", category: "Wellness & Lifestyle", description: "Vinyasa yoga, meditation sessions, and breathwork workshops.", isSystemRecord: true, isActive: true },
];

export default function IndustryServicesPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [activeMenuIndustryId, setActiveMenuIndustryId] = useState<string | null>(null);

  const [categories] = useState<IndustryCategory[]>(INITIAL_CATEGORIES);
  const [industries, setIndustries] = useState<IndustryItem[]>(INITIAL_INDUSTRIES);

  // Side Drawer States
  const [isIndustryDrawerOpen, setIsIndustryDrawerOpen] = useState(false);
  const [editingIndustryId, setEditingIndustryId] = useState<string | null>(null);

  // Industry Form State
  const [industryForm, setIndustryForm] = useState({
    name: "",
    category: "Healthcare",
    description: "",
    isActive: true,
  });

  // Category filter options
  const categoryOptions = useMemo(() => {
    return [
      { value: "All", label: `All Categories (${categories.length})` },
      ...categories.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    ];
  }, [categories]);

  // Filtered Industries
  const filteredIndustries = useMemo(() => {
    return industries.filter((ind) => {
      const matchSearch =
        ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory =
        selectedCategoryFilter === "All" || ind.category === selectedCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [industries, searchQuery, selectedCategoryFilter]);

  // Handle open industry drawer
  const handleOpenIndustryDrawer = (item?: IndustryItem) => {
    if (item) {
      setEditingIndustryId(item.id);
      setIndustryForm({
        name: item.name,
        category: item.category,
        description: item.description,
        isActive: item.isActive,
      });
    } else {
      setEditingIndustryId(null);
      setIndustryForm({
        name: "",
        category: categories[0]?.name || "Healthcare",
        description: "",
        isActive: true,
      });
    }
    setIsIndustryDrawerOpen(true);
    setActiveMenuIndustryId(null);
  };

  // Handle save industry
  const handleSaveIndustry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industryForm.name.trim()) return;

    if (editingIndustryId) {
      setIndustries(
        industries.map((ind) =>
          ind.id === editingIndustryId
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
      setIndustries([newInd, ...industries]);
    }

    setIndustryForm({ name: "", category: categories[0]?.name || "Healthcare", description: "", isActive: true });
    setEditingIndustryId(null);
    setIsIndustryDrawerOpen(false);
  };

  const handleDuplicateIndustry = (item: IndustryItem) => {
    const duplicated: IndustryItem = {
      ...item,
      id: `ind-${Date.now()}`,
      idNumber: Math.floor(Math.random() * 900) + 10,
      name: `${item.name} (Copy)`,
      isSystemRecord: false,
    };
    setIndustries([duplicated, ...industries]);
    setActiveMenuIndustryId(null);
  };

  const handleDeleteIndustry = (indId: string) => {
    if (confirm("Are you sure you want to delete this industry?")) {
      setIndustries(industries.filter((s) => s.id !== indId));
      setActiveMenuIndustryId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Industries"
        subtitle="Manage industries, domain workflows, and associate them with industry categories."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Action Header: Search Bar, Category Filter, and Add Button in standard row */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search industries by name, category, or description..."
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

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Dropdown */}
            <FilterDropdown
              label="Category"
              options={categoryOptions}
              selectedValue={selectedCategoryFilter}
              onChange={(val) => setSelectedCategoryFilter(val)}
              placeholder="Select Category"
            />

            <Pill
              variant="navy"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenIndustryDrawer()}
              className="shadow-sm shrink-0 self-start sm:self-auto"
            >
              New Industry
            </Pill>
          </div>
        </div>

        {/* INDUSTRIES DATA TABLE (Standardized Table UI) */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[30%]">
                    Industry Name
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[24%]">
                    Industry Category
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[12%]">
                    ID
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[14%]">
                    Record Type
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[12%]">
                    Status
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[8%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredIndustries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No industries match your search criteria. Click &quot;New Industry&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  filteredIndustries.map((ind) => (
                    <tr
                      key={ind.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* 1. Industry Name */}
                      <td className="px-5 py-3.5 align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenIndustryDrawer(ind)}
                          className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-[#1456f0] transition-colors text-left group-hover:underline truncate block max-w-full cursor-pointer"
                        >
                          {ind.name}
                        </button>
                      </td>

                      {/* 2. Industry Category */}
                      <td className="px-4 py-3.5 align-middle text-slate-700">
                        <span className="truncate block font-medium">
                          {ind.category}
                        </span>
                      </td>

                      {/* 3. ID */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <span className="font-mono text-xs text-slate-500 font-medium">
                          #{ind.idNumber}
                        </span>
                      </td>

                      {/* 4. Record Type */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <span className="font-medium text-slate-600 text-xs">
                          {ind.isSystemRecord ? "System" : "Custom"}
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <span className="font-medium text-slate-700 text-xs">
                          {ind.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* 6. Actions (Hamburger Dropdown) */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuIndustryId(
                                activeMenuIndustryId === ind.id ? null : ind.id
                              )
                            }
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              activeMenuIndustryId === ind.id
                                ? "bg-[#1456f0] text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#181e25]"
                            }`}
                            title="Actions"
                          >
                            <Menu className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuIndustryId === ind.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuIndustryId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-2xl border border-slate-200 shadow-xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenIndustryDrawer(ind)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1456f0] transition-colors text-left cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateIndustry(ind)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-[#1456f0] transition-colors text-left cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Duplicate</span>
                                </button>
                                {!ind.isSystemRecord && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIndustry(ind.id)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
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

      {/* SIDE DRAWER: CREATE / EDIT INDUSTRY */}
      <SideDrawer
        isOpen={isIndustryDrawerOpen}
        onClose={() => setIsIndustryDrawerOpen(false)}
        title={editingIndustryId ? "Edit Industry" : "Create Industry"}
        subtitle="Specify category linkage, operational descriptions, and status."
        width="lg"
      >
        <form onSubmit={handleSaveIndustry} className="space-y-5">
          {/* Industry Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Industry Name *</label>
            <input
              type="text"
              required
              value={industryForm.name}
              onChange={(e) => setIndustryForm({ ...industryForm, name: e.target.value })}
              placeholder="e.g. Pediatric Cardiology"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-medium"
            />
          </div>

          {/* Industry Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Industry Category *</label>
            <CustomSelect
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              value={industryForm.category}
              onChange={(val) => setIndustryForm({ ...industryForm, category: val })}
              placeholder="Select Category"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description</label>
            <textarea
              rows={3}
              value={industryForm.description}
              onChange={(e) => setIndustryForm({ ...industryForm, description: e.target.value })}
              placeholder="Brief summary of workflows and specialties covered..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-medium resize-none"
            />
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-800">Active Status</div>
              <div className="text-[11px] text-slate-500">Enable industry for provisioning</div>
            </div>
            <button
              type="button"
              onClick={() => setIndustryForm({ ...industryForm, isActive: !industryForm.isActive })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                industryForm.isActive ? "bg-[#1456f0]" : "bg-slate-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  industryForm.isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Drawer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsIndustryDrawerOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <Pill variant="navy" size="md" icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}>
              Save Industry
            </Pill>
          </div>
        </form>
      </SideDrawer>
    </div>
  );
}
