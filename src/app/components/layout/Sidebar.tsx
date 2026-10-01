/**
 * Sidebar.tsx
 * Path: src/app/components/layout/Sidebar.tsx
 *
 * Client Portal Sidebar navigation:
 * - Positioned strictly below the topbar (top-16).
 * - Exact drawer/accordion styling and animations as AdminSidebar.
 * - Displays client navigation structure (Overview, Workspace, Automations, Billing & Insights, Settings).
 * - Middle navigation area scrolls independently (flex-1 overflow-y-auto).
 * - Top includes organization switcher card.
 * - Pinned bottom footer with user avatar + name that triggers an upward menu with Profile & Configure options.
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronRight,
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
  Settings,
  Building2,
  UserCog,
  CreditCard,
  Volume2,
  Hash,
  Layers,
  Link as LinkIcon,
  ScrollText,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrganizationContext";
import { toast } from "sonner";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSubItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  badge?: string;
  children?: NavSubItem[];
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workspace: true,
    automation: false,
    billing: false,
    settings: false,
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    settings: true,
  });

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSignOut = () => {
    logout();
    toast.success("Logged out successfully");
    onClose();
    navigate("/login");
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

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
    if (itemId === "settings-numbers") {
      return (
        currentPath.startsWith("/settings/numbers") ||
        (currentPath === "/settings" && currentSearch.includes("tab=numbers"))
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
        (currentPath === "/settings" && currentSearch.includes("tab=integrations"))
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

    if (itemId === "settings") {
      return currentPath.startsWith("/settings");
    }

    if (itemId === "processes" || itemId === "deals") {
      return currentPath.startsWith("/deals");
    }
    if (itemId === "workflows") {
      return currentPath.startsWith("/process");
    }

    return currentPath.startsWith(itemPath);
  };

  const sections: NavSection[] = [
    {
      id: "workspace",
      title: "WORKSPACE",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/" },
        { id: "clients", label: "Clients", icon: Users, path: "/clients" },
        { id: "call-logs", label: "Call Logs", icon: Phone, path: "/call-logs" },
        { id: "chats", label: "Chats", icon: MessageCircle, path: "/chats" },
        { id: "processes", label: "Process", icon: RefreshCw, path: "/deals" },
        { id: "appointments", label: "Appointments", icon: Calendar, path: "/appointments" },
        { id: "scribe", label: "AI Scribe", icon: Stethoscope, path: "/scribe" },
      ],
    },
    {
      id: "automation",
      title: "AUTOMATIONS",
      items: [
        { id: "workflows", label: "Workflows", icon: SlidersHorizontal, path: "/process" },
        { id: "knowledge-base", label: "Knowledge Base", icon: Database, path: "/knowledge-base" },
        { id: "web-forms", label: "Webforms", icon: FileText, path: "/web-forms" },
      ],
    },
    {
      id: "billing",
      title: "BILLING & INSIGHTS",
      items: [
        { id: "product-services", label: "Product & Services", icon: Package, path: "/services" },
        { id: "invoices", label: "Invoice", icon: Receipt, path: "/invoices" },
        { id: "insurance-claims", label: "Insurance & Claims", icon: ShieldCheck, path: "/claims" },
        { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
      ],
    },
    {
      id: "settings",
      title: "SETTINGS",
      items: [
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          path: "/settings",
          children: [
            { id: "settings-org", label: "Organization", icon: Building2, path: "/settings/organization" },
            { id: "settings-team", label: "Team", icon: UserCog, path: "/settings/team" },
            { id: "settings-billing", label: "Billing", icon: CreditCard, path: "/settings/billing" },
            { id: "settings-voices", label: "AI Voices / Models", icon: Volume2, path: "/settings/voices" },
            { id: "settings-numbers", label: "Numbers", icon: Hash, path: "/settings/numbers" },
            { id: "settings-sections", label: "Sections / Fields", icon: Layers, path: "/settings/sections-fields" },
            { id: "settings-integrations", label: "Integrations", icon: LinkIcon, path: "/settings/integrations" },
            { id: "settings-audit", label: "Audit Logs", icon: ScrollText, path: "/settings/audit-logs" },
            { id: "settings-security", label: "Security", icon: Lock, path: "/settings/security" },
          ],
        },
      ],
    },
  ];

  // Auto-expand section containing current active path
  useEffect(() => {
    sections.forEach((sec) => {
      const hasActive = sec.items.some(
        (it) =>
          isPathActive(it.path, it.id) ||
          it.children?.some((ch) => isPathActive(ch.path, ch.id))
      );
      if (hasActive) {
        setExpandedSections((prev) => ({
          ...prev,
          [sec.id]: true,
        }));
      }
    });

    if (location.pathname.startsWith("/settings")) {
      setExpandedItems((prev) => ({ ...prev, settings: true }));
    }
  }, [location.pathname, location.search]);

  return (
    <aside
      className={`fixed top-12 left-0 h-[calc(100vh-3rem)] w-64 bg-white flex flex-col z-40 shadow-xl transition-transform duration-300 ease-in-out select-none border-r border-gray-200/90 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col justify-between">
        {/* ── Top Organization Switcher Header ── */}
        <div className="p-4 pb-2 border-b border-gray-100">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl p-2 z-50 space-y-1">
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
                    onClick={() => {
                      setShowOrgDropdown(false);
                      onClose();
                    }}
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

        {/* ── Scrollable Accordion Section Area ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {sections.map((section) => {
            const isExpanded = !!expandedSections[section.id];
            const hasActiveChild = section.items.some(
              (it) =>
                isPathActive(it.path, it.id) ||
                it.children?.some((ch) => isPathActive(ch.path, ch.id))
            );

            const getHeaderStyle = () => {
              if (isExpanded && hasActiveChild) {
                return "border-2 border-gray-900 text-gray-900 rounded-full bg-white shadow-2xs";
              }
              if (section.id === "workspace") {
                return "bg-gray-100 text-gray-700 rounded-full";
              }
              return "text-gray-700 hover:text-gray-900";
            };

            return (
              <div key={section.id} className="space-y-1.5">
                {/* Accordion Header Button */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full px-4 py-2 flex items-center justify-between text-[11px] font-bold tracking-wider transition-all cursor-pointer ${getHeaderStyle()}`}
                >
                  <span>{section.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>

                {/* Accordion Body Items */}
                {isExpanded && (
                  <div className="pt-1 pb-2 space-y-1 pl-1">
                    {section.items.map((item) => {
                      const active = isPathActive(item.path, item.id);
                      const hasChildActive = item.children?.some((ch) => isPathActive(ch.path, ch.id));
                      const isItemExp = !!expandedItems[item.id];
                      const Icon = item.icon;
                      const hasChildren = Boolean(item.children && item.children.length > 0);

                      return (
                        <div key={item.id} className="space-y-1">
                          {hasChildren ? (
                            <div className="flex items-center">
                              <div
                                onClick={() => toggleItem(item.id)}
                                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${
                                  active || hasChildActive
                                    ? "bg-[#1E293B] text-white font-semibold shadow-xs"
                                    : "text-[#475569] hover:text-[#0F172A] hover:bg-gray-50"
                                }`}
                              >
                                <Link
                                  to={item.path || "#"}
                                  onClick={(e) => {
                                    if (!item.path) {
                                      e.preventDefault();
                                      toggleItem(item.id);
                                    } else {
                                      onClose();
                                    }
                                  }}
                                  className="flex items-center gap-3 min-w-0 flex-1"
                                >
                                  <Icon
                                    className={`w-4 h-4 shrink-0 ${
                                      active || hasChildActive ? "text-white" : "text-[#64748B]"
                                    }`}
                                  />
                                  <span className="truncate">{item.label}</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(item.id);
                                  }}
                                  className="p-0.5 hover:opacity-80 cursor-pointer"
                                  aria-expanded={isItemExp}
                                >
                                  {isItemExp ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <Link
                              to={item.path || "#"}
                              onClick={onClose}
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
                          )}

                          {/* Nested Sub-items */}
                          {hasChildren && isItemExp && (
                            <div className="pl-3.5 pt-0.5 pb-1 space-y-0.5 border-l-2 border-gray-100 ml-3">
                              {item.children?.map((child) => {
                                const childActive = isPathActive(child.path, child.id);
                                const ChildIcon = child.icon;

                                return (
                                  <Link
                                    key={child.id}
                                    to={child.path}
                                    onClick={onClose}
                                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all ${
                                      childActive
                                        ? "bg-[#1E293B] text-white font-semibold shadow-xs"
                                        : "text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50"
                                    }`}
                                  >
                                    <ChildIcon
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        childActive ? "text-white" : "text-[#64748B]"
                                      }`}
                                    />
                                    <span className="truncate">{child.label}</span>
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
              </div>
            );
          })}
        </div>

        {/* ── Fixed/Pinned Bottom Controls with Upward User Dropdown ── */}
        <div className="shrink-0 p-3 border-t border-gray-100 bg-[#FAFAFA] relative">
          {/* Upward Dropdown Menu */}
          {showUserMenu && (
            <div
              ref={userMenuRef}
              className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {user?.name || "Admin User"}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {user?.email || "admin@mantrahealth.com"}
                </p>
              </div>

              {/* Profile option - opens team member profile */}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onClose();
                  navigate("/profile");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#1456f0] hover:bg-blue-50/60 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span>Profile</span>
              </button>

              {/* Configure option */}
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  toast.info("Configure menu");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                <span>Configure</span>
              </button>

              {/* Log out */}
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
      </div>
    </aside>
  );
}
