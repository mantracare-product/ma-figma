"use client";

import React, { useState, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { GlassCard } from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Pill";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";
import { DocumentTemplate } from "@/lib/types/industry-templates";
import { DocumentEditorModal } from "@/components/industry-templates/DocumentEditorModal";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Menu,
  Copy,
} from "lucide-react";

export default function DocumentTemplatesPage({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { allDocs, saveDocumentTemplate, deleteDocumentTemplate, bundles, categories, getIndustriesByCategory } =
    useIndustryTemplateStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("All");
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);

  // Document Editor Drawer State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentTemplate | null>(null);

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

  // Filtered docs with newest first
  const filteredDocs = useMemo(() => {
    return allDocs
      .filter((d) => {
        const docName = d.name || d.title || "";
        const docDesc = d.description || "";
        const docInd = d.industryName || "";
        const docCat = d.categoryName || "";

        const matchCategory =
          selectedCategoryFilter === "All" ||
          d.categoryId === selectedCategoryFilter ||
          d.categoryName === selectedCategoryFilter ||
          categories.find((c) => c.id === selectedCategoryFilter)?.name === d.categoryName;

        const matchIndustry =
          selectedIndustryFilter === "All" ||
          d.industryId === selectedIndustryFilter ||
          d.industryName === selectedIndustryFilter ||
          bundles.find((b) => b.industryId === selectedIndustryFilter)?.industryName === d.industryName;

        const q = searchQuery.toLowerCase();
        const matchSearch =
          docName.toLowerCase().includes(q) ||
          docDesc.toLowerCase().includes(q) ||
          docInd.toLowerCase().includes(q) ||
          docCat.toLowerCase().includes(q);

        return matchCategory && matchIndustry && matchSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
  }, [allDocs, selectedCategoryFilter, selectedIndustryFilter, searchQuery, categories, bundles]);

  const handleOpenCreateDoc = () => {
    const newDoc: DocumentTemplate = {
      id: `doc-${Date.now()}`,
      categoryId: "",
      categoryName: "",
      industryId: "",
      industryName: "",
      name: "",
      title: "",
      description: "",
      creationMethod: "import_doc",
      contentHtml: "",
      extractedFields: [],
      autoNumbering: {
        enabled: true,
        prefix: "DOC-",
        sequenceDigits: 4,
        currentNumber: 1001,
        suffix: `-${new Date().getFullYear()}`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedDoc(newDoc);
    setIsEditorOpen(true);
  };

  const handleEditDoc = (doc: DocumentTemplate) => {
    setSelectedDoc(doc);
    setIsEditorOpen(true);
  };

  const getDocumentTypeLabel = (method?: string) => {
    switch (method) {
      case "import_doc":
        return "Word (.docx)";
      case "import_webform":
        return "WebForm";
      case "custom":
        return "Custom HTML";
      default:
        return "Custom HTML";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Bar */}
      <TopBar
        title="Document Templates"
        subtitle="Manage official operational, clinical consent, patient agreements, and hospital document templates with variable placeholder mapping."
        showFilters={false}
        onMenuToggle={onMenuToggle}
      />

      {/* Main Glass Workspace */}
      <GlassCard variant="default" rounded="3xl" padding="lg" className="space-y-6">
        {/* Controls Row: Search + Category Dropdown + Industry Dropdown + Add Button */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by document name, category, or industry..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl placeholder:text-slate-400 text-[#222222] shadow-xs outline-none focus:ring-2 focus:ring-[#1456f0]/40"
            />
          </div>

          {/* Filters & Action Group in the SAME Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Industry Category Filter Dropdown */}
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

            {/* Add Document Template Button */}
            <Pill
              variant="navy"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateDoc}
            >
              Add Document Template
            </Pill>
          </div>
        </div>

        {/* Clean Document Templates Data Table: Hamburger actions, no colorful capsules, Created On column */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-left w-[28%]">
                    Document Name
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[13%]">
                    Document Type
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry Category
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[16%]">
                    Industry
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[11%]">
                    Created On
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-left w-[10%]">
                    Sequencing
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center w-[6%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No document templates match your search criteria. Click &quot;Add Document Template&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const docName = doc.name || doc.title || "Untitled Template";
                    const formattedDocNum = doc.autoNumbering?.enabled
                      ? `${doc.autoNumbering.prefix}${String(doc.autoNumbering.currentNumber).padStart(
                          doc.autoNumbering.sequenceDigits,
                          "0"
                        )}${doc.autoNumbering.suffix || ""}`
                      : "—";

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 transition-colors duration-150 group"
                      >
                        {/* 1. Document Name */}
                        <td className="px-5 py-3.5 align-middle">
                          <button
                            type="button"
                            onClick={() => handleEditDoc(doc)}
                            className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-[#1456f0] transition-colors text-left group-hover:underline truncate block max-w-full cursor-pointer"
                          >
                            {docName}
                          </button>
                        </td>

                        {/* 2. Document Type */}
                        <td className="px-4 py-3.5 align-middle text-slate-600 font-medium">
                          {getDocumentTypeLabel(doc.creationMethod)}
                        </td>

                        {/* 3. Industry Category */}
                        <td className="px-4 py-3.5 align-middle text-slate-700">
                          <span className="truncate block">
                            {doc.categoryName || "General"}
                          </span>
                        </td>

                        {/* 4. Industry */}
                        <td className="px-4 py-3.5 align-middle text-slate-700">
                          <span className="truncate block">
                            {doc.industryName || "General"}
                          </span>
                        </td>

                        {/* 5. Created On */}
                        <td className="px-4 py-3.5 align-middle text-slate-500">
                          {formatDate(doc.createdAt)}
                        </td>

                        {/* 6. Sequencing */}
                        <td className="px-4 py-3.5 align-middle font-mono text-slate-600">
                          {formattedDocNum}
                        </td>

                        {/* 7. Actions (Hamburger Dropdown) */}
                        <td className="px-4 py-3.5 align-middle text-center">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuDocId(
                                  activeMenuDocId === doc.id ? null : doc.id
                                )
                              }
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                activeMenuDocId === doc.id
                                  ? "bg-[#1456f0] text-white shadow-xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#181e25]"
                              }`}
                              title="Document Actions"
                            >
                              <Menu className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuDocId === doc.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenuDocId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleEditDoc(doc);
                                      setActiveMenuDocId(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#1456f0] hover:bg-blue-50/80 rounded-xl transition-all text-left cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#1456f0]" />
                                    <span>Edit Template</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const duplicated: DocumentTemplate = {
                                        ...doc,
                                        id: `doc-${Date.now()}`,
                                        name: `${docName} (Copy)`,
                                        title: `${docName} (Copy)`,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString(),
                                      };
                                      saveDocumentTemplate(duplicated);
                                      setActiveMenuDocId(null);
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
                                      setActiveMenuDocId(null);
                                      if (confirm(`Delete document template "${docName}"?`)) {
                                        deleteDocumentTemplate(doc.id);
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

      {/* Document Template Editor Drawer */}
      {isEditorOpen && selectedDoc && (
        <DocumentEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          document={selectedDoc}
          onSave={(saved) => saveDocumentTemplate(saved)}
        />
      )}
    </div>
  );
}
