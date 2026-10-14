/**
 * Sidebar.tsx
 * Path: src/app/components/layout/Sidebar.tsx
 *
 * Client Portal Sidebar navigation:
 * - Docked inline navigation (collapsible & expandable).
 * - Collapsed state: icon-only view (w-[68px]) with hover tooltips portaled to document.body (relative to page, z-index 999999).
 * - Expanded state: full view (w-64) with organization switcher, accordion categories, and user footer.
 * - Flat SETTINGS hierarchy: all 9 settings pages listed directly under single SETTINGS heading.
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  Check,
  Plus,
  User,
  SlidersHorizontal,
  LogOut,
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
  Star,
  Eye,
  EyeOff,
  RotateCcw,
  GripVertical,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrganizationContext";
import { useSidebar } from "../../context/SidebarContext";
import { useSidebarMenu } from "../../context/SidebarMenuContext";
import { getSidebarIcon } from "./ConfigureMenuModal";
import { toast } from "sonner";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
  isFeatured?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

/**
 * Tooltip that renders via createPortal onto document.body
 * so it is positioned relative to the whole viewport and never clipped by sidebar overflow or page z-index.
 */
function SidebarPortalTooltip({
  text,
  badge,
  children,
}: {
  text: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      className="relative flex items-center justify-center w-full"
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            className="fixed -translate-y-1/2 px-2.5 py-1.5 bg-[#0F172A] text-white text-[11px] font-medium rounded-lg shadow-2xl pointer-events-none flex items-center gap-1.5 border border-slate-700/60 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
          >
            <span>{text}</span>
            {badge && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                {badge}
              </span>
            )}
            {/* Left arrow pointing towards icon */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-[#0F172A]" />
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Collapsed Organization Avatar Button with Portaled Flyout Menu
 */
function CollapsedOrgSwitcher({
  activeOrganization,
  organizations,
  setActiveOrganization,
}: {
  activeOrganization: any;
  organizations: any[];
  setActiveOrganization: (org: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.right + 10,
      });
    }
    setIsOpen((v) => !v);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="p-3 flex justify-center">
      <SidebarPortalTooltip text={activeOrganization?.name || "Demo Mantra"}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-2xs hover:ring-2 hover:ring-[#1456f0]/30 transition-all cursor-pointer"
        >
          {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "D"}
        </button>
      </SidebarPortalTooltip>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-56 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5 py-1">
              Organizations
            </p>
            {organizations.map((org) => {
              const isCurrent = activeOrganization?.id === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrganization(org);
                    setIsOpen(false);
                    toast.success(`Switched to ${org.name}`);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-blue-50 text-[#1456f0]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-5 h-5 rounded-md bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </div>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                </button>
              );
            })}
            <div className="border-t border-gray-100 pt-1">
              <Link
                to="/settings/organization"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 p-2 text-xs font-medium text-gray-600 hover:text-[#1456f0] hover:bg-blue-50/50 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manage Organizations</span>
              </Link>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/**
 * Collapsed User Avatar Button with Portaled Flyout Menu
 */
function CollapsedUserMenu({
  user,
  onSignOut,
  onNavigate,
  onOpenConfigure,
}: {
  user: any;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  onOpenConfigure: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ bottom: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        bottom: window.innerHeight - rect.bottom,
        left: rect.right + 10,
      });
    }
    setIsOpen((v) => !v);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="shrink-0 p-3 border-t border-gray-100 bg-[#FAFAFA] flex justify-center">
      <SidebarPortalTooltip text={user?.name || "Admin User"}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleOpen}
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-xs shadow-2xs hover:ring-2 hover:ring-[#1456f0]/30 transition-all cursor-pointer"
        >
          {user?.name
            ? user.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "AU"}
        </button>
      </SidebarPortalTooltip>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-52 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
            style={{
              bottom: `${coords.bottom}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate("/profile");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#1456f0] hover:bg-blue-50/60 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenConfigure();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span>Configure menu</span>
            </button>

            <div className="border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Log out</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const { collapsed, setCollapsed } = useSidebar();
  const {
    config,
    defaultStartPage,
    setDefaultStartPage,
    isConfiguring,
    setIsConfiguring,
    toggleItemVisibility,
    toggleItemFeatured,
    reorderSectionItems,
    moveItem,
    resetToDefault,
  } = useSidebarMenu();

  const [draggedItem, setDraggedItem] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ sectionId: string; index: number } | null>(null);

  const [openGearItem, setOpenGearItem] = useState<{
    sectionId: string;
    item: { id: string; label: string; path: string; visible: boolean; isFeatured?: boolean; iconName?: string };
    coords: { top: number; left: number };
  } | null>(null);
  const gearMenuRef = useRef<HTMLDivElement>(null);

  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  const startConfiguring = () => {
    setCollapsed(false);
    setIsConfiguring(true);
  };

  // Dynamic sections mapped from config
  const sections = React.useMemo(() => {
    return config.sections
      .map((sec) => ({
        id: sec.id,
        title: sec.id === "billing" ? "REVENUE & INSIGHTS" : sec.id === "automation" ? "CUSTOMIZATIONS" : sec.title,
        items: sec.items
          .filter((item) => item.visible)
          .map((item) => ({
            id: item.id,
            label: item.label,
            icon: getSidebarIcon(item.iconName),
            path: item.path,
            badge: item.badge,
            isFeatured: item.isFeatured,
          })),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [config]);

  // Collapsed mode items: all items marked visible AND featured (default quick icons)
  const collapsedItems = React.useMemo(() => {
    const list: Array<NavItem & { isFeatured?: boolean }> = [];
    const seenIds = new Set<string>();

    config.sections.forEach((sec) => {
      sec.items.forEach((item) => {
        if (item.visible && item.isFeatured && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          list.push({
            id: item.id,
            label: item.label,
            icon: getSidebarIcon(item.iconName),
            path: item.path,
            badge: item.badge,
            isFeatured: item.isFeatured,
          });
        }
      });
    });

    return list;
  }, [config]);

  // Accordion state for expanded sidebar initialized with section defaults
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    config.sections.forEach((s) => {
      init[s.id] = s.defaultExpanded;
    });
    return init;
  });

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // Close menus on outside click for expanded mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setOpenGearItem(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPathActive = (itemPath?: string, itemId?: string): boolean => {
    if (!itemPath) return false;
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (itemPath === "/") {
      return currentPath === "/";
    }

    if (itemId === "settings-org") {
      return (
        currentPath === "/settings/organization" ||
        (currentPath === "/settings" && (currentSearch.includes("tab=organization") || currentSearch === ""))
      );
    }
    if (itemId === "settings-team") {
      return (
        currentPath.startsWith("/settings/team") ||
        (currentPath === "/settings" && currentSearch.includes("tab=users"))
      );
    }
    if (itemId === "settings-billing") {
      return (
        currentPath.startsWith("/settings/billing") ||
        (currentPath === "/settings" &&
          (currentSearch.includes("tab=plans") ||
            currentSearch.includes("tab=payments") ||
            currentSearch.includes("tab=credit-usage") ||
            currentSearch.includes("tab=billing")))
      );
    }
    if (itemId === "settings-voices") {
      return (
        currentPath.startsWith("/settings/voices") ||
        (currentPath === "/settings" && currentSearch.includes("tab=voice-config"))
      );
    }
    if (itemId === "settings-sections") {
      return (
        currentPath.startsWith("/settings/sections") ||
        (currentPath === "/settings" &&
          (currentSearch.includes("tab=custom-fields") || currentSearch.includes("tab=layout")))
      );
    }
    if (itemId === "settings-integrations") {
      return (
        currentPath.startsWith("/settings/integrations") ||
        currentPath.startsWith("/settings/numbers") ||
        (currentPath === "/settings" &&
          (currentSearch.includes("tab=integrations") || currentSearch.includes("tab=numbers")))
      );
    }
    if (itemId === "settings-audit") {
      return (
        currentPath.startsWith("/settings/audit") ||
        (currentPath === "/settings" && currentSearch.includes("tab=audit-logs"))
      );
    }
    if (itemId === "settings-security") {
      return (
        currentPath.startsWith("/settings/security") ||
        (currentPath === "/settings" && currentSearch.includes("tab=security"))
      );
    }

    if (itemId === "processes" || itemId === "deals") {
      return currentPath.startsWith("/deals");
    }
    if (itemId === "workflows") {
      return currentPath.startsWith("/process");
    }

    return currentPath.startsWith(itemPath);
  };

  // Auto-expand section containing current active path
  useEffect(() => {
    sections.forEach((sec) => {
      const hasActive = sec.items.some((it) => isPathActive(it.path, it.id));
      if (hasActive) {
        setExpandedSections((prev) => ({
          ...prev,
          [sec.id]: true,
        }));
      }
    });
  }, [location.pathname, location.search, sections]);

  // Auto-collapse sidebar when navigating to workflow page if currently expanded
  useEffect(() => {
    if (location.pathname.startsWith("/process") || location.pathname.startsWith("/workflows")) {
      setCollapsed(true);
    }
  }, [location.pathname, setCollapsed]);

  return (
    <aside
      className={`h-full bg-white border-r border-gray-200/90 flex flex-col shrink-0 select-none transition-[width] duration-300 ease-in-out z-30 relative ${
        collapsed && !isConfiguring ? "w-[68px] min-w-[68px] max-w-[68px]" : "w-64 min-w-[256px] max-w-[256px]"
      }`}
    >
      {/* Floating Circular Collapse/Expand Toggle Button on the dividing border (hidden during configure mode) */}
      {!isConfiguring && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-2.5 top-[60px] w-5 h-5 rounded-full bg-white border border-gray-200/90 shadow-xs hover:shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all z-40 cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          )}
        </button>
      )}

      <div className="h-full w-full flex flex-col justify-between overflow-hidden">
        {/* ── Top Organization Switcher Header ── */}
        {collapsed && !isConfiguring ? (
          <CollapsedOrgSwitcher
            activeOrganization={activeOrganization}
            organizations={organizations}
            setActiveOrganization={setActiveOrganization}
          />
        ) : (
          /* Expanded Org Card */
          <div className="p-4 pb-1" ref={orgMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-full bg-white border border-gray-200/90 hover:border-gray-300 rounded-xl p-2.5 px-3 flex items-center justify-between shadow-2xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {activeOrganization?.name ? activeOrganization.name.charAt(0).toUpperCase() : "D"}
                  </div>
                  <span
                    className="text-xs font-bold text-gray-900 truncate"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {activeOrganization?.name || "Demo Mantra"}
                  </span>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
              </button>

              {/* Organization Dropdown */}
              {showOrgDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2.5 py-1">
                    Organizations
                  </p>
                  {organizations.map((org) => {
                    const isCurrent = activeOrganization?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        onClick={() => {
                          setActiveOrganization(org);
                          setShowOrgDropdown(false);
                          toast.success(`Switched to ${org.name}`);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-blue-50 text-[#1456f0]"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 rounded-md bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{org.name}</span>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#1456f0]" />}
                      </button>
                    );
                  })}
                  <div className="border-t border-gray-100 pt-1">
                    <Link
                      to="/settings/organization"
                      onClick={() => setShowOrgDropdown(false)}
                      className="w-full flex items-center gap-2 p-2 text-xs font-medium text-gray-600 hover:text-[#1456f0] hover:bg-blue-50/50 rounded-xl transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Manage Organizations</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Middle Scrollable Body (Configure Mode OR Normal Navigation) ── */}
        {isConfiguring ? (
          /* Configuring Body List */
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
            {config.sections.map((section) => (
              <div key={section.id} className="space-y-1.5">
                <div className="px-1 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  <span>{section.id === "billing" ? "REVENUE & INSIGHTS" : section.id === "automation" ? "CUSTOMIZATIONS" : section.title}</span>
                </div>

                <div className="space-y-1">
                  {section.items.map((item, idx) => {
                    const Icon = getSidebarIcon(item.iconName);
                    const isDragging = draggedItem?.sectionId === section.id && draggedItem?.index === idx;
                    const isOver = dragOverItem?.sectionId === section.id && dragOverItem?.index === idx;
                    const isGearOpen = openGearItem?.item.id === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedItem({ sectionId: section.id, index: idx });
                        }}
                        onDragEnd={() => {
                          setDraggedItem(null);
                          setDragOverItem(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (!dragOverItem || dragOverItem.sectionId !== section.id || dragOverItem.index !== idx) {
                            setDragOverItem({ sectionId: section.id, index: idx });
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverItem?.sectionId === section.id && dragOverItem?.index === idx) {
                            setDragOverItem(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedItem) {
                            moveItem(draggedItem.sectionId, section.id, draggedItem.index, idx);
                            setDraggedItem(null);
                            setDragOverItem(null);
                          }
                        }}
                        className={`flex items-center justify-between p-1.5 px-2 rounded-xl text-xs transition-all border select-none ${
                          isDragging
                            ? "opacity-30 border-blue-400 bg-blue-50/30 scale-98"
                            : isOver
                            ? "border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
                            : item.visible
                            ? "bg-white border-gray-200 text-gray-800 shadow-2xs hover:border-gray-300"
                            : "bg-gray-50/70 border-dashed border-gray-200 text-gray-400 opacity-60"
                        }`}
                      >
                        {/* Drag Handle + Icon + Title */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div
                            className="p-1 -ml-0.5 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              item.visible ? "bg-blue-50 text-[#1456f0]" : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>

                          <span
                            className={`truncate text-xs font-medium ${
                              item.visible ? "text-gray-800" : "text-gray-400 line-through"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>

                        {/* Action: Gear Settings Button */}
                        <div className="flex items-center shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (isGearOpen) {
                                setOpenGearItem(null);
                              } else {
                                setOpenGearItem({
                                  sectionId: section.id,
                                  item,
                                  coords: {
                                    top: rect.top,
                                    left: rect.right + 10,
                                  },
                                });
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isGearOpen
                                ? "bg-gray-200 text-gray-900 shadow-2xs"
                                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            }`}
                            title="Menu options"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : collapsed ? (
          /* Collapsed Icon-Only Navigation: Workspace items + Featured items + "v" Expand button */
          <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col items-center gap-1.5 min-h-0">
            {collapsedItems.map((item) => {
              const active = isPathActive(item.path, item.id);
              const Icon = item.icon;

              return (
                <SidebarPortalTooltip key={item.id} text={item.label} badge={item.badge}>
                  <Link
                    to={item.path}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                      active
                        ? "bg-[#1E293B] text-white shadow-xs"
                        : "text-[#475569] hover:text-[#0F172A] hover:bg-gray-100"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-white" : "text-[#64748B]"}`} />
                  </Link>
                </SidebarPortalTooltip>
              );
            })}

            {/* "v" Chevron Button to Open Sidebar completely */}
            <SidebarPortalTooltip text="View more">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer group mt-1"
                aria-label="View more"
              >
                <ChevronDown className="w-4.5 h-4.5 transition-transform group-hover:translate-y-0.5" />
              </button>
            </SidebarPortalTooltip>
          </div>
        ) : (
          /* Expanded Accordion Navigation */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {sections.map((section) => {
              const isExpanded = !!expandedSections[section.id];

              return (
                <div key={section.id} className="space-y-1.5">
                  {/* Accordion Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50/80 transition-all cursor-pointer"
                  >
                    <span>{section.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>

                  {/* Accordion Body Items */}
                  {isExpanded && (
                    <div className="pt-1 pb-2 space-y-1 pl-1">
                      {section.items.map((item) => {
                        const active = isPathActive(item.path, item.id);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.id}
                            to={item.path}
                            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                              active
                                ? "bg-[#1E293B] text-white font-semibold shadow-xs"
                                : "text-[#475569] hover:text-[#0F172A] hover:bg-gray-50"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                active ? "text-white" : "text-[#64748B]"
                              }`}
                            />
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Portaled Gear Action Popover Menu */}
        {openGearItem &&
          createPortal(
            <div
              ref={gearMenuRef}
              className="fixed w-56 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/90 p-1.5 z-[999999] space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-gray-800"
              style={{
                top: `${Math.min(openGearItem.coords.top, window.innerHeight - 140)}px`,
                left: `${Math.min(openGearItem.coords.left, window.innerWidth - 240)}px`,
              }}
            >
              {/* Hide / Show from Menu */}
              <button
                type="button"
                onClick={() => {
                  toggleItemVisibility(openGearItem.sectionId, openGearItem.item.id);
                  toast.success(
                    `${openGearItem.item.label} ${openGearItem.item.visible ? "hidden from menu" : "shown in menu"}`
                  );
                  setOpenGearItem(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{openGearItem.item.visible ? "Hide from menu" : "Show in menu"}</span>
                {openGearItem.item.visible ? (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                )}
              </button>

              {/* Feature / Unfeature this page (Featured pages appear in Collapsed Sidebar) */}
              <button
                type="button"
                onClick={() => {
                  toggleItemFeatured(openGearItem.sectionId, openGearItem.item.id);
                  toast.success(
                    `${openGearItem.item.label} ${
                      openGearItem.item.isFeatured ? "removed from featured pages" : "marked as featured"
                    }`
                  );
                  setOpenGearItem(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{openGearItem.item.isFeatured ? "Unfeature this page" : "Feature this page"}</span>
                <Star
                  className={`w-3.5 h-3.5 ${
                    openGearItem.item.isFeatured
                      ? "fill-amber-400 text-amber-500"
                      : "text-gray-400"
                  }`}
                />
              </button>
            </div>,
            document.body
          )}

        {/* ── Fixed/Pinned Bottom Controls (Configure controls OR User Dropdown) ── */}
        {isConfiguring ? (
          /* Configuring Sticky Bottom Bar */
          <div className="p-3 border-t border-gray-200/90 bg-white flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                resetToDefault();
                toast.success("Sidebar reset to default");
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfiguring(false);
                toast.success("Sidebar navigation saved");
              }}
              className="flex-1 px-4 py-1.5 bg-[#1E293B] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        ) : collapsed ? (
          <CollapsedUserMenu
            user={user}
            onSignOut={handleSignOut}
            onNavigate={(path) => navigate(path)}
            onOpenConfigure={startConfiguring}
          />
        ) : (
          /* Expanded User Card */
          <div className="shrink-0 p-3 border-t border-gray-100 bg-[#FAFAFA] relative" ref={userMenuRef}>
            {/* Upward Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#1456f0] hover:bg-blue-50/60 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    startConfiguring();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                  <span>Configure menu</span>
                </button>

                <div className="border-t border-gray-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}

            {/* User card trigger button */}
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group"
              aria-expanded={showUserMenu}
              aria-label="User menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ring-1 ring-black/5">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "AU"}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span
                    className="text-xs font-bold text-gray-900 truncate group-hover:text-black"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {user?.name || "Admin User"}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate">
                    {user?.role || "SystemAdmin"}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
