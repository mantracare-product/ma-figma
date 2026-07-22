import React, { useState, useMemo } from "react";
import { X, Search, FileText, Check, Plus, Tag, Sparkles, MessageSquare } from "lucide-react";
import { LIBRARY_TEMPLATES, LibraryTemplate } from "../../../lib/templateLibrary";
import { Button } from "../ui/Button";

interface TemplateLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LibraryTemplate) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  UTILITY: "bg-blue-50 text-blue-700 border-blue-200",
  MARKETING: "bg-purple-50 text-purple-700 border-purple-200",
  AUTHENTICATION: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function TemplateLibraryDrawer({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplateLibraryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredTemplates = useMemo(() => {
    return LIBRARY_TEMPLATES.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.bodyText.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "ALL" ||
        tpl.category.toUpperCase() === selectedCategory.toUpperCase();

      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Template Library
                </h2>
                <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Browse pre-built, ready-to-use WhatsApp message templates
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-6 border-b border-gray-100 bg-white space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, keyword, or body content..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "UTILITY", "MARKETING", "AUTHENTICATION"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No matching templates found</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or category filter.</p>
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const catBadgeStyle =
                CATEGORY_COLORS[tpl.category.toUpperCase()] ||
                "bg-gray-100 text-gray-700 border-gray-200";

              return (
                <div
                  key={tpl.id}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            {tpl.name}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${catBadgeStyle}`}
                          >
                            {tpl.category}
                          </span>
                        </div>
                        <p
                          className="text-xs text-gray-500 mt-1 leading-relaxed"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {tpl.description}
                        </p>
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 relative">
                      {tpl.headerText && (
                        <div className="text-xs font-bold text-gray-900 mb-1.5">
                          {tpl.headerText}
                        </div>
                      )}
                      <p
                        className="text-xs text-gray-800 whitespace-pre-line leading-relaxed"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {tpl.bodyText.split(/({{[^}]+}})/g).map((part, idx) => {
                          if (part.startsWith("{{") && part.endsWith("}}")) {
                            return (
                              <span
                                key={idx}
                                className="inline-block px-1 py-0.5 mx-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-mono font-semibold"
                              >
                                {part}
                              </span>
                            );
                          }
                          return part;
                        })}
                      </p>
                      {tpl.footerText && (
                        <div className="text-[10px] text-gray-400 mt-2 border-t border-emerald-100/60 pt-1.5">
                          {tpl.footerText}
                        </div>
                      )}
                      {tpl.buttons && tpl.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-emerald-100/60">
                          {tpl.buttons.map((btn, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-[11px] font-medium text-emerald-800 shadow-2xs"
                            >
                              {btn.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <Button
                      variant="primary"
                      onClick={() => onSelectTemplate(tpl)}
                      className="px-4 py-2 text-xs font-semibold flex items-center gap-1.5 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Use This Template
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
