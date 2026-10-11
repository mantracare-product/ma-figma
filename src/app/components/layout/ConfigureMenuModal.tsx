import React, { useState } from "react";
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  EyeOff,
  Star,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
  Search,
  ChevronRight,
  FolderInput,
  Sparkles,
  LayoutDashboard,
  Users,
  Calendar,
  Phone,
  MessageCircle,
  Stethoscope,
  RefreshCw,
  FileText,
  Database,
  Receipt,
  ShieldCheck,
  Package,
  BarChart3,
  Building2,
  UserCog,
  CreditCard,
  Volume2,
  Hash,
  Layers,
  Link as LinkIcon,
  ScrollText,
  Lock,
  Zap,
} from "lucide-react";
import { useSidebarMenu, NavSectionConfig, NavItemConfig } from "../../context/SidebarMenuContext";
import { toast } from "sonner";

// Icon resolution helper
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Phone,
  MessageCircle,
  RefreshCw,
  Calendar,
  Stethoscope,
  SlidersHorizontal,
  Zap,
  Database,
  FileText,
  Package,
  Receipt,
  ShieldCheck,
  BarChart3,
  Building2,
  UserCog,
  CreditCard,
  Volume2,
  Hash,
  Layers,
  Link: LinkIcon,
  ScrollText,
  Lock,
};

export function getSidebarIcon(iconName: string): React.ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] || LayoutDashboard;
}

export default function ConfigureMenuModal() {
  const {
    config,
    isConfiguring,
    setIsConfiguring,
    resetToDefault,
    toggleItemVisibility,
    toggleItemFeatured,
    reorderSectionItems,
    moveItem,
    toggleSectionDefaultExpanded,
  } = useSidebarMenu();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");

  if (!isConfiguring) return null;

  // Calculate statistics
  let totalItems = 0;
  let visibleCount = 0;
  let hiddenCount = 0;
  let featuredCount = 0;

  config.sections.forEach((sec) => {
    sec.items.forEach((item) => {
      totalItems++;
      if (item.visible) visibleCount++;
      else hiddenCount++;
      if (item.isFeatured) featuredCount++;
    });
  });

  const filteredSections = config.sections
    .filter((sec) => selectedSectionId === "all" || sec.id === selectedSectionId)
    .map((sec) => {
      const items = sec.items.filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.path.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q)
        );
      });
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Configure Sidebar Navigation
              </h2>
              <p className="text-xs text-gray-500">
                Reorder options, toggle visibility, and mark featured items for collapsible access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetToDefault();
                toast.success("Sidebar navigation reset to default");
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Reset to default menu configuration"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
              <span>Reset to Default</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfiguring(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu options..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1456f0]/20 focus:border-[#1456f0]"
            />
          </div>

          {/* Section filter pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setSelectedSectionId("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedSectionId === "all"
                  ? "bg-[#1E293B] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All ({totalItems})
            </button>
            {config.sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSectionId(sec.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedSectionId === sec.id
                    ? "bg-[#1E293B] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {sec.title} ({sec.items.length})
              </button>
            ))}
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/50">
              {visibleCount} visible
            </span>
            {hiddenCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium border border-rose-200/50">
                {hiddenCount} hidden
              </span>
            )}
            {featuredCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200/50 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                {featuredCount} featured
              </span>
            )}
          </div>
        </div>

        {/* Modal Body: Sections & Options List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA]">
          {filteredSections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No navigation options found</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing your search query</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden"
              >
                {/* Section Header */}
                <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {section.title}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      ({section.items.filter((i) => i.visible).length}/{section.items.length} visible)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        toggleSectionDefaultExpanded(section.id);
                        toast.success(
                          `${section.title} set to default ${
                            !section.defaultExpanded ? "expanded" : "collapsed"
                          }`
                        );
                      }}
                      className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set whether this section starts open or closed"
                    >
                      <span>Default {section.defaultExpanded ? "Open" : "Collapsed"}</span>
                    </button>
                  </div>
                </div>

                {/* Section Items */}
                <div className="divide-y divide-gray-100">
                  {section.items.map((item, index) => {
                    const IconComp = getSidebarIcon(item.iconName);
                    const isFirst = index === 0;
                    const isLast = index === section.items.length - 1;

                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          item.visible ? "bg-white hover:bg-gray-50/60" : "bg-gray-50/50 opacity-60"
                        }`}
                      >
                        {/* Left Side: Drag/Order Handle + Icon + Label */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Up / Down Reordering Buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => reorderSectionItems(section.id, index, index - 1)}
                              className={`p-0.5 rounded transition-colors ${
                                isFirst
                                  ? "text-gray-200 cursor-not-allowed"
                                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                              }`}
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => reorderSectionItems(section.id, index, index + 1)}
                              className={`p-0.5 rounded transition-colors ${
                                isLast
                                  ? "text-gray-200 cursor-not-allowed"
                                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                              }`}
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Item Icon */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              item.visible
                                ? "bg-blue-50 text-[#1456f0]"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>

                          {/* Item Title & Route */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-900 truncate">
                                {item.label}
                              </span>
                              {item.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                  Featured
                                </span>
                              )}
                              {!item.visible && (
                                <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded">
                                  Hidden
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 truncate block font-mono">
                              {item.path}
                            </span>
                          </div>
                        </div>

                        {/* Right Side: Move section dropdown, Feature toggle, Visibility toggle */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Move to another section select */}
                          <div className="relative">
                            <select
                              value={section.id}
                              onChange={(e) => {
                                const targetSecId = e.target.value;
                                if (targetSecId !== section.id) {
                                  const targetSec = config.sections.find((s) => s.id === targetSecId);
                                  const targetIdx = targetSec ? targetSec.items.length : 0;
                                  moveItem(section.id, targetSecId, index, targetIdx);
                                  toast.success(`Moved ${item.label} to ${targetSec?.title || targetSecId}`);
                                }
                              }}
                              className="text-[11px] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-gray-600 font-medium focus:outline-none cursor-pointer"
                              title="Move to section"
                            >
                              {config.sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Star / Feature Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              toggleItemFeatured(section.id, item.id);
                              toast.success(
                                `${item.label} ${!item.isFeatured ? "marked as featured" : "unfeatured"}`
                              );
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              item.isFeatured
                                ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                                : "bg-white border-gray-200 text-gray-400 hover:text-amber-500 hover:bg-gray-50"
                            }`}
                            title={item.isFeatured ? "Unfeature this page" : "Feature this page (appears in collapsed sidebar)"}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                item.isFeatured ? "fill-amber-400 text-amber-500" : ""
                              }`}
                            />
                          </button>

                          {/* Visibility Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              toggleItemVisibility(section.id, item.id);
                              toast.success(
                                `${item.label} is now ${!item.visible ? "visible in sidebar" : "hidden from sidebar"}`
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                              item.visible
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                            }`}
                            title={item.visible ? "Hide from sidebar" : "Show in sidebar"}
                          >
                            {item.visible ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Visible</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Changes apply in real-time and are saved automatically for your organization.
          </p>
          <button
            type="button"
            onClick={() => setIsConfiguring(false)}
            className="px-5 py-2 bg-[#1E293B] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
